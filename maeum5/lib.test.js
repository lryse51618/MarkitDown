import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { CRISIS, EMOTIONS, SLOTS, cleanExtract, detectRisk, estimateBpm, insights, slotStats } from './src/lib.js';
import { FEATURE_EVIDENCE, PERSONAS, ROUTINES } from './src/content.js';
import { seed } from './seed.js';

const rand = (s = 7) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// 30fps 12초, 피부 맥파 방향(R,G,B ≈ 0.33, 0.77, 0.53) + 조명 흔들림 + 잡음
const fake = (hz, amp, noise = 0.4) => {
  const r = rand();
  return [...Array(360)].map((_, i) => {
    const t = i * 33.3, pulse = amp * Math.sin((2 * Math.PI * hz * t) / 1000), light = 1 + 0.02 * Math.sin((2 * Math.PI * 0.1 * t) / 1000);
    const n = () => (r() - 0.5) * noise;
    return { t, r: 150 * light * (1 + 0.33 * pulse) + n(), g: 110 * light * (1 + 0.77 * pulse) + n(), b: 90 * light * (1 + 0.53 * pulse) + n() };
  });
};

test('rPPG: 72bpm 맥파를 찾고, 잡음만 있으면 품질이 낮다', () => {
  const hit = estimateBpm(fake(1.2, 0.004));
  assert.ok(Math.abs(hit.bpm - 72) <= 2, `bpm ${hit.bpm}`);
  assert.ok(hit.quality > 0.5, `quality ${hit.quality}`);
  const miss = estimateBpm(fake(1.2, 0, 2));
  assert.ok(miss.quality < hit.quality / 2, `noise quality ${miss.quality}`);
  assert.equal(estimateBpm(fake(1.2, 0.004).slice(0, 10)), null);
});

test('위험 표현은 잡고, 흔한 과장 표현은 넘긴다', () => {
  for (const t of ['죽고 싶어요', '그냥 사라지고 싶다', '자해했어요', '인생을 끝내고 싶어']) assert.ok(detectRisk(t), t);
  for (const t of ['배고파 죽겠다', '과제 빨리 끝내고 싶다', '피곤해서 쓰러질 것 같아']) assert.ok(!detectRisk(t), t);
  assert.match(CRISIS, /109/);
});

test('모델 출력은 스키마 밖 값을 버린다', () => {
  const d = cleanExtract({ reply: ' 안녕 ', emotion: '행복', slot: '새벽', mood: 11, sleep_hours: 30, caffeine_cups: 2, risk: 'high', place: '' });
  assert.deepEqual(d, { reply: '안녕', emotion: null, slot: null, place: null, mood: null, sleep_hours: null, caffeine_cups: 2, risk: 'none' });
  assert.equal(cleanExtract({ mood: 6.6 }).mood, 7);
  assert.equal(cleanExtract(null).reply, '');
});

test('상관 분석은 14일 전에는 열리지 않고, 14일부터 경향을 낸다', () => {
  const daily = [...Array(14)].map((_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, sleep_h: 4 + (i % 5), caffeine_cups: 1, hr_bpm: 70 }));
  const checkins = daily.map((d) => ({ ts: `${d.date}T10:00`, slot: '아침', emotion: '무기력·우울', mood: d.sleep_h }));
  assert.deepEqual(insights(daily.slice(1), checkins).items, []);
  const out = insights(daily, checkins);
  assert.equal(out.items[0].text, '잠을 더 잔 날 기분 점수가 높은 경향');
  assert.ok(out.items[0].r > 0.99);
});

test('시드 데이터: 두 페르소나의 패턴이 다르게 나온다', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE daily (persona TEXT, date TEXT, sleep_h REAL, caffeine_cups REAL, hr_bpm REAL, PRIMARY KEY (persona, date));
    CREATE TABLE checkins (id INTEGER PRIMARY KEY, persona TEXT, ts TEXT, slot TEXT, emotion TEXT, mood INTEGER, place TEXT, source TEXT);
    CREATE TABLE messages (id INTEGER PRIMARY KEY, persona TEXT, ts TEXT, role TEXT, content TEXT);
    CREATE TABLE done (id INTEGER PRIMARY KEY, persona TEXT, ts TEXT, routine TEXT, after INTEGER);`);
  seed(db, new Date(2026, 10, 5, 12));
  const get = (p) => {
    const daily = db.prepare('SELECT * FROM daily WHERE persona = ? ORDER BY date').all(p);
    const checkins = db.prepare('SELECT * FROM checkins WHERE persona = ?').all(p);
    return { daily, checkins, stats: slotStats(checkins), ins: insights(daily, checkins) };
  };
  const A = get('A'), B = get('B');
  assert.equal(A.daily.length, 14);
  assert.equal(A.daily.at(-1).date, '2026-11-05');
  assert.equal(A.stats.find((x) => x.slot === '아침').top, '무기력·우울');
  assert.equal(A.stats.find((x) => x.slot === '밤').top, '고독·소외감');
  assert.equal(B.stats.find((x) => x.slot === '밤').top, '불안·과부하');
  assert.ok(B.ins.items.some((x) => x.text === '카페인을 많이 마신 날 밤 잠이 짧아지는 경향'), JSON.stringify(B.ins.items));
  assert.ok(!A.ins.items.some((x) => x.text.startsWith('카페인을 많이 마신 날 밤')), JSON.stringify(A.ins.items));
});

test('콘텐츠: 의료 표현 없음, 행동마다 근거 2~3편', () => {
  const shown = JSON.stringify([PERSONAS, ROUTINES.map(({ refs, ...r }) => ({ ...r, findings: refs.map((x) => x.finding) })), FEATURE_EVIDENCE.map(({ refs, ...f }) => f)]);
  for (const w of ['처방', '치료', '완화']) assert.ok(!shown.includes(w), w);
  for (const r of ROUTINES) {
    assert.ok(EMOTIONS.includes(r.emotion) && r.slots.every((x) => SLOTS.includes(x)), r.id);
    assert.ok(r.refs.length >= 2 && r.refs.length <= 3, r.id);
    assert.ok(r.steps.length <= 3 && ['A', 'B', 'C'].includes(r.level), r.id);
  }
  for (const e of EMOTIONS) assert.ok(ROUTINES.filter((r) => r.emotion === e).length >= 2, e);
});
