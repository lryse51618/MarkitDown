// 마음 5분 매트릭스 — API 서버 + 화면(Vite 미들웨어). 실행: npm start → http://localhost:5173
import http from 'node:http';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import Anthropic from '@anthropic-ai/sdk';
import { createServer as createVite } from 'vite';
import { seed } from './seed.js';
import { PERSONAS, ROUTINES } from './src/content.js';
import { CRISIS, EMOTIONS, OK, SLOTS, cleanExtract, dateKey, detectRisk, slotOf, slotStats, stamp } from './src/lib.js';

const PORT = Number(process.env.PORT ?? 5173);
const MODEL = 'claude-opus-5-5'; // 비용을 낮추려면 'claude-haiku-5-5' (README 비용 표)

const db = new DatabaseSync(join(import.meta.dirname, 'maeum5.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS daily (persona TEXT, date TEXT, sleep_h REAL, caffeine_cups REAL, hr_bpm REAL, PRIMARY KEY (persona, date));
  CREATE TABLE IF NOT EXISTS checkins (id INTEGER PRIMARY KEY, persona TEXT, ts TEXT, slot TEXT, emotion TEXT, mood INTEGER, place TEXT, source TEXT);
  CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, persona TEXT, ts TEXT, role TEXT, content TEXT);
  CREATE TABLE IF NOT EXISTS done (id INTEGER PRIMARY KEY, persona TEXT, ts TEXT, routine TEXT, after INTEGER);
`);
if (!db.prepare('SELECT 1 FROM daily LIMIT 1').get()) seed(db);

const q = (sql) => db.prepare(sql);
const insertMessage = q('INSERT INTO messages (persona, ts, role, content) VALUES (?, ?, ?, ?)');
const insertCheckin = q('INSERT INTO checkins (persona, ts, slot, emotion, mood, place, source) VALUES (?, ?, ?, ?, ?, ?, ?)');
const upsertDaily = q(`INSERT INTO daily (persona, date, sleep_h, caffeine_cups, hr_bpm) VALUES (?, ?, ?, ?, ?)
  ON CONFLICT (persona, date) DO UPDATE SET sleep_h = coalesce(excluded.sleep_h, sleep_h),
  caffeine_cups = coalesce(excluded.caffeine_cups, caffeine_cups), hr_bpm = coalesce(excluded.hr_bpm, hr_bpm)`);

function state(p) {
  const from = new Date();
  from.setDate(from.getDate() - 13);
  return {
    persona: PERSONAS[p],
    daily: q('SELECT date, sleep_h, caffeine_cups, hr_bpm FROM daily WHERE persona = ? ORDER BY date DESC LIMIT 14').all(p).reverse(),
    checkins: q('SELECT ts, slot, emotion, mood, place, source FROM checkins WHERE persona = ? AND ts >= ? ORDER BY ts').all(p, dateKey(from)),
    messages: q("SELECT ts, role, content FROM messages WHERE persona = ? AND role != 'system' ORDER BY id").all(p),
    done: q('SELECT ts, routine, after FROM done WHERE persona = ? ORDER BY ts').all(p),
  };
}

// 고정 프롬프트(캐시됨). 매번 바뀌는 정보는 아래 contextNote()가 대화 끝에 system 메시지로 붙인다.
const SYSTEM = `너는 '마음 5분 매트릭스'의 대화 상대야. 이 앱은 지친 20대가 자기 감정의 리듬을 이해하도록 돕는 셀프케어 보조 앱이고, 의료 서비스가 아니야.

# 말하는 방식
- 한국어 존댓말, 따뜻하고 담백하게. 2~3문장, 150자 이내.
- 먼저 상대의 말을 구체적으로 받아 주고(공감), 질문은 한 번에 하나만 해.
- 진단명, 약, 의학적 판단을 말하지 않아. '처방', '치료', '완치', '증상' 같은 의료 표현을 쓰지 않아.
- 해볼 행동을 네가 지어내 추천하지 마. 앱이 근거를 확인한 5분 행동 목록에서 골라 카드로 보여줘. 필요하면 "아래 카드에 지금 해볼 만한 5분 행동을 띄워 둘게요" 정도로만 말해.
- system 역할의 [앱 메시지]는 사용자에게 보이지 않는 참고 정보야. 그대로 읽어 주지 말고 대화에 자연스럽게 녹여.

# 대화로 모을 정보 (개인 패턴 통계용)
설문처럼 몰아서 묻지 말고 대화 흐름에 맞춰 하나씩 알아내. 이미 아는 건 다시 묻지 마. [앱 메시지]에 '오늘 아직 모르는 것'이 있으면 그중 하나를 자연스럽게 물어봐.
1. 감정: 무기력·우울 / 불안·과부하 / 분노·울분 / 고독·소외감 / 괜찮음 중 가장 가까운 것
2. 시간대: 그 감정이 드는 때 — 아침(5~11시) / 낮(11~17시) / 저녁(17~22시) / 밤(22~5시)
3. 장소·상황: 침대 위, 강의실, 지하철처럼 짧게
4. 수면: 지난밤 잔 시간
5. 카페인: 오늘 마신 커피·에너지음료 잔 수
6. 기분 점수: 1(아주 힘듦)~10(아주 좋음)

# 출력 필드
- reply: 사용자에게 보낼 말
- emotion, slot, place, sleep_hours, caffeine_cups: 이번 사용자 메시지에서 새로 드러난 값만. 드러나지 않았으면 null. 지금 이야기라면 slot은 null (앱이 현재 시간으로 기록해).
- mood: 감정이 드러났다면 1~10으로 추정, 아니면 null
- risk: none / watch / urgent
  - watch: "다 의미 없다", "내가 없어도 될 것 같다", "더는 못 버티겠다"처럼 간접적인 위험 신호
  - urgent: 자신을 해치거나 삶을 끝내려는 생각이나 계획
  - watch 이상이면 판단하거나 캐묻지 말고 걱정을 전한 뒤, 믿을 만한 사람이나 전문 상담과 지금 이야기해 보길 권해. 상담 전화번호는 앱이 함께 보여줘.`;

const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });
const SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    emotion: nullable({ type: 'string', enum: [...EMOTIONS, OK] }),
    slot: nullable({ type: 'string', enum: SLOTS }),
    place: nullable({ type: 'string' }),
    mood: nullable({ type: 'integer' }),
    sleep_hours: nullable({ type: 'number' }),
    caffeine_cups: nullable({ type: 'number' }),
    risk: { type: 'string', enum: ['none', 'watch', 'urgent'] },
  },
  required: ['reply', 'emotion', 'slot', 'place', 'mood', 'sleep_hours', 'caffeine_cups', 'risk'],
  additionalProperties: false,
};

function contextNote(p, now) {
  const P = PERSONAS[p];
  const { daily, checkins } = state(p);
  const top = slotStats(checkins).filter((x) => x.top).map((x) => `${x.slot} ${x.top} ${x.topN}회`).join(', ');
  const today = daily.find((d) => d.date === dateKey(now)) ?? {};
  const missing = [today.sleep_h == null && '지난밤 수면 시간', today.caffeine_cups == null && '오늘 카페인'].filter(Boolean);
  return `[앱 메시지] 지금 ${stamp(now).replace('T', ' ')} (${slotOf(now)}). 대화 상대: ${P.name}(${P.age}세, ${P.label}) — ${P.summary}
최근 14일 시간대별로 자주 기록된 감정: ${top || '아직 없음'}
오늘 아직 모르는 것: ${missing.join(', ') || '없음'}`;
}

let client;
async function chat(p, text) {
  const now = new Date();
  const ts = stamp(now);
  if (detectRisk(text)) {
    insertMessage.run(p, ts, 'user', text);
    insertMessage.run(p, ts, 'assistant', CRISIS);
    return { reply: CRISIS, risk: 'urgent', slot: slotOf(now) };
  }
  const note = contextNote(p, now);
  const history = q('SELECT role, content FROM messages WHERE persona = ? ORDER BY id').all(p).map(({ role, content }) => ({ role, content }));
  while (history.length && history[0].role !== 'user') history.shift(); // API 대화는 user로 시작해야 한다
  // shortcut: 대화 전체를 매번 보낸다(캐시로 비용 절감). 수백 턴이 넘으면 요약/컴팩션 추가.
  history.push({ role: 'user', content: text }, { role: 'system', content: note });

  client ??= new Anthropic();
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // 안전 분류기가 거절하면 서버가 다른 모델로 다시 시도
    cache_control: { type: 'ephemeral' }, // 고정 프롬프트 + 이전 대화를 캐시
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: history,
  });
  const u = res.usage;
  console.log(`[chat ${p}] ${res.model} in=${u.input_tokens} cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0} out=${u.output_tokens}`);
  if (res.stop_reason === 'refusal') return { reply: '지금은 이 이야기에 답하기 어려워요. 다른 말로 다시 들려주실래요?', risk: 'none', slot: slotOf(now) };

  const data = cleanExtract(JSON.parse(res.content.find((b) => b.type === 'text')?.text ?? '{}'));
  if (!data.reply) throw new Error('Claude 응답이 비어 있어요');
  insertMessage.run(p, ts, 'user', text);
  insertMessage.run(p, ts, 'system', note);
  insertMessage.run(p, ts, 'assistant', data.reply);
  const slot = data.slot ?? slotOf(now);
  if (data.emotion || data.mood != null) insertCheckin.run(p, ts, slot, data.emotion, data.mood, data.place, 'chat');
  if (data.sleep_hours != null || data.caffeine_cups != null) upsertDaily.run(p, dateKey(now), data.sleep_hours, data.caffeine_cups, null);
  return { ...data, slot };
}

const explain = (e) =>
  e instanceof Anthropic.AuthenticationError ? 'Claude API 키가 올바르지 않아요 (.env 확인)'
  : e instanceof Anthropic.RateLimitError ? '요청이 많아요. 잠시 후 다시 보내 주세요'
  : e instanceof Anthropic.APIConnectionError ? 'Claude API에 연결하지 못했어요 (네트워크 확인)'
  : e instanceof Anthropic.APIError ? `Claude API 오류 (${e.status}): ${e.message}`
  : !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN ? 'Claude API 키가 없어요 — maeum5/.env에 ANTHROPIC_API_KEY를 넣고 서버를 다시 켜 주세요'
  : e.message;

const send = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};
const readJson = (req) =>
  new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (c) => {
      s += c;
      if (s.length > 10_000) { reject(new Error('요청 본문이 너무 커요')); req.destroy(); }
    });
    req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch { reject(new Error('JSON 형식이 아니에요')); } });
    req.on('error', reject);
  });
const isPersona = (p) => p === 'A' || p === 'B';

async function api(req, res) {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/api/state') {
      const p = url.searchParams.get('p');
      return isPersona(p) ? send(res, 200, state(p)) : send(res, 400, { error: '페르소나는 A 또는 B예요' });
    }
    if (req.method !== 'POST') return send(res, 404, { error: '없는 주소예요' });
    const body = await readJson(req);
    if (!isPersona(body.p)) return send(res, 400, { error: '페르소나는 A 또는 B예요' });
    const now = new Date();
    if (url.pathname === '/api/chat') {
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text || text.length > 1000) return send(res, 400, { error: '메시지는 1~1000자로 보내 주세요' });
      return send(res, 200, await chat(body.p, text));
    }
    if (url.pathname === '/api/vitals') {
      const bpm = Number(body.bpm);
      if (!(bpm >= 40 && bpm <= 180)) return send(res, 400, { error: '심박이 측정 범위(40~180)를 벗어났어요' });
      upsertDaily.run(body.p, dateKey(now), null, null, Math.round(bpm));
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/api/done') {
      if (!ROUTINES.some((r) => r.id === body.routine) || ![0, 1, 2].includes(body.after)) return send(res, 400, { error: '잘못된 기록이에요' });
      q('INSERT INTO done (persona, ts, routine, after) VALUES (?, ?, ?, ?)').run(body.p, stamp(now), body.routine, body.after);
      return send(res, 200, { ok: true });
    }
    send(res, 404, { error: '없는 주소예요' });
  } catch (e) {
    console.error(e);
    send(res, 502, { error: explain(e) });
  }
}

const server = http.createServer();
const vite = await createVite({ root: import.meta.dirname, appType: 'spa', server: { middlewareMode: true, hmr: { server } } });
server.on('request', (req, res) => (req.url.startsWith('/api/') ? api(req, res) : vite.middlewares(req, res)));
server.listen(PORT, () => console.log(`마음 5분 매트릭스 → http://localhost:${PORT}`));
