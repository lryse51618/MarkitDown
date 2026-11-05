// 2주 마음 점검(/phq9) — PHQ-9 카드형 설문 → 점수 카드 + 5분 행동 추천. 결과와 해본 행동은 홈의 마음 정원에도 남긴다
import { useRef, useState } from 'react';
import { PHQ9, PLANS, ROUTINES } from './content.js';
import { api, phqLevel, stamp } from './lib.js';
import { Action, CTA, Logo, PlanCard, loadMe, saveMe } from './common.jsx';

const remember = (fn) => saveMe(fn(loadMe())); // 이 기기에만

export default function Survey() {
  const [step, setStep] = useState(-1); // -1 소개, 0~8 문항, 9 결과
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const sending = useRef(false);

  const submit = async (a) => {
    if (sending.current) return; // 마지막 문항을 두 번 눌러도 한 번만 보낸다
    sending.current = true;
    setErr('');
    try {
      const res = await api('/api/survey', { answers: a });
      setResult(res);
      remember((me) => ({ ...me, phq: [...me.phq, { ts: stamp(new Date()), total: res.total }].slice(-26) }));
    } catch (e) {
      setErr(e.message);
    } finally {
      sending.current = false;
    }
  };
  const choose = (score) => {
    const next = [...answers.slice(0, step), score];
    setAnswers(next);
    setTimeout(() => setStep(next.length), 180); // 누른 버튼이 잠깐 보이게
    if (next.length === 9) submit(next);
  };
  const restart = () => {
    setAnswers([]);
    setResult(null);
    setErr('');
    setStep(-1);
    window.scrollTo(0, 0);
  };

  if (step < 0) return <Intro onStart={() => setStep(0)} />;
  if (step < 9) return <Question step={step} answer={answers[step]} onChoose={choose} onBack={() => setStep(step - 1)} />;
  if (err)
    return (
      <Center>
        <p className="text-[17px] font-semibold text-[#191F28]">결과를 불러오지 못했어요</p>
        <p className="mt-1 text-sm text-[#8B95A1]">{err}</p>
        <button type="button" onClick={() => submit(answers)} className={`${CTA} mt-6 px-8 py-4`}>다시 시도</button>
      </Center>
    );
  if (!result)
    return (
      <Center>
        <div className="motion-safe:animate-pulse"><Logo size={56} /></div>
        <p className="mt-5 text-[17px] font-semibold text-[#191F28]">결과를 정리하고 있어요</p>
        <p className="mt-1 text-sm text-[#8B95A1]">잠시만 기다려 주세요</p>
      </Center>
    );
  return <Result result={result} answers={answers} onRestart={restart} />;
}

const Center = ({ children }) => <div className="enter flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center">{children}</div>;

function Intro({ onStart }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(120%_60%_at_50%_100%,#d6f5e3_0%,#eefbf3_40%,#ffffff_75%)]">
      <header className="mx-auto flex w-full max-w-md items-center gap-2 px-6 pt-5 text-sm">
        <a href="/" className="flex items-center gap-2 font-bold text-[#191F28]"><Logo size={24} />마음 5분</a>
        <a href="/" className="ml-auto text-[#8B95A1] hover:text-[#333D4B]">홈으로</a>
      </header>
      <main className="enter mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
        <Logo size={72} />
        <h1 className="mt-6 text-[28px] font-bold leading-snug tracking-tight text-[#191F28]">지난 2주,<br />마음은 어땠나요?</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-[#6B7684]">9개 질문에 답하면 지금 마음 상태와<br />바로 해볼 수 있는 5분 행동을 알려드려요.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm text-[#4E5968]">
          {['9문항', '약 1분', '무료', '이름 없이 저장'].map((t) => (
            <span key={t} className="rounded-full bg-white/80 px-3 py-1.5 shadow-sm ring-1 ring-black/5">{t}</span>
          ))}
        </div>
      </main>
      <footer className="mx-auto w-full max-w-md px-6 pb-8">
        <p className="text-center text-xs leading-relaxed text-[#8B95A1]">
          PHQ-9 문항으로 하는 자기 점검이에요. 진단이 아니에요.<br />추천을 위해 응답 점수가 Claude API(Anthropic)로 전송돼요.
        </p>
        <button type="button" onClick={onStart} className={`${CTA} mt-4 w-full py-4 shadow-lg shadow-brand/20`}>동의하고 시작하기</button>
      </footer>
    </div>
  );
}

function Question({ step, answer, onChoose, onBack }) {
  const item = PHQ9.items[step];
  return (
    <div className="min-h-dvh bg-white">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center px-2 py-2">
          <button type="button" onClick={onBack} aria-label="이전" className="rounded-full p-3 text-[#333D4B] transition hover:bg-[#F2F4F6] active:scale-95">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="ml-auto pr-4 text-sm font-medium tabular-nums text-[#8B95A1]">{step + 1} / 9</span>
        </div>
        <div className="h-1 bg-[#F2F4F6]" role="progressbar" aria-label="진행도" aria-valuemin={0} aria-valuemax={9} aria-valuenow={step + 1}>
          <div className="h-full rounded-r-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${((step + 1) / 9) * 100}%` }} />
        </div>
      </div>
      <main key={step} className="slide mx-auto max-w-md px-6 pb-10 pt-8">
        <p className="text-[15px] leading-relaxed text-[#8B95A1]">{PHQ9.prompt}</p>
        <h1 className="mt-4 text-[24px] font-bold leading-[1.4] tracking-tight text-[#191F28]">{item.text}</h1>
        {step === 8 && <p className="mt-3 text-sm leading-relaxed text-[#6B7684]">어떤 답이든 괜찮아요. 힘든 생각이 있다면 결과 화면에서 바로 이야기할 수 있는 곳을 알려드릴게요.</p>}
        <div className="mt-8 space-y-3">
          {PHQ9.options.map((label, score) => (
            <button key={score} type="button" aria-pressed={answer === score} onClick={() => onChoose(score)}
              className={`flex w-full items-center justify-between rounded-2xl px-5 py-[18px] text-left text-[17px] font-semibold transition duration-150 active:scale-[0.98] ${
                answer === score ? 'bg-brand-soft text-brand-ink ring-2 ring-brand' : 'bg-[#F2F4F6] text-[#333D4B] hover:bg-[#E5E8EB]'}`}>
              {label}
              <span className={`ml-3 shrink-0 text-sm font-medium ${answer === score ? 'text-brand-ink' : 'text-[#B0B8C1]'}`}>{score}점</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function Result({ result, answers, onRestart }) {
  const level = phqLevel(result.total, PHQ9.levels);
  const top = answers.slice(0, 8).map((s, i) => [s, i]).filter(([s]) => s >= 2)
    .sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, 3).map(([, i]) => PHQ9.items[i].short);
  const picks = result.picks.map((id) => ROUTINES.find((r) => r.id === id)).filter(Boolean);
  return (
    <div className="min-h-dvh bg-[#F2F4F6]">
      <header className="sticky top-0 z-10 bg-[#F2F4F6]/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2 px-6 py-4 text-[17px] font-bold text-[#191F28]"><Logo size={24} />마음 체크 결과</div>
      </header>
      <main className="enter mx-auto max-w-md space-y-3 px-4 pb-10">
        {result.crisis && <Crisis message={result.message} />}

        <section className="rounded-3xl bg-white p-6">
          <p className="text-sm font-medium text-[#8B95A1]">지난 2주 마음 점수</p>
          <p className="mt-1">
            <span className="text-[44px] font-bold tracking-tight text-[#191F28]">{result.total}</span>
            <span className="ml-1 text-lg text-[#B0B8C1]">/ 27</span>
          </p>
          <p className="mt-2 text-[19px] font-bold text-[#191F28]">{level.label}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-[#4E5968]">{level.text}</p>
          <Meter total={result.total} />
          {top.length > 0 && (
            <div className="mt-5">
              <p className="text-sm text-[#8B95A1]">특히 자주 방해받은 부분</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {top.map((t) => <span key={t} className="rounded-full bg-[#F2F4F6] px-3 py-1.5 text-sm font-medium text-[#4E5968]">{t}</span>)}
              </div>
            </div>
          )}
          <p className="mt-5 text-xs leading-relaxed text-[#B0B8C1]">진단이 아닌 자기 점검 결과예요. 구간은 PHQ-9 표준 기준(0–4 · 5–9 · 10–14 · 15–19 · 20–27)을 따라요.</p>
        </section>

        {level.expert && !result.crisis && <Expert />}

        <section className="pt-3">
          <h2 className="px-2 text-[20px] font-bold tracking-tight text-[#191F28]">지금 바로 해보는 5분 행동</h2>
          {!result.crisis && <p className="mt-1 px-2 text-[15px] leading-relaxed text-[#4E5968]">{result.message}</p>}
          <p className="mt-1 px-2 text-xs text-[#8B95A1]">
            {result.source === 'claude' ? 'Claude가 응답을 보고 근거 있는 행동 목록에서 골랐어요.' : '응답에 맞춰 근거 있는 행동 목록에서 골랐어요.'}
          </p>
          <div className="mt-3 space-y-3">
            {picks.map((r, i) => (
              <Action key={r.id} r={r} best={i === 0}
                onDone={(after) => remember((me) => ({ ...me, leaves: [...me.leaves, { ts: stamp(new Date()), emotion: null, routine: r.id, after }].slice(-300) }))} />
            ))}
          </div>
        </section>

        {/* 위기 신호가 있으면 유료 상품을 권하지 않는다 */}
        {!result.crisis && (
          <section className="pt-3">
            <h2 className="px-2 text-[20px] font-bold tracking-tight text-[#191F28]">더 깊이 돌아보고 싶다면</h2>
            <p className="mt-1 px-2 text-[15px] leading-relaxed text-[#4E5968]">지금 받은 결과와 5분 행동은 계속 무료예요. 아래는 출시 전 상품이에요.</p>
            <div className="mt-3 space-y-3">
              {PLANS.products.filter((p) => p.poll).map((p) => <PlanCard key={p.id} plan={p} compact />)}
            </div>
            <a href="/pricing" className="mt-3 block px-2 text-sm font-semibold text-brand-ink underline">요금 안내 전체 보기</a>
          </section>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onRestart} className="rounded-2xl bg-white py-4 text-[16px] font-semibold text-[#333D4B] transition hover:bg-[#E5E8EB] active:scale-[0.98]">다시 점검하기</button>
          <a href="/" className="rounded-2xl bg-white py-4 text-center text-[16px] font-semibold text-[#333D4B] transition hover:bg-[#E5E8EB] active:scale-[0.98]">홈으로</a>
        </div>
        <p className="px-2 pt-2 text-center text-xs leading-relaxed text-[#8B95A1]">
          마음 5분 매트릭스는 의료 서비스가 아닌 셀프케어 보조 앱이에요. <a href="/demo" className="underline">시연 대시보드</a>
        </p>
      </main>
    </div>
  );
}

function Meter({ total }) {
  return (
    <div className="mt-5" aria-hidden="true">
      <div className="relative h-2 rounded-full bg-gradient-to-r from-[#CFF4DE] via-brand to-brand-ink">
        <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#191F28] shadow" style={{ left: `${(total / 27) * 100}%` }} />
      </div>
      <div className="relative mt-2 h-4 text-[11px] tabular-nums text-[#B0B8C1]">
        {[0, 5, 10, 15, 20, 27].map((v) => <span key={v} className="absolute -translate-x-1/2" style={{ left: `${(v / 27) * 100}%` }}>{v}</span>)}
      </div>
    </div>
  );
}

function Crisis({ message }) {
  return (
    <section role="alert" className="rounded-3xl bg-[#FFF0F0] p-6 ring-1 ring-[#FFD4D4]">
      <p className="text-[19px] font-bold text-[#C62828]">혼자 견디지 않아도 돼요</p>
      <p className="mt-2 text-[15px] leading-relaxed text-[#5B2525]">{message}</p>
      <div className="mt-4 grid gap-2">
        <a href="tel:109" className="rounded-2xl bg-[#D93B3B] py-4 text-center text-[19px] font-bold text-white transition active:scale-[0.98]">109 자살예방상담 (24시간)</a>
        <a href="tel:15770199" className="rounded-2xl bg-white py-4 text-center font-semibold text-[#C62828] ring-1 ring-[#FFD4D4] transition active:scale-[0.98]">1577-0199 정신건강위기상담</a>
      </div>
      <p className="mt-3 text-sm text-[#7A3B3B]">위험이 급하다면 112 또는 119에 바로 연락해 주세요.</p>
    </section>
  );
}

function Expert() {
  return (
    <section className="rounded-3xl bg-white p-6">
      <p className="text-[17px] font-bold text-[#191F28]">전문가와 이야기해 보세요</p>
      <p className="mt-1 text-[15px] leading-relaxed text-[#4E5968]">가까운 정신건강복지센터에서 상담을 받을 수 있어요.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
        <a href="tel:15770199" className="rounded-2xl bg-brand-soft py-3 text-center text-brand-ink">1577-0199 상담</a>
        <a href="https://www.mentalhealth.go.kr" target="_blank" rel="noreferrer" className="rounded-2xl bg-[#F2F4F6] py-3 text-center text-[#333D4B]">정신건강정보포털</a>
      </div>
    </section>
  );
}

