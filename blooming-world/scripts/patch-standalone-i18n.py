#!/usr/bin/env python3
# ============================================================
# Волна 7 — синхронизация i18n/каталогов/генератора уровней в
# зеркала standalone (data.js / app-core.js) из TS-источников.
# Гарантирует паритет переводов RU/EN/ES/PT и кривой сложности.
# Запуск: python3 scripts/patch-standalone-i18n.py
# ============================================================
import re
import sys
from pathlib import Path

ROOT = Path('/home/z/my-project')
DATA = ROOT / 'scripts/standalone/parts/data.js'
CORE = ROOT / 'scripts/standalone/parts/app-core.js'
I18N = ROOT / 'src/lib/i18n.ts'
SHOP = ROOT / 'src/lib/game/shop.ts'
GARDEN = ROOT / 'src/lib/game/garden.ts'
THEMES = ROOT / 'src/lib/game/themes.ts'

errors = []


def die(msg):
    errors.append(msg)


def esc_js(s: str) -> str:
    return s.replace('\\', '\\\\').replace("'", "\\'")


def js_obj(d: dict) -> str:
    inner = ', '.join(f"{k}: '{esc_js(v)}'" for k, v in d.items())
    return '{ ' + inner + ' }'


# ---------- 1. парс i18n.ts ----------
def parse_i18n():
    src = I18N.read_text(encoding='utf-8')
    dicts = {}
    for name in ['RU', 'EN', 'ES', 'PT']:
        m = re.search(rf'const {name}: Dict = \{{(.*?)\n\}};', src, re.S)
        if not m:
            die(f'i18n: блок {name} не найден')
            continue
        body = m.group(1)
        pairs = dict(re.findall(r"'([a-zA-Z0-9._]+)':\s*'((?:[^'\\]|\\.)*)'", body))
        if not pairs:
            die(f'i18n: {name} пуст')
        dicts[name.lower()] = pairs
    return dicts


# ---------- 2. парс каталогов (id → localized name[/desc]) ----------
def parse_named_catalog(path: Path):
    src = path.read_text(encoding='utf-8')
    names = {}
    descs = {}
    # tempered-паттерн: id → (не пересекая другой id) → name → (опц.) desc;
    # поддержка однострочных И многострочных записей каталога
    item_pat = re.compile(
        r"id:\s*'(?P<id>[^']+)',"
        r"(?:(?!id:)[\s\S]){0,250}?name:\s*(?P<name>\{[^}]*\})"
        r"(?:(?:(?:(?!id:)[\s\S]){0,250}?)desc:\s*(?P<desc>\{[^}]*\}))?"
    )
    for m in item_pat.finditer(src):
        iid, name_src, desc_src = m.group('id'), m.group('name'), m.group('desc')

        def quad(s):
            if not s:
                return None
            mm = re.match(r"\{\s*ru:\s*'((?:[^'\\]|\\.)*)',\s*en:\s*'((?:[^'\\]|\\.)*)',\s*es:\s*'((?:[^'\\]|\\.)*)',\s*pt:\s*'((?:[^'\\]|\\.)*)'\s*\}", s)
            return {'ru': mm.group(1), 'en': mm.group(2), 'es': mm.group(3), 'pt': mm.group(4)} if mm else None

        nq = quad(name_src)
        if not nq:
            continue  # элементы без name (аватары) или не 4-язычные — мимо
        names[iid] = nq
        dq = quad(desc_src)
        if desc_src and not dq:
            die(f'{path.name}: desc {iid} не 4-язычный')
        if dq:
            descs[iid] = dq
    return names, descs


def parse_chapters():
    src = THEMES.read_text(encoding='utf-8')
    out = {}
    for m in re.finditer(r"id:\s*(\d+),\s*\n\s*name:\s*(\{[^}]*\}),\s*\n\s*tagline:\s*(\{[^}]*\})", src):
        cid = int(m.group(1))

        def quad(s):
            mm = re.match(r"\{\s*ru:\s*'((?:[^'\\]|\\.)*)',\s*en:\s*'((?:[^'\\]|\\.)*)',\s*es:\s*'((?:[^'\\]|\\.)*)',\s*pt:\s*'((?:[^'\\]|\\.)*)'\s*\}", s)
            return {'ru': mm.group(1), 'en': mm.group(2), 'es': mm.group(3), 'pt': mm.group(4)} if mm else None

        nq, tq = quad(m.group(2)), quad(m.group(3))
        if not nq or not tq:
            die(f'themes: глава {cid} не 4-язычная')
        out[cid] = (nq, tq)
    return out


def patch_by_id(text: str, iid: str, name_obj: str, desc_obj: str | None, where: str):
    pat = re.compile(r"(id:\s*'" + re.escape(iid) + r"',[^{\n]*?name:\s*)\{[^}]*\}")
    new_text, n = pat.subn(lambda m: m.group(1) + name_obj, text)
    if n == 0:
        die(f'{where}: не найдена строка id: {iid}')
        return text
    if desc_obj:
        pat2 = re.compile(r"(id:\s*'" + re.escape(iid) + r"',\s*icon:\s*'[^']*',\s*price:\s*\d+,\s*name:\s*\{[^}]*\},\s*desc:\s*)\{[^}]*\}")
        new_text, n2 = pat2.subn(lambda m: m.group(1) + desc_obj, new_text)
        if n2 == 0:
            die(f'{where}: не найден desc для {iid}')
    return new_text


def main():
    dicts = parse_i18n()
    shop_names, shop_descs = parse_named_catalog(SHOP)
    garden_names, _ = parse_named_catalog(GARDEN)
    chapters = parse_chapters()
    if len(shop_names) < 50:
        die(f'shop: распознано только {len(shop_names)} имён')
    if len(garden_names) != 34:
        die(f'garden: распознано {len(garden_names)} из 34')
    if len(chapters) != 10:
        die(f'themes: распознано {len(chapters)} глав из 10')
    if errors:
        print('ОШИБКИ ПАРСИНГА:'); [print(' -', e) for e in errors]; sys.exit(1)

    # ---------- data.js ----------
    text = DATA.read_text(encoding='utf-8')

    # 1) словари целиком (паритет с i18n.ts): ru/en — замена, es/pt — вставка перед DICTS
    for lang in ['ru', 'en', 'es', 'pt']:
        block = f"const I18N_{lang.upper()} = {{\n" + ",\n".join(
            f"  '{k}': '{esc_js(v)}'" for k, v in dicts[lang].items()
        ) + "\n};"
        pat = re.compile(r"const I18N_" + lang.upper() + r" = \{.*?\n\};", re.S)
        text, n = pat.subn(lambda _: block, text, count=1)
        if n != 1:
            marker = 'const DICTS = '
            idx = text.find(marker)
            if idx == -1:
                die(f'data.js: маркер DICTS не найден для вставки {lang}')
            else:
                text = text[:idx] + block + '\n' + text[idx:]
                print(f'  вставлен словарь {lang} ({len(dicts[lang])} ключей)')
    text = text.replace(
        'const DICTS = { ru: I18N_RU, en: I18N_EN };',
        'const DICTS = { ru: I18N_RU, en: I18N_EN, es: I18N_ES, pt: I18N_PT };',
    )

    # 2) главы (id 0..9: name + tagline)
    for cid, (nq, tq) in chapters.items():
        pat = re.compile(r"(id:\s*" + str(cid) + r",\s*name:\s*)\{[^}]*\}(,\s*tagline:\s*)\{[^}]*\}")
        text, n = pat.subn(lambda m: m.group(1) + js_obj(nq) + m.group(2) + js_obj(tq), text, count=1)
        if n != 1:
            die(f'data.js: глава {cid} не заменена')

    # 3) каталог магазина + сад (name, у бустеров и desc)
    for iid, nq in shop_names.items():
        text = patch_by_id(text, iid, js_obj(nq), js_obj(shop_descs[iid]) if iid in shop_descs else None, 'data.js shop')
    for iid, nq in garden_names.items():
        text = patch_by_id(text, iid, js_obj(nq), None, 'data.js garden')

    # 4) генератор уровней: 100 → 10000 + плато сложности
    text = text.replace(
        "/* ---------------- level generator (100 levels / 10 chapters) ---------------- */\nconst TOTAL_LEVELS = 100;",
        "/* ---------------- level generator (10 000 levels / 1 000 chapters) ----------------\n"
        " * Волна 7: главы 0–9 — исходная кривая (d = chapter), далее плато d = 9\n"
        " * (сложность финальной эры, без инфляции). Калибровка: scripts/audit-scale.ts. */\n"
        "const TOTAL_LEVELS = 10000;",
    )
    text = text.replace(
        "const TOTAL_CHAPTERS = TOTAL_LEVELS / CHAPTER_SIZE;",
        "const TOTAL_CHAPTERS = TOTAL_LEVELS / CHAPTER_SIZE;\n"
        "function goalDepthOf(chapter) { return Math.min(9, chapter); }",
    )
    # идемпотентность: убрать дубли, оставив одно объявление
    while text.count('function goalDepthOf(chapter) { return Math.min(9, chapter); }') > 1:
        text = text.replace(
            'function goalDepthOf(chapter) { return Math.min(9, chapter); }\nfunction goalDepthOf(chapter) { return Math.min(9, chapter); }',
            'function goalDepthOf(chapter) { return Math.min(9, chapter); }',
        )
    text = text.replace(
        "  const items = isItemLevel ? 2 + Math.floor(chapter / 2) : 0;",
        "  const items = isItemLevel ? Math.min(8, 2 + Math.floor(chapter / 2)) : 0;",
    )
    text = text.replace(
        "  const targetScore = Math.round(moves * (isBoss ? 30 + chapter * 2 : 42 + chapter * 3));",
        "  const depth = goalDepthOf(chapter);\n"
        "  const targetScore = Math.round(moves * (isBoss ? 30 + depth * 2 : 42 + depth * 3));",
    )
    text = text.replace(
        "  const colorCount = Math.max(8, Math.round(moves * (0.5 + chapter * 0.03)));",
        "  const colorCount = Math.max(8, Math.round(moves * (0.5 + depth * 0.03)));",
    )

    # 5) chapterTheme → цикл эр + chapterDisplayName (Волна 7)
    text = text.replace(
        "function chapterTheme(chapter) {\n  return CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, chapter))];\n}",
        "/* Волна 7: главы дальше 10-й циклят 10 эр (§5.1 — порядок оттенков не меняется);\n"
        " * к имени цикла добавляется римский номер («Роща II»). */\n"
        "function eraOfChapter(chapter) {\n"
        "  return ((Math.floor(chapter) % CHAPTERS.length) + CHAPTERS.length) % CHAPTERS.length;\n"
        "}\n"
        "function cycleOfChapter(chapter) { return Math.floor(Math.floor(chapter) / CHAPTERS.length); }\n"
        "function chapterTheme(chapter) { return CHAPTERS[eraOfChapter(chapter)]; }\n"
        "const ROMAN = [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];\n"
        "function romanNumeral(n) {\n"
        "  let v = Math.max(1, Math.floor(n));\n"
        "  let out = '';\n"
        "  for (const p of ROMAN) { while (v >= p[0]) { out += p[1]; v -= p[0]; } }\n"
        "  return out;\n"
        "}\n"
        "function chapterDisplayName(chapter, lang) {\n"
        "  const era = CHAPTERS[eraOfChapter(chapter)];\n"
        "  const cycle = cycleOfChapter(chapter);\n"
        "  const base = era.name[lang];\n"
        "  return cycle > 0 ? base + ' ' + romanNumeral(cycle + 1) : base;\n"
        "}",
    )
    DATA.write_text(text, encoding='utf-8')

    # ---------- app-core.js ----------
    core = CORE.read_text(encoding='utf-8')

    # 6) ивенты/сезоны/сундуки → 4 языка
    core = core.replace(
        "coins: { id: 'coins', icon: '🪙', name: { ru: 'Золотые выходные', en: 'Golden Weekend' }, desc: { ru: 'Все победы приносят ×2 монет — только сегодня!', en: 'All wins grant ×2 coins — today only!' } },",
        "coins: { id: 'coins', icon: '🪙', name: { ru: 'Золотые выходные', en: 'Golden Weekend', es: 'Fin de semana dorado', pt: 'Fim de semana dourado' }, desc: { ru: 'Все победы приносят ×2 монет — только сегодня!', en: 'All wins grant ×2 coins — today only!', es: 'Todas las victorias dan ×2 monedas — ¡solo hoy!', pt: 'Todas as vitórias dão ×2 moedas — só hoje!' } },",
    )
    core = core.replace(
        "cascade: { id: 'cascade', icon: '🌊', name: { ru: 'Каскадный уикенд', en: 'Cascade Weekend' }, desc: { ru: 'Каскады 3+ приносят бонусные монеты к награде!', en: 'Cascades of 3+ grant bonus coins on top of the reward!' } },",
        "cascade: { id: 'cascade', icon: '🌊', name: { ru: 'Каскадный уикенд', en: 'Cascade Weekend', es: 'Fin de semana de cascadas', pt: 'Fim de semana de cascatas' }, desc: { ru: 'Каскады 3+ приносят бонусные монеты к награде!', en: 'Cascades of 3+ grant bonus coins on top of the reward!', es: '¡Las cascadas de 3+ dan monedas extra de recompensa!', pt: 'Cascatas de 3+ dão moedas extras de recompensa!' } },",
    )
    for ru, en, es, pt in [
        ('Осень', 'Autumn', 'Otoño', 'Outono'),
        ('Зима', 'Winter', 'Invierno', 'Inverno'),
        ('Весна', 'Spring', 'Primavera', 'Primavera'),
        ('Лето', 'Summer', 'Verano', 'Verão'),
    ]:
        core = core.replace(
            f"name: {{ ru: '{ru}', en: '{en}' }} }}",
            f"name: {{ ru: '{ru}', en: '{en}', es: '{es}', pt: '{pt}' }} }}",
        )
    # сундуки — точные строки
    core = core.replace(
        "{ need: 5000, reward: 150, icon: '📦', name: { ru: 'Деревянный', en: 'Wooden' } },",
        "{ need: 5000, reward: 150, icon: '📦', name: { ru: 'Деревянный', en: 'Wooden', es: 'De madera', pt: 'De madeira' } },",
    )
    core = core.replace(
        "{ need: 15000, reward: 300, icon: '🎁', name: { ru: 'Серебряный', en: 'Silver' } },",
        "{ need: 15000, reward: 300, icon: '🎁', name: { ru: 'Серебряный', en: 'Silver', es: 'De plata', pt: 'De prata' } },",
    )
    core = core.replace(
        "{ need: 35000, reward: 600, icon: '🏆', name: { ru: 'Золотой', en: 'Golden' } },",
        "{ need: 35000, reward: 600, icon: '🏆', name: { ru: 'Золотой', en: 'Golden', es: 'Dorado', pt: 'Dourado' } },",
    )
    core = core.replace(
        "{ need: 70000, reward: 1200, icon: '💎', name: { ru: 'Бриллиантовый', en: 'Diamond' } },",
        "{ need: 70000, reward: 1200, icon: '💎', name: { ru: 'Бриллиантовый', en: 'Diamond', es: 'De diamante', pt: 'De diamante' } },",
    )

    # 7) валидация языка сейва (ru/en/es/pt)
    core = core.replace(
        "  out.lang = out.lang === 'en' ? 'en' : 'ru';",
        "  /* Волна 7: 4 языка (ru/en/es/pt), иное — дефолт ru */\n"
        "  out.lang = (out.lang === 'ru' || out.lang === 'en' || out.lang === 'es' || out.lang === 'pt') ? out.lang : 'ru';",
    )

    # 8) A/B зеркало + global props аналитики (перед секцией аналитики)
    ab_block = (
        "/* ---------------- Волна 7: A/B первых сессий (зеркало ab.ts) ----------------\n"
        " * Вариант детерминирован по playerId (FNV-1a → 50/50), ключ ≠ сейв (§5.4).\n"
        " * B «быстрый старт»: первая сессия открывается уровнем 1, коуч на ур. 1–3.\n"
        " * ============================================================ */\n"
        "const AB_KEY = 'blooming-world-ab-v1';\n"
        "const AB_COACH_MAX_LEVEL = 3;\n"
        "let abCached = null;\n"
        "let abStarted = false;\n"
        "let analyticsGlobalProps = {};\n"
        "function setAnalyticsGlobals(props) { analyticsGlobalProps = Object.assign({}, analyticsGlobalProps, props || {}); }\n"
        "function analyticsGlobals() { return Object.assign({}, analyticsGlobalProps); }\n"
        "function abFnv1a(s) {\n"
        "  let h = 2166136261 >>> 0;\n"
        "  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }\n"
        "  return h >>> 0;\n"
        "}\n"
        "function abPlayerId() {\n"
        "  try {\n"
        "    let id = localStorage.getItem('blooming-world-player-id');\n"
        "    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {\n"
        "      id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g, '') : ('p' + Date.now().toString(36) + Math.floor(Math.random() * 1e12).toString(36));\n"
        "      localStorage.setItem('blooming-world-player-id', id);\n"
        "    }\n"
        "    return id;\n"
        "  } catch (e) { return ''; }\n"
        "}\n"
        "function abReadBlob() {\n"
        "  try {\n"
        "    const raw = localStorage.getItem(AB_KEY);\n"
        "    if (!raw) return null;\n"
        "    const p = JSON.parse(raw);\n"
        "    if (!p || (p.v !== 'A' && p.v !== 'B') || typeof p.sessions !== 'number') return null;\n"
        "    return p;\n"
        "  } catch (e) { return null; }\n"
        "}\n"
        "function abWriteBlob(blob) {\n"
        "  abCached = blob;\n"
        "  try { localStorage.setItem(AB_KEY, JSON.stringify(blob)); } catch (e) { /* только память */ }\n"
        "}\n"
        "function abVariantForId(pid) { return abFnv1a(pid) % 2 === 1 ? 'B' : 'A'; }\n"
        "function abVariant() {\n"
        "  if (abCached) return abCached.v;\n"
        "  const stored = abReadBlob();\n"
        "  if (stored) { abCached = stored; return stored.v; }\n"
        "  const pid = abPlayerId();\n"
        "  const variant = abVariantForId(pid || 'fallback-id');\n"
        "  abWriteBlob({ v: variant, sessions: 0 });\n"
        "  return variant;\n"
        "}\n"
        "function abSessionStart() {\n"
        "  const variant = abVariant();\n"
        "  if (abStarted) return { variant: variant, first: abCached ? abCached.sessions === 1 : false };\n"
        "  abStarted = true;\n"
        "  const blob = abReadBlob() || { v: variant, sessions: 0 };\n"
        "  const first = blob.sessions === 0;\n"
        "  abWriteBlob({ v: blob.v, sessions: blob.sessions + 1 });\n"
        "  setAnalyticsGlobals({ ab: variant, fs: first ? 1 : 0 });\n"
        "  return { variant: variant, first: first };\n"
        "}\n"
        "function abFirstSession() {\n"
        "  const blob = abReadBlob();\n"
        "  if (blob) return blob.sessions <= 1;\n"
        "  return abCached ? abCached.sessions <= 1 : false;\n"
        "}\n"
        "function abShouldStartInGame(variant, firstSession) { return variant === 'B' && !!firstSession; }\n"
        "function abCoachActive(variant, level) { return variant === 'B' && level <= AB_COACH_MAX_LEVEL; }\n"
        "\n"
        "/* ---------------- лёгкая аналитика (Волна 2) ----------------"
    )
    if "function abSessionStart" not in core:
        core = core.replace(
            "/* ---------------- лёгкая аналитика (Волна 2) ----------------",
            ab_block,
            1,
        )
    core = core.replace(
        "    const ev = Object.assign({ t: new Date().toISOString(), e: e }, props || {});",
        "    /* Волна 7: каждое событие тегировано ab/fs (A/B воронка) */\n"
        "    const ev = Object.assign({ t: new Date().toISOString(), e: e }, analyticsGlobalProps, props || {});",
    )
    CORE.write_text(core, encoding='utf-8')

    if errors:
        print('ОШИБКИ ПАТЧА:'); [print(' -', e) for e in errors]; sys.exit(1)
    print('OK: data.js + app-core.js синхронизированы (i18n ×4, каталоги, главы, генератор, A/B)')


if __name__ == '__main__':
    main()
