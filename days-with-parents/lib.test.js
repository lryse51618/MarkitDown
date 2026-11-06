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

test('남은 만남: 기대수명 84세까지 단순 계산, 넘긴 나이도 1년은 남긴다', () => {
  assert.deepEqual(D.lifeMath(68), { total: 1008, spent: 816, leftMonths: 192, leftPct: 19, leftVisits: 192 });
  const old = D.lifeMath(90);
  assert.equal(old.leftVisits, 12);
  assert.ok(old.leftPct > 0 && old.total > old.spent); // 원래 코드는 '-7%가 남았어요'가 나왔다
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
