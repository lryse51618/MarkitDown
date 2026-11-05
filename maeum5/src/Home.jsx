// 홈 — '지금 체크'(골라서 10초 또는 털어놓기 1분 → 감정 × 장소 → 5분 행동) · 마음 정원 · 나와의 약속 · 2주 마음 점검(PHQ-9). 내 기록은 이 기기에만 저장
import { useEffect, useRef, useState } from 'react';
import { PHQ9, PLACES, ROUTINES } from './content.js';
import { EMOTIONS, OK, SLOTS, duePromise, gardenStats, josa, pickNow, slotOf, slotStats, stamp, ventNudge } from './lib.js';
import { Action, CTA, Logo, loadMe, saveMe } from './common.jsx';
import Vent from './Vent.jsx';

// 잎 색은 감정의 결 세 묶음. 다섯 색으로 나누면 색약 검사를 통과하지 못해서 dataviz 검증 팔레트 1~3번으로 묶었다
const FAMILY = { '무기력·우울': 'low', '고독·소외감': 'low', '불안·과부하': 'high', '분노·울분': 'high', [OK]: 'ok' };
const FAMILY_STYLE = {
  low: { color: '#2a78d6', label: '가라앉은 마음' },
  high: { color: '#eb6834', label: '긴장된 마음' },
  ok: { color: '#1baf7a', label: '괜찮은 마음' },
};
const leafColor = (emotion) => FAMILY_STYLE[FAMILY[emotion ?? OK]].color;
const GREET = { 아침: '좋은 아침이에요', 낮: '오후도 수고 많아요', 저녁: '오늘 하루 어땠어요', 밤: '늦은 밤이에요' };
const byId = (id) => ROUTINES.find((r) => r.id === id);
const PICK = 'bg-brand-soft text-brand-ink ring-2 ring-brand';
const IDLE = 'bg-[#F2F4F6] text-[#333D4B] hover:bg-[#E5E8EB]';

export default function Home() {
  const [me, setMe] = useState(loadMe);
  const [mode, setMode] = useState('pick'); // pick 골라서 10초 · vent 털어놓기 1분
  const [emotion, setEmotion] = useState(null);
  const [place, setPlace] = useState(null);
  const [picks, setPicks] = useState([]); // 고른 순간에 정한다. 해본 뒤 순서가 바뀌어 카드가 갈리지 않게
  const [alt, setAlt] = useState(0);
  const [fromPromise, setFromPromise] = useState(null); // 약속에서 바로 시작한 행동
  const [done, setDone] = useState(null); // 방금 해본 행동 → 약속 정하기
  const [grew, setGrew] = useState(false);
  const [toast, setToast] = useState('');
  const resultRef = useRef(null);

  const update = (fn) => setMe((m) => { const next = fn(m); saveMe(next); return next; });
  const now = new Date();
  const slot = slotOf(now);
  const due = duePromise(me.promises, now);
  const hint = slotStats(me.checks).find((s) => s.slot === slot);
  const r = picks.length ? picks[alt % picks.length] : null;
  const lastPhq = me.phq.at(-1);
  const nudge = ventNudge(me.vents, now, PHQ9.items);

  useEffect(() => { if (r) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [r?.id]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const chooseEmotion = (e) => { setEmotion(e); setPlace(null); setPicks([]); setFromPromise(null); setDone(null); setAlt(0); };
  const choosePlace = (p, e = emotion) => {
    setPlace(p); setAlt(0); setDone(null);
    setPicks(pickNow(ROUTINES, { emotion: e, place: p, slot, leaves: me.leaves }));
    update((m) => ({ ...m, checks: [...m.checks, { ts: stamp(new Date()), slot, emotion: e, place: p }].slice(-300) }));
  };
  const switchMode = (m) => { setMode(m); chooseEmotion(null); };
  // 털어놓은 글에서 읽힌 감정(과 장소)으로 바로 5분 행동까지. 기기에는 신호만 남기고 글은 남기지 않는다
  const onVent = (res) => {
    update((m) => ({ ...m, vents: [...m.vents, { ts: stamp(new Date()), emotion: res.emotion, signals: res.signals }].slice(-100) }));
    if (!res.emotion) return; // 위기 안내만 보여줄 때
    chooseEmotion(res.emotion);
    if (res.place) choosePlace(res.place, res.emotion);
  };
  const onDone = (routine) => (after) => {
    update((m) => ({
      ...m,
      leaves: [...m.leaves, { ts: stamp(new Date()), emotion, routine: routine.id, after }].slice(-300),
      promises: fromPromise ? m.promises.map((p) => (p.id === fromPromise.id ? { ...p, kept: (p.kept ?? 0) + 1 } : p)) : m.promises,
    }));
    setGrew(true);
    if (fromPromise) setToast('약속을 지켰어요! 정원에 잎이 하나 났어요');
    else setDone(routine);
  };
  const markShown = (id) => update((m) => ({ ...m, promises: m.promises.map((p) => (p.id === id ? { ...p, shown: stamp(new Date()) } : p)) }));
  const startPromise = () => {
    markShown(due.id);
    setFromPromise(due); setEmotion(due.emotion); setPlace(null); setPicks([byId(due.routine)].filter(Boolean)); setDone(null); setAlt(0);
  };
  const savePromise = (when, note) => {
    update((m) => ({
      ...m,
      promises: [{ id: Date.now(), slot: when, routine: done.id, emotion, note, from: stamp(new Date()), shown: null, kept: 0 },
        ...m.promises.filter((p) => !(p.slot === when && p.routine === done.id))].slice(0, 10),
    }));
    setDone(null);
    setToast(`약속했어요. ${when}에 앱을 열면 먼저 보여드릴게요`);
  };

  return (
    <div className="min-h-dvh bg-[#F2F4F6]">
      <header className="sticky top-0 z-10 bg-[#F2F4F6]/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2 px-6 py-4 text-sm">
          <span className="flex items-center gap-2 text-[17px] font-bold text-[#191F28]"><Logo size={26} />마음 5분</span>
          <a href="/pricing" className="ml-auto text-[#8B95A1] hover:text-[#333D4B]">요금 안내</a>
          <a href="/demo" className="ml-3 text-[#8B95A1] hover:text-[#333D4B]">시연</a>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-4 pb-12">
        {due && !fromPromise && <PromiseDue p={due} onStart={startPromise} onSkip={() => markShown(due.id)} />}

        <section className="enter rounded-3xl bg-white p-6">
          <p className="text-sm font-medium text-[#8B95A1]">{GREET[slot]} · 지금 체크</p>
          <h1 className="mt-1 text-[24px] font-bold leading-snug tracking-tight text-[#191F28]">지금 마음은 어때요?</h1>
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-[#F2F4F6] p-1">
            {[['pick', '골라서 10초'], ['vent', '털어놓기 1분']].map(([id, label]) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => switchMode(id)}
                className={`rounded-xl py-2.5 text-[15px] font-semibold transition ${mode === id ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#6B7684] hover:text-[#333D4B]'}`}>{label}</button>
            ))}
          </div>
          {mode === 'vent' ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-[#6B7684]">고르기 어려운 날엔 감정 쓰레기통에 쏟아내요. AI가 마음에 이름을 붙여 주고, 글은 바로 버려요.</p>
              <Vent onRead={onVent} onReset={() => chooseEmotion(null)} onPick={() => switchMode('pick')} />
            </>
          ) : (
            <>
              {hint?.top && hint.topN >= 2 && <p className="mt-3 text-sm text-[#6B7684]">이 시간엔 보통 {josa(hint.top, '을', '를')} 골랐어요.</p>}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[...EMOTIONS, OK].map((e) => (
                  <button key={e} type="button" aria-pressed={emotion === e} onClick={() => chooseEmotion(e)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-4 text-left text-[16px] font-semibold transition active:scale-[0.98] ${e === OK ? 'col-span-2' : ''} ${emotion === e ? PICK : IDLE} ${hint?.top === e && emotion !== e ? 'ring-1 ring-brand/60' : ''}`}>
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: leafColor(e) }} aria-hidden="true" />
                    {e === OK ? '괜찮아요' : e}
                  </button>
                ))}
              </div>
            </>
          )}
          {emotion && !fromPromise && (
            <div className="enter mt-5">
              <p className="text-[17px] font-bold text-[#191F28]">지금 어디에 있어요?</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {PLACES.map((p) => (
                  <button key={p.id} type="button" aria-pressed={place === p.id} onClick={() => choosePlace(p.id)}
                    className={`rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition active:scale-[0.98] ${place === p.id ? PICK : IDLE}`}>{p.label}</button>
                ))}
              </div>
            </div>
          )}
        </section>

        {r && (
          <div ref={resultRef} className="enter scroll-mt-20 space-y-2">
            <p className="px-2 pt-2 text-sm text-[#6B7684]">
              {fromPromise ? '지난번의 내가 정해 둔 5분이에요.'
                : `${mode === 'vent' ? '쏟아낸 마음은 몸으로 가라앉혀요. ' : ''}${PLACES.find((p) => p.id === place)?.label}에서 지금 할 수 있는 5분이에요. 해보고 나아졌던 행동일수록 먼저 나와요.`}
            </p>
            <Action key={`${r.id}-${alt}`} r={r} best onDone={onDone(r)} />
            {!fromPromise && !done && picks.length > 1 && (
              <button type="button" onClick={() => setAlt(alt + 1)} className="w-full rounded-2xl bg-white py-3.5 text-[15px] font-semibold text-[#4E5968] transition active:scale-[0.98]">
                다른 5분 행동 보기 ({(alt % picks.length) + 1}/{picks.length})
              </button>
            )}
          </div>
        )}
        {done && <PromiseForm slot={slot} r={done} onSave={savePromise} onSkip={() => setDone(null)} />}

        <Garden leaves={me.leaves} grew={grew} />
        <PhqCard last={lastPhq} now={now} nudge={nudge} />
        {me.promises.length > 0 && <Promises list={me.promises} onRemove={(id) => update((m) => ({ ...m, promises: m.promises.filter((p) => p.id !== id) }))} />}

        <p className="px-2 pt-2 text-center text-xs leading-relaxed text-[#8B95A1]">
          의료 서비스가 아닌 셀프케어 보조 앱이에요. 힘들 때: 자살예방상담 109 · 정신건강위기상담 1577-0199.<br />지금 체크·정원·약속은 이 기기에만 저장돼요. 털어놓은 글은 저장하지 않아요.
        </p>
      </main>
      {toast && <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#191F28] px-4 py-2.5 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}

function PromiseDue({ p, onStart, onSkip }) {
  return (
    <section className="enter rounded-3xl bg-brand-soft p-6 ring-1 ring-brand/40">
      <p className="text-sm font-semibold text-brand-ink">{p.slot}의 나에게 · 지난번의 내가 한 약속</p>
      <p className="mt-2 text-[19px] font-bold leading-snug text-[#191F28]">
        {p.emotion && p.emotion !== OK ? `${josa(p.emotion, '이', '가')} 오면` : '이 시간이 오면'} → {byId(p.routine)?.title}
      </p>
      {p.note && <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-[15px] leading-relaxed text-[#333D4B]">“{p.note}”</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onSkip} className="rounded-2xl bg-white py-4 font-semibold text-[#4E5968] transition active:scale-[0.98]">오늘은 넘길게요</button>
        <button type="button" onClick={onStart} className={`${CTA} py-4`}>지금 해볼게요</button>
      </div>
    </section>
  );
}

function PromiseForm({ slot, r, onSave, onSkip }) {
  const [when, setWhen] = useState(slot);
  const [note, setNote] = useState('');
  return (
    <section className="enter rounded-3xl bg-white p-6">
      <p className="text-[18px] font-bold text-[#191F28]">이 5분, 언제 또 필요할까요?</p>
      <p className="mt-1 text-sm leading-relaxed text-[#6B7684]">정해 두면 그 시간에 앱을 열 때 ‘{r.title}’ 카드를 먼저 보여드려요. 그때의 나에게 한 줄 남겨도 좋아요.</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {SLOTS.map((s) => (
          <button key={s} type="button" aria-pressed={when === s} onClick={() => setWhen(s)}
            className={`rounded-2xl py-3 text-[15px] font-semibold transition active:scale-[0.97] ${when === s ? PICK : IDLE}`}>{s}</button>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} placeholder="그때의 나에게 (예: 일단 발가락부터!)" aria-label="그때의 나에게 한 줄"
        className="mt-3 w-full rounded-2xl bg-[#F2F4F6] px-4 py-3.5 text-[15px] text-[#191F28] outline-none placeholder:text-[#B0B8C1] focus:ring-2 focus:ring-brand" />
      <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
        <button type="button" onClick={onSkip} className="rounded-2xl bg-[#F2F4F6] py-4 font-semibold text-[#4E5968] transition active:scale-[0.98]">괜찮아요</button>
        <button type="button" onClick={() => onSave(when, note.trim())} className={`${CTA} py-4`}>약속하기</button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[#8B95A1]">“그 시간이 오면 → 이 행동”처럼 미리 정해 두면 실행률이 올라가요 (Gollwitzer & Sheeran, 2006 메타분석). 약속은 이 기기에만 저장돼요.</p>
    </section>
  );
}

function Garden({ leaves, grew }) {
  const stats = gardenStats(leaves);
  const shown = leaves.slice(-24);
  const W = 320, H = stats.n ? 222 : 70, base = H - 22, top = base - Math.min(172, 44 + shown.length * 6); // 씨앗만 있을 땐 낮게
  const xAt = (y) => W / 2 + 6 * Math.sin((base - y) / 38); // 살짝 휘는 줄기
  const stem = Array.from({ length: Math.ceil((base - top) / 6) + 1 }, (_, k) => Math.max(top, base - k * 6)).map((y, k) => `${k ? 'L' : 'M'}${xAt(y).toFixed(1)} ${y}`).join(' ');
  const step = shown.length > 1 ? (base - 18 - (top + 16)) / (shown.length - 1) : 0;
  const families = ['low', 'high', 'ok'].map((f) => ({ ...FAMILY_STYLE[f], n: Object.entries(stats.by).filter(([e]) => FAMILY[e] === f).reduce((s, [, n]) => s + n, 0) }));
  return (
    <section className="rounded-3xl bg-white p-6">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[18px] font-bold text-[#191F28]">마음 정원</h2>
        <span className="ml-auto text-sm text-[#8B95A1]">잎 {stats.n}장 · 기록한 날 {stats.days}일</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block h-auto w-full" role="img"
        aria-label={stats.n ? `마음 정원: 잎 ${stats.n}장, 해보고 나아진 순간 ${stats.better}번` : '마음 정원: 아직 씨앗이에요'}>
        <ellipse cx={W / 2} cy={base + 8} rx="118" ry="13" fill="#E3F6EA" />
        {stats.n === 0 ? (
          <ellipse cx={W / 2} cy={base - 2} rx="10" ry="7" fill="#B08968" />
        ) : (
          <path d={stem} stroke="#2F9E5B" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {shown.map((l, i) => {
          const y = base - 18 - i * step, side = i % 2 ? 1 : -1, s = [0.8, 1, 1.25][l.after] ?? 1;
          return (
            <g key={`${l.ts}-${i}`} transform={`translate(${xAt(y).toFixed(1)} ${y.toFixed(1)}) rotate(${side * -35}) scale(${side * s} ${s})`}>
              <path d="M0 0 Q16 -12 34 0 Q16 12 0 0 Z" fill={leafColor(l.emotion)} className={grew && i === shown.length - 1 ? 'grow' : ''} />
            </g>
          );
        })}
        {stats.days >= 14 && (
          <g transform={`translate(${xAt(top).toFixed(1)} ${top})`}>
            {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={9 * Math.cos((a * Math.PI) / 180)} cy={9 * Math.sin((a * Math.PI) / 180)} r="7" fill="#FFD43B" />)}
            <circle r="6" fill="#F59F00" />
          </g>
        )}
      </svg>
      {stats.n === 0 ? (
        <p className="mt-2 text-[15px] leading-relaxed text-[#4E5968]">아직 씨앗이에요. 5분 행동을 하나 해보면 첫 잎이 나요. 잎 색은 그때의 마음, 크기는 해보고 나아진 만큼이에요.</p>
      ) : (
        <p className="mt-2 text-[15px] leading-relaxed text-[#4E5968]">잎 {stats.n}장 중 {stats.better}번은 해보고 나아졌어요.</p>
      )}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#4E5968]">
        {families.map((f) => (
          <li key={f.label} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: f.color }} aria-hidden="true" />{f.label} {f.n}</li>
        ))}
      </ul>
      {stats.best.length > 0 && (
        <div className="mt-4 rounded-2xl bg-[#F9FAFB] p-4">
          <p className="text-sm font-bold text-[#333D4B]">내게 잘 맞았던 행동</p>
          <ul className="mt-2 space-y-1.5">
            {stats.best.map((b) => (
              <li key={b.id} className="flex text-sm text-[#4E5968]"><span className="min-w-0 flex-1 truncate">{byId(b.id)?.title}</span><span className="ml-2 shrink-0 tabular-nums">{b.n}번 중 {b.better}번 나아짐</span></li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-sm text-[#4E5968]">
        {stats.days >= 14 ? <>꽃이 피었어요. 30일 보고서를 만들 만큼 기록이 쌓였어요. <a href="/pricing" className="font-semibold text-brand-ink underline">보고서 알아보기</a></> : `기록한 날이 14일이 되면 꽃이 펴요 (${stats.days}/14).`}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[#8B95A1]">기록을 눈으로 보면 이어가기 쉬워요 (Harkin et al., 2016 메타분석).</p>
    </section>
  );
}

function PhqCard({ last, now, nudge }) {
  const due = !last || (now - new Date(last.ts)) / 864e5 >= 14 || nudge;
  return (
    <a href="/phq9" className="block rounded-3xl bg-white p-6 transition active:scale-[0.99]">
      <div className="flex items-center gap-2">
        <p className="text-[17px] font-bold text-[#191F28]">2주 마음 점검</p>
        {due && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink">{nudge || last ? '점검할 때예요' : '처음 해보기'}</span>}
        <span className="ml-auto text-xl text-[#B0B8C1]" aria-hidden="true">›</span>
      </div>
      <p className="mt-1 text-sm text-[#6B7684]">PHQ-9 9문항 · 약 1분 · 2주에 한 번이면 충분해요</p>
      {nudge && <p className="mt-2 rounded-2xl bg-brand-soft px-4 py-3 text-sm leading-relaxed text-[#1E3A2B]">최근 2주 털어놓은 글에서 ‘{nudge.short}’ 신호가 {nudge.n}번 보였어요. 9문항으로 차분히 점검해 볼까요?</p>}
      {last && <p className="mt-2 text-sm text-[#4E5968]">지난 점검 {Number(last.ts.slice(5, 7))}/{Number(last.ts.slice(8, 10))} · {last.total}점</p>}
    </a>
  );
}

function Promises({ list, onRemove }) {
  return (
    <section className="rounded-3xl bg-white p-6">
      <p className="text-[17px] font-bold text-[#191F28]">나와의 약속</p>
      <ul className="mt-2 divide-y divide-[#F2F4F6]">
        {list.map((p) => (
          <li key={p.id} className="flex items-start gap-3 py-3">
            <span className="mt-0.5 shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink">{p.slot}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-[#333D4B]">{byId(p.routine)?.title}</p>
              {p.note && <p className="text-sm text-[#8B95A1]">“{p.note}”</p>}
              {p.kept > 0 && <p className="text-xs font-semibold text-brand-ink">{p.kept}번 지켰어요</p>}
            </div>
            <button type="button" onClick={() => onRemove(p.id)} aria-label={`${p.slot} 약속 지우기`} className="shrink-0 text-sm text-[#B0B8C1] hover:text-[#6B7684]">지우기</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
