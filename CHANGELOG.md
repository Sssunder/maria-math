# Changelog — maria-math

## 2026-11-12 — Lesson durations + 5-round dev/passenger loop (UNCOMMITTED, no push)
- **Durations 40/45/60**: `getSelectedDurationMin()` + `pluralMinutes()`; open-slot end follows selected program duration, booked slot shows real `booking.duration` end; duration label, select notice, confirm-modal summary and Telegram handoff all show "N мин (до HH:MM)". Cabinet program editor got 40/45/60/90 preset chips.
- **Pair loop (OmniRoute passenger `cfp/moonshotai/kimi-k2.7-code`, read-only mocked RPC, zero DB writes)** — 5 substantial cabinet rounds, each accepted by passenger:
  - **R1**: one-click "Открыть весь день (10–20)" + per-action confirm + result toast; "Ближайший урок" strip.
  - **R2**: student dossier (history/total/notes/Позвонить/Записать ещё prefill) + "Выгрузить в Excel" (CSV BOM+`;`).
  - **R3**: notes sync to cloud config via `admin_save_config` (cross-device) + "Заметки в файл" txt backup.
  - **R4**: public weekly schedule overview + "Ссылка на запись" (`?day=…#booking`) with working deep-link (init-order bug fixed).
  - **R5**: owner review replies (3 templates, publish/remove, stored in `siteConfig.review_replies`, shown publicly as "Ответ Марии") + "Канал с отзывами" link + "Скопировать детали записи" in confirm modal.
- **Theme-safety fix**: reply label uses `color-mix(accent 62%, text-heading)` (removed `.text-peach` `!important` clash) — contrast now 5.2–8.1 across all 4 themes (was 2.95 in sakura).
- **Verified**: Playwright mocked-RPC E2E at 360/1440 + 4 themes: 0 overflow, 0 errors; bulk/dossier/CSV/cloud-note-reload/reply-publish/booking-copy/deep-link all green. Backend RPC set unchanged; no new RPCs.
- **Open / Next**: passenger's standing wish — Telegram notifications for new bookings (needs bot/backend, not implemented). NOT committed/pushed (awaiting explicit user request).

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
