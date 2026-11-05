// 요금 안내 — 수익 구조(제안). 가격·구성 문구는 content.js의 PLANS에서 고친다.
import { PLANS } from './content.js';
import { Logo, PlanCard } from './common.jsx';

export default function Pricing() {
  return (
    <div className="min-h-dvh bg-[#F2F4F6]">
      <header className="sticky top-0 z-10 bg-[#F2F4F6]/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2 px-6 py-4">
          <a href="/" className="flex items-center gap-2 font-bold text-[#191F28]"><Logo size={24} />마음 5분</a>
          <a href="/" className="ml-auto text-sm text-[#8B95A1] hover:text-[#333D4B]">마음 체크</a>
        </div>
      </header>
      <main className="enter mx-auto max-w-md space-y-3 px-4 pb-10">
        <section className="px-2 pt-2">
          <h1 className="text-[26px] font-bold tracking-tight text-[#191F28]">요금 안내</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#4E5968]">{PLANS.value}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-[#4E5968]">{PLANS.model}</p>
        </section>
        <p className="rounded-2xl bg-[#FFF4E5] px-4 py-3 text-sm leading-relaxed text-[#8A5300]">{PLANS.priceNote}</p>
        {PLANS.products.map((p) => (
          <PlanCard key={p.id} plan={p}>
            {p.id === 'org' && (
              <div className="mt-5 rounded-2xl bg-[#F9FAFB] p-4">
                <p className="text-sm font-bold text-[#333D4B]">
                  구성 <span className="ml-1 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-xs font-semibold text-[#8A5300]">제안 · 확정 전</span>
                </p>
                <dl className="mt-2 divide-y divide-[#EEF0F2]">
                  {PLANS.org.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[84px_1fr] gap-3 py-2.5 text-sm">
                      <dt className="font-semibold text-[#333D4B]">{k}</dt>
                      <dd className="leading-relaxed text-[#4E5968]">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-xs leading-relaxed text-[#8B95A1]">{PLANS.orgNote}</p>
              </div>
            )}
          </PlanCard>
        ))}
        <p className="px-2 pt-2 text-center text-xs leading-relaxed text-[#8B95A1]">
          마음 5분 매트릭스는 의료 서비스가 아닌 셀프케어 보조 앱이에요. 가격과 구성은 검증 결과에 따라 바뀔 수 있어요.
        </p>
      </main>
    </div>
  );
}
