// 여러 화면이 같이 쓰는 조각: 로고, 지불 의향 버튼, 요금 카드
import { useState } from 'react';
import { INTEREST, LEVELS } from './content.js';
import { api } from './lib.js';

// 로고는 public/favicon.svg 한 곳에만 그린다 (새싹 = 작은 행동으로 자라는 마음)
export const Logo = ({ size = 28 }) => <img src="/favicon.svg" width={size} height={size} alt="" className="shrink-0" />;

export function Interest({ product }) {
  const [counts, setCounts] = useState(null);
  const [err, setErr] = useState('');
  const vote = async (answer) => {
    try {
      setCounts((await api('/api/interest', { product, answer })).counts);
    } catch (e) {
      setErr(e.message);
    }
  };
  if (counts) {
    const total = counts.reduce((a, b) => a + b, 0);
    return (
      <p className="enter mt-4 rounded-2xl bg-brand-soft px-4 py-3 text-sm leading-relaxed text-brand-ink">
        응답 고마워요. 지금까지 {total}명 중 {counts[0]}명이 "{INTEREST[0]}"를 골랐어요.
      </p>
    );
  }
  return (
    <div className="mt-4">
      <p className="text-sm text-[#6B7684]">아직 판매 전이에요. 이 가격이면 어떠세요?</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {INTEREST.map((t, i) => (
          <button key={t} type="button" onClick={() => vote(i)}
            className="rounded-2xl bg-[#F2F4F6] px-2 py-3 text-sm font-semibold text-[#333D4B] transition hover:bg-[#E5E8EB] active:scale-[0.97]">{t}</button>
        ))}
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-[#E5484D]">{err}</p>}
    </div>
  );
}

const Check = () => (
  <svg className="mt-1 shrink-0 text-brand" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L20 7" />
  </svg>
);

export function PlanCard({ plan, compact = false, children }) {
  return (
    <article className="rounded-3xl bg-white p-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-[18px] font-bold tracking-tight text-[#191F28]">{plan.name}</h3>
          <p className="mt-0.5 text-sm text-[#8B95A1]">{plan.unit}</p>
        </div>
        <div className="ml-auto shrink-0 text-right">
          <p className="text-[20px] font-bold tracking-tight text-[#191F28]">{plan.price}</p>
          {plan.id !== 'free' && <span className="mt-1 inline-block rounded-full bg-[#FFF4E5] px-2 py-0.5 text-xs font-semibold text-[#8A5300]">검증 예정 제안가</span>}
        </div>
      </div>
      <ul className="mt-4 space-y-1.5">
        {(compact ? plan.includes.slice(0, 2) : plan.includes).map((t) => (
          <li key={t} className="flex gap-2 text-[15px] leading-relaxed text-[#333D4B]"><Check />{t}</li>
        ))}
      </ul>
      <ul className="mt-3 space-y-1">
        {plan.notes.map((t) => <li key={t} className="text-sm leading-relaxed text-[#8B95A1]">· {t}</li>)}
      </ul>
      {plan.sample && <a href="/demo" className="mt-3 inline-block text-sm font-semibold text-brand-ink underline">보고서에 들어갈 내용 미리 보기 (가상 인물)</a>}
      {children}
      {plan.poll && <Interest product={plan.id} />}
    </article>
  );
}

// 내 기록은 로그인 없이 이 기기(localStorage)에만 둔다: 지금 체크, 정원의 잎, 나와의 약속, 2주 점검 점수
const KEY = 'maeum5:me';
const EMPTY = { checks: [], leaves: [], promises: [], phq: [] };
export function loadMe() {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...EMPTY }; // 사생활 보호 모드 등에서 저장소를 못 쓰면 빈 기록으로 동작
  }
}
export function saveMe(me) {
  try {
    localStorage.setItem(KEY, JSON.stringify(me));
  } catch {
    /* 저장 못 해도 화면은 계속 쓴다 */
  }
}

export const AFTER = ['그대로예요', '조금 나아졌어요', '많이 나아졌어요'];
export const CTA = 'rounded-2xl bg-brand-strong text-[19px] font-bold text-white transition hover:bg-brand-deep active:scale-[0.98]'; // 흰 글자는 19px 굵게(큰 글씨 대비 기준)

// 5분 행동 카드: 단계 · 근거(펼쳐 보기) · 다 했어요 → 해보니 어때요?
export function Action({ r, best = false, onDone }) {
  const [state, setState] = useState('idle'); // idle → rate → saved
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const save = (after) => {
    onDone?.(after); // 정원의 잎은 서버 응답과 상관없이 이 기기에 남긴다
    setState('saved');
    api('/api/done', { p: 'U', routine: r.id, after }).catch((e) => setErr(e.message));
  };
  return (
    <article className={`rounded-3xl bg-white p-6 ${best ? 'shadow-lg shadow-brand/10 ring-2 ring-brand' : ''}`}>
      <div className="flex items-center gap-2 text-sm">
        {best && <span className="rounded-full bg-brand-soft px-2.5 py-1 font-semibold text-brand-ink">가장 추천</span>}
        <span className="min-w-0 truncate text-[#8B95A1]">{r.situation}</span>
        <span className="ml-auto shrink-0 rounded-full bg-[#F2F4F6] px-2.5 py-1 font-semibold text-[#4E5968]">{r.minutes}분</span>
      </div>
      <h3 className="mt-3 text-[20px] font-bold tracking-tight text-[#191F28]">{r.title}</h3>
      <ol className="mt-3 space-y-2">
        {r.steps.map((s, i) => (
          <li key={s} className="flex gap-3 text-[15px] leading-relaxed text-[#333D4B]">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F2F4F6] text-xs font-bold text-[#6B7684]">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm leading-relaxed text-[#8B95A1]">{r.why}</p>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2 text-sm font-semibold text-brand-ink">
        근거 {r.level}등급 · 연구 {r.refs.length}편 {open ? '접기' : '보기'}
      </button>
      {open && (
        <div className="enter mt-2 space-y-3 rounded-2xl bg-[#F9FAFB] p-4">
          <p className="text-xs text-[#6B7684]">{r.level}등급: {LEVELS[r.level]}</p>
          {r.note && <p className="text-xs leading-relaxed text-[#8A5300]">{r.note}</p>}
          {r.refs.map((ref) => (
            <div key={ref.cite}>
              <p className="text-sm leading-relaxed text-[#333D4B]">{ref.finding}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#8B95A1]">{ref.cite}</p>
            </div>
          ))}
        </div>
      )}
      {state === 'idle' && (
        <button type="button" onClick={() => setState('rate')}
          className={best ? `${CTA} mt-4 w-full py-4` : 'mt-4 w-full rounded-2xl bg-brand-soft py-4 font-semibold text-brand-ink transition hover:bg-[#DDF3E6] active:scale-[0.98]'}>
          다 했어요
        </button>
      )}
      {state === 'rate' && (
        <div className="enter mt-4">
          <p className="text-sm font-medium text-[#4E5968]">해보니 어때요?</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {AFTER.map((t, i) => (
              <button key={t} type="button" onClick={() => save(i)} className="rounded-2xl bg-[#F2F4F6] px-2 py-3 text-sm font-semibold text-[#333D4B] transition hover:bg-[#E5E8EB] active:scale-[0.97]">{t}</button>
            ))}
          </div>
        </div>
      )}
      {state === 'saved' && <p className="enter mt-4 rounded-2xl bg-brand-soft py-4 text-center font-semibold text-brand-ink">✓ 잘했어요! 정원에 잎이 하나 났어요</p>}
      {err && <p role="alert" className="mt-2 text-sm text-[#E5484D]">{err}</p>}
    </article>
  );
}
