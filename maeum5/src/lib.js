// 서버와 화면이 같이 쓰는 순수 함수들 (테스트: lib.test.js)

export const SLOTS = ['아침', '낮', '저녁', '밤'];
export const EMOTIONS = ['무기력·우울', '불안·과부하', '분노·울분', '고독·소외감'];
export const OK = '괜찮음';
export const MIN_DAYS = 14; // 이보다 기록이 적으면 상관 분석을 보여주지 않음 (소표본·자기상관 문제)

const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const stamp = (d) => `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const slotOf = (d) => {
  const h = d.getHours();
  return h >= 5 && h < 11 ? '아침' : h >= 11 && h < 17 ? '낮' : h >= 17 && h < 22 ? '저녁' : '밤';
};
export const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

// 직접적인 위험 표현은 모델을 거치지 않고 바로 안내한다. 간접 신호는 모델의 risk 필드가 맡는다.
const RISK = /죽고\s*싶|자살|자해|목숨을?\s*끊|사라지고\s*싶|없어지고\s*싶|살기\s*싫|살고\s*싶지\s*않|뛰어내리고\s*싶|(삶|인생)을?\s*끝내/;
export const detectRisk = (text) => RISK.test(text);

export const CRISIS =
  '지금 많이 힘드시다는 게 느껴져요. 이 마음을 혼자 견디지 않으셨으면 해요. ' +
  '지금 바로 전문 상담사와 이야기할 수 있어요: 자살예방상담전화 109(24시간), 정신건강위기상담 1577-0199. ' +
  '위험이 급하다면 112나 119에 연락해 주세요.';

// 모델 출력 → DB 사이의 신뢰 경계: 스키마 밖 값은 버린다
export function cleanExtract(o) {
  const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null);
  const mood = num(o?.mood, 1, 10);
  return {
    reply: typeof o?.reply === 'string' ? o.reply.trim().slice(0, 600) : '',
    emotion: [...EMOTIONS, OK].includes(o?.emotion) ? o.emotion : null,
    slot: SLOTS.includes(o?.slot) ? o.slot : null,
    place: typeof o?.place === 'string' && o.place.trim() ? o.place.trim().slice(0, 30) : null,
    mood: mood === null ? null : Math.round(mood),
    sleep_hours: num(o?.sleep_hours, 0, 16),
    caffeine_cups: num(o?.caffeine_cups, 0, 15),
    risk: ['none', 'watch', 'urgent'].includes(o?.risk) ? o.risk : 'none',
  };
}

export function slotStats(checkins) {
  return SLOTS.map((slot) => {
    const cs = checkins.filter((c) => c.slot === slot);
    const counts = {};
    for (const c of cs) if (EMOTIONS.includes(c.emotion)) counts[c.emotion] = (counts[c.emotion] ?? 0) + 1;
    const [top, topN] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    return { slot, n: cs.length, mood: mean(cs.filter((c) => c.mood != null).map((c) => c.mood)), top, topN };
  });
}

export function pearson(x, y) {
  if (x.length < 3) return null;
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

// 일별 기록 상관·시차상관. p값은 일별 자기상관 때문에 믿기 어려워 표시하지 않고 '경향'으로만 말한다.
export function insights(daily, checkins) {
  const moods = {};
  for (const c of checkins) if (c.mood != null) (moods[c.ts.slice(0, 10)] ??= []).push(c.mood);
  const rows = daily.map((d) => ({ ...d, mood: moods[d.date] ? mean(moods[d.date]) : null }));
  if (rows.length < MIN_DAYS) return { n: rows.length, items: [] };
  const items = [];
  const test = (xs, ys, pos, neg) => {
    const ok = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => x != null && y != null);
    const r = pearson(ok.map((p) => p[0]), ok.map((p) => p[1]));
    // |r| ≥ 0.5: 14개 표본의 p<.05 기준(r≈0.53)에 가까운 값. 그보다 약하면 말하지 않는다.
    if (r !== null && Math.abs(r) >= 0.5) items.push({ text: r > 0 ? pos : neg, r, n: ok.length });
  };
  const col = (k, from = 0, to = rows.length) => rows.slice(from, to).map((r) => r[k]);
  test(col('sleep_h'), col('mood'), '잠을 더 잔 날 기분 점수가 높은 경향', '잠을 더 잔 날 기분 점수가 낮은 경향');
  test(col('caffeine_cups', 0, -1), col('sleep_h', 1), '카페인을 많이 마신 다음 날 더 오래 자는 경향', '카페인을 많이 마신 날 밤 잠이 짧아지는 경향');
  test(col('caffeine_cups'), col('hr_bpm'), '카페인을 많이 마신 날 심박이 높은 경향', '카페인을 많이 마신 날 심박이 낮은 경향');
  test(col('hr_bpm'), col('mood'), '심박이 높은 날 기분 점수가 높은 경향', '심박이 높은 날 기분 점수가 낮은 경향');
  return { n: rows.length, items: items.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)) };
}

// rPPG 심박 추정: POS 투영(Wang et al., 2017) → 1초 이동평균 제거 → 0.7–3 Hz(42–180 bpm) 주기도 피크
// samples: [{ t: ms, r, g, b }] — 이마 ROI의 채널 평균
export function estimateBpm(samples) {
  const n = samples.length;
  if (n < 64) return null;
  const avg = (k) => mean(samples.map((s) => s[k]));
  const mr = avg('r'), mg = avg('g'), mb = avg('b');
  if (!mr || !mg || !mb) return null;
  const s1 = samples.map((s) => s.g / mg - s.b / mb);
  const s2 = samples.map((s) => s.g / mg + s.b / mb - (2 * s.r) / mr);
  const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
  const alpha = sd(s2) ? sd(s1) / sd(s2) : 0;
  const h = s1.map((v, i) => v + alpha * s2[i]);
  const secs = (samples[n - 1].t - samples[0].t) / 1000;
  const w = Math.max(1, Math.round((n - 1) / secs / 2));
  const x = h.map((v, i) => v - mean(h.slice(Math.max(0, i - w), i + w + 1)));
  const spec = [];
  let total = 0;
  for (let f = 0.7; f <= 3.0001; f += 0.01) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) {
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
      const ph = (2 * Math.PI * f * (samples[i].t - samples[0].t)) / 1000;
      re += x[i] * hann * Math.cos(ph);
      im += x[i] * hann * Math.sin(ph);
    }
    const p = re * re + im * im;
    spec.push([f, p]);
    total += p;
  }
  const [peak] = spec.reduce((a, b) => (b[1] > a[1] ? b : a));
  const near = spec.filter(([f]) => Math.abs(f - peak) <= 0.1).reduce((s, [, p]) => s + p, 0);
  return { bpm: Math.round(peak * 60), quality: total ? near / total : 0 };
}

// 화면 → 서버 호출 (화면에서만 쓴다)
export const api = async (path, body) => {
  const r = await fetch(path, body && { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `요청 실패 (${r.status})`);
  return j;
};

// PHQ-9: 응답 검증(신뢰 경계) · 점수 구간 · 규칙 기반 추천 · 모델 추천 정리
export const parseAnswers = (a) =>
  Array.isArray(a) && a.length === 9 && a.every((v) => Number.isInteger(v) && v >= 0 && v <= 3) ? a : null;

export const phqLevel = (total, levels) => levels.find((l) => total <= l.max) ?? levels.at(-1);

export function rulePicks(answers, items) {
  const order = answers.map((s, i) => [s, i]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const picks = [];
  for (const [, i] of order) for (const id of items[i].routines) if (!picks.includes(id)) picks.push(id);
  for (const id of ['sigh', 'label', 'walk']) if (!picks.includes(id)) picks.push(id); // 점수가 낮아도 3개를 채운다
  return picks.slice(0, 3);
}

const MEDICAL = /처방|치료|완치|진단|증상|우울증/;
// 모델 출력 정리: 목록에 있는 id만 중복 없이 3개. 의료 표현이 섞인 문장은 버린다(웰니스 문구 규칙).
export function cleanReco(o, ids, fallbackPicks) {
  const picks = [...new Set((Array.isArray(o?.picks) ? o.picks : []).filter((id) => ids.includes(id)))];
  for (const id of fallbackPicks) if (picks.length < 3 && !picks.includes(id)) picks.push(id);
  const message = typeof o?.message === 'string' ? o.message.trim().slice(0, 300) : '';
  return { picks: picks.slice(0, 3), message: message && !MEDICAL.test(message) ? message : null };
}

// 받침 붙이기: 과부하를 / 우울을
export const josa = (word, withFinal, without) => word + ((word.charCodeAt(word.length - 1) - 0xac00) % 28 ? withFinal : without);

// 지금 체크: 감정 × 장소 × 시간대 매트릭스에 내 기록(해보고 나아졌던 비율)을 더해 5분 행동 순위를 낸다. AI를 쓰지 않는다(비용 0원).
const OK_POOL = ['walk', 'hello', 'reread'];
export function pickNow(routines, { emotion, place, slot, leaves = [] }) {
  const mine = (id) => {
    const xs = leaves.filter((l) => l.routine === id);
    return xs.length ? xs.filter((l) => l.after > 0).length / xs.length : 0.5; // 안 해본 행동은 중간값
  };
  return routines
    .filter((r) => (emotion === OK ? OK_POOL.includes(r.id) : r.emotion === emotion))
    .map((r) => ({ r, score: (r.places.includes(place) ? 2 : 0) + (r.slots.includes(slot) ? 1 : 0) + mine(r.id) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.r);
}

// 나와의 약속: 정한 시간대가 오면 보여준다. 만든 뒤 6시간, 보여준 뒤 6시간은 다시 띄우지 않는다(자정을 넘는 '밤'도 한 번만).
const hoursSince = (ts, now) => (now - new Date(ts)) / 36e5;
export const duePromise = (promises, now) =>
  promises.find((p) => p.slot === slotOf(now) && hoursSince(p.from, now) >= 6 && (!p.shown || hoursSince(p.shown, now) >= 6)) ?? null;

// 마음 정원 요약: 잎 수, 나아진 횟수, 감정별 잎, 기록한 날 수, 내게 잘 맞았던 행동(2번 이상 해본 것)
export function gardenStats(leaves) {
  const by = {}, per = {};
  for (const l of leaves) {
    by[l.emotion ?? OK] = (by[l.emotion ?? OK] ?? 0) + 1;
    const x = (per[l.routine] ??= { id: l.routine, n: 0, better: 0 });
    x.n++;
    if (l.after > 0) x.better++;
  }
  const best = Object.values(per).filter((x) => x.n >= 2).sort((a, b) => b.better / b.n - a.better / a.n || b.n - a.n).slice(0, 3);
  return { n: leaves.length, better: leaves.filter((l) => l.after > 0).length, by, days: new Set(leaves.map((l) => l.ts.slice(0, 10))).size, best };
}

// 감정 쓰레기통: 모델 출력 정리(신뢰 경계). 신호는 PHQ-9 9개 영역에 0~3, 없는 값은 0. 의료 표현이 섞인 답은 버린다.
export function cleanVent(o, keys, placeIds) {
  const reply = typeof o?.reply === 'string' ? o.reply.trim().slice(0, 300) : '';
  return {
    reply: reply && !MEDICAL.test(reply) ? reply : null,
    emotion: [...EMOTIONS, OK].includes(o?.emotion) ? o.emotion : null,
    place: placeIds.includes(o?.place) ? o.place : null,
    signals: Object.fromEntries(keys.map((k) => [k, [0, 1, 2, 3].includes(o?.signals?.[k]) ? o.signals[k] : 0])),
    risk: ['none', 'watch', 'urgent'].includes(o?.risk) ? o.risk : 'none',
  };
}

// 최근 14일 털어놓은 글에서 같은 영역 신호(2 이상)가 3번 이상이면 9문항 점검을 권한다. 자해 생각은 위기 안내가 따로 맡는다.
export function ventNudge(vents, now, items) {
  const from = now - 14 * 864e5;
  const recent = vents.filter((v) => new Date(v.ts) >= from);
  const hits = items.filter((it) => it.key !== 'harm').map((it) => ({ ...it, n: recent.filter((v) => (v.signals?.[it.key] ?? 0) >= 2).length }));
  return hits.filter((h) => h.n >= 3).sort((a, b) => b.n - a.n)[0] ?? null;
}

// 느슨한 연대: 최근 12시간 중 지금과 같은 시간대에 같은 행동을 한 실제 기록만 센다(어제 같은 시간대는 빠짐)
export function togetherStats(rows, now) {
  const slot = slotOf(now);
  const same = rows.filter((r) => now - new Date(r.ts) <= 12 * 36e5 && slotOf(new Date(r.ts)) === slot);
  return { n: same.length, better: same.filter((r) => r.after > 0).length, slot };
}
export function togetherText({ n, better, slot }, title) {
  if (n <= 1) return `오늘 ${slot}, ‘${title}’ 첫 번째는 나예요. 다음에 올 누군가와 이어질 거예요.`;
  return `오늘 ${slot}, 나까지 ${n}명이 ‘${title}’ 했어요.` + (n >= 5 ? ` 그중 ${better}명은 조금이라도 나아졌어요.` : '');
}
