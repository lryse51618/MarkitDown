// 남은 날들 — 화면과 이동. 화면마다 주소(#/age, #/home, #/day/2026-11-06 …)가 있어서 브라우저 뒤로가기·앞으로가기·새로고침이 그대로 된다.
(() => {
  'use strict';
  const D = window.Days;
  const KEY = 'days_with_parents_v1';
  const $ = (id) => document.getElementById(id);
  const sheet = $('sheet');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOW = { 1: '통화했어요', 2: '만났어요' };

  /* ---------- 저장: 기록은 localStorage, 목소리는 용량이 커서 IndexedDB ---------- */
  const EMPTY = { parentAge: null, ageYear: null, records: {} };
  let S = { ...EMPTY };
  try { S = { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* 저장소를 못 쓰면 빈 기록으로 시작 */ }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch { toast('이 브라우저에는 저장되지 않아요. 사생활 보호 모드인지 확인해 주세요.'); }
  }

  let dbp;
  const audioDb = () => (dbp ??= new Promise((ok, no) => {
    const r = indexedDB.open('days_with_parents', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('audio');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  }));
  const audioTx = (mode, fn) => audioDb().then((db) => new Promise((ok, no) => {
    const tx = db.transaction('audio', mode);
    const req = fn(tx.objectStore('audio'));
    tx.oncomplete = () => ok(req.result);
    tx.onerror = () => no(tx.error);
  }));
  const getAudio = (k) => audioTx('readonly', (s) => s.get(k));
  const putAudio = (k, blob) => audioTx('readwrite', (s) => s.put(blob, k));
  const delAudio = (k) => audioTx('readwrite', (s) => s.delete(k));
  const clearAudio = () => audioTx('readwrite', (s) => s.clear());

  /* ---------- 이동 ---------- */
  const SCREENS = ['start', 'age', 'grid', 'count', 'home', 'life', 'settings', 'day'];
  const SETUP_FREE = ['start', 'age']; // 나이를 넣기 전에도 볼 수 있는 화면
  const PARENT = { age: 'start', grid: 'age', count: 'grid', life: 'home', settings: 'home', day: 'home' };
  const trail = []; // 이 탭에서 지나온 주소. 앱 안 '이전' 버튼이 사이트 밖으로 나가지 않게 쓴다
  let replacing = false;

  const route = () => { const [name = '', arg = ''] = location.hash.replace(/^#\/?/, '').split('/'); return { name, arg }; };
  function go(to, replace = false) {
    const target = '#/' + to;
    if (location.hash === target) return show();
    replacing = replace;
    if (replace) location.replace(target); else location.hash = target;
  }
  function back() {
    if (trail.length > 1) history.back();
    else go(PARENT[route().name] ?? 'home', true); // 주소로 바로 들어온 경우
  }
  const today = () => D.dayKey(new Date());
  const validDay = (k) => D.parseKey(k) != null && k <= today();

  function show() {
    const { name, arg } = route();
    const age = D.ageNow(S, new Date());
    const home = age == null ? 'start' : 'home';
    if (!SCREENS.includes(name) || (age == null && !SETUP_FREE.includes(name)) || (name === 'day' && !validDay(arg))) return go(home, true);

    const here = location.hash;
    if (replacing && trail.length) trail[trail.length - 1] = here;
    else if (trail.at(-2) === here) trail.pop();
    else if (trail.at(-1) !== here) trail.push(here);
    replacing = false;

    const base = name === 'day' ? 'home' : name;
    for (const el of document.querySelectorAll('.screen')) {
      const on = el.dataset.route === base;
      if (on && !el.classList.contains('active')) { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); } // 들어올 때마다 글자가 올라오게
      el.classList.toggle('active', on);
      el.inert = !on || name === 'day';
    }
    if (base === 'age') { $('ageIn').value = age ?? ''; checkAge(); }
    if (base === 'grid') renderGrid(age);
    if (base === 'count') renderCount(age);
    if (base === 'home') renderHome();
    if (base === 'life') renderLife(age);
    if (base === 'settings') $('setAge').value = age;
    if (name === 'day') openSheet(arg); else closeSheet();

    // 새 화면의 제목으로 초점을 옮겨서 화면 읽기 프로그램이 바뀐 화면을 읽게 한다
    const head = name === 'day' ? $('shDate') : document.querySelector(`.screen[data-route="${base}"] h1`);
    head?.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', show);

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go], [data-back]');
    if (!t) return;
    if (t.hasAttribute('data-back')) back(); else go(t.dataset.go);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ['day', 'life', 'settings'].includes(route().name)) back();
  });

  /* ---------- 나이 ---------- */
  const okAge = (v) => Number.isInteger(v) && v >= 40 && v <= 110;
  function checkAge() {
    const raw = $('ageIn').value;
    const ok = okAge(Number(raw));
    $('ageBtn').disabled = !ok;
    $('ageHint').classList.toggle('err', raw !== '' && !ok);
  }
  $('ageIn').addEventListener('input', checkAge);
  $('ageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = Number($('ageIn').value);
    if (!okAge(v)) return checkAge();
    S.parentAge = v;
    S.ageYear = new Date().getFullYear();
    save();
    go('grid');
  });
  $('setForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = Number($('setAge').value);
    if (!okAge(v)) return toast('40~110세 사이로 적어주세요');
    S.parentAge = v;
    S.ageYear = new Date().getFullYear();
    save();
    toast('나이를 바꿨어요');
    back();
  });
  $('wipeBtn').addEventListener('click', () => {
    if (!confirm('모든 기록과 목소리를 지울까요? 되돌릴 수 없어요.')) return;
    S.records = {};
    save();
    clearAudio().catch(() => {});
    toast('모든 기록을 지웠어요');
  });

  /* ---------- 인생 그리드 · 남은 만남 ---------- */
  function lifeGrid(el, age) {
    const m = D.lifeMath(age);
    el.replaceChildren(...Array.from({ length: m.total }, (_, i) => Object.assign(document.createElement('i'), { className: i < m.spent ? 'ld' : 'ld left' })));
    el.setAttribute('aria-label', `한 칸이 한 달인 그림. 지나간 달 ${m.spent.toLocaleString()}칸, 남은 달 ${m.leftMonths.toLocaleString()}칸`);
    return m;
  }
  function renderGrid(age) {
    const m = lifeGrid($('lifeGrid'), age);
    $('gridTitle').innerHTML = `한 칸이 한 달입니다.<br><span class="hl">${m.leftPct}%</span>가 남았어요.`;
  }
  let counter;
  function renderCount(age) {
    const { leftVisits } = D.lifeMath(age);
    const el = $('leftNum');
    $('countTitle').setAttribute('aria-label', `앞으로 남은 만남 ${leftVisits.toLocaleString()}번`);
    clearInterval(counter);
    if (reduceMotion) { el.textContent = leftVisits.toLocaleString(); return; }
    let cur = 0;
    const step = Math.max(Math.ceil(leftVisits / 45), 1);
    counter = setInterval(() => {
      cur = Math.min(cur + step, leftVisits);
      el.textContent = cur.toLocaleString();
      if (cur === leftVisits) clearInterval(counter);
    }, 28);
  }
  function renderLife(age) {
    const m = lifeGrid($('lifeGrid2'), age);
    $('lvTitle').innerHTML = `남은 칸은 <span class="hl">${m.leftMonths.toLocaleString()}</span>달입니다.`;
    $('lvNote').innerHTML = `부모님 ${age}세 · 통계청 기대수명(약 ${D.LIFE_EXPECT}세)까지로 단순하게 계산했어요.<br>자주 보실 필요는 없습니다. 가끔 떠올려만 주세요.`;
  }

  /* ---------- 메인: 지난 1년 ---------- */
  let justLit = null, scrolledToToday = false;
  function renderHome() {
    const days = D.yearDays(new Date());
    const t = today();
    const cols = `repeat(${days.length / 7}, var(--cell))`;
    $('monthRow').style.gridTemplateColumns = cols;
    $('monthRow').replaceChildren(...D.monthLabels(days).map((textContent) => Object.assign(document.createElement('span'), { textContent })));
    $('yearGrid').replaceChildren(...days.map((d) => {
      if (d.future) return Object.assign(document.createElement('span'), { className: 'd future' });
      const r = S.records[d.key];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `d${r ? ' l' + r.level : ''}${d.key === t ? ' today' : ''}${d.key === justLit ? ' just-lit' : ''}`;
      b.setAttribute('aria-label', `${D.spoken(d.key)}${d.key === t ? '(오늘)' : ''}${r ? ', ' + (r.text || r.audio ? '기록 남김' : HOW[r.how ?? r.level]) : ''}`);
      b.addEventListener('click', () => go('day/' + d.key));
      return b;
    }));
    justLit = null;
    if (!scrolledToToday) { const y = $('yearScroll'); y.scrollLeft = y.scrollWidth; scrolledToToday = true; }
    $('litCount').textContent = days.filter((d) => S.records[d.key]).length;
    $('pickDay').max = t;

    const keys = Object.keys(S.records).sort().reverse();
    if (!keys.length) {
      $('recList').innerHTML = '<p class="empty">아직 기록이 없습니다.<br>뵙고 오신 날 아래 버튼만 눌러주세요.</p>';
      return;
    }
    $('recList').replaceChildren(...keys.map((k) => {
      const r = S.records[k];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rec';
      b.innerHTML = '<span class="date"></span><span class="txt"></span>' + (r.audio ? '<span class="tag"><i></i>목소리 기록</span>' : '');
      b.querySelector('.date').textContent = D.dotted(k);
      b.querySelector('.txt').textContent = r.text || ((r.how ?? r.level) === 1 ? '통화했습니다.' : '뵙고 왔습니다.');
      b.addEventListener('click', () => go('day/' + k));
      return b;
    }));
  }
  $('todayBtn').addEventListener('click', () => go('day/' + today()));
  $('pickDay').addEventListener('change', (e) => {
    const k = e.target.value;
    e.target.value = '';
    if (validDay(k)) go('day/' + k);
    else if (k) toast('오늘까지의 날짜만 기록할 수 있어요');
  });

  /* ---------- 하루 기록 ---------- */
  let curKey = null, curHow = 2, pending = null, rec = null, discard = false, playerUrl = null;
  function openSheet(key) {
    if (curKey === key) return;
    curKey = key;
    pending = null;
    const r = S.records[key];
    $('shDate').textContent = D.dotted(key) + (key === today() ? ' · 오늘' : '');
    $('shQ').textContent = D.questionFor(key);
    $('shText').value = r?.text ?? '';
    pickHow(r ? r.how ?? Math.min(r.level, 2) : 2);
    $('delBtn').hidden = !r;
    micIdle();
    setPlayer(null);
    if (r?.audio) {
      getAudio(key)
        .then((blob) => { if (curKey === key && blob) { setPlayer(blob); micMsg('남긴 목소리가 있어요.<br>다시 녹음하면 바뀌어요.'); } })
        .catch(() => micMsg('목소리 기록을 불러오지 못했어요.'));
    }
    sheet.inert = false;
    sheet.classList.add('on');
  }
  function closeSheet() {
    if (curKey == null) return;
    if (rec?.state === 'recording') { discard = true; rec.stop(); }
    sheet.classList.remove('on');
    sheet.inert = true;
    setPlayer(null);
    pending = null;
    curKey = null;
  }
  sheet.addEventListener('click', (e) => { if (e.target === sheet) back(); });

  function pickHow(n) {
    curHow = n;
    for (const b of document.querySelectorAll('.lv')) b.setAttribute('aria-pressed', String(+b.dataset.lv === n));
  }
  for (const b of document.querySelectorAll('.lv')) b.addEventListener('click', () => pickHow(+b.dataset.lv));

  const micMsg = (html) => { $('micTxt').innerHTML = html; };
  function micIdle() {
    const b = $('micBtn');
    b.classList.remove('rec-on');
    b.textContent = '●';
    b.setAttribute('aria-label', '목소리 녹음');
    micMsg('목소리를 남기면<br>칸이 가장 밝게 켜집니다.');
  }
  function setPlayer(blob) {
    const p = $('player');
    if (playerUrl) URL.revokeObjectURL(playerUrl);
    playerUrl = blob ? URL.createObjectURL(blob) : null;
    p.hidden = !blob;
    if (blob) p.src = playerUrl;
    else { p.removeAttribute('src'); p.load(); }
  }

  $('micBtn').addEventListener('click', () => (rec?.state === 'recording' ? rec.stop() : startRec()));
  async function startRec() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return micMsg('이 브라우저에서는 녹음할 수 없어요.<br>글로 남기셔도 괜찮아요.');
    const key = curKey;
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { return micMsg('마이크 권한이 필요합니다.<br>글로 남기셔도 괜찮아요.'); }
    if (key !== curKey) { stream.getTracks().forEach((t) => t.stop()); return; } // 권한을 묻는 사이 시트를 닫았다
    const chunks = [];
    const r = new MediaRecorder(stream);
    rec = r;
    discard = false;
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (discard || key !== curKey) return;
      micIdle();
      if (!chunks.length) return micMsg('녹음된 소리가 없어요. 다시 눌러 주세요.');
      pending = new Blob(chunks, { type: r.mimeType || chunks[0].type || 'audio/webm' }); // 아이폰 사파리는 mp4로 녹음한다
      setPlayer(pending);
      micMsg('녹음이 담겼어요.<br>저장하기를 눌러야 남아요.');
    };
    r.start();
    const b = $('micBtn');
    b.classList.add('rec-on');
    b.textContent = '■';
    b.setAttribute('aria-label', '녹음 멈추기');
    micMsg('녹음 중입니다…<br>다시 누르면 멈춥니다.');
  }
  const stopped = () => new Promise((ok) => {
    if (rec?.state !== 'recording') return ok();
    rec.addEventListener('stop', () => setTimeout(ok), { once: true });
    rec.stop();
  });

  $('saveBtn').addEventListener('click', async () => {
    await stopped(); // 녹음 중에 저장을 눌러도 녹음까지 담는다
    const key = curKey;
    if (key == null) return;
    const text = $('shText').value.trim();
    const old = S.records[key];
    let audio = !!old?.audio;
    if (pending) {
      try { await putAudio(key, pending); audio = true; }
      catch { toast('목소리는 저장하지 못했어요. 글과 칸은 저장했어요.'); }
    }
    S.records[key] = { how: curHow, level: text || audio ? 3 : curHow, text, audio }; // 글이나 목소리까지 남기면 가장 밝게
    save();
    if (!old) justLit = key;
    back();
  });
  $('delBtn').addEventListener('click', () => {
    if (!confirm('이 날의 기록을 지울까요? 남긴 목소리도 함께 지워져요.')) return;
    const key = curKey;
    delete S.records[key];
    save();
    delAudio(key).catch(() => {});
    toast('기록을 지웠어요');
    back();
  });

  let toastT;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 2600);
  }

  show();
})();
