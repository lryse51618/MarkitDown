// 마음 5분 매트릭스 — 시연 화면 (한 화면에 페르소나 전환 · 7일 차트 · 웹캠 심박 · AI 대화 · 5분 루틴)
import { useEffect, useRef, useState } from 'react';
import { FEATURE_EVIDENCE, LEVELS, PERSONAS, ROUTINES } from './content.js';
import { EMOTIONS, MIN_DAYS, dateKey, estimateBpm, insights, mean, slotOf, slotStats, SLOTS } from './lib.js';

// 차트 색: dataviz 기본 팔레트 1~3번(색약 검사 통과). 3번 청록은 대비 3:1 미만이라 값 라벨·표 보기를 함께 둔다.
const C = { sleep: '#2a78d6', caffeine: '#eb6834', hr: '#1baf7a', grid: '#e1e0d9', axis: '#c3c2b7', muted: '#898781', ink: '#0b0b0b' };
const CHIP = {
  '무기력·우울': 'bg-indigo-50 text-indigo-800', '불안·과부하': 'bg-amber-50 text-amber-900',
  '분노·울분': 'bg-rose-50 text-rose-800', '고독·소외감': 'bg-sky-50 text-sky-800', 괜찮음: 'bg-stone-100 text-stone-700',
};
const AFTER = ['그대로예요', '조금 나아졌어요', '많이 나아졌어요'];
const DURATION = 15000; // 심박 측정 시간(ms)
const MIN_QUALITY = 0.25; // 이보다 신호가 약하면 저장하지 않는다

const api = async (path, body) => {
  const r = await fetch(path, body && { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `요청 실패 (${r.status})`);
  return j;
};
const md = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const r1 = (v) => (v == null ? '–' : Math.round(v * 10) / 10);
const daysAgo = (n) => dateKey(new Date(Date.now() - n * 864e5));
const josa = (word, withFinal, without) => word + ((word.charCodeAt(word.length - 1) - 0xac00) % 28 ? withFinal : without); // 과부하를 / 우울을

export default function App() {
  const [p, setP] = useState('A');
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('now');
  const [slot, setSlot] = useState(() => slotOf(new Date()));
  const [focus, setFocus] = useState(null);
  const [live, setLive] = useState(null); // 방금 대화에서 뽑힌 값
  const [rating, setRating] = useState(null);
  const [toast, setToast] = useState('');
  const [asTable, setAsTable] = useState(false);
  const want = useRef(p);

  const load = () => api(`/api/state?p=${want.current}`).then((d) => d.persona.id === want.current && setS(d)).catch((e) => setErr(e.message));
  useEffect(() => { want.current = p; setLive(null); setRating(null); load(); }, [p]);
  useEffect(() => {
    if (tab === 'evidence' && focus) document.getElementById(`ev-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [tab, focus]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!s) return <p className="p-8 text-stone-500">{err || '불러오는 중…'}</p>;

  const P = s.persona;
  const stale = P.id !== p;
  const week = s.daily.slice(-7);
  const stats = slotStats(s.checkins);
  const worst = stats.filter((x) => x.mood != null).sort((a, b) => a.mood - b.mood)[0]?.slot;
  const ins = insights(s.daily, s.checkins);
  const dayMood = (date) => mean(s.checkins.filter((c) => c.ts.startsWith(date) && c.mood != null).map((c) => c.mood));
  const today = dateKey(new Date());
  const baseline = mean(s.daily.filter((d) => d.date !== today && d.hr_bpm != null).slice(-7).map((d) => d.hr_bpm));

  const st = stats.find((x) => x.slot === slot);
  const liveEmotion = live && live.slot === slot && EMOTIONS.includes(live.emotion) ? live.emotion : null;
  const emotion = liveEmotion ?? st.top;
  const picks = emotion
    ? ROUTINES.filter((r) => r.emotion === emotion).sort((a, b) => b.slots.includes(slot) - a.slots.includes(slot))
    : ROUTINES.filter((r) => r.id === 'sigh' || r.id === 'label');
  const reason = liveEmotion
    ? `방금 대화에서 ${josa(liveEmotion, '이', '가')} 느껴져서 골랐어요.`
    : st.top ? `최근 14일 ${slot}에 ${josa(st.top, '을', '를')} ${st.topN}번 기록해서 골랐어요.` : `${slot} 기록이 아직 적어서 어디서나 할 수 있는 행동을 골랐어요.`;
  const weekDays = [...Array(7)].map((_, i) => daysAgo(6 - i));
  const doneWeek = s.done.filter((d) => d.ts.slice(0, 10) >= weekDays[0]);

  const showEvidence = (id) => { setFocus(id); setTab('evidence'); };
  const markDone = async (routine, after) => {
    try {
      await api('/api/done', { p: P.id, routine, after });
      setRating(null);
      setToast(`기록했어요. 이번 주 ${doneWeek.length + 1}번째 작은 행동이에요.`);
      load();
    } catch (e) { setToast(e.message); }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <h1 className="text-lg font-bold">마음 5분 매트릭스</h1>
            <p className="text-xs text-stone-500">셀프케어 보조 앱 · 의료 서비스가 아니에요</p>
          </div>
          <div role="group" aria-label="시연 페르소나 전환" className="flex rounded-full bg-stone-100 p-1 text-sm">
            {Object.values(PERSONAS).map((x) => (
              <button key={x.id} type="button" aria-pressed={p === x.id} onClick={() => setP(x.id)}
                className={`rounded-full px-4 py-1.5 transition ${p === x.id ? 'bg-stone-900 text-white shadow' : 'text-stone-600 hover:text-stone-900'}`}>
                {x.id} · {x.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      {err && <p role="alert" className="mx-auto max-w-7xl px-4 pt-3 text-sm text-red-700">{err}</p>}

      <main className={`mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-12 ${stale ? 'pointer-events-none opacity-50' : ''}`}>
        <Panel className="lg:col-span-4" title={`${P.name} (${P.age})`} note={`${P.label} · 시연용 가상 인물`}>
          <p className="text-sm text-stone-700">{P.summary}</p>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">{P.pattern}</p>
          <h3 className="mt-4 text-sm font-medium">시간대별 마음 패턴 <span className="text-xs font-normal text-stone-500">최근 14일 · 기분 평균(1~10)</span></h3>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {stats.map((x) => (
              <button key={x.slot} type="button" onClick={() => { setSlot(x.slot); setTab('now'); }}
                className={`rounded-xl border p-2 text-left ${x.slot === worst ? 'border-stone-900 bg-white' : 'border-stone-200 bg-stone-50'} ${x.slot === slot ? 'ring-2 ring-stone-300' : ''}`}>
                <div className="flex items-center justify-between text-xs text-stone-500">{x.slot}{x.slot === worst && <span className="font-medium text-stone-900">최저</span>}</div>
                <div className="text-lg font-semibold">{r1(x.mood)}</div>
                <div className="h-1.5 rounded-full bg-[#cde2fb]"><div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${(x.mood ?? 0) * 10}%` }} /></div>
                <div className="mt-1 text-[11px] leading-tight text-stone-600">{x.top ? <>{x.top}<br />{x.topN}회</> : '기록 적음'}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-stone-50 p-3">
            <div className="text-sm font-medium">기록에서 보이는 경향 <span className="text-xs font-normal text-stone-500">상관·시차상관 · {ins.n}일</span></div>
            {ins.n < MIN_DAYS ? (
              <p className="mt-1 text-sm text-stone-600">기록 {ins.n}일째예요. {MIN_DAYS}일부터 패턴 분석이 열리고, 그전엔 평균만 보여드려요.</p>
            ) : ins.items.length ? (
              <ul className="mt-1 space-y-0.5 text-sm">
                {ins.items.slice(0, 3).map((it) => <li key={it.text}>· {it.text} <span className="whitespace-nowrap text-xs text-stone-500 tabular-nums">r = {it.r.toFixed(2)}</span></li>)}
              </ul>
            ) : <p className="mt-1 text-sm text-stone-600">아직 뚜렷한 경향은 없어요.</p>}
            <p className="mt-1 text-[11px] text-stone-500">짧은 기간의 상관이라 원인이 아니라 경향이에요. 하루하루 이어진 기록이라 p값은 표시하지 않아요.</p>
          </div>
        </Panel>

        <Panel className="lg:col-span-5" title="최근 7일 기록"
          action={<button type="button" onClick={() => setAsTable(!asTable)} className="text-xs text-stone-600 underline">{asTable ? '차트로 보기' : '표로 보기'}</button>}>
          {asTable ? (
            <table className="w-full text-sm tabular-nums">
              <thead className="text-xs text-stone-500">
                <tr><th className="py-1 text-left font-normal">날짜</th><th className="text-right font-normal">수면</th><th className="text-right font-normal">카페인</th><th className="text-right font-normal">심박</th><th className="text-right font-normal">기분</th></tr>
              </thead>
              <tbody>
                {week.map((d) => (
                  <tr key={d.date} className="border-t border-stone-100">
                    <td className="py-1">{md(d.date)}</td><td className="text-right">{d.sleep_h ?? '–'}시간</td><td className="text-right">{d.caffeine_cups ?? '–'}잔</td>
                    <td className="text-right">{d.hr_bpm ?? '–'}bpm</td><td className="text-right">{r1(dayMood(d.date))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-3">
              <MiniChart title="수면" unit="시간" color={C.sleep} rows={week} k="sleep_h" kind="bar" />
              <MiniChart title="카페인" unit="잔" color={C.caffeine} rows={week} k="caffeine_cups" kind="bar" />
              <MiniChart title="안정 시 심박" unit="bpm" color={C.hr} rows={week} k="hr_bpm" kind="line" />
            </div>
          )}
        </Panel>

        <Panel className="lg:col-span-3" title="웹캠 심박 측정" note="rPPG · 참고용">
          <Rppg key={P.id} baseline={baseline} onEvidence={() => showEvidence('rppg')}
            onSave={async (bpm) => { await api('/api/vitals', { p: P.id, bpm }); load(); }} />
        </Panel>

        <Panel className="lg:col-span-5" title="AI 대화" note="설문 대신 대화로 기록해요">
          <Chat s={s} onSent={(r) => { setLive(r); if (r.slot) setSlot(r.slot); setTab('now'); load(); }} />
        </Panel>

        <Panel className="lg:col-span-7" title="상황별 5분 루틴"
          action={
            <div role="tablist" className="flex gap-1 text-sm">
              {[['now', '지금 추천'], ['table', '감정별 행동표'], ['evidence', '근거 자료']].map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                  className={`rounded-full px-3 py-1 ${tab === id ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>{label}</button>
              ))}
            </div>
          }>
          {tab === 'now' && (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {SLOTS.map((x) => (
                  <button key={x} type="button" onClick={() => setSlot(x)}
                    className={`rounded-full border px-3 py-1 text-sm ${slot === x ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 hover:bg-stone-100'}`}>
                    {x}{x === slotOf(new Date()) && <span className="ml-1 text-xs opacity-70">지금</span>}
                  </button>
                ))}
                <span className="ml-auto flex items-center gap-1 text-xs text-stone-600" title="한 번이라도 했다면 충분해요">
                  이번 주 작은 행동 {doneWeek.length}번
                  {weekDays.map((d) => <span key={d} className={`size-2 rounded-full ${doneWeek.some((x) => x.ts.startsWith(d)) ? 'bg-stone-900' : 'bg-stone-200'}`} />)}
                </span>
              </div>
              <p className="mt-2 text-sm text-stone-600">{P.name}님, {reason}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {picks.map((r) => {
                  const mine = s.done.filter((d) => d.routine === r.id);
                  return (
                    <article key={r.id} className="flex flex-col rounded-2xl border border-stone-200 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 ${CHIP[r.emotion]}`}>{r.emotion}</span>
                        <span className="text-stone-500">{r.situation}</span>
                        <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5">{r.minutes}분</span>
                      </div>
                      <h3 className="mt-2 font-semibold">{r.title}</h3>
                      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm">{r.steps.map((x) => <li key={x}>{x}</li>)}</ol>
                      <p className="mt-2 text-xs text-stone-500">{r.why}</p>
                      <div className="mt-auto flex flex-wrap gap-x-2 gap-y-0.5 pt-3 text-xs text-stone-600">
                        <button type="button" onClick={() => showEvidence(r.id)} className="whitespace-nowrap underline">근거 {r.level}등급 · 연구 {r.refs.length}편</button>
                        {mine.length > 0 && <span className="whitespace-nowrap">내 기록 {mine.length}번 중 {mine.filter((d) => d.after > 0).length}번 나아짐</span>}
                      </div>
                      {rating === r.id ? (
                        <div className="mt-2 rounded-xl bg-stone-50 p-2 text-xs">
                          <div className="mb-1 text-stone-600">해보고 나니 어때요?</div>
                          <div className="flex flex-wrap gap-1">
                            {AFTER.map((t, i) => <button key={t} type="button" onClick={() => markDone(r.id, i)} className="rounded-full border border-stone-300 bg-white px-2 py-1 hover:bg-stone-100">{t}</button>)}
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setRating(r.id)} className="mt-2 rounded-xl bg-stone-900 py-2 text-sm text-white hover:bg-stone-700">해봤어요</button>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs text-stone-500">
                  <tr><th className="py-1 font-normal">감정</th><th className="font-normal">상황</th><th className="font-normal">원리</th><th className="font-normal">5분 행동</th><th className="font-normal">근거</th></tr>
                </thead>
                <tbody>
                  {ROUTINES.map((r) => (
                    <tr key={r.id} className="border-t border-stone-100 align-top">
                      <td className="py-2 pr-2"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${CHIP[r.emotion]}`}>{r.emotion}</span></td>
                      <td className="py-2 pr-2 text-stone-600">{r.situation}</td>
                      <td className="py-2 pr-2 text-stone-600">{r.principle}</td>
                      <td className="py-2 pr-2 font-medium">{r.title} <span className="font-normal text-stone-500">· {r.minutes}분</span></td>
                      <td className="py-2"><button type="button" onClick={() => showEvidence(r.id)} className="whitespace-nowrap underline">{r.level}등급</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'evidence' && (
            <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1 text-sm">
              <p className="text-xs text-stone-500">각 행동을 고른 이유가 된 연구예요. 이 앱 자체의 효과를 뜻하지 않아요. 등급 — {Object.entries(LEVELS).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
              {[...ROUTINES, ...FEATURE_EVIDENCE].map((r) => (
                <div key={r.id} id={`ev-${r.id}`} className={`rounded-xl border p-3 ${focus === r.id ? 'border-stone-900' : 'border-stone-200'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    {r.level ? <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">{r.level}등급</span> : <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">기능 근거</span>}
                    {r.emotion && <span className={`rounded-full px-2 py-0.5 text-xs ${CHIP[r.emotion]}`}>{r.emotion}</span>}
                  </div>
                  {r.use && <p className="mt-1 text-stone-700">{r.use} <span className="text-stone-500">{r.limit}</span></p>}
                  {r.note && <p className="mt-1 text-xs text-amber-900">{r.note}</p>}
                  <ul className="mt-2 space-y-1.5">
                    {r.refs.map((ref) => <li key={ref.cite}><div>{ref.finding}</div><div className="text-xs text-stone-500">{ref.cite}</div></li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-stone-500">
        마음 5분 매트릭스는 의료 서비스가 아닌 셀프케어 보조 앱이에요. 진단하지 않으며 전문 상담을 대신하지 않아요.
        힘들 때: 자살예방상담전화 109 · 정신건강위기상담 1577-0199 · 긴급 112/119. 화면의 인물과 기록은 시연용 가상 데이터예요.
      </footer>
      {toast && <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}

function Panel({ title, note, action, className = '', children }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">{title}</h2>
        {note && <span className="text-xs text-stone-500">{note}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

const bar = (x, y, w, h, r = 4) => {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
};

function MiniChart({ title, unit, color, rows, k, kind }) {
  const [hover, setHover] = useState(null);
  const vals = rows.map((r) => r[k]);
  const have = vals.filter((v) => v != null);
  if (!have.length) return <p className="text-sm text-stone-500">{title}: 기록 없음</p>;
  const W = 480, H = 104, L = 30, R = 10, T = 16, B = 18;
  const hi = Math.max(...have), lo = Math.min(...have);
  const [min, max] = kind === 'bar' ? [0, hi <= 2 ? 2 : Math.ceil(hi / 2) * 2] : [Math.floor((lo - 3) / 10) * 10, Math.ceil((hi + 3) / 10) * 10];
  const y = (v) => T + (H - T - B) * (1 - (v - min) / (max - min));
  const band = (W - L - R) / rows.length;
  const x = (i) => L + band * (i + 0.5);
  const bw = Math.min(22, band * 0.55);
  const shown = hover ?? vals.findLastIndex((v) => v != null);
  const pts = rows.map((r, i) => r[k] != null && [x(i), y(r[k])]).filter(Boolean);
  return (
    <figure>
      <figcaption className="flex items-baseline gap-2 text-sm">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-stone-500">7일 평균 {r1(mean(have))}{unit}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img"
        aria-label={`${title} 최근 7일: ${rows.map((r) => `${md(r.date)} ${r[k] ?? '기록 없음'}`).join(', ')}`}>
        {[min, (min + max) / 2, max].map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={i === 0 && kind === 'bar' ? C.axis : C.grid} />
            <text x={L - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill={C.muted}>{Math.round(t * 10) / 10}</text>
          </g>
        ))}
        {kind === 'line' && hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke={C.axis} />}
        {kind === 'bar'
          ? rows.map((r, i) => r[k] > 0 && <path key={r.date} d={bar(x(i) - bw / 2, y(r[k]), bw, y(0) - y(r[k]))} fill={color} opacity={hover == null || hover === i ? 1 : 0.4} />)
          : <>
              <polyline points={pts.map((pt) => pt.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map(([px, py]) => <circle key={px} cx={px} cy={py} r="4" fill={color} stroke="#fff" strokeWidth="2" />)}
            </>}
        {rows.map((r, i) => <text key={r.date} x={x(i)} y={H - 4} textAnchor="middle" fontSize="10" fill={C.muted}>{md(r.date)}</text>)}
        {shown >= 0 && vals[shown] != null && (
          <text x={x(shown)} y={y(vals[shown]) - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill={C.ink}>{vals[shown]}{unit}</text>
        )}
        {rows.map((r, i) => (
          <rect key={r.date} x={L + band * i} y={0} width={band} height={H} fill="transparent" tabIndex={0} className="outline-none focus:fill-stone-900/5"
            aria-label={`${md(r.date)} ${r[k] == null ? '기록 없음' : r[k] + unit}`}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
        ))}
      </svg>
    </figure>
  );
}

function Rppg({ baseline, onSave, onEvidence }) {
  const video = useRef(null);
  const canvas = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | run | done | error
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (phase !== 'run') return;
    let raf, stream, stopped = false, est = null, lastEst = 0, t0 = 0;
    const v = video.current, cv = canvas.current, ctx = cv.getContext('2d');
    const off = Object.assign(document.createElement('canvas'), { width: 160, height: 120 });
    const octx = off.getContext('2d', { willReadFrequently: true });
    const samples = [];
    const tick = (now) => {
      const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      octx.drawImage(v, 0, 0, 160, 120);
      const px = octx.getImageData(64, 22, 32, 16).data; // 이마 영역(가로 40~60%, 세로 18~32%)
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; b += px[i + 2]; }
      samples.push({ t: now, r: r / (px.length / 4), g: g / (px.length / 4), b: b / (px.length / 4) });
      const elapsed = now - t0;
      if (elapsed > 4000 && now - lastEst > 1000) { est = estimateBpm(samples.filter((x) => x.t > now - 10000)); lastEst = now; }
      drawOverlay(ctx, w, h, now, elapsed / DURATION, samples, est);
      if (elapsed >= DURATION) { setResult(estimateBpm(samples.filter((x) => x.t > now - 12000))); setPhase('done'); return; }
      raf = requestAnimationFrame(tick);
    };
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
      .then(async (st) => {
        stream = st;
        if (stopped) return st.getTracks().forEach((t) => t.stop());
        v.srcObject = st;
        await v.play();
        t0 = performance.now();
        raf = requestAnimationFrame(tick);
      })
      .catch((e) => { setMsg(`카메라를 켤 수 없어요 (${e.name}). 브라우저 카메라 권한을 확인해 주세요.`); setPhase('error'); });
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [phase]);

  const start = () => { setResult(null); setSaved(false); setMsg(''); setPhase('run'); };
  const delta = result && baseline ? result.bpm - Math.round(baseline) : null;
  const good = result && result.quality >= MIN_QUALITY;

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-900">
        <video ref={video} muted playsInline className="absolute inset-0 size-full -scale-x-100 object-cover" />
        <canvas ref={canvas} className="absolute inset-0 size-full" />
        {phase !== 'run' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-stone-200">
            {phase === 'idle' && <p>얼굴을 타원에 맞추고<br />15초간 가만히 있어 주세요</p>}
            {phase === 'error' && <p>{msg}</p>}
          </div>
        )}
      </div>
      {phase === 'done' && result && (
        good ? (
          <div className="mt-3">
            <div className="text-3xl font-semibold">{result.bpm}<span className="ml-1 text-base font-normal text-stone-500">bpm</span></div>
            {delta != null && <p className="text-sm text-stone-600">평소(최근 7일 평균 {Math.round(baseline)})보다 {delta > 0 ? `${delta} 높아요` : delta < 0 ? `${-delta} 낮아요` : '그대로예요'}</p>}
            {delta >= 10 && <p className="mt-1 text-sm text-stone-700">긴장했거나 카페인 영향일 수 있어요. '박스 호흡'을 해보세요.</p>}
            <p className="mt-1 text-xs text-stone-500">신호 품질 {Math.round(result.quality * 100)}% · 의료용 측정이 아니에요</p>
            <button type="button" disabled={saved} onClick={async () => { await onSave(result.bpm); setSaved(true); }}
              className="mt-2 w-full rounded-xl bg-stone-900 py-2 text-sm text-white disabled:bg-stone-300">{saved ? '오늘 기록에 저장했어요' : '오늘 기록에 저장'}</button>
          </div>
        ) : <p className="mt-3 text-sm text-stone-700">신호가 약해요(품질 {Math.round((result?.quality ?? 0) * 100)}%). 밝은 곳에서 얼굴을 타원에 맞추고 다시 재 주세요.</p>
      )}
      {phase !== 'run' && (
        <button type="button" onClick={start} className="mt-3 w-full rounded-xl border border-stone-300 py-2 text-sm hover:bg-stone-100">
          {phase === 'idle' ? '심박 측정 시작' : '다시 측정'}
        </button>
      )}
      <p className="mt-3 text-xs leading-relaxed text-stone-500">
        맥박이 뛸 때마다 이마 피부의 혈류가 바뀌며 생기는 미세한 색 변화를 카메라로 읽어요. 영상은 저장하지 않고 이 브라우저 안에서만 계산해요.{' '}
        <button type="button" onClick={onEvidence} className="underline">근거 보기</button>
      </p>
    </div>
  );
}

function drawOverlay(ctx, w, h, now, progress, samples, est) {
  const cx = w / 2, cy = h * 0.47, rx = w * 0.22, ry = h * 0.36;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(12,10,9,0.45)'; // 얼굴 가이드 바깥을 어둡게
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#34d399'; ctx.strokeRect(w * 0.4, h * 0.18, w * 0.2, h * 0.14); // 측정하는 이마 영역
  const sy = cy - ry + 2 * ry * (0.5 + 0.5 * Math.sin(now / 700)); // 스캔 라인
  const grad = ctx.createLinearGradient(0, sy - 14, 0, sy + 14);
  grad.addColorStop(0, 'rgba(52,211,153,0)'); grad.addColorStop(0.5, 'rgba(52,211,153,0.45)'); grad.addColorStop(1, 'rgba(52,211,153,0)');
  ctx.fillStyle = grad; ctx.fillRect(cx - rx, sy - 14, rx * 2, 28);
  const recent = samples.filter((x) => x.t > now - 4000); // 최근 4초 초록 채널 파형
  if (recent.length > 2) {
    const m = mean(recent.map((x) => x.g));
    const amp = Math.max(0.3, ...recent.map((x) => Math.abs(x.g - m)));
    ctx.strokeStyle = '#34d399'; ctx.beginPath();
    recent.forEach((x, i) => {
      const px = w * 0.06 + (w * 0.88 * (x.t - (now - 4000))) / 4000, py = h * 0.88 - ((x.g - m) / amp) * h * 0.05;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(w * 0.06, h * 0.95, w * 0.88, 4);
  ctx.fillStyle = '#34d399'; ctx.fillRect(w * 0.06, h * 0.95, w * 0.88 * Math.min(1, progress), 4);
  const beat = est ? Math.max(0, Math.sin((2 * Math.PI * est.bpm * now) / 60000)) : 0;
  ctx.beginPath(); ctx.arc(w * 0.08, h * 0.08, 5 + 3 * beat, 0, Math.PI * 2); ctx.fillStyle = '#f43f5e'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 14px system-ui, sans-serif'; ctx.textBaseline = 'middle';
  ctx.fillText(est ? `${est.bpm} bpm` : '신호 모으는 중…', w * 0.08 + 14, h * 0.08);
}

function Chat({ s, onSent }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [last, setLast] = useState(null);
  const box = useRef(null);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [s.messages.length, busy]);
  useEffect(() => { setLast(null); setErr(''); }, [s.persona.id]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true); setErr('');
    try {
      const r = await api('/api/chat', { p: s.persona.id, text: t });
      setText(''); setLast(r); onSent(r);
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  };
  const chips = last && [last.emotion, last.slot, last.place, last.mood != null && `기분 ${last.mood}`,
    last.sleep_hours != null && `수면 ${last.sleep_hours}시간`, last.caffeine_cups != null && `카페인 ${last.caffeine_cups}잔`].filter(Boolean);

  return (
    <div className="flex flex-col">
      <div ref={box} className="h-80 space-y-2 overflow-y-auto rounded-xl bg-stone-50 p-3 lg:h-96">
        {s.messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-auto bg-stone-900 text-white' : 'bg-white shadow-sm'}`}>{m.content}</div>
        ))}
        {busy && <><div className="ml-auto max-w-[85%] rounded-2xl bg-stone-700 px-3 py-2 text-sm text-white">{text}</div><div className="w-fit rounded-2xl bg-white px-3 py-2 text-sm text-stone-400 shadow-sm">입력 중…</div></>}
      </div>
      {chips?.length > 0 && <p className="mt-2 text-xs text-stone-600">대화에서 기록됨: {chips.join(' · ')}</p>}
      {last && last.risk !== 'none' && (
        <div role="alert" className="mt-2 flex gap-2 rounded-xl border border-[#d03b3b] bg-red-50 p-3 text-sm text-red-900">
          <span aria-hidden="true" className="font-bold text-[#d03b3b]">!</span>
          <span><b>혼자 견디지 않아도 돼요.</b> 자살예방상담전화 109(24시간) · 정신건강위기상담 1577-0199 · 긴급하면 112/119</span>
        </div>
      )}
      {err && <p role="alert" className="mt-2 text-xs text-red-700">{err}</p>}
      <form onSubmit={send} className="mt-2 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={`${s.persona.name}님으로 이야기해 보세요`}
          className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900" aria-label="메시지" />
        <button type="submit" disabled={busy || !text.trim()} className="rounded-xl bg-stone-900 px-4 text-sm text-white disabled:bg-stone-300">보내기</button>
      </form>
    </div>
  );
}
