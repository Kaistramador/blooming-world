# STATE.md — единая точка входа в проект «Цветущий мир» (Blooming World)

> 📌 **Это главный файл непрерывности.** Обновляется в конце КАЖДОЙ рабочей сессии.
> Новая сессия начинается фразой пользователя: **«Продолжай Цветущий мир по STATE.md»** — этого достаточно.

> Обновлено: 8 ноября 2026 (сессия **ВОЛНА 1 «Графика нового поколения» ВЫПОЛНЕНА**: план развития по волнам W1–W7 на базе исследования конкурентов в ROADMAP.md; 10 авторских AI-фонов эр в standalone и Next; премиум-полировка фишек; сок: комбо-попапы/волны/тряска/конфетти/интро; lint/tsc 0, движок и standalone smoke PASSED, сборка 862.7 KB, браузерные смоки 0 ошибок; пуш: корень репо (standalone) + зеркало. Ранее 8.11 — исследование конкурентов (PDF в download/) + Task 3 (GitHub-пуш), 7.11 — Task 2 (дальтоникам) и Task 1 (MVP))

---

## 1. Как я (ассистент) восстанавливаю контекст — порядок чтения (~1 мин)

1. `STATE.md` (этот файл) — текущее состояние и следующий шаг
2. `git log --oneline -5` + `git status --short` — сверить дерево и HEAD с «Зафиксировано» (§7)
3. `ROADMAP.md` — кандидаты следующих волн (**не стартуют без слова игрока**)
4. `tail -40 worklog.md` — журнал последнего Task (детали приёмки)
5. Карта кода — §3 ниже

## 2. Текущее состояние (на 8 ноября 2026)

| Что | Статус |
|---|---|
| **Task 1 — MVP «Цветущий мир»** (match-3, веб/PWA-основа) | ✅ Движок `src/lib/game/engine.ts` — чистый TS без DOM (портабельность на React Native предусмотрена): swap-матчи + каскады, спец-фишки rocketH/rocketV/bomb/rainbow (4/5-матчи), спец-комбо, камни-препятствия с HP, tap-режим (каждый 10-й уровень — босс), бустеры hammer/bomb/cross/shuffle/undo/moves5. 100 уровней = 10 глав × 10 (генератор `levels.ts` параметризован — `TOTAL_LEVELS`, масштаб до 10000 меняется одной константой). 10 глав = 10 эр графики (камень → пиксель → 16-цвет → глянец → флэт → граденты → неон → стекло → радуга → золотой сад): `themes.ts`. Магазин: 6 бустеров, паки монет (демо, без реальных платежей), 10 скинов, 24 аватара, 12 рамок, 10 стилей имени, 18 эффектов (`shop.ts`). Глобальный рейтинг: 520 детерминированных ботов (`leaderboard.ts`, mulberry32 seed 20261107, уровни ботов до 12000+). RU/EN (`i18n.ts`). Синтез-звук WebAudio (`sound.ts`). Состояние игрока — Zustand persist, ключ **`blooming-world-save-v1`** (менять запрещено — §5.4) |
| **Task 2 — Доступность для дальтоников** (запрос игрока: «сложно разобрать») | ✅ **Форма-кодирование** (`shapes.ts`): у каждого цвета свой силуэт ВО ВСЕХ главах и скинах — красный=треугольник, жёлтый=ромб, зелёный=шестиугольник, синий=круг, фиолетовый=квадрат, оранжевый=звезда. **Палитры Okabe-Ito** (`themes.ts`): порядок оттенков зафиксирован по всем эрам (эволюция графики = насыщенность/светлота/канты/эффекты, НЕ оттенки), светлотная лестница для яркостных подсказок при дейтеран/протан. Тёмный/светлый кант вокруг силуэта каждой фишки (двухслойная техника, тени через drop-shadow — следуют силуэту). Камни — восьмиугольник с трещинами и **HP-пипсами** (точка = оставшийся удар). Чипы целей «собери N» — с мини-силуэтом цвета. Спец-фишки — белый маркер на тёмном диске. Скины-эмодзи — поверх силуэта (двойное кодирование). Проверка: уровни 2, 12, 25, 61, 71 в браузере (главы 1/2/6/8: камень/пиксель/неон/стекло), свап+каскад, консоль 0; eslint/tsc 0; симуляция движка OK |
| **Task 3 — Непрерывность + GitHub (без Cloudflare)** | ✅ ЗАВЕРШЁН 08.11. Этот файл + `worklog.md` + `ROADMAP.md` + `scripts/sync-github.sh` (+ `scripts/sync-exclude.txt`). Принцип как у SciFi Mahjong: STATE — единая точка входа, обновление в конце КАЖДОЙ сессии, вход по фразе «Продолжай Цветущий мир по STATE.md». **Пуш выполнен** (§4): `.env` заполнен токеном от игрока; репо **Kaistramador/blooming-world** — корень = standalone-игра (index.html + README + web-app/), папка **blooming-world/** = зеркало всего проекта (STATE.md/worklog/ROADMAP/src/scripts/…), секрет-гвард 0. Скрипт доработан: fetch с extraheader, exclude + `blooming-world-repo/` и `.zscripts/`; eslint ignores + `.github-sync/`; lint-фиксы в `scripts/standalone/*.js` (smoke-харнесс порта — ALL TESTS PASSED) |
| **Волна 1 — Графика нового поколения** (из исследования конкурентов, PDF в download/) | ✅ **План по волнам W1–W7** в ROADMAP.md. Выполнено: 10 авторских AI-фонов эр (`public/eras/era-*.webp` + base64 `parts/assets.js`, итог standalone 862.7 KB); фото-слой + виньетка/скримы в BloomingBackground/buildBackground (статичные холмы убраны — живут в фото, анимации сохранены); GemTile/tileHtml — премиум 3D-глубина и двойной блик (a11y-силуэты не тронуты, §5.2); сок: комбо-попапы с похвалой ×2–×5 (i18n RU/EN), bm-shockwave по камням, bm-board-shake, конфетти победы 28 лепестков, bm-board-in. Приёмка: lint 0 / tsc 0 / движок OK / standalone smoke PASSED / браузерные смоки обеих версий 0 ошибок |
| **Следующий шаг** | **Волна 2 «Удержание»** — стартует по слову игрока: win-streak (множитель награды за серию побед), аудит win-rate первых 15 уровней ≥95% (симуляция), лёгкая аналитика-события в localStorage. **Игроку (если ещё не сделано):** включить GitHub Pages — Settings → Pages → Deploy from a branch → main → / (root) — игра с новой графикой будет на https://kaistramador.github.io/blooming-world/ . **Протокол сессий:** пуш в конце КАЖДОЙ сессии — `bash scripts/sync-github.sh "…"` + обновить standalone в корне репо (blooming-world-repo) |

## 3. Карта проекта (где что лежит)

| Путь | Что это |
|---|---|
| `src/lib/game/engine.ts` | Ядро игры: чистый TS, без DOM/RN-зависимостей. trySwap/tryTap/hammerHit/bombBlast/crossBlast/shuffleBoard, спец-фишки, гравитация сегментов, камни |
| `src/lib/game/levels.ts` | Генератор уровней: `TOTAL_LEVELS=100` (10 глав × 10), цели (score/collect/stone/item), камни, voids, тап-боссы на каждом 10-м |
| `src/lib/game/themes.ts` | 10 эр: палитры Okabe-Ito (якоря в `ANCHORS`), EraTileStyle (rim/rimWidth/эффекты), EraBackground (сцена) |
| `src/lib/game/shapes.ts` | Доступность: `GEM_SHAPE_CLIP` (clip-path силуэтов), `gemShapeCss()` |
| `src/lib/game/shop.ts` | Каталог магазина: BOOSTERS, COIN_PACKS, GEM_SKINS (глифы/кольцо), AVATARS, FRAMES, NAME_STYLES, EFFECTS |
| `src/lib/game/leaderboard.ts` | 520 ботов (mulberry32 20261107), сортировка (уровень, звёзды) |
| `src/lib/game/sound.ts` | WebAudio-синтез, без аудиофайлов |
| `src/lib/store.ts` | Zustand persist `blooming-world-save-v1`: монеты/звёзды/бустеры/косметика/статистика |
| `src/lib/i18n.ts` | RU/EN словарь |
| `src/components/game/` | GameScreen (поле, анимации, бустеры), GemTile (рендер фишки: силуэт+кант+оверлей), MapScreen, ShopScreen, RanksScreen, ProfileScreen, BloomingBackground, PlayerBadge |
| `scripts/test-engine.ts` | Симуляция движка (прогон уровней, win-rate по главам, камни) |
| `scripts/standalone/` | Node-харнесс standalone-порта: build.py (сборка index.html из parts/), run-tests.js + test-engine-js.js (smoke движка в JS) |
| `scripts/sync-github.sh` | Синк на GitHub (§4), конфиг в `.env` |
| `blooming-world-repo/` | Локальный клон целевого репо Kaistramador/blooming-world (standalone + его собственный git) — в зеркало НЕ входит |

## 4. Протокол GitHub-сохранения (без Cloudflare)

> Урок SciFi Mahjong (их Task 102): откат песочницы уничтожил незапушенные коммиты локально — выжило только то, что было на GitHub. Отсюда правило: **пуш в конце КАЖДОЙ сессии ОБЯЗАТЕЛЬНО**, до закрытия задачи.
>
> **Факт 08.11:** конфиг в `.env` заполнен (токен дан игроком в чате): `GITHUB_REPO=Kaistramador/blooming-world`, `GITHUB_TARGET_FOLDER=blooming-world`. Структура репо: **корень = standalone-игра** (index.html + README + web-app/ — сюда НЕ писать) + **папка blooming-world/ = зеркало проекта**. Токен: fine-grained, Contents: Read and write — НЕТ прав Pages/Workflows/Administration (Pages через API не включить, workflow-файлы не запушить — проверено 403/remote rejected). Если игроку нужен автоматический Pages-деплой — новый токен с правами Pages + Workflows.

1. **Конфиг** — в `.env` корня проекта (файл в синк не попадает, токен никогда не печатается и не коммитится):
   - `GITHUB_TOKEN=…` — fine-grained PAT (или classic со scope repo). Выдаётся игроком на github.com: Settings → Developer settings → Fine-grained tokens → доступ только к целевому репозиторию → Repository permissions → Contents: **Read and write**.
   - `GITHUB_REPO=owner/name` — целевой репозиторий (фактически: Kaistramador/blooming-world — отдельный репозиторий под игру).
   - `GITHUB_TARGET_FOLDER=blooming-world` — отдельная папка внутри репозитория; пусто = корень (тогда это «отдельный репозиторий под игру»).
2. **Синк** — `bash scripts/sync-github.sh "Task N: суть"`: клон (или переиспользование `.github-sync/`) → fetch + `reset --hard origin/main` (наше содержимое всегда живёт в проекте, чужие файлы репо обновляются из origin) → rsync зеркала в `blooming-world/` (исключения — `scripts/sync-exclude.txt`: node_modules/.next/.env/upload/базы/логи/.git/.github-sync/blooming-world-repo/skills/examples и пр.) → коммит → пуш с авторизацией через http.extraheader (токен не остаётся в .git/config; fetch внутри цикла тоже с extraheader — работает и с приватным репо). Если origin уехал вперёд — скрипт сам повторяет fetch/rebase-цикл до 3 раз.
3. **Правила**: (а) корень целевого репо (standalone-игра, README, web-app/) не трогаем; (б) секреты в репозиторий не попадают — скрипт проверяет индекс на .env/секреты после пуша; (в) сообщения коммитов: `blooming-world: Task N: …`; (г) собственный git-репо проекта (`/home/z/my-project`) — локальный снимок для диффов, защита прогресса = только GitHub-пуш.

## 5. Решения и уроки (§-правила проекта)

- **§5.1 Графика/эволюция**: порядок оттенков фишек одинаков во всех 10 эрах (Okabe-Ito якоря: красный #c74134, жёлтый #f6e04b, зелёный #2ea56d, синий #3d9be0, фиолетовый #b06fc9, оранжевый #ef8f2a). Эры эволюционируют насыщенностью/светлотой/кантами/эффектами. Новый контент обязан сохранять форму-кодирование (`shapes.ts` — силуэт определяется цветом, скины меняют только внутреннюю графику).
- **§5.2 Доступность**: минимальный стандарт — любой новый элемент поля различим БЕЗ опоры на цвет (форма/символ/кант/движение). Камни ≠ фишки: восьмиугольник + пипсы HP. Спец-маркер всегда белый на тёмном диске.
- **§5.3 Юридическая чистота**: оригинальные названия («Цветущий мир»/Blooming World, спец-фишки самоименованные), графика CSS-оригинальная, из жанра берутся только неохраняемые механики. Никаких ассетов/имён/выражений из Candy Crush/Royal Match и прочих игр.
- **§5.4 Сейвы**: ключ persist `blooming-world-save-v1` не менять; структурные изменения стора — только аддитивные (поля с дефолтами), версию persist поднимать при несовместимых изменениях. Формат standalone-файла совместим: `{state: {...}, version: 0}`.
- **§5.5 Архитектура**: движок (`engine.ts`, `levels.ts`) — чистый TS без DOM: подготовка к будущему порту на React Native. UI-слой — единственное место, где живут CSS/анимации. Изменения движка зеркалим в `scripts/standalone/parts/engine.js` (двойное сопровождение: Next-версия + standalone-файл).
- **§5.6 Без Cloudflare** (решение игрока от 07.11): хостинг игры — только GitHub Pages (включение — 3 клика игроком, §2 «Следующий шаг»); сохранение прогресса разработки — только GitHub-пуш по §4.
- **§5.7 Проверка перед закрытием Task**: `bun run lint` + `bunx tsc --noEmit` (игнор examples/ и skills/ — шаблонные) + при правках движка — `bun scripts/test-engine.ts` и `node scripts/standalone/run-tests.js` + браузерный смок ключевых сценариев.

## 6. Техстек и запуск

- Next.js ^16.1.1 + TypeScript + Tailwind + Zustand (persist localStorage) + WebAudio. Имя пакета в package.json — шаблонное (`nextjs_tailwind_shadcn_ts`, версия 0.2.1) — на работу не влияет.
- Запуск dev: `bun run dev` (порт 3000). Линт: `bun run lint`. Типы: `bunx tsc --noEmit`. Симуляция движка: `bun scripts/test-engine.ts`; standalone-движок: `node scripts/standalone/run-tests.js`; сборка standalone-файла: `python3 scripts/standalone/build.py`.
- В браузере: карта → уровень; язык RU/EN переключается в профиле. Standalone-игра: `blooming-world-repo/index.html` (или `download/blooming-world/index.html`) — двойной клик, без сборки.

## 7. Зафиксировано (HEAD собственного git-репо проекта)

- Волна 1 (08.11) — графика нового поколения: 10 AI-фонов эр + сок + премиум-фишки; standalone в корне репо обновлён (push blooming-world-repo), зеркало синкнуто (sync-github.sh)
- Task 3 (завершение, 08.11) — коммит «blooming-world: Task 3 завершён — зеркало на GitHub + гигиена линта» (sync-github.sh: fetch+extraheader; sync-exclude: +blooming-world-repo/.zscripts; eslint ignores: +.github-sync; scripts/standalone: lint-фиксы; worklog/STATE обновлены)
- Task 3 (07.11) — коммит «blooming-world: Task 3 — STATE.md/worklog.md/ROADMAP.md + sync-github.sh (пуш после выдачи токена игроком)»
- GitHub Kaistramador/blooming-world: 9f3c4a7 (standalone в корне) → 2d6fb08 (зеркало blooming-world/) → далее синк в конце каждой сессии
- Task 2 — коммит «a11y: форма-кодирование + Okabe-Ito + канты + камни-восьмиугольники»
- Task 1 — коммиты MVP (см. `git log --oneline`)
