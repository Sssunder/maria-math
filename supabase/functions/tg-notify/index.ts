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

async function listSites(): Promise<Array<{ slug: string; config: Record<string, any> }>> {
  const res = await fetch(`${SB_URL}/rest/v1/client_sites?select=slug,config`, { headers: sbHeaders });
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
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
      const me = await tg("getMe", {});
      const uname = me?.result?.username ?? "";
      const link = uname ? `https://t.me/${uname}?start=maria-math` : "";
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "Привет! Я единый бот уведомлений о новых записях — общая платформа для любых сайтов (репетитор, бьюти, услуги).\n\n" +
          "🔔 Ученик записался через сайт — тебе сразу приходит сообщение со ссылкой на кабинет.\n\n" +
          "Как подключить: открой кабинет своего сайта → вкладка «Сегодня» → «Подключить уведомления» и нажми ссылку.\n" +
          (link ? `Например, сайт Марии: ${link}\n\n` : "") +
          "Отписаться в любой момент: /stop",
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
      text: `Готово! Теперь я буду присылать сюда новые записи с сайта «${slug}». Ничего нажимать не нужно — уведомления приходят сами.\n\nОтписаться: /stop`,
    });
    return json({ ok: true });
  }

  if (text.startsWith("/stop")) {
    const slug = text.split(/\s+/)[1]?.trim();
    if (slug) {
      const cfg = await readConfig(slug);
      if (cfg === null) {
        await tg("sendMessage", { chat_id: chatId, text: "Не нашёл такой сайт. Проверь название." });
        return json({ ok: true });
      }
      await writeTelegram(slug, { enabled: false });
      await tg("sendMessage", { chat_id: chatId, text: `Готово, уведомления с сайта «${slug}» отключены. Снова подключить: /start ${slug}` });
      return json({ ok: true });
    }
    const sites = await listSites();
    const mine = sites.filter((s) => s.config?.telegram?.chat_id === chatId && s.config?.telegram?.enabled !== false);
    if (mine.length === 0) {
      await tg("sendMessage", { chat_id: chatId, text: "Ты пока не подключён к уведомлениям. Подключить: /start" });
      return json({ ok: true });
    }
    for (const s of mine) await writeTelegram(s.slug, { enabled: false });
    const names = mine.map((s) => s.slug).join(", ");
    await tg("sendMessage", { chat_id: chatId, text: `Готово, уведомления отключены (${names}). Больше ничего не пришлю. Снова подключить: /start` });
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

async function handleBranding(): Promise<Response> {
  const name = "Уведомления о записях";
  const short_description = "Единый бот уведомлений о записях для любых сайтов: новая запись приходит сама, со ссылкой на кабинет.";
  const description =
    "Я присылаю уведомления о новых записях с твоего сайта. Общий бот-платформа для любого бизнеса: репетитор, бьюти, услуги — кто угодно, у кого есть запись через сайт.\n\n" +
    "🔔 Клиент записался через сайт — тебе сразу приходит сообщение: имя, дата/время, услуга/формат и телефон.\n" +
    "🔗 В каждом уведомлении — ссылка «Открыть день в кабинете»: тапнул и редактируешь.\n" +
    "🙌 Ничего нажимать не нужно — уведомления приходят сами.\n" +
    "🚪 Отписаться в любой момент — /stop.\n\n" +
    "Подключение: кабинет сайта → «Подключить уведомления» → /start.";
  const commands = [
    { command: "start", description: "Подключить уведомления к сайту" },
    { command: "stop", description: "Отписаться от уведомлений" },
  ];
  const results = {
    name: await tg("setMyName", { name }),
    short_description: await tg("setMyShortDescription", { short_description }),
    description: await tg("setMyDescription", { description }),
    commands: await tg("setMyCommands", { commands }),
  };
  const ok = Object.values(results).every((r: any) => r?.ok === true);
  return json({ ok, results });
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
  const base = String(body.url || "https://sssunder.github.io/maria-math").replace(/\/+$/, "");
  const link = `${base}/?day=${encodeURIComponent(String(body.date ?? ""))}#admin`;
  const text =
    `🔔 Новая запись!\n` +
    `📅 ${fmtDate(body.date)} в ${body.time ?? ""}\n` +
    `👤 ${body.name ?? "Клиент"}${grade}\n` +
    `📋 ${body.format ?? "Запись"} · ${Number(body.duration ?? 60)} мин · ${Number(body.price ?? 0)} ₽\n` +
    `📞 ${body.phone ?? ""}${messenger}\n\n` +
    `🔗 Открыть день в кабинете: ${link}\n\n` +
    `🚪 Отписаться: /stop`;
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
    if (action === "branding") return await handleBranding();
    return await handleWebhook(req);
  } catch (e) {
    return json({ ok: false, reason: String(e) }, 500);
  }
});