// 감정 쓰레기통 — 1분 동안 글이나 말로 쏟아내기 → AI가 감정 이름과 PHQ-9 영역 신호(진단 아님)를 읽고, 글은 버린다
import { useEffect, useRef, useState } from 'react';
import { PHQ9 } from './content.js';
import { OK, api } from './lib.js';
import { CTA, Crisis } from './common.jsx';

const LIMIT = 60; // 초
const Speech = window.SpeechRecognition || window.webkitSpeechRecognition; // 없으면 '말로 하기'를 숨긴다

export default function Vent({ onRead, onReset, onPick }) {
  const [text, setText] = useState('');
  const [sec, setSec] = useState(0);
  const [started, setStarted] = useState(false);
  const [listening, setListening] = useState(false);
  const [state, setState] = useState('write'); // write → tossing → read
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const rec = useRef(null);

  // 1분 타이머: 처음 쓰거나 말하기 시작하면 돈다. 1분이 지나도 계속 쓸 수 있고, 말하기만 멈춘다
  useEffect(() => {
    if (!started || state !== 'write') return;
    const t = setInterval(() => setSec((s) => Math.min(LIMIT, s + 1)), 1000);
    return () => clearInterval(t);
  }, [started, state]);
  useEffect(() => { if (sec >= LIMIT) rec.current?.stop(); }, [sec]);
  useEffect(() => () => rec.current?.abort(), []);

  const listen = () => {
    if (listening) return rec.current?.stop();
    const r = new Speech();
    r.lang = 'ko-KR';
    r.continuous = true;
    r.interimResults = true;
    const before = text.trim() ? `${text.trim()} ` : '';
    r.onresult = (e) => setText((before + Array.from(e.results, (x) => x[0].transcript).join(' ')).replace(/\s+/g, ' ').slice(0, 2000));
    r.onerror = (e) => setErr(e.error === 'not-allowed' ? '마이크를 쓸 수 없어요. 글로 써 주세요' : e.error === 'no-speech' ? '말소리가 들리지 않았어요' : '말을 글로 바꾸지 못했어요. 글로 써 주세요');
    r.onend = () => setListening(false);
    rec.current = r;
    setErr('');
    try {
      r.start();
      setListening(true);
      setStarted(true);
    } catch {
      setErr('말로 하기를 시작하지 못했어요. 글로 써 주세요');
    }
  };

  const toss = async () => {
    rec.current?.stop();
    setState('tossing');
    setErr('');
    try {
      const [r] = await Promise.all([api('/api/vent', { text: text.trim() }), new Promise((ok) => setTimeout(ok, 700))]); // 버리는 모습이 보이게
      setText(''); // 글 원문은 화면에서도 지운다
      setRes(r);
      setState('read');
      onRead(r);
    } catch (e) {
      setErr(`${e.message}. 글은 그대로 있어요.`);
      setState('write');
    }
  };
  const restart = () => {
    setRes(null);
    setSec(0);
    setStarted(false);
    setState('write');
    onReset();
  };

  if (state === 'read') {
    const signals = PHQ9.items.filter((it) => it.key !== 'harm' && res.signals?.[it.key] >= 1).sort((a, b) => res.signals[b.key] - res.signals[a.key]);
    return (
      <div className="enter mt-4 space-y-3">
        {res.crisis ? <Crisis message={res.reply} /> : <p className="rounded-2xl bg-brand-soft px-4 py-3.5 text-[16px] leading-relaxed text-[#1E3A2B]">{res.reply}</p>}
        {res.emotion && (
          <div className="rounded-2xl bg-[#F9FAFB] p-4">
            <p className="text-sm text-[#6B7684]">글에서 읽힌 마음</p>
            <p className="mt-1 text-[18px] font-bold text-[#191F28]">{res.emotion === OK ? '괜찮은 마음' : res.emotion}</p>
            {signals.length > 0 && (
              <>
                <p className="mt-3 text-sm text-[#6B7684]">PHQ-9 영역에서 보인 신호</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {signals.map((it) => (
                    <span key={it.key} className={`rounded-full px-3 py-1 text-sm font-medium ${res.signals[it.key] >= 2 ? 'bg-[#191F28] text-white' : 'bg-white text-[#4E5968] ring-1 ring-[#E5E8EB]'}`}>{it.short}</span>
                  ))}
                </div>
              </>
            )}
            <p className="mt-3 text-xs leading-relaxed text-[#8B95A1]">AI가 글에서 읽은 신호예요. 진단이나 점수가 아니에요. 털어놓은 글은 저장하지 않고 버렸어요.</p>
          </div>
        )}
        <p className="text-sm text-[#6B7684]">오늘 이 쓰레기통에 버려진 마음 {res.today}개</p>
        <div className="flex gap-4 text-sm font-semibold">
          <button type="button" onClick={restart} className="text-brand-ink">또 털어놓기</button>
          {res.emotion && <button type="button" onClick={onPick} className="text-[#6B7684]">감정이 다르면 직접 고르기</button>}
        </div>
      </div>
    );
  }

  if (state === 'tossing')
    return (
      <div className="mt-4 flex flex-col items-center py-4" role="status">
        <div className="toss w-full rounded-2xl bg-[#F2F4F6] px-4 py-3.5 text-[15px] leading-relaxed text-[#4E5968] line-clamp-3">{text}</div>
        <Bin />
        <p className="mt-2 text-[15px] font-semibold text-[#333D4B]">마음을 비우는 중…</p>
      </div>
    );

  return (
    <div className="enter mt-4">
      <textarea value={text} maxLength={2000} rows={5} aria-label="털어놓을 글"
        onChange={(e) => { setText(e.target.value); setStarted(true); }}
        placeholder="오늘 짜증 났던 일, 답답했던 순간… 맞춤법은 신경 쓰지 말고 그냥 쏟아내요."
        className="block w-full resize-none rounded-2xl bg-[#F2F4F6] px-4 py-3.5 text-[16px] leading-relaxed text-[#191F28] outline-none placeholder:text-[#8B95A1] focus:ring-2 focus:ring-brand" />
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E8EB]" role="progressbar" aria-label="1분 타이머" aria-valuemin={0} aria-valuemax={LIMIT} aria-valuenow={sec}>
          <div className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-linear" style={{ width: `${(sec / LIMIT) * 100}%` }} />
        </div>
        <span className="shrink-0 text-sm tabular-nums text-[#6B7684]">{sec >= LIMIT ? '1분 됐어요' : started ? `${LIMIT - sec}초` : '1분'}</span>
      </div>
      <div className={`mt-3 grid gap-2 ${Speech ? 'grid-cols-[1fr_2fr]' : ''}`}>
        {Speech && (
          <button type="button" onClick={listen} aria-pressed={listening}
            className={`flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold transition active:scale-[0.98] ${listening ? 'bg-[#FFF0F0] text-[#C62828]' : 'bg-[#F2F4F6] text-[#333D4B] hover:bg-[#E5E8EB]'}`}>
            {listening ? <span className="size-2.5 rounded-full bg-[#D93B3B] motion-safe:animate-pulse" aria-hidden="true" /> : <Mic />}
            {listening ? '멈추기' : '말로 하기'}
          </button>
        )}
        <button type="button" onClick={toss} disabled={!text.trim()} className={`${CTA} py-4 disabled:bg-[#E5E8EB] disabled:text-[#8B95A1] disabled:active:scale-100`}>버리기</button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-[#E5484D]">{err} <button type="button" onClick={onPick} className="font-semibold underline">감정 직접 고르기</button></p>}
      <p className="mt-3 text-xs leading-relaxed text-[#8B95A1]">
        버리면 글이 Claude API(Anthropic)로 보내져 감정만 읽고, 마음 5분은 글 원문을 저장하지 않아요.{Speech && ' 말로 하기는 브라우저 음성 인식을 써요(크롬은 Google 서버에서 처리).'}
      </p>
    </div>
  );
}

const Mic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const Bin = () => (
  <svg className="mt-3 text-[#4E5968]" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </svg>
);
