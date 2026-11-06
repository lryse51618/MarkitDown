// 남은 날들 — 계산만 모은 곳(화면 코드 없음). 브라우저에서는 window.Days, 테스트(Node)에서는 require로 쓴다.
(function (root) {
  const VISITS_PER_YEAR = 12; // 따로 사는 부모와의 왕래 연 12회(중윗값, 평균 42회) — 한국복지패널 제19차 조사
  // 나이별 기대여명(앞으로 더 살 것으로 기대되는 햇수) [나이, 남자, 여자] — 통계청(국가데이터처) 2024년 생명표.
  // 90세·100세 이상 값은 보도자료 표를 옮긴 자료 기준이라 원표로 한 번 더 확인할 것
  const LIFE_TABLE = [[40, 41.9, 47.4], [60, 23.7, 28.4], [65, 19.5, 23.7], [70, 15.5, 19.2], [80, 8.5, 10.9], [90, 4.0, 5.1], [100, 1.9, 2.3]];

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

  // 표의 나이 사이는 직선으로 잇고 남녀 값의 평균을 쓴다(70세 남녀 전체 17.5년과 0.15년 차이). 100세 넘으면 100세 이상 값
  function yearsLeft(age) {
    const a = Math.max(age, LIFE_TABLE[0][0]);
    const i = LIFE_TABLE.findIndex(([x]) => x > a);
    if (i === -1) { const [, m, f] = LIFE_TABLE.at(-1); return (m + f) / 2; }
    const [a0, m0, f0] = LIFE_TABLE[i - 1], [a1, m1, f1] = LIFE_TABLE[i];
    const k = (a - a0) / (a1 - a0);
    return (m0 + (m1 - m0) * k + f0 + (f1 - f0) * k) / 2;
  }
  function lifeMath(age) {
    const left = Math.max(1, Math.round(yearsLeft(age) * 12)); // 남은 달
    const spent = age * 12;
    return { total: spent + left, spent, leftMonths: left, leftYears: left / 12, leftPct: Math.max(1, Math.round((left / (spent + left)) * 100)), leftVisits: Math.round((left / 12) * VISITS_PER_YEAR) };
  }

  // 백업 파일(가져오기) 검사: 이 앱 파일인지, 날짜·값·목소리 형식이 맞는지. 이상한 값은 버린다
  const AUDIO_URL = /^data:audio\/[\w.+-]+(;[\w.+=-]+)*;base64,[A-Za-z0-9+/=]+$/;
  function cleanBackup(o) {
    if (o?.app !== 'days_with_parents' || !o.records || typeof o.records !== 'object') return null;
    const records = {}, audio = {};
    for (const [k, r] of Object.entries(o.records)) {
      if (!parseKey(k) || !r || typeof r !== 'object') continue;
      const how = r.how === 1 || r.how === 2 ? r.how : r.level === 1 ? 1 : 2;
      const text = typeof r.text === 'string' ? r.text.trim().slice(0, 1000) : '';
      const clip = o.audio?.[k];
      const hasAudio = typeof clip === 'string' && AUDIO_URL.test(clip);
      records[k] = { how, level: text || hasAudio ? 3 : how, text, audio: hasAudio };
      if (hasAudio) audio[k] = clip;
    }
    const okAge = Number.isInteger(o.parentAge) && o.parentAge >= 40 && o.parentAge <= 110;
    return { records, audio, parentAge: okAge ? o.parentAge : null, ageYear: okAge && Number.isInteger(o.ageYear) ? o.ageYear : null };
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

  const api = { VISITS_PER_YEAR, dayKey, parseKey, dotted, spoken, ageNow, yearsLeft, lifeMath, cleanBackup, yearDays, monthLabels, questionFor };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Days = api;
})(this);
