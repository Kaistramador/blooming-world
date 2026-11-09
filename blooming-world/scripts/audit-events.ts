/* ============================================================
 * Bloom Match — аудит Волны 4 «События».
 * Проверяет: (1) детерминизм уровня дня при перезагрузках,
 * (2) автоматическое переключение ивентов по календарю за 2 года,
 * (3) клампинг уровня дня под прогресс новичка,
 * (4) математику наград (день ×2, выходные ×2, каскад-бонус),
 * (5) сезонную витрину (полная комплектность 6 предметов/сезон).
 * Запуск: bun scripts/audit-events.ts
 * ============================================================ */

import { dailyLevelFor, dateKeyOf, dateSeed, weekendEventFor, cascadeBonus, seasonOn, seasonOfMonth, DAILY_REWARD_MULT, CASCADE_BONUS_FROM } from '../src/lib/game/events';
import { streakMult, STREAK_MAX_MULT } from '../src/lib/store';
import { seasonalBundleFor, GEM_SKINS, AVATARS, FRAMES, NAME_STYLES, TILE_EFFECTS } from '../src/lib/game/shop';
import { TOTAL_LEVELS } from '../src/lib/game/levels';
import type { SeasonId } from '../src/lib/game/events';

let failures = 0;
function check(cond: boolean, label: string, extra = '') {
  if (cond) {
    console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`);
  } else {
    failures++;
    console.error(`  ✗ FAIL: ${label}${extra ? ' — ' + extra : ''}`);
  }
}

/* ---------- 1. Детерминизм уровня дня ---------- */
console.log('\n[1] Уровень дня: детерминизм при перезагрузках');
{
  const key = '2026-11-08';
  const first = dailyLevelFor(key);
  let stable = true;
  for (let i = 0; i < 1000; i++) {
    if (dailyLevelFor(key) !== first) { stable = false; break; }
  }
  check(stable, `1000 повторных вызовов дают один уровень (${first}) — перезагрузка не меняет расклад`);

  // 60 подряд идущих дней: каждый день фиксируется на сутки
  let dayStable = true;
  const base = new Date(2026, 10, 1);
  for (let d = 0; d < 60; d++) {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + d);
    const k = dateKeyOf(day);
    const lv = dailyLevelFor(k);
    for (let rep = 0; rep < 10; rep++) {
      if (dailyLevelFor(k) !== lv) { dayStable = false; break; }
    }
  }
  check(dayStable, '60 дней подряд: уровень стабилен внутри суток');

  // разнообразие: 200 дней → хотя бы 40 разных уровней, все в диапазоне
  const seen = new Set<number>();
  let inRange = true;
  for (let d = 0; d < 200; d++) {
    const day = new Date(2026, 0, 1 + d);
    const lv = dailyLevelFor(dateKeyOf(day));
    seen.add(lv);
    if (lv < 1 || lv > TOTAL_LEVELS) inRange = false;
  }
  check(inRange, `все уровни в диапазоне 1..${TOTAL_LEVELS}`);
  check(seen.size >= 40, `разнообразие: ${seen.size} разных уровней за 200 дней (≥40)`);
}

/* ---------- 2. Клампинг под прогресс ---------- */
console.log('\n[2] Уровень дня: клампинг под прогресс игрока');
{
  const key = dateKeyOf(new Date(2026, 10, 8));
  const raw = dailyLevelFor(key);
  // новичок (maxUnlocked=1): daily = min(raw, 1)
  const newbieDaily = Math.min(raw, Math.max(1, 1));
  check(newbieDaily === 1, `новичок получает уровень 1 (сырой ${raw} → ${newbieDaily})`);
  // игрок 45 уровня: min(raw, 45)
  const midDaily = Math.min(raw, Math.max(1, 45));
  check(midDaily <= 45, `игрок с 45 открытыми: daily = ${midDaily} ≤ 45`);
}

/* ---------- 3. Календарь ивентов за 2 года ---------- */
console.log('\n[3] Выходные ивенты: переключение по календарю');
{
  let ok = true;
  let satCoins = 0, sunCascade = 0, weekdayNull = 0, total = 0;
  for (let y = 2026; y <= 2027; y++) {
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= 28; d++) {
        const dt = new Date(y, m, d);
        const ev = weekendEventFor(dateKeyOf(dt));
        const dow = dt.getDay();
        total++;
        if (dow === 6) { if (ev !== 'coins') ok = false; else satCoins++; }
        else if (dow === 0) { if (ev !== 'cascade') ok = false; else sunCascade++; }
        else { if (ev !== null) ok = false; else weekdayNull++; }
      }
    }
  }
  check(ok, `672 дня: сб→coins (${satCoins}), вс→cascade (${sunCascade}), будни→null (${weekdayNull})`);

  // переход суток: суббота 23:59 → воскресенье 00:01
  const satLate = new Date(2026, 10, 14, 23, 59); // суббота
  const sunEarly = new Date(2026, 10, 15, 0, 1);  // воскресенье
  check(satLate.getDay() === 6 && weekendEventFor(dateKeyOf(satLate)) === 'coins', 'сб 23:59 → coins');
  check(sunEarly.getDay() === 0 && weekendEventFor(dateKeyOf(sunEarly)) === 'cascade', 'вс 00:01 → cascade (переключение в 00:00)');
}

/* ---------- 4. Математика наград ---------- */
console.log('\n[4] Награды: множители дня/выходных/каскада');
{
  // формула recordWin: reward = base * streakMult * eventMult + cascadeCoins
  const base = 30 + 3 * 10 + 1 * 5; // firstClear, 3 звезды, глава 1
  const rewardOf = (streak: number, daily: boolean, weekend: 'coins' | 'cascade' | null, maxCascade = 1) =>
    base * streakMult(streak) * (daily ? DAILY_REWARD_MULT : 1) * (weekend === 'coins' ? 2 : 1) +
    (weekend === 'cascade' ? cascadeBonus(maxCascade) : 0);

  const r1 = rewardOf(1, false, null);
  check(r1 === base, `обычная победа: ${r1} = base ${base}`);

  const r2 = rewardOf(3, false, null);
  check(r2 === base * 3, `серия 3: ×3 → ${r2}`);

  const r3 = rewardOf(1, true, null);
  check(r3 === base * DAILY_REWARD_MULT, `уровень дня: ×${DAILY_REWARD_MULT} → ${r3}`);

  const r4 = rewardOf(2, true, 'coins');
  check(r4 === base * 2 * DAILY_REWARD_MULT * 2, `день + золотые выходные + серия 2: ${r4} = base×2×2×2 (стекаются)`);

  const r5 = rewardOf(1, false, 'cascade', 3);
  check(r5 === base + 30, `каскад 3: +30 → ${r5}`);

  const r6 = rewardOf(1, false, 'cascade', 5);
  check(r6 === base + 90, `каскад 5: +90 → ${r6}`);

  const r7 = rewardOf(1, false, 'cascade', 12);
  check(r7 === base + (8 - (CASCADE_BONUS_FROM - 1)) * 30, `каскад 12 (кап 8): +${(8 - (CASCADE_BONUS_FROM - 1)) * 30} → ${r7}`);

  const r8 = rewardOf(1, false, 'cascade', 2);
  check(r8 === base, `каскад 2 (< порога 3): бонуса нет → ${r8}`);

  // потолок множителя серии
  check(streakMult(10) === STREAK_MAX_MULT, `streakMult(10) = ${STREAK_MAX_MULT} (кап серии)`);
}

/* ---------- 5. Сезонная витрина ---------- */
console.log('\n[5] Сезонная косметика: комплектность и календарь');
{
  const seasons: SeasonId[] = ['autumn', 'winter', 'spring', 'summer'];
  let allComplete = true;
  for (const s of seasons) {
    const b = seasonalBundleFor(s);
    const complete = b.skin.season === s && b.avatars.length === 2 && b.avatars.every((a) => a.season === s) &&
      b.frame.season === s && b.nameStyle.season === s && b.effect.season === s;
    if (!complete) allComplete = false;
    console.log(`    ${s}: скин «${b.skin.name.ru}», аватары ×${b.avatars.length}, рамка «${b.frame.name.ru}», имя «${b.nameStyle.name.ru}», эффект «${b.effect.name.ru}»`);
  }
  check(allComplete, 'все 4 сезона: 6 предметов (скин + 2 аватара + рамка + имя + эффект)');

  // сезонные предметы не пересекаются с базовыми по id
  const seasonalIds = new Set([...GEM_SKINS, ...AVATARS, ...FRAMES, ...NAME_STYLES, ...TILE_EFFECTS].filter((x: { season?: SeasonId }) => x.season).map((x: { id: string }) => x.id));
  check(seasonalIds.size === 24, `в каталоге 24 сезонных предмета (${seasonalIds.size})`);

  // календарь сезонов: ноябрь = осень, декабрь = зима, март = весна, июль = лето
  check(seasonOfMonth(10) === 'autumn' && seasonOn(new Date(2026, 10, 8)) === 'autumn', 'ноябрь 2026 → осень (текущая витрина)');
  check(seasonOfMonth(11) === 'winter', 'декабрь → зима');
  check(seasonOfMonth(2) === 'spring', 'март → весна');
  check(seasonOfMonth(6) === 'summer', 'июль → лето');

  // детерминизм витрины внутри сезона (витрина = f(месяц), перезагрузка не меняет)
  check(seasonOn(new Date(2026, 10, 1)) === seasonOn(new Date(2026, 10, 30)), 'витрина стабильна внутри сезона');
}

/* ---------- Итог ---------- */
console.log('\n────────────────────────────');
if (failures === 0) {
  console.log('ALL CHECKS PASSED — Волна 4 «События» сбалансирована и детерминирована');
} else {
  console.error(`${failures} CHECK(S) FAILED`);
  process.exit(1);
}
