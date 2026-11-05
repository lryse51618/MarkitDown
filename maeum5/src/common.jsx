// 여러 화면이 같이 쓰는 조각: 로고, 지불 의향 버튼, 요금 카드
import { useState } from 'react';
import { INTEREST } from './content.js';
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
