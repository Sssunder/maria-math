# Changelog — maria-math

## 2026-11-12 — Obvious «Пройти обучение заново» button + post-skip hint, local only
- Faint «Экскурсия» pill → prominent white button «Пройти обучение заново» (tooltip «Повторить экскурсию по кабинету»), always in the cabinet tab bar.
- On accidental skip (Пропустить / Esc): bottom toast «Ничего страшного! Жми «Пройти обучение заново» вверху — покажу всё ещё раз.» for ~6s + the button pulses. Toast is `pointer-events:none` so it never blocks clicks.
- Same change ported to natalia-math, elena-beauty, tutor-platform-template.
- **Verified**: `verify_tour.py` 11/8/8 PASS; template `verify.py` PASS; live `skip_hint_check.py` PASS (relabel, hint shown, pulse, relaunch→step0, 0 overflow @360 with hint, 0 errors). Read-only/mocked, **zero DB writes**. NOT pushed.

## 2026-11-12 — Plain-language connect guide + VPN links in Telegram card, local only
- Card now self-explains for owners «с компьютером на вы»: persistent «Как подключить (2 минуты)» numbered list (1. VPN if Telegram blocked → 2. «Подключить уведомления» → 3. «Запустить» /start → 4. «Я подписался — обновить статус»). Added Pavel's VPN referral links (`quattro.app/register?ref=HEmqibBsi5vz1Qz2` / `QuattroVPN_BOT?start=r_HEmqibBsi5vz1Qz2`) in the how-to + a slim VPN line when connected.
- Tour Telegram section expanded to 3 steps («Уведомления в Telegram» → «Шаг 1 — VPN и кнопка» → «Шаг 2 — Запустить и вернуться»), each switches to the card's tab first.
- Same how-to + VPN + 3-step tour ported to natalia-math, elena-beauty, tutor-platform-template.
- **Verified**: `verify_platform.py` 3/3 PASS (card, shared-bot link, how-to + both VPN hrefs, save/connect/disable/notify, 0 overflow 1440/360, 0 errors); `verify_tour.py` 11/8/8 PASS; template `verify.py` PASS. Mocked RPC, **zero DB writes**. NOT pushed.

## 2026-11-12 — Universal booking-notification platform (one shared bot for ANY niche), local only
- **Bot is now a common platform**, not tutor-only: branding redeployed universal («единый бот… для любого бизнеса: репетитор, бьюти, услуги»), notify text niche-neutral («Клиент», 📋 услуга). `/start <slug>` / `/stop` unchanged.
- **One shared bot for all sites**: `DEFAULT_SITE_CONFIG.telegram.bot_username='GojoNotifyBot'` everywhere → connect is one click (`t.me/GojoNotifyBot?start=<slug>`), no per-site BotFather needed.
- **Ported connect-card + auto-notify** to elena-beauty, natalia-math, tutor-platform-template (maria already had it): `TG_NOTIFY_URL`, `notifyNewBooking()` fired after booking success, Telegram card in cabinet (Texts tab; maria=Today), save/enable/refresh helpers adapted per site.
- Tour Telegram step now switches to the tab holding the card (spotlight no longer targets hidden panel).
- **Verified**: `verify_platform.py` (mocked RPC + tg-notify, **zero DB writes**) PASS on all 3 (card, shared-bot link, save, connect/disable, notify payload, 0 overflow 1440/360, 0 errors); `verify_tour.py` 9/6/6 PASS; template `verify.py` PASS. NOT pushed.

## 2026-11-12 — Cabinet mini-tour (onboarding «Экскурсия»), local only
- **Self-contained tour** appended before `</body>`: on first cabinet login a spotlight + white card walks the tabs step-by-step («Сегодня», «Расписание», «Тексты», «Отзывы», «Аналитика», «Ученики», Telegram card), plain-language «куда жать». Auto-detects `teacherView`/`masterView` + tab buttons, so the same snippet fits any tutor site.
- Controls: Дальше / Назад / Пропустить, Esc closes; «Экскурсия» pill in the tab bar replays anytime; `localStorage cabinetTourDone:<path>` shows it once. Theme-safe (own white card + dark scrim), mobile-clamped.
- **Verified** `verify_tour.py` (mocked RPC, **zero DB writes**): maria 9 steps, natalia/elena 5; auto-start, tab switching, spotlight/scrim, card inside viewport, finish/skip flag, relaunch, 0 overflow 1440/360, 0 console errors — PASS on all 3 sites. Same snippet added to natalia-math, elena-beauty, tutor-platform-template/template.html. NOT pushed.

## 2026-11-12 — Telegram bot: live link + real unsubscribe + branding (function DEPLOYED; site push pending)
- **Deployed** `tg-notify` to Supabase (`ngsonqwylcwcziwxurkc`, verify_jwt OFF). Webhook registered; bot **@GojoNotifyBot**; Pavel subscribed (chat_id 576326824) and received 4 test bookings with cabinet links.
- **Link in every notification**: `🔗 Открыть день в кабинете: <site>/?day=<date>#admin` — tap opens that day + cabinet PIN. Site sends `url` in the notify payload.
- **Real unsubscribe**: `/stop` (bare) disables every site this chat is subscribed to; `/stop <slug>` disables one. Sets `config.telegram.enabled=false` server-side. Each notification ends with `🚪 Отписаться: /stop`. Bare `/start` now explains the bot is shared by ALL tutor sites (self-service in Telegram).
- **Branding applied via API** (`?action=branding`): name «Уведомления о записях», short/full description, commands `start`/`stop` («Отписаться от уведомлений»). All 4 returned ok.
- **Avatar**: generated `vibe_images/gojo-notify-bot-avatar_*.png` (smiling bell + π). Bot's own photo can ONLY be set via BotFather `/setuserpic` (no Bot API method) — file + instructions handed to user.
- **Verified**: branding ok×4; `/stop` no-write probes (unknown slug, unsubscribed chat) returned ok and left maria-math `enabled:true` intact (read-only check). **Zero DB writes in tests.** Elena/Natalia sites untouched.
- **Pending**: push `index.html` (link payload + Telegram card) to Sssunder/maria-math so REAL bookings auto-notify on the live site — needs explicit user OK. Revoke Supabase token when done.

## 2026-11-12 — Telegram auto-notifications for new bookings (function deployed; site push pending)
- **Goal**: hands-off alerts — when a student books via the site, Maria gets a Telegram message automatically (no tapping). One shared bot for all tutor sites; each tutor subscribes once via `/start`.
- **Edge Function** `supabase/functions/tg-notify/index.ts` (Deno, no external imports): `?action=webhook` stores `chat_id` into `client_sites.config.telegram` on `/start <slug>`; `?action=notify` sends a formatted new-booking message to the subscribed chat (15s per-slug rate-limit); `?action=setup` self-registers the Telegram webhook + prefills `bot_username` (open from browser, RF-reachable via Supabase). Bot token lives ONLY in the `TG_BOT_TOKEN` secret — never in HTML. Deploy with **verify_jwt = false** (Telegram webhook sends no JWT).
- **Site (`index.html`)**: `TG_NOTIFY_URL`; `notifyTutorNewBooking()` fired right after `create_public_booking_v2` success (fire-and-forget, function decides subscription server-side); `DEFAULT_SITE_CONFIG.telegram` + deep-merge in `mergeSiteConfig`; Telegram card in **Today** tab (`#tgNotifyStatus`/`#tgNotifySetup`, `renderTelegramCard`): bot-username input + save, `/start` deep-link `t.me/<bot>?start=maria-math`, connected status, enable/disable. New JS: `saveTelegramBotUsername`, `setTelegramEnabled`.
- **Verified**: `verify_telegram.py` (port 8745, mocked RPC + mocked tg-notify, **zero DB writes, zero real Telegram calls**) — booking auto-ping payload correct, card render/save/deep-link, connect/disable persist, 0 overflow 1440/360, 0 errors. Full regression **14/14 PASS**. `api.telegram.org` is blocked from this RF machine, so real send is only testable post-deploy (function runs abroad on Supabase).
- **To activate (one-time, needs user OK)**: (1) Supabase Dashboard → Edge Functions → deploy `tg-notify`, paste `index.ts`, verify_jwt OFF, secret `TG_BOT_TOKEN`; (2) open `https://ngsonqwylcwcziwxurkc.supabase.co/functions/v1/tg-notify?action=setup&slug=maria-math` in browser → registers webhook + prefills username; (3) Maria: cabinet → Today → «Подключить уведомления» → `/start` in Telegram. NOT committed/pushed; Elena/Natalia untouched.

## 2026-11-12 — Cycle 2: 10 substantial cabinet rounds (dev/passenger loop, all accepted)
- **Pair loop** (OmniRoute passenger `cfp/moonshotai/kimi-k2.7-code`, read-only mocked RPC, **zero DB writes**); 10 rounds, each accepted by passenger. Backend RPC set unchanged — all new per-lesson/per-student data lives in cloud config via `admin_save_config` (`mergeSiteConfig` passes new keys through).
  - **R6 Analytics** (`#teacherTabAnalytics`): revenue/lessons/hours/avg KPIs, week/month/all periods, bar chart, format-leader table.
  - **R7 Revenue protection**: prepaid balance, lesson statuses (done/noshow/cancelled), cancel policy + public note; no-show consumes prepaid (money kept) else logged as loss; cancel frees slot. `siteConfig.lesson_status/prepaid/cancel_policy`.
  - **R8 Waitlist** (`siteConfig.waitlist`): queue + free-slot matcher; cancel auto-suggests waiting students; offer prefills manual booking; save refills slot + marks booked.
  - **R9 Student CRM** (`#teacherTabStudents`): search, format/activity filters, sort, "давно не был" lapse threshold, copy-text reminders, rebook prefill, global lapsed count.
  - **R10 Homework & goals** (dossier, `siteConfig.student_learning`): homework text+due (done/overdue), goals with 0–100% progress slider.
  - **R11 Review request** (`siteConfig.review_requests`): after "Проведён" → ready parent message + `#reviews` form link + Telegram/WhatsApp/MAX send; "отзыв запрошен" badge prevents duplicates.
  - **R12 Payments & debt** (`siteConfig.payments`): per-lesson paid/overdue/pending table + quick toggle; per-student debt/pending badges; global "Долг учеников" in CRM.
  - **R13 Today dashboard** (`#teacherTabToday`, first tab): day lessons/revenue/debt/lapsed KPIs, "кому напомнить", "что задать" (homework due), "кто должен"; quick done/pay actions; **print day schedule** (`#printDaySheet` `@media print`).
  - **R14 Recurring lessons** (`siteConfig.recurring`): per-student weekday+time+format template; "Создать уроки на N недель" bulk-generates bookings (skips occupied, idempotent); save/remove template.
  - **R15 Lesson reminder**: "Напомнить" per scheduled today lesson → ready text + WhatsApp/Telegram/MAX send + copy (done/cancelled excluded).
- **Verified**: 12 Playwright mocked-RPC E2E scripts (ports 8731–8744) at 360/393/1440 + 4 themes: 0 overflow, 0 console errors; exact figures asserted (revenue, debt, generated dates, messenger links). All 12 green after the final round.
- **Open / Next**: passenger's standing wish — Telegram notifications for new bookings (needs bot/backend, not implemented).

## 2026-11-12 — Lesson durations + 5-round dev/passenger loop (committed `654e23d`)
- **Durations 40/45/60**: `getSelectedDurationMin()` + `pluralMinutes()`; open-slot end follows selected program duration, booked slot shows real `booking.duration` end; duration label, select notice, confirm-modal summary and Telegram handoff all show "N мин (до HH:MM)". Cabinet program editor got 40/45/60/90 preset chips.
- **Pair loop (OmniRoute passenger `cfp/moonshotai/kimi-k2.7-code`, read-only mocked RPC, zero DB writes)** — 5 substantial cabinet rounds, each accepted by passenger:
  - **R1**: one-click "Открыть весь день (10–20)" + per-action confirm + result toast; "Ближайший урок" strip.
  - **R2**: student dossier (history/total/notes/Позвонить/Записать ещё prefill) + "Выгрузить в Excel" (CSV BOM+`;`).
  - **R3**: notes sync to cloud config via `admin_save_config` (cross-device) + "Заметки в файл" txt backup.
  - **R4**: public weekly schedule overview + "Ссылка на запись" (`?day=…#booking`) with working deep-link (init-order bug fixed).
  - **R5**: owner review replies (3 templates, publish/remove, stored in `siteConfig.review_replies`, shown publicly as "Ответ Марии") + "Канал с отзывами" link + "Скопировать детали записи" in confirm modal.
- **Theme-safety fix**: reply label uses `color-mix(accent 62%, text-heading)` (removed `.text-peach` `!important` clash) — contrast now 5.2–8.1 across all 4 themes (was 2.95 in sakura).
- **Verified**: Playwright mocked-RPC E2E at 360/1440 + 4 themes: 0 overflow, 0 errors; bulk/dossier/CSV/cloud-note-reload/reply-publish/booking-copy/deep-link all green. Backend RPC set unchanged; no new RPCs.
- **Open / Next**: passenger's standing wish — Telegram notifications for new bookings (needs bot/backend, not implemented). Committed as `654e23d`; cycle 2 (rounds 6–15) built on top.

## 2026-11-12 — UX loop, 3 rounds (native maker-checker, read-only verify)
- **R1**: `#nearestSlotHint` — banner above day-scroll shows nearest open slot ("Ближайшее свободное окно: …") with "Показать" jump; refreshed in `recomputeSlots()`.
- **R2**: `#reviewsAvgBadge` — average rating "X.X из 5" next to reviews count, hidden when no reviews.
- **R3**: mobile header CTA "Урок" → "Записаться"; `aria-label` on icon-only theme & sound buttons.
- **Verified**: headless Playwright (mocked `get_public_site_bundle`, no DB writes) at 360x800 & 1440x900: 0 overflow, 0 console errors, all three features visible. History preserved (new commit on top of `f23b510`).

## 2026-11-12 — Constructor v3 (`index.html`, Supabase `ngsonqwylcwcziwxurkc`)
- **Tab 2 (`#teacherTabTexts`) Constructor**: added `#cfgDefaultTheme` (`cozy-cat`/`sakura`/`artek`/`cyber`) applied when `maria_theme_manual` is unset and immediately on Save; phone (`+7/8/9...` -> `+7XXXXXXXXXX`) & Telegram (`@user`/`user`/`+7...`/`https://t.me/...`) normalization with auto-sync to `#cfgMaxUrl` / `#cfgTgUrl` + `#syncMessengersFromPhoneBtn`; `#cfgReviewsChannelUrl` rendered as `#reviewsChannelLink` + `#footerReviewsChannelLink`; all header/hero/booking/review/footer contact links synced via `siteConfig.contacts`.
- **Programs Constructor (`#cfgProgramsList`)**: added show/hide toggle (`p.hidden`, `>= 1` active guard), icon/title/price/duration/desc/benefit editing, and `+ Добавить формат` (`#addProgramFormatBtn`) persisted cleanly via `mergeSiteConfig()`.
- **Tab 3 (`#teacherTabReviews`) + Live Preview**: added 3-step owner tips box, `#admReviewForm` + shared `buildPublicReviewCardHtml()` live preview (`#admReviewLivePreview`), and `admin_add_review` / `admin_set_review_visibility` / `admin_delete_review` integration.
- **UI & Contrast**: fixed `cyber` dark overrides (checkboxes/radios, status badges, owner tips) and lifted light-mode accent/Telegram contrast (`--color-accent: #DC4B22`, `#0284C7`).
- **Deploy / URL**: pushed to `origin/master` -> https://sssunder.github.io/maria-math/
- **Verified**: headless Playwright E2E (PIN `1234`) across 36 view/theme combinations (`1440x900`, `393x852`, `360x800` × 4 themes × public/Tab 2/Tab 3): `0px` horizontal overflow, contrast >= `3.53`, phone->MAX/TG auto-sync, `admin_save_config`, review preview + visibility + delete, and DB restored to Maria's original config (`0` active synthetic reviews).
- **Open / Next**: none.

## 2026-11-11 — Cloud Sync Baseline (`55cfb82`)
- Connected `maria-math` (`SITE_SLUG='maria-math'`) to shared Supabase `client-sites` RPCs (`get_public_site_bundle`, `create_public_booking_v2`, `create_public_review`, `admin_login_and_fetch`, `admin_save_config`, `admin_set_slot_state_v2`, `admin_bulk_day_action_v2`, `admin_delete_review`, `admin_change_pin`) and 3-tab Teacher Cabinet.
