// Supabase Edge Function: tg-notify
// Один Telegram-бот уведомлений о новых записях для всех сайтов репетиторов.
// Секрет: TG_BOT_TOKEN (задаётся в дашборде). SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY
// инжектируются платформой автоматически. Деплоить с verify_jwt = false (Telegram
// шлёт вебхук без JWT). Токен бота никогда не попадает в клиентский HTML.
//
// Маршруты:
//   POST ?action=webhook  — апдейты Telegram. /start <slug> запоминает chat_id сайта.
//   POST ?action=notify   — сайт пингует после новой записи; шлёт сообщение подписчику.

const BOT_TOKEN = Deno.env.get("TG_BOT_TOKEN") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function tg(method: string, payload: Record<string, unknown>): Promise<any> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

async function readConfig(slug: string): Promise<Record<string, any> | null> {
  const res = await fetch(
    `${SB_URL}/rest/v1/client_sites?slug=eq.${encodeURIComponent(slug)}&select=config`,
    { headers: sbHeaders },
  );
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0].config ?? {};
}

async function writeTelegram(slug: string, tg: Record<string, any>): Promise<void> {
  const cfg = (await readConfig(slug)) ?? {};
  cfg.telegram = { ...(cfg.telegram ?? {}), ...tg };
  await fetch(`${SB_URL}/rest/v1/client_sites?slug=eq.${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ config: cfg }),
  });
}

// Best-effort антиспам: не чаще одного уведомления на сайт за 15 секунд.
const lastNotify = new Map<string, number>();

function fmtDate(iso: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(iso ?? "");
}

async function handleWebhook(req: Request): Promise<Response> {
  let update: any = {};
  try { update = await req.json(); } catch (_) { return json({ ok: true }); }
  const msg = update.message ?? update.edited_message;
  const chatId = msg?.chat?.id;
  if (!chatId) return json({ ok: true });
  const text = String(msg?.text ?? "");

  if (text.startsWith("/start")) {
    const slug = text.split(/\s+/)[1]?.trim();
    if (!slug) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Привет! Чтобы получать уведомления о новых записях, открой сайт репетитора и нажми «Подключить уведомления» в кабинете (вкладка «Сегодня»).",
      });
      return json({ ok: true });
    }
    const cfg = await readConfig(slug);
    if (cfg === null) {
      await tg("sendMessage", { chat_id: chatId, text: "Не нашёл такой сайт. Проверь ссылку подписки." });
      return json({ ok: true });
    }
    await writeTelegram(slug, {
      chat_id: chatId,
      username: msg?.from?.username ?? "",
      enabled: true,
      subscribed_at: new Date().toISOString(),
    });
    await tg("sendMessage", {
      chat_id: chatId,
      text: `Готово! Теперь я буду присылать сюда новые записи с сайта «${slug}». Ничего нажимать не нужно — уведомления приходят сами.`,
    });
    return json({ ok: true });
  }

  if (text.startsWith("/stop")) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "Отключить уведомления можно в кабинете сайта: вкладка «Сегодня» → карточка Telegram → «Выключить».",
    });
    return json({ ok: true });
  }

  return json({ ok: true });
}

async function handleSetup(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const fnName = url.pathname.split('/').filter(Boolean).pop() || 'tg-notify';
  const me = await tg("getMe", {});
  const username = me?.result?.username ?? "";
  const webhookUrl = `${SB_URL}/functions/v1/${fnName}?action=webhook`;
  const wh = await tg("setWebhook", { url: webhookUrl, allowed_updates: ["message"] });
  const slug = url.searchParams.get("slug");
  if (slug && username) {
    const cfg = await readConfig(slug);
    if (cfg !== null) await writeTelegram(slug, { bot_username: username });
  }
  return json({
    ok: true, username, webhook_url: webhookUrl,
    webhook_set: wh?.ok === true, webhook_description: wh?.description ?? "",
    slug_prefilled: slug ?? null,
  });
}

async function handleNotify(req: Request): Promise<Response> {
  let body: any = {};
  try { body = await req.json(); } catch (_) { return json({ ok: false, reason: "bad_json" }, 400); }
  const slug = String(body.slug ?? "");
  if (!slug) return json({ ok: false, reason: "no_slug" }, 400);

  const cfg = await readConfig(slug);
  const t = cfg?.telegram;
  if (!t?.chat_id || !t.enabled) return json({ ok: false, reason: "not_subscribed" });

  const now = Date.now();
  if (now - (lastNotify.get(slug) ?? 0) < 15000) return json({ ok: false, reason: "rate_limited" });
  lastNotify.set(slug, now);

  const grade = body.grade ? ` (${body.grade})` : "";
  const messenger = body.messenger ? ` · ${body.messenger}` : "";
  const text =
    `🔔 Новая запись!\n` +
    `📅 ${fmtDate(body.date)} в ${body.time ?? ""}\n` +
    `👤 ${body.name ?? "Ученик"}${grade}\n` +
    `📚 ${body.format ?? "Урок"} · ${Number(body.duration ?? 60)} мин · ${Number(body.price ?? 0)} ₽\n` +
    `📞 ${body.phone ?? ""}${messenger}`;
  const r = await tg("sendMessage", { chat_id: t.chat_id, text });
  return json({ ok: true, sent: r?.ok === true });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!BOT_TOKEN) return json({ ok: false, reason: "no_bot_token" }, 500);
  const action = new URL(req.url).searchParams.get("action");
  try {
    if (action === "notify") return await handleNotify(req);
    if (action === "setup") return await handleSetup(req);
    return await handleWebhook(req);
  } catch (e) {
    return json({ ok: false, reason: String(e) }, 500);
  }
});