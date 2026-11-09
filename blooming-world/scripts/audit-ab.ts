/* ============================================================
 * Волна 7 «Масштаб и рост» — аудит A/B воронки первых сессий.
 *
 * Проверки:
 *  1. Распределение вариантов детерминировано и сбалансировано
 *     (FNV-1a от playerId → 50/50 ±5 п.п. на 2000 синтетических id).
 *  2. Семантика сессий: первая сессия → fs=1, вторая → fs=0;
 *     вариант персистентен между «перезагрузками» (localStorage).
 *  3. Каждое событие аналитики тегировано ab/fs; конкретные props
 *     перекрывают глобальные теги.
 *  4. Логика воронки: B+первая сессия → старт в геймплее;
 *     коуч только в B на уровнях 1..3.
 *  5. i18n: ключи коуча есть во всех 4 языках.
 *
 * Запуск: bun scripts/audit-ab.ts
 * ============================================================ */

/* ---- mock localStorage ДО импортов модулей, читающих window ---- */
const store = new Map<string, string>();
const storage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => store.set(k, String(v)),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
};
(globalThis as Record<string, unknown>).window = {
  localStorage: storage,
  isSecureContext: true,
  crypto: globalThis.crypto,
};
(globalThis as Record<string, unknown>).localStorage = storage;

import { abVariantForId, abVariant, abSessionStart, abFirstSession, abShouldStartInGame, abCoachActive, __abResetForTests, AB_KEY_NAME } from '../src/lib/game/ab';
import { logEvent, getEvents, analyticsGlobals, analyticsSummary, clearEvents } from '../src/lib/game/analytics';
import { DICTS } from '../src/lib/i18n';

const checks: [string, boolean][] = [];
const check = (name: string, pass: boolean) => checks.push([name, pass]);

/* ---------------- 1. баланс и детерминизм ---------------- */
let bCount = 0;
const N = 2000;
const seen = new Map<string, 'A' | 'B'>();
for (let i = 0; i < N; i++) {
  const id = `test-player-${String(i).padStart(5, '0')}`;
  const v = abVariantForId(id);
  if (v === 'B') bCount++;
  if (seen.has(id)) check(`детерминизм ${id}`, seen.get(id) === v);
  seen.set(id, v);
}
const bShare = bCount / N;
check(`баланс вариантов: доля B ${(bShare * 100).toFixed(1)}% в [45%; 55%]`, bShare >= 0.45 && bShare <= 0.55);
check('оба варианта встречаются', bCount > 0 && bCount < N);

/* ---------------- 2. семантика сессий ---------------- */
store.clear();
__abResetForTests();
storage.setItem('blooming-world-player-id', 'audit-player-12345678');
const expected = abVariantForId('audit-player-12345678');
const v1 = abVariant();
check(`вариант = FNV(playerId) (${expected})`, v1 === expected);
check('вариант персистентен в blob', abVariant() === v1);
__abResetForTests();
const v2 = abVariant(); // имитация перезагрузки: blob из localStorage
check('вариант стабилен между «перезагрузками»', v2 === v1);

const first1 = abSessionStart();
check(`первая сессия: fs=${first1.first ? 1 : 0}`, first1.first === true);
check('вариант сессии = назначенному', first1.variant === v1);
check('abFirstSession() = true в первой сессии', abFirstSession() === true);

/* «перезагрузка» → вторая сессия */
__abResetForTests();
const second = abSessionStart();
check(`вторая сессия: fs=${second.first ? 1 : 0}`, second.first === false);
check('abFirstSession() = false во второй сессии', abFirstSession() === false);
check('вариант не меняется между сессиями', second.variant === v1);

/* ---------------- 3. теги в аналитике ---------------- */
clearEvents();
analyticsGlobals(); // прогрев
logEvent('fs_screen', { screen: 'map' });
logEvent('level_start', { level: 1 });
logEvent('level_win', { level: 1, fs: 5 }); // перекрытие глобального fs конкретным props
const events = getEvents();
if (process.env.AB_DEBUG) {
  console.log('DEBUG globals:', analyticsGlobals());
  console.log('DEBUG events:', JSON.stringify(events));
}
check(`все события тегированы ab (${events[0]?.ab})`, events.length > 0 && events.every((e) => e.ab === 'A' || e.ab === 'B'));
check('fs в событиях: 0 во второй сессии (без перекрытий)', events.slice(0, 2).every((e) => e.fs === 0));
check('конкретные props перекрывают глобальные (fs=5)', events[2]?.fs === 5);
const summ = analyticsSummary();
check(`сводка: ${summ.total} событий, стартов ${summ.starts}`, summ.total === 3 && summ.starts === 1);

/* ---------------- 4. логика воронки ---------------- */
check('B+первая → старт в геймплее', abShouldStartInGame('B', true) === true);
check('B+повторная → карта', abShouldStartInGame('B', false) === false);
check('A+первая → карта (контроль)', abShouldStartInGame('A', true) === false);
check('коуч B ур.1', abCoachActive('B', 1) === true);
check('коуч B ур.3', abCoachActive('B', 3) === true);
check('коуч B ур.4 отсутствует', abCoachActive('B', 4) === false);
check('коуч A отсутствует', abCoachActive('A', 1) === false);
check('коуч у босса (ур.10) отсутствует', abCoachActive('B', 10) === false);

/* ---------------- 5. i18n коуча ---------------- */
const langs = ['ru', 'en', 'es', 'pt'] as const;
for (const l of langs) {
  check(`tut.tap/${l}`, (DICTS[l]['tut.tap'] ?? '').length > 5);
  check(`tut.swap/${l}`, (DICTS[l]['tut.swap'] ?? '').length > 5);
}
const ruKeys = Object.keys(DICTS.ru).length;
check(`словари синхронны (${ruKeys} ключей)`, langs.every((l) => Object.keys(DICTS[l]).length === ruKeys));

/* ---------------- вердикт ---------------- */
console.log('=== Волна 7: аудит A/B воронки первых сессий ===');
let ok = true;
for (const [name, pass] of checks) {
  console.log(`${pass ? '✅' : '❌'} ${name}`);
  if (!pass) ok = false;
}
console.log(ok ? `\nALL CHECKS PASSED (${checks.length})` : `\nCHECKS FAILED (${checks.filter(([, p]) => !p).length}/${checks.length})`);
process.exit(ok ? 0 : 1);
