// 남은 날들 — 계산만 모은 곳(화면 코드 없음). 브라우저에서는 window.Days, 테스트(Node)에서는 require로 쓴다.
(function (root) {
  const LIFE_EXPECT = 84; // 통계청 생명표의 기대수명(출생 시) 근처 값으로 단순 계산 (가정)
  const VISITS_PER_YEAR = 12; // 따로 사는 부모와의 왕래 연 12회(중앙값, 한국복지패널)

  const pad = (n) => String(n).padStart(2, '0');
  // 날짜 키는 기기 시간대 기준. toISOString()은 UTC라 한국에서는 오전 9시 전까지 하루 밀린다
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = (k) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k ?? '');
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return dayKey(d) === k ? d : null; // 2월 31일처럼 없는 날짜는 거른다
  };
  const dotted = (k) => k.replaceAll('-', '.');
  const spoken = (k) => { const d = parseKey(k); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`; };

  // 입력한 해를 같이 저장해서, 해가 바뀌면 한 살씩 늘린다
  const ageNow = (s, now) => (s.parentAge == null ? null : s.parentAge + (now.getFullYear() - (s.ageYear ?? now.getFullYear())));

  function lifeMath(age) {
    const life = Math.max(LIFE_EXPECT, age + 1); // 기대수명을 넘긴 분도 1년은 남은 것으로 센다
    const yearsLeft = life - age;
    return { total: life * 12, spent: age * 12, leftMonths: yearsLeft * 12, leftPct: Math.round((yearsLeft / life) * 100), leftVisits: yearsLeft * VISITS_PER_YEAR };
  }

  // 최근 1년 달력: 일요일로 시작하는 주 단위, 마지막 주는 토요일까지 채우고 오늘 뒤 칸은 future
  function yearDays(today) {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const d = new Date(end);
    d.setDate(d.getDate() - 363);
    d.setDate(d.getDate() - d.getDay());
    const days = [];
    for (; d <= end || d.getDay() !== 0; d.setDate(d.getDate() + 1)) days.push({ key: dayKey(d), future: d > end, month: d.getMonth(), dow: d.getDay() });
    return days;
  }

  // 열(주)마다 달 이름. 그 주 일요일의 달이 앞 열과 달라질 때 붙이고, 첫 열 이름은 다음 이름과 겹치지 않을 때만
  function monthLabels(days) {
    const weeks = days.length / 7;
    const out = Array(weeks).fill('');
    for (let w = 1; w < weeks; w++) if (days[w * 7].month !== days[(w - 1) * 7].month) out[w] = `${days[w * 7].month + 1}월`;
    const next = out.findIndex(Boolean);
    if (next === -1 || next >= 3) out[0] = `${days[0].month + 1}월`;
    return out;
  }

  const QUESTIONS = [
    '아버지 첫 월급으로 뭐 하셨어요?',
    '어머니가 제일 좋아하던 노래가 뭐예요?',
    '두 분은 어떻게 처음 만나셨어요?',
    '제가 어렸을 때 제일 속 썩였던 일이 뭐예요?',
    '스무 살 때 꿈이 뭐였어요?',
    '요즘 제일 자주 생각나는 사람이 누구예요?',
    '살면서 제일 잘한 선택이 뭐라고 생각하세요?',
    '할머니 할아버지는 어떤 분이셨어요?',
    '지금 제일 하고 싶은 게 뭐예요?',
    '제 이름은 어떻게 지으신 거예요?',
  ];
  const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };
  const questionFor = (k) => QUESTIONS[Math.abs(hash(k)) % QUESTIONS.length]; // 같은 날은 늘 같은 질문

  const api = { LIFE_EXPECT, VISITS_PER_YEAR, dayKey, parseKey, dotted, spoken, ageNow, lifeMath, yearDays, monthLabels, questionFor };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Days = api;
})(this);
