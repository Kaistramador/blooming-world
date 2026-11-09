/* ============================================================
 * Волна 6: аудит командного сундука (Team Chest).
 *
 * Проверки:
 *   1. ISO-неделя: ключ 'YYYY-Www', неделя стартует в ПОНЕДЕЛЬНИК,
 *      понедельник 00:00 = новый горшок; известные даты (2026-W01).
 *   2. Детерминизм: одна неделя → один и тот же вклад ботов
 *      (день/неделя фиксированы); разные недели — разные горшки.
 *   3. Монотонность: горшок растёт по дням недели (0..6), полный
 *      недельный вклад ботов в разумном диапазоне (12k..30k).
 *   4. Математика сундуков: пороги/награды/забор (reached,
 *      rewardBetween), забор не платит за уже взятые сундуки.
 *   5. Баланс: бот-команда к вс дотягивает до сундука 1–2;
 *      активный игрок (+25k) — до 3-го; очень активный (+50k) — до 4-го.
 *   6. Зеркало standalone: team-секция app-core.js даёт те же
 *      значения (функциональная проверка вырезанного блока).
 *
 * Запуск: bun scripts/audit-team.ts
 * ============================================================ */

import { readFileSync } from 'node:fs';
import {
  weekKeyOf,
  dayIndexOf,
  teamBots,
  teamBotPotFor,
  teamSnapshot,
  chestReachedFor,
  chestRewardBetween,
  TEAM_CHESTS,
  TEAM_BOTS,
} from '../src/lib/game/team';

let fails = 0;
function check(cond: boolean, msg: string) {
  if (cond) {
    console.log('ok:', msg);
  } else {
    console.error('FAIL:', msg);
    fails++;
  }
}

/* ---------- 1. ISO-неделя (эталон — Python isocalendar) ---------- */
check(weekKeyOf(new Date(2026, 0, 1)) === '2026-W01', 'ISO: 2026-01-01 (Чт) → 2026-W01');
check(weekKeyOf(new Date(2026, 0, 4)) === '2026-W01', 'ISO: 2026-01-04 (Вс) → 2026-W01');
check(weekKeyOf(new Date(2026, 0, 5)) === '2026-W02', 'ISO: 2026-01-05 (Пн) → 2026-W02 — новая неделя в понедельник');
check(weekKeyOf(new Date(2026, 0, 11)) === '2026-W02', 'ISO: 2026-01-11 (Вс) → 2026-W02');
check(weekKeyOf(new Date(2026, 0, 12)) === '2026-W03', 'ISO: 2026-01-12 (Пн) → 2026-W03');
check(weekKeyOf(new Date(2027, 0, 1)) === '2026-W53', 'ISO: 2027-01-01 → 2026-W53 (длинный год — четверг решает)');
check(dayIndexOf(new Date(2026, 0, 12)) === 0, 'dayIdx: понедельник → 0');
check(dayIndexOf(new Date(2026, 0, 17)) === 5, 'dayIdx: суббота → 5');
check(dayIndexOf(new Date(2026, 0, 18)) === 6, 'dayIdx: воскресенье → 6');

/* ---------- 2. Детерминизм ---------- */
const wk = weekKeyOf(new Date(2026, 10, 9)); // воскресенье 09.11.2026 → 2026-W46
check(wk === '2026-W46', 'ISO: 2026-11-09 (Вс) → 2026-W46');
const potA = teamBotPotFor(wk, 6);
const potB = teamBotPotFor(wk, 6);
check(potA === potB, `детерминизм: pot(вс)=${potA} стабилен`);
check(teamBots(wk).length === TEAM_BOTS, `ботов в команде: ${TEAM_BOTS}`);
const wk2 = weekKeyOf(new Date(2026, 10, 2)); // понедельник предыдущей недели → 2026-W45
check(teamBotPotFor(wk, 6) !== teamBotPotFor(wk2, 6), 'разные недели → разные горшки');
const sameWeekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((_, d) => teamBotPotFor(wk, d));
let monotonic = true;
for (let d = 1; d < 7; d++) if (sameWeekDays[d] < sameWeekDays[d - 1]) monotonic = false;
check(monotonic, `горшок монотонно растёт по дням (${sameWeekDays.join(' → ')})`);

/* ---------- 3. Разумный недельный вклад ботов ---------- */
check(teamBots(wk).every((b) => b.perDay.reduce((a, v) => a + v, 0) === b.total), 'perDay бота сходится в total');
const botTotal = teamSnapshot(wk, 6, 0).botTotal;
check(botTotal >= 12000 && botTotal <= 30000, `полный вклад ботов за неделю в диапазоне 12k..30k: ${botTotal}`);
check(teamSnapshot(wk, 6, 0).botPot === botTotal, 'горшок в воскресенье = полному вкладу ботов');

/* ---------- 4. Математика сундуков ---------- */
check(TEAM_CHESTS.length === 4, '4 сундука');
check(TEAM_CHESTS.every((c, i) => i === 0 || c.need > TEAM_CHESTS[i - 1].need), 'пороги возрастают');
check(chestReachedFor(0) === 0, 'pot=0 → 0 сундуков');
check(chestReachedFor(TEAM_CHESTS[0].need - 1) === 0, 'pot чуть ниже порога → 0');
check(chestReachedFor(TEAM_CHESTS[2].need) === 3, `pot=${TEAM_CHESTS[2].need} → 3 сундука`);
check(chestReachedFor(TEAM_CHESTS[3].need + 999999) === 4, 'pot > последнего порога → 4');
check(chestRewardBetween(0, 2) === TEAM_CHESTS[0].reward + TEAM_CHESTS[1].reward, 'rewardBetween(0,2) = сумма первых двух');
check(chestRewardBetween(2, 2) === 0, 'rewardBetween(x,x) = 0 — повторный забор не платит');
check(chestRewardBetween(0, 4) === TEAM_CHESTS.reduce((a, c) => a + c.reward, 0), 'полный забор = сумме всех наград');

/* ---------- 5. Баланс (достижимость сундуков) ---------- */
const snapBots = teamSnapshot(wk, 6, 0);
check(snapBots.reached >= 1 && snapBots.reached <= 2, `боты-команда к вс: сундук ${snapBots.reached} (1–2)`);
const active = teamSnapshot(wk, 6, 25000); // активный: ~15 побед × ~1700 очков
check(active.reached >= 3, `активный игрок (+25k): сундук ${active.reached} (≥3)`);
const hardcore = teamSnapshot(wk, 6, 50000); // очень активный
check(hardcore.reached === 4, `очень активный (+50k): сундук ${hardcore.reached} (4)`);
const newbie = teamSnapshot(wk, 3, 2500); // новичок: 3-4 победы к четвергу
check(newbie.reached >= 1, `новичок (+2.5k к чт): сундук ${newbie.reached} (≥1)`);
// перекат недели: в новой неделе вклад игрока обнуляется на стороне стора;
// тут проверяем чистую семантику снапшота: contributed учитывается только传入
const rolloverCheck = teamSnapshot(wk2, 0, 0).pot;
check(rolloverCheck >= 0 && rolloverCheck <= teamSnapshot(wk2, 6, 0).pot, 'перекат: новая неделя начинает с вклада только ботов');

/* ---------- 6. Зеркало standalone (app-core.js) ---------- */
try {
  const core = readFileSync(new URL('../scripts/standalone/parts/app-core.js', import.meta.url), 'utf8');
  const start = core.indexOf('function dateKeyOf');
  const end = core.indexOf('function defaultState');
  const block = core.slice(start, end);
  const engineSrc = readFileSync(new URL('../scripts/standalone/parts/engine.js', import.meta.url), 'utf8');
  // чистые функции без DOM — eval безопасен
  const sandbox = new Function(
    engineSrc + '\n' + block + '\n' +
    `return { weekKeyOf, dayIndexOf, teamBotPotFor, teamSnapshot, chestReachedFor, chestRewardBetween, TEAM_CHESTS, teamBots, TEAM_BOTS };`,
  )();
  check(sandbox.weekKeyOf(new Date(2026, 0, 12)) === '2026-W03', 'зеркало: ISO-неделя совпадает');
  check(sandbox.teamBotPotFor(wk, 6) === potA, `зеркало: botPot(вс)=${sandbox.teamBotPotFor(wk, 6)} совпадает`);
  check(sandbox.chestReachedFor(35000) === 3, 'зеркало: пороги совпадают');
  check(sandbox.chestRewardBetween(0, 4) === chestRewardBetween(0, 4), 'зеркало: награды совпадают');
  check(sandbox.TEAM_BOTS === TEAM_BOTS, 'зеркало: число ботов совпадает');
  check(sandbox.teamBots(wk)[0].total === teamBots(wk)[0].total, 'зеркало: расклад ботов идентичен (детерминизм порта)');
} catch (e) {
  check(false, `зеркало standalone: ошибка выполнения блока ${(e as Error).message}`);
}

/* ---------- 7. Паритет движков: node (V8) vs bun (JSC) ---------- */
/* Урок сессии 6: .sort(() => rng()-0.5) в разных движках делает разное число
 * вызовов rng → разные горшки в браузере и в тестах. Теперь расклад обязан
 * совпадать между движками. */
try {
  const { execSync } = await import('node:child_process');
  const nodeOut = execSync(
    `node -e "
const fs = require('fs');
const engine = fs.readFileSync('scripts/standalone/parts/engine.js', 'utf8');
const core = fs.readFileSync('scripts/standalone/parts/app-core.js', 'utf8');
const block = core.slice(core.indexOf('function dateKeyOf'), core.indexOf('function defaultState'));
const api = new Function(engine + '\\n' + block + '\\nreturn { teamBotPotFor, teamBots, teamSnapshot };')();
console.log(JSON.stringify({
  pot6: api.teamBotPotFor('2026-W46', 6),
  pot2: api.teamBotPotFor('2026-W46', 2),
  total: api.teamSnapshot('2026-W46', 6, 0).botTotal,
  first: api.teamBots('2026-W46')[0].total,
}));
"`,
  ).toString().trim();
  const node = JSON.parse(nodeOut);
  const pot6 = teamBotPotFor('2026-W46', 6);
  const pot2 = teamBotPotFor('2026-W46', 2);
  const totalHere = teamSnapshot('2026-W46', 6, 0).botTotal;
  const firstHere = teamBots('2026-W46')[0].total;
  check(node.pot6 === pot6, `паритет движков: botPot(вс) node=${node.pot6} = bun=${pot6}`);
  check(node.pot2 === pot2, `паритет движков: botPot(ср) node=${node.pot2} = bun=${pot2}`);
  check(node.total === totalHere && node.first === firstHere, 'паритет движков: недельный вклад и бот №1 идентичны');
} catch (e) {
  check(false, `паритет движков: ошибка ${(e as Error).message}`);
}

if (fails === 0) {
  console.log('\nALL CHECKS PASSED');
} else {
  console.error(`\n${fails} CHECK(S) FAILED`);
  process.exitCode = 1;
}
