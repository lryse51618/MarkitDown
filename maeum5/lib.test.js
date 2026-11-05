import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { CRISIS, EMOTIONS, OK, SLOTS, cleanExtract, cleanReco, cleanVent, detectRisk, duePromise, estimateBpm, gardenStats, insights, parseAnswers, phqLevel, pickNow, rulePicks, slotStats, togetherStats, togetherText, ventNudge } from './src/lib.js';
import { FEATURE_EVIDENCE, INTEREST, PERSONAS, PHQ9, PLACES, PLANS, ROUTINES } from './src/content.js';
import { seed } from './seed.js';
import { distPath } from './static.js';

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

test('배포 모드는 dist 밖 파일을 내보내지 않는다', () => {
  const root = '/srv/app/dist';
  assert.equal(distPath(root, '/assets/index-a1.js'), '/srv/app/dist/assets/index-a1.js');
  assert.equal(distPath(root, '/'), '/srv/app/dist/');
  for (const evil of ['/..%2f..%2fmaeum5.db', '/%2e%2e/server.js', '/assets/..%2f..%2f..%2fetc/passwd', '/%E0%A4%A']) {
    const got = distPath(root, evil);
    assert.ok(got === null || got.startsWith(root + '/'), `${evil} → ${got}`);
  }
  assert.equal(distPath(root, '/..%2f..%2fmaeum5.db'), null);
});

test('콘텐츠: 의료 표현 없음, 행동마다 근거 2~3편', () => {
  const shown = JSON.stringify([PERSONAS, PHQ9, PLANS, INTEREST, ROUTINES.map(({ refs, ...r }) => ({ ...r, findings: refs.map((x) => x.finding) })), FEATURE_EVIDENCE.map(({ refs, ...f }) => f)]);
  for (const w of ['처방', '치료', '완화']) assert.ok(!shown.includes(w), w);
  for (const r of ROUTINES) {
    assert.ok(EMOTIONS.includes(r.emotion) && r.slots.every((x) => SLOTS.includes(x)), r.id);
    assert.ok(r.refs.length >= 2 && r.refs.length <= 3, r.id);
    assert.ok(r.steps.length <= 3 && ['A', 'B', 'C'].includes(r.level), r.id);
  }
  for (const e of EMOTIONS) assert.ok(ROUTINES.filter((r) => r.emotion === e).length >= 2, e);
  assert.equal(PHQ9.items.length, 9);
  assert.equal(PHQ9.options.length, 4);
  for (const it of PHQ9.items) assert.ok(it.routines.every((id) => ROUTINES.some((r) => r.id === id)), it.short);
  assert.deepEqual(PHQ9.levels.map((l) => l.max), [4, 9, 14, 19, 27]);
  // 요금: 상품 범위 고정, 유료 상품마다 '구분할 점'이 있고, AI 보고서는 전문가 검토가 아님을 밝힌다
  assert.deepEqual(PLANS.products.map((p) => p.id), ['free', 'report', 'consult', 'org']);
  assert.deepEqual(PLANS.products.filter((p) => p.poll).map((p) => p.id), ['report', 'consult']);
  for (const p of PLANS.products) assert.ok(p.includes.length && p.notes.length, p.id);
  assert.ok(PLANS.products.find((p) => p.id === 'report').notes.some((n) => n.includes('AI') && n.includes('검토하지 않아요')));
  assert.ok(PLANS.priceNote.includes('검증 예정 제안 가격'));
  assert.equal(INTEREST.length, 3);
});

test('PHQ-9: 응답 검증 · 점수 구간 · 규칙 추천 · 모델 추천 정리', () => {
  assert.deepEqual(parseAnswers([0, 1, 2, 3, 0, 1, 2, 3, 0]), [0, 1, 2, 3, 0, 1, 2, 3, 0]);
  for (const bad of [null, {}, [], Array(8).fill(0), Array(10).fill(0), Array(9).fill(4), Array(9).fill(-1), Array(9).fill(1.5), [0, 0, 0, 0, 0, 0, 0, 0, '1']]) {
    assert.equal(parseAnswers(bad), null, JSON.stringify(bad));
  }
  assert.equal(phqLevel(0, PHQ9.levels).max, 4);
  assert.equal(phqLevel(4, PHQ9.levels).max, 4);
  assert.equal(phqLevel(5, PHQ9.levels).max, 9);
  assert.equal(phqLevel(10, PHQ9.levels).expert, true);
  assert.equal(phqLevel(27, PHQ9.levels).max, 27);
  // 점수가 높은 문항부터 관련 행동, 3개로 맞춘다
  assert.deepEqual(rulePicks([0, 0, 3, 0, 0, 2, 0, 0, 0], PHQ9.items), ['todo', 'sigh', 'kind']);
  assert.deepEqual(rulePicks(Array(9).fill(0), PHQ9.items), ['sigh', 'label', 'walk']);
  const ids = ROUTINES.map((r) => r.id);
  const r = cleanReco({ picks: ['box', 'made-up', 'box'], message: '우울증이 의심돼요' }, ids, ['sigh', 'label', 'walk']);
  assert.deepEqual(r.picks, ['box', 'sigh', 'label']);
  assert.equal(r.message, null);
  assert.equal(cleanReco({ picks: [], message: ' 오늘도 버텨 줘서 고마워요. ' }, ids, ['sigh', 'label', 'walk']).message, '오늘도 버텨 줘서 고마워요.');
  assert.deepEqual(cleanReco(null, ids, ['sigh', 'label', 'walk']).picks, ['sigh', 'label', 'walk']);
});

test('지금 체크: 감정 × 장소 매트릭스는 모든 칸에서 그 장소에 맞는 행동을 먼저 고른다', () => {
  for (const r of ROUTINES) assert.ok(r.places.length && r.places.every((p) => PLACES.some((x) => x.id === p)), r.id);
  for (const emotion of [...EMOTIONS, OK]) {
    for (const { id } of PLACES) {
      const [top] = pickNow(ROUTINES, { emotion, place: id, slot: '낮' });
      assert.ok(top.places.includes(id), `${emotion} @ ${id} → ${top.id}`);
    }
  }
  // 동점이면 내 기록에서 나아졌던 행동이 먼저
  const base = { emotion: '불안·과부하', place: 'desk', slot: '낮' };
  assert.equal(pickNow(ROUTINES, base)[0].id, 'box');
  const leaves = [['sigh', 2], ['sigh', 1], ['box', 0], ['box', 0]].map(([routine, after]) => ({ ts: '2026-11-01T10:00', routine, after }));
  assert.equal(pickNow(ROUTINES, { ...base, leaves })[0].id, 'sigh');
});

test('나와의 약속: 정한 시간대에 하루 한 번, 만든 직후와 자정 넘은 같은 밤에는 다시 안 뜬다', () => {
  const p = { id: 1, slot: '아침', routine: 'toes', from: '2026-11-05T21:00', shown: null };
  assert.equal(duePromise([p], new Date('2026-11-06T09:00')), p);
  assert.equal(duePromise([p], new Date('2026-11-05T21:30')), null); // 아직 저녁
  assert.equal(duePromise([{ ...p, shown: '2026-11-06T09:00' }], new Date('2026-11-06T10:00')), null); // 오늘 이미 봄
  const night = { id: 2, slot: '밤', routine: 'todo', from: '2026-11-05T23:00', shown: null };
  assert.equal(duePromise([night], new Date('2026-11-06T01:00')), null); // 만든 그 밤
  assert.equal(duePromise([night], new Date('2026-11-06T23:00')), night);
});

test('마음 정원 요약: 잎·나아짐·기록한 날·내게 맞는 행동', () => {
  const leaves = [
    { ts: '2026-11-01T09:00', emotion: '무기력·우울', routine: 'toes', after: 1 },
    { ts: '2026-11-01T22:00', emotion: '불안·과부하', routine: 'sigh', after: 2 },
    { ts: '2026-11-02T09:00', emotion: '무기력·우울', routine: 'toes', after: 0 },
    { ts: '2026-11-03T09:00', emotion: null, routine: 'toes', after: 2 },
  ];
  const g = gardenStats(leaves);
  assert.equal(g.n, 4);
  assert.equal(g.better, 3);
  assert.equal(g.days, 3);
  assert.deepEqual(g.by, { '무기력·우울': 2, '불안·과부하': 1, [OK]: 1 });
  assert.deepEqual(g.best, [{ id: 'toes', n: 3, better: 2 }]);
});

test('감정 쓰레기통: 모델 출력은 스키마 밖 값을 버리고, 의료 표현이 섞인 답은 쓰지 않는다', () => {
  const keys = PHQ9.items.map((it) => it.key);
  assert.equal(new Set(keys).size, 9);
  const v = cleanVent({ reply: ' 많이 지쳤겠어요. ', emotion: '분노·울분', place: 'roof', signals: { sleep: 2, mood: 7, energy: '3' }, risk: 'maybe' }, keys, PLACES.map((p) => p.id));
  assert.equal(v.reply, '많이 지쳤겠어요.');
  assert.equal(v.emotion, '분노·울분');
  assert.equal(v.place, null);
  assert.equal(v.risk, 'none');
  assert.deepEqual(Object.keys(v.signals), keys);
  assert.equal(v.signals.sleep, 2);
  assert.equal(v.signals.mood, 0); // 범위 밖
  assert.equal(v.signals.energy, 0); // 문자열
  assert.equal(cleanVent({ reply: '우울증 치료가 필요해요' }, keys, []).reply, null);
  assert.equal(cleanVent(null, keys, []).emotion, null);
});

test('감정 쓰레기통 신호가 2주 안에 같은 영역에서 3번 뚜렷하면 9문항 점검을 권한다(자해 생각은 위기 안내가 맡음)', () => {
  const now = new Date('2026-11-15T12:00');
  const v = (ts, signals) => ({ ts, emotion: null, signals });
  const vents = [v('2026-11-14T09:00', { sleep: 2 }), v('2026-11-12T09:00', { sleep: 3, harm: 3 }), v('2026-11-10T09:00', { sleep: 1, harm: 3 }), v('2026-11-09T09:00', { harm: 3 })];
  assert.equal(ventNudge(vents, now, PHQ9.items), null); // 잠 2번(1은 안 셈), 자해는 제외
  const more = [...vents, v('2026-11-02T09:00', { sleep: 2 })];
  assert.equal(ventNudge(more, now, PHQ9.items)?.key, 'sleep');
  assert.equal(ventNudge(more, now, PHQ9.items)?.n, 3);
  assert.equal(ventNudge([...vents, v('2026-10-30T09:00', { sleep: 3 })], now, PHQ9.items), null); // 14일 전은 안 셈
});

test('느슨한 연대: 같은 시간대의 실제 기록만 세고, 5명 미만이면 나아진 수를 숨긴다', () => {
  const rows = [
    { ts: '2026-11-05T23:10', after: 1 }, // 어젯밤(같은 밤)
    { ts: '2026-11-06T00:40', after: 0 },
    { ts: '2026-11-05T19:00', after: 2 }, // 저녁이라 안 셈
  ];
  assert.deepEqual(togetherStats(rows, new Date('2026-11-06T01:00')), { n: 2, better: 1, slot: '밤' });
  assert.equal(togetherStats([{ ts: '2026-11-05T09:00', after: 1 }], new Date('2026-11-06T09:30')).n, 0); // 어제 아침
  assert.match(togetherText({ n: 1, better: 1, slot: '아침' }, '발가락 30초 꼼지락'), /첫 번째는 나/);
  assert.equal(togetherText({ n: 4, better: 3, slot: '밤' }, '박스 호흡'), '오늘 밤, 나까지 4명이 ‘박스 호흡’ 했어요.');
  assert.match(togetherText({ n: 5, better: 3, slot: '밤' }, '박스 호흡'), /그중 3명은 조금이라도 나아졌어요/);
});
