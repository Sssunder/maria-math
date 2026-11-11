# Changelog — maria-math

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
