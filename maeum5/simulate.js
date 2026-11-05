// 시연 데이터 쌓기: Claude가 가상 페르소나를 연기하며, 실행 중인 서버의 챗봇(/api/chat)과 대화한다.
// 사용: 한 터미널에서 `npm start`, 다른 터미널에서 `npm run simulate -- A 6` (페르소나 A|B, 주고받을 횟수)
// 기록 시간대는 실행 시각 기준이라 아침·낮·저녁·밤에 나눠 돌리면 시간대 패턴이 쌓인다.
import Anthropic from '@anthropic-ai/sdk';
import { PERSONAS } from './src/content.js';
import { slotOf } from './src/lib.js';

const [p = 'A', turns = '6'] = process.argv.slice(2);
const P = PERSONAS[p];
if (!P) throw new Error('페르소나는 A 또는 B예요');
const BASE = `http://localhost:${process.env.PORT ?? 5173}`;
const now = new Date();
const client = new Anthropic();
const convo = []; // 페르소나 입장: 챗봇의 말이 user, 페르소나의 답이 assistant
let botSaid = '(셀프케어 앱 챗봇을 열었어요. 지금 상황과 기분을 짧게 이야기해 주세요.)';

for (let i = 0; i < Number(turns); i++) {
  convo.push({ role: 'user', content: botSaid });
  const r = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: `너는 셀프케어 앱 시연용 가상 인물 '${P.name}'(${P.age}세, ${P.label})을 연기한다. ${P.summary}
생활 패턴: ${P.pattern}
지금은 ${slotOf(now)}(${now.getHours()}시)이다. 앱 챗봇의 말에 이 인물로서 한국어 구어체 1~2문장으로만 답해.
지금 시간대에 맞는 상황을 말하고, 수면 시간·카페인·장소를 가끔 구체적으로 섞어. 자해나 자살에 관한 표현은 쓰지 마.`,
    messages: convo,
  });
  const said = r.content.find((b) => b.type === 'text')?.text.trim();
  if (r.stop_reason === 'refusal' || !said) break;
  convo.push({ role: 'assistant', content: said });
  const res = await fetch(`${BASE}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ p, text: said }) });
  const out = await res.json();
  if (!res.ok) throw new Error(out.error);
  const got = [out.emotion, out.slot, out.place, out.mood != null && `기분 ${out.mood}`,
    out.sleep_hours != null && `수면 ${out.sleep_hours}시간`, out.caffeine_cups != null && `카페인 ${out.caffeine_cups}잔`].filter(Boolean);
  console.log(`${P.name}: ${said}\n봇: ${out.reply}\n  → 기록: ${got.join(' · ') || '없음'}\n`);
  botSaid = out.reply;
}
