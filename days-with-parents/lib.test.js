// node --test days-with-parents/lib.test.js  (한국 시간대에서 생기던 날짜 밀림을 같이 확인한다)
process.env.TZ = 'Asia/Seoul';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('./public/lib.js');

test('날짜 키는 기기 시간대 기준이라 한국 오전에도 하루 밀리지 않는다', () => {
  const morning = new Date(2026, 10, 6, 8, 30); // 11월 6일 오전 8시 30분
  assert.equal(morning.toISOString().slice(0, 10), '2026-11-05'); // 원래 코드 방식은 전날이 된다
  assert.equal(D.dayKey(morning), '2026-11-06');
  assert.equal(D.parseKey('2026-11-06').getDate(), 6);
  assert.equal(D.parseKey('2026-02-31'), null);
  assert.equal(D.parseKey('../etc'), null);
  assert.equal(D.spoken('2026-11-06'), '2026년 11월 6일');
});

test('남은 만남: 2024년 생명표 나이별 기대여명(남녀 평균)으로, 나이가 많을수록 줄고 0이 되지 않는다', () => {
  assert.equal(D.yearsLeft(65), (19.5 + 23.7) / 2); // 표에 있는 나이는 그 값 그대로
  assert.equal(D.yearsLeft(80), (8.5 + 10.9) / 2);
  assert.ok(Math.abs(D.yearsLeft(68) - 19.05) < 1e-9); // 65~70세 사이는 직선으로
  assert.deepEqual(D.lifeMath(68), { total: 1045, spent: 816, leftMonths: 229, leftYears: 229 / 12, leftPct: 22, leftVisits: 229 });
  assert.equal(D.lifeMath(80).leftVisits, 116); // 예전 '84세 − 나이' 계산은 48번이었다
  let prev = Infinity;
  for (let a = 40; a <= 110; a++) { const y = D.yearsLeft(a); assert.ok(y <= prev && y > 0, `${a}세`); prev = y; }
  const old = D.lifeMath(110);
  assert.ok(old.leftPct >= 1 && old.total > old.spent); // 원래 코드는 84세를 넘으면 '-7%가 남았어요'가 나왔다
});

test('백업 가져오기: 이 앱 파일만 받고, 날짜·값·목소리 형식이 틀린 건 버린다', () => {
  assert.equal(D.cleanBackup({ app: 'other', records: {} }), null);
  assert.equal(D.cleanBackup(null), null);
  const got = D.cleanBackup({
    app: 'days_with_parents', parentAge: 70, ageYear: 2026,
    records: {
      '2026-11-06': { how: 1, level: 1, text: '  통화  ', audio: true },
      '2026-11-05': { how: 9, level: 2, text: 5 },
      '2026-02-31': { how: 2, level: 2, text: '' },
      '../x': { how: 2 },
      '2026-11-04': { how: 2, text: '<img src=x onerror=alert(1)>' },
    },
    audio: { '2026-11-06': 'data:audio/webm;codecs=opus;base64,GkXfow==', '2026-11-05': 'data:text/html;base64,PHNjcmlwdD4=' },
  });
  assert.deepEqual(Object.keys(got.records).sort(), ['2026-11-04', '2026-11-05', '2026-11-06']);
  assert.deepEqual(got.records['2026-11-06'], { how: 1, level: 3, text: '통화', audio: true });
  assert.deepEqual(got.records['2026-11-05'], { how: 2, level: 2, text: '', audio: false }); // 목소리가 오디오가 아니면 버림
  assert.equal(got.records['2026-11-04'].text, '<img src=x onerror=alert(1)>'); // 글은 화면에 textContent로만 넣는다
  assert.deepEqual(Object.keys(got.audio), ['2026-11-06']);
  assert.equal(got.parentAge, 70);
  assert.equal(D.cleanBackup({ app: 'days_with_parents', records: {}, parentAge: 7 }).parentAge, null);
});

test('부모님 나이는 해가 바뀌면 한 살씩 늘어난다', () => {
  assert.equal(D.ageNow({ parentAge: 68, ageYear: 2026 }, new Date(2027, 0, 1)), 69);
  assert.equal(D.ageNow({ parentAge: 68 }, new Date(2027, 0, 1)), 68); // 입력한 해가 없으면 그대로
  assert.equal(D.ageNow({ parentAge: null }, new Date()), null);
});

test('1년 달력: 일요일~토요일로 꽉 찬 주, 오늘 뒤는 future, 달 이름은 붙어 나오지 않는다', () => {
  const days = D.yearDays(new Date(2026, 10, 6, 23, 0)); // 금요일 밤
  assert.equal(days.length % 7, 0);
  assert.equal(days[0].dow, 0);
  const t = days.findIndex((d) => d.key === '2026-11-06');
  assert.ok(t > 0 && !days[t].future && days[t + 1].future);
  assert.equal(days.at(-1).key, '2026-11-07');
  assert.ok(days.length >= 364 && days.length <= 378);
  const labels = D.monthLabels(days);
  assert.equal(labels.length, days.length / 7);
  assert.equal(labels.filter(Boolean).length >= 12, true);
  labels.forEach((l, i) => { if (l) assert.ok(!labels.slice(i + 1, i + 3).some(Boolean), `${l} 바로 옆에 다른 달 이름`); });
  assert.equal(D.questionFor('2026-11-06'), D.questionFor('2026-11-06'));
});
