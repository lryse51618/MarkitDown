// 시연용 가상 페르소나 14일 데이터 + 대화 기록. 첫 실행 때 DB에 들어가고, `npm run reset` 후 다시 만들어진다.
// 실제 사람 데이터가 아니다. 팀원이 페르소나를 맡아 매일 채팅하거나 `npm run simulate`로 더 쌓는다.
import { dateKey, stamp } from './src/lib.js';

const DAYS = 14;
const DAILY = {
  A: {
    sleep: [6.0, 9.0, 5.5, 8.5, 7.0, 5.0, 9.5, 6.0, 8.0, 4.5, 9.0, 6.5, 8.5, 5.5],
    caffeine: [1, 1, 2, 1, 1, 2, 0, 1, 2, 2, 1, 1, 1, 2],
    hr: [74, 72, 77, 73, 74, 78, 71, 75, 73, 79, 72, 75, 72, 77],
  },
  B: {
    sleep: [6.0, 6.0, 5.5, 7.0, 5.0, 6.5, 8.5, 7.5, 6.0, 4.5, 5.5, 5.0, 7.0, 5.5],
    caffeine: [3, 4, 2, 5, 3, 4, 1, 3, 5, 4, 5, 2, 4, 3],
    hr: [85, 88, 84, 88, 87, 86, 81, 84, 90, 88, 89, 85, 86, 87],
  },
};
// 시간대별 기본 기분(1~10)·힘들 때 감정·장소. every: n일마다 기록
const SCHEDULE = {
  A: [
    ['아침', '10:40', 3.4, '무기력·우울', '침대 위', 1],
    ['낮', '15:20', 5.4, '무기력·우울', '도서관', 2],
    ['저녁', '20:10', 6.0, '불안·과부하', '방 안', 3],
    ['밤', '23:50', 4.0, '고독·소외감', '방 안', 1],
  ],
  B: [
    ['아침', '08:20', 5.6, '불안·과부하', '등굣길', 3],
    ['낮', '13:40', 4.2, '불안·과부하', '강의실', 1],
    ['저녁', '19:30', 4.8, '분노·울분', '카페 알바', 2],
    ['밤', '23:40', 3.8, '불안·과부하', '기숙사 책상', 1],
  ],
};
const HARD_DAY = { A: [9, -2], B: [10, -1.5] }; // A: 서류 탈락 문자, B: 전공 발표
const SLEEP_WEIGHT = { A: 0.5, B: 0.6 };

const TALK = {
  A: [
    [0, '21:10', [
      ['assistant', '안녕하세요, 민준님. 저는 마음 5분이에요. 진단하거나 고치려는 게 아니라, 민준님 하루의 리듬을 같이 살펴보는 대화 상대예요. 오늘 하루는 어떠셨어요?'],
      ['user', '그냥 그래요. 오늘도 서류 하나 떨어졌어요.'],
      ['assistant', '기다린 끝에 받은 소식이라 더 힘이 빠지셨겠어요. 그런 날은 하루 중 언제가 제일 무거우세요?'],
      ['user', '아침이요. 눈 뜨자마자 메일함부터 보는데 그때 제일 바닥 쳐요.'],
      ['assistant', '눈 뜨자마자 결과를 보면 하루 시작이 통째로 흔들리죠. 보통 몇 시쯤 잠들고 몇 시쯤 일어나세요?'],
      ['user', '새벽 2~3시에 자고 10시 넘어서 일어나요. 어떤 날은 12시까지 자요.'],
      ['assistant', '잠드는 시간이 늦어서 아침이 더 길고 무겁게 느껴질 수 있겠어요. 늦게까지 깨어 있을 땐 주로 어떤 마음이세요?'],
      ['user', '혼자 방에 있으면 친구들은 다 취업했는데 나만 멈춰 있는 것 같아서 외로워요.'],
      ['assistant', '비교하는 마음이 밤에 더 크게 들리는 거네요. 말해 주셔서 고마워요. 커피나 에너지음료는 하루에 얼마나 드세요?'],
      ['user', '커피 하루 한두 잔이요. 오후에 도서관 가서 마셔요.'],
      ['assistant', '알려주셔서 고마워요. 오늘 이야기로 보면 "아침 침대 위의 무기력"과 "밤 방 안의 외로움"이 민준님에게 중요한 순간 같아요. 그 시간에 맞춰 부담 없는 5분 행동을 띄워 둘게요.'],
    ]],
    [12, '11:05', [
      ['assistant', '민준님, 좋은 아침이에요. 오늘은 눈 떴을 때 몸이 어땠어요?'],
      ['user', '또 10시 넘어서 일어났어요. 메일 확인했는데 연락 없고요.'],
      ['assistant', '기다리던 연락이 없으면 아침부터 힘이 쭉 빠지죠. 어젯밤엔 몇 시간쯤 주무셨어요?'],
      ['user', '8시간 반? 많이 잤는데도 개운하지가 않아요.'],
      ['assistant', '오래 자도 개운하지 않은 날이 있죠. 지금 같은 아침에 해볼 만한 짧은 행동을 아래 카드로 띄워 둘게요.'],
    ]],
  ],
  B: [
    [0, '22:30', [
      ['assistant', '안녕하세요, 서연님. 저는 마음 5분이에요. 조언을 쏟아내기보다 서연님 하루의 리듬을 같이 기록하는 대화 상대예요. 요즘 하루는 어때요?'],
      ['user', '과제가 너무 많아서 정신없어요. 다음 주에 발표도 있고요.'],
      ['assistant', '할 일이 한꺼번에 몰리면 머리가 꽉 찬 느낌이죠. 하루 중 언제 압박이 가장 커요?'],
      ['user', '수업 들을 때랑 밤에 과제할 때요. 특히 12시 넘으면 심장이 두근거려요.'],
      ['assistant', '마감이 가까워질수록 몸까지 긴장하는 거네요. 그 시간쯤 커피나 에너지드링크도 드세요?'],
      ['user', '네, 오늘만 아메리카노 세 잔에 에너지드링크 하나 마셨어요. 마지막은 저녁 8시쯤?'],
      ['assistant', '많이 버티느라 애쓰셨네요. 보통 몇 시간 정도 주무세요?'],
      ['user', '평일엔 5시간 정도요. 주말에 몰아서 자요.'],
      ['assistant', '평일 5시간이면 몸이 꽤 지쳐 있겠어요. 알바도 하신다고 했는데, 일하다가 마음이 확 올라오는 순간도 있어요?'],
      ['user', '손님이 반말하거나 무리한 요구를 하면 진짜 화나는데 그냥 참아요.'],
      ['assistant', '참느라 쌓이는 게 많겠어요. 오늘 이야기로 보면 "낮 강의실과 밤 책상의 불안", "저녁 알바 중 울분"이 서연님에게 중요한 순간 같아요. 그 시간에 맞춰 짧은 5분 행동을 준비해 둘게요.'],
    ]],
    [12, '23:55', [
      ['user', '내일 발표인데 아직 PPT를 못 끝냈어요. 커피 네 잔째예요.'],
      ['assistant', '발표 전날 밤이라 마음이 급하겠어요. 지금 몸은 어때요, 두근거림이 있어요?'],
      ['user', '네 좀 두근거려요. 그래도 해야 돼요.'],
      ['assistant', '해내려는 마음이 느껴져요. 잠깐 숨을 고를 수 있는 1분짜리 행동을 아래 카드에 띄워 둘게요.'],
    ]],
  ],
};
const DONE = {
  A: [['toes', 7, 1], ['reread', 8, 1], ['toes', 9, 0], ['toes', 10, 1], ['reread', 11, 1], ['toes', 12, 2]],
  B: [['box', 7, 1], ['box', 8, 2], ['todo', 9, 1], ['box', 10, 1], ['step', 10, 1], ['box', 11, 0], ['box', 12, 1], ['todo', 12, 1]],
};

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function seed(db, today = new Date()) {
  const at = (i, hhmm) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    d.setHours(Number(hhmm.slice(0, 2)), Number(hhmm.slice(3)), 0, 0);
    return d;
  };
  const daily = db.prepare('INSERT INTO daily (persona, date, sleep_h, caffeine_cups, hr_bpm) VALUES (?, ?, ?, ?, ?)');
  const checkin = db.prepare('INSERT INTO checkins (persona, ts, slot, emotion, mood, place, source) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const message = db.prepare('INSERT INTO messages (persona, ts, role, content) VALUES (?, ?, ?, ?)');
  const done = db.prepare('INSERT INTO done (persona, ts, routine, after) VALUES (?, ?, ?, ?)');
  db.exec('BEGIN');
  for (const p of ['A', 'B']) {
    const { sleep, caffeine, hr } = DAILY[p];
    const avgSleep = sleep.reduce((s, v) => s + v, 0) / DAYS;
    const rand = rng(p.charCodeAt(0));
    for (let i = 0; i < DAYS; i++) {
      daily.run(p, dateKey(at(i, '00:00')), sleep[i], caffeine[i], hr[i]);
      for (const [slot, time, base, emotion, place, every] of SCHEDULE[p]) {
        if (i % every) continue;
        const hard = HARD_DAY[p][0] === i ? HARD_DAY[p][1] : 0;
        const raw = base + SLEEP_WEIGHT[p] * (sleep[i] - avgSleep) + hard + (rand() * 3 - 1.5);
        const mood = Math.min(10, Math.max(1, Math.round(raw)));
        checkin.run(p, stamp(at(i, time)), slot, mood <= 5 ? emotion : '괜찮음', mood, place, 'seed');
      }
    }
    for (const [day, time, lines] of TALK[p]) lines.forEach(([role, text], k) => message.run(p, stamp(new Date(at(day, time).getTime() + k * 60000)), role, text));
    for (const [routine, day, after] of DONE[p]) done.run(p, stamp(at(day, '21:00')), routine, after);
  }
  db.exec('COMMIT');
}
