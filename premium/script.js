(() => {
  const WHATSAPP = '5521999464757';
  // DEMONSTRAÇÃO: os horários são de exemplo. Para uso real, ligar à agenda da clínica.
  const HOURS = {
    manha: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
    tarde: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
  };

  const root = document.documentElement;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const wide = window.matchMedia('(min-width: 961px)');
  const clamp = v => Math.min(1, Math.max(0, v));
  const behavior = () => (calm.matches ? 'auto' : 'smooth');
  const waLink = text => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  const motion = !calm.matches && 'IntersectionObserver' in window;
  root.classList.toggle('motion', motion);

  // Links de WhatsApp com mensagem pronta
  $$('[data-wa]').forEach(a => {
    a.href = waLink(a.dataset.wa);
    a.target = '_blank';
    a.rel = 'noopener';
  });

  /* ---------- Textos que surgem ---------- */
  const splitWords = (el, make) => {
    let i = 0;
    const walk = node => [...node.childNodes].forEach(child => {
      if (child.nodeType !== 3) return walk(child);
      const parts = child.textContent.split(/(\s+)/).filter(Boolean);
      child.replaceWith(...parts.map(part => (/^\s+$/.test(part) ? document.createTextNode(' ') : make(part, i++))));
    });
    walk(el);
  };
  $$('[data-split]').forEach(el => splitWords(el, (word, i) => {
    const outer = document.createElement('span'), inner = document.createElement('span');
    outer.className = 'w';
    outer.style.setProperty('--i', i);
    inner.textContent = word;
    outer.append(inner);
    return outer;
  }));
  const lights = $$('[data-light]').map(el => {
    const words = [];
    splitWords(el, word => {
      const span = document.createElement('span');
      span.textContent = word;
      words.push(span);
      return span;
    });
    return { el, words };
  });

  const countUp = el => {
    const end = Number(el.dataset.count), start = performance.now();
    const tick = now => {
      const t = clamp((now - start) / 1400);
      el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (motion) {
    const io = new IntersectionObserver(entries => entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.add('is-in');
      if (target.dataset.count) countUp(target);
      io.unobserve(target);
    }), { rootMargin: '0px 0px -8% 0px' });
    $$('[data-split], [data-reveal], [data-count], [data-zoom]').forEach(el => io.observe(el));
  }

  /* ---------- Letra grande ---------- */
  const fontButton = $('.font-toggle');
  const setBig = on => {
    root.classList.toggle('big-text', on);
    fontButton.setAttribute('aria-pressed', String(on));
    fontButton.textContent = on ? 'A−' : 'A+';
    fontButton.setAttribute('aria-label', on ? 'Voltar a letra ao tamanho normal' : 'Aumentar o tamanho da letra');
  };
  let saved = false;
  try { saved = localStorage.getItem('integra-letra') === 'grande'; } catch (e) { /* armazenamento bloqueado */ }
  setBig(saved);
  fontButton.addEventListener('click', () => {
    const on = !root.classList.contains('big-text');
    setBig(on);
    try { localStorage.setItem('integra-letra', on ? 'grande' : 'normal'); } catch (e) { /* armazenamento bloqueado */ }
    layout();
  });

  /* ---------- Menu em tela cheia ---------- */
  const menu = $('.menu'), menuButton = $('.menu-toggle'), header = $('.nav');
  const behind = $$('main, footer, .quickbar');
  const setMenu = open => {
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    $('.menu-label', menuButton).textContent = open ? 'Fechar' : 'Menu';
    root.classList.toggle('menu-open', open);
    behind.forEach(el => { el.inert = open; });
    paint();
  };
  menuButton.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  $('.brand').addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuButton.focus(); }
  });
  window.matchMedia('(min-width: 1181px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------- Galeria de cuidados ---------- */
  const care = $('.care'), careInner = $('.care-inner'), view = $('.care-view'), track = $('.care-track');
  const cards = $$('.card', track), bar = $('.care-bar i'), count = $('.care-count b');
  const prev = $('.care-prev'), nextCard = $('.care-next');
  let distance = 0, current = 0;

  const showProgress = p => {
    current = Math.round(p * (cards.length - 1));
    bar.style.transform = `scaleX(${.2 + p * .8})`;
    count.textContent = String(current + 1).padStart(2, '0');
    prev.disabled = current === 0;
    nextCard.disabled = current === cards.length - 1;
  };
  // Prende a galeria na tela só quando há espaço para o conteúdo inteiro
  function layoutCare() {
    care.classList.remove('is-pinned');
    care.style.height = '';
    track.style.transform = '';
    distance = 0;
    if (!motion || !wide.matches) return;
    care.classList.add('is-pinned');
    view.scrollLeft = 0;
    if (careInner.offsetHeight > window.innerHeight) { care.classList.remove('is-pinned'); return; }
    distance = Math.max(0, track.scrollWidth - view.clientWidth);
    care.style.height = `${window.innerHeight + distance}px`;
  }
  const goTo = i => {
    const p = clamp(i / (cards.length - 1));
    window.scrollTo({ top: care.getBoundingClientRect().top + window.scrollY + p * distance, behavior: behavior() });
  };
  // Presa: as setas rolam a página. Solta: as setas andam um cartão para o lado.
  const step = dir => {
    if (distance) return goTo(current + dir);
    view.scrollBy({ left: dir * (cards[1].offsetLeft - cards[0].offsetLeft), behavior: behavior() });
  };
  prev.addEventListener('click', () => step(-1));
  nextCard.addEventListener('click', () => step(1));
  const swiped = () => {
    if (distance) return;
    const max = Math.max(1, view.scrollWidth - view.clientWidth);
    showProgress(clamp(view.scrollLeft / max));
    prev.disabled = view.scrollLeft < 2;
    nextCard.disabled = view.scrollLeft > max - 2;
  };
  view.addEventListener('scroll', swiped, { passive: true });
  // Quem navega pelo teclado vê o cartão focado
  cards.forEach((card, i) => card.addEventListener('focusin', e => {
    if (distance && e.target.matches(':focus-visible')) goTo(i);
  }));

  /* ---------- Efeitos ligados à rolagem ---------- */
  const folio = $('.folio'), folioNum = $('.folio-num'), folioName = $('.folio-name');
  const sections = $$('main > section, footer');
  const fab = $('.fab'), timeline = $('.timeline'), stepsList = $$('li', timeline);
  const parallax = $$('[data-parallax]');
  const navLinks = $$('.nav-links a');

  const sectionAt = y => sections.find(s => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; });

  function paint() {
    const h = window.innerHeight;
    header.classList.toggle('is-solid', menu.hidden && window.scrollY > 24);

    const middle = sectionAt(h / 2);
    const named = middle && middle.dataset.folio;
    folio.classList.toggle('is-on', Boolean(named) && !(middle === care && distance));
    if (named) {
      folio.classList.toggle('on-dark', middle.dataset.theme === 'dark');
      folioName.textContent = named;
      folioNum.textContent = String(sections.filter(s => s.dataset.folio).indexOf(middle) + 1).padStart(2, '0');
    }
    navLinks.forEach(a => a.classList.toggle('is-current', Boolean(middle) && a.hash === `#${middle.id}`));
    const quiet = !middle || ['inicio', 'agendar', 'contato'].includes(middle.id) || middle.tagName === 'FOOTER';
    fab.classList.toggle('is-on', !quiet);

    if (distance) {
      const p = clamp(-care.getBoundingClientRect().top / distance);
      track.style.transform = `translate3d(${-p * distance}px,0,0)`;
      showProgress(p);
    }

    const t = timeline.getBoundingClientRect();
    timeline.style.setProperty('--fill', motion ? clamp((h * .6 - t.top) / t.height) : 1);
    stepsList.forEach(li => li.classList.toggle('is-active', !motion || li.getBoundingClientRect().top < h * .6));

    if (!motion) return;
    lights.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      // Termina de acender antes do meio da tela, para não atrapalhar a leitura
      const p = clamp((h * .9 - r.top) / (r.height * .6 + h * .15));
      words.forEach((w, i) => { w.style.opacity = .28 + .72 * clamp(p * words.length - i); });
    });
    parallax.forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      const p = clamp((h - r.top) / (h + r.height));
      img.style.transform = `translate3d(0,${(-p * 10.5).toFixed(2)}%,0)`;
    });
  }
  let waiting = false;
  const schedule = () => {
    if (waiting) return;
    waiting = true;
    requestAnimationFrame(() => { waiting = false; paint(); });
  };
  function layout() {
    layoutCare();
    swiped();
    paint();
  }
  window.addEventListener('scroll', schedule, { passive: true });
  let resizeTimer, lastWidth = window.innerWidth, lastHeight = window.innerHeight;
  window.addEventListener('resize', () => {
    // No celular a barra do navegador muda a altura; só recalcula se mudar de verdade
    if (window.innerWidth === lastWidth && (!wide.matches || window.innerHeight === lastHeight)) return schedule();
    lastWidth = window.innerWidth;
    lastHeight = window.innerHeight;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 150);
  });
  if (document.fonts) document.fonts.ready.then(layout);

  /* ---------- Vídeo ---------- */
  const video = $('.player video'), play = $('.play'), playLabel = $('.play-label', play), playIcon = $('.play-icon', play);
  // Começa sozinho (sem som, exigência dos navegadores), menos para quem pede menos movimento ou economia de dados
  const autoplay = motion && !(navigator.connection && navigator.connection.saveData);
  let userPaused = false, autoPaused = false;

  const soundButton = on => {
    play.classList.toggle('is-sound', on);
    playIcon.textContent = on ? '🔊' : '▶';
    playLabel.textContent = on ? 'Ouvir com som' : 'Assistir (1 minuto)';
    play.hidden = false;
  };
  play.addEventListener('click', () => {
    video.muted = false;   // só libera o áudio: o vídeo segue de onde está
    video.controls = true;
    play.hidden = true;
    video.play().catch(() => { /* o navegador pode exigir o toque nos controles */ });
    video.focus();
  });
  video.addEventListener('play', () => {
    userPaused = false;
    video.controls = true;
    if (video.muted) soundButton(true); else play.hidden = true;
  });
  video.addEventListener('volumechange', () => { if (!video.muted) play.hidden = true; });
  video.addEventListener('pause', () => {
    // Se a pessoa pausou, o vídeo não volta a tocar sozinho
    if (!autoPaused && !document.hidden) userPaused = true;
    autoPaused = false;
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const { intersectionRatio: seen } = entries[entries.length - 1];
      if (seen >= .5) {
        if (!autoplay || userPaused || video.ended || !video.paused) return;
        if (!video.currentTime) video.muted = true;
        video.play().catch(() => { play.hidden = false; });   // bloqueado: fica o botão de assistir
      } else if (seen < .15 && !video.paused && !document.fullscreenElement) {
        autoPaused = true;
        video.pause();
      }
    }, { threshold: [0, .15, .5] }).observe(video);
  }

  /* ---------- Música de fundo ---------- */
  // O volume baixo já está no arquivo, porque o iPhone ignora o volume definido pela página.
  const music = $('.music'), musicButton = $('.music-toggle');
  let wantsMusic = !(navigator.connection && navigator.connection.saveData), heard = false;
  try { if (localStorage.getItem('integra-musica') === 'desligada') wantsMusic = false; } catch (e) { /* armazenamento bloqueado */ }

  const paintMusic = () => musicButton.setAttribute('aria-pressed', String(wantsMusic && heard));
  const videoHasSound = () => !video.paused && !video.muted && video.volume > 0;
  // Toca só se a pessoa quer, a aba está à vista e o vídeo não está falando
  const syncMusic = () => {
    if (wantsMusic && !document.hidden && !videoHasSound()) {
      if (music.paused) music.play().catch(() => { /* o navegador espera o primeiro toque */ });
    } else music.pause();
    paintMusic();
  };
  music.addEventListener('playing', () => { heard = true; paintMusic(); });
  musicButton.addEventListener('click', () => {
    wantsMusic = !(wantsMusic && heard);
    heard = wantsMusic;
    try { localStorage.setItem('integra-musica', wantsMusic ? 'ligada' : 'desligada'); } catch (e) { /* armazenamento bloqueado */ }
    syncMusic();
  });
  // Navegadores só liberam som depois de um clique, toque ou tecla
  ['click', 'touchend', 'keydown'].forEach(type => document.addEventListener(type, e => {
    if (wantsMusic && music.paused && !musicButton.contains(e.target)) syncMusic();
  }, { passive: true }));
  ['play', 'pause', 'ended', 'volumechange'].forEach(type => video.addEventListener(type, syncMusic));
  document.addEventListener('visibilitychange', syncMusic);
  syncMusic();

  /* ---------- Prévia das especialidades ---------- */
  const previewIcon = $('.preview .ic'), previewUse = $('use', previewIcon), previewName = $('.preview-name');
  const specButtons = $$('.spec-list button');
  const preview = button => {
    if (button.classList.contains('is-active')) return;
    specButtons.forEach(b => b.classList.toggle('is-active', b === button));
    previewUse.setAttribute('href', `#${button.dataset.icon}`);
    previewName.textContent = button.dataset.book;
    previewIcon.classList.remove('swap');
    previewIcon.getBoundingClientRect();
    previewIcon.classList.add('swap');
  };
  specButtons.forEach(b => ['pointerenter', 'focus'].forEach(type => b.addEventListener(type, () => preview(b))));
  preview(specButtons[0]);

  /* ---------- Agendamento ---------- */
  const wizard = $('.wizard'), form = $('form', wizard);
  const select = $('#spec'), datesBox = $('.dates'), slotsBox = $('.slots'), error = $('.error', wizard);
  const back = $('.back', wizard), next = $('.next', wizard), bubble = $('.bubble-text');
  let state;

  const addGroup = (label, names) => {
    const group = document.createElement('optgroup');
    group.label = label;
    names.forEach(n => group.append(new Option(n, n)));
    select.append(group);
  };
  const bookable = selector => $$(selector).map(b => b.dataset.book);
  addGroup('Especialidades', bookable('.spec-list [data-book]'));
  addGroup('Exames', bookable('.exam-grid [data-book]'));
  addGroup('Programas', ['Nutrição e Emagrecimento', 'Reabilitação Cardíaca']);

  const hash = text => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const longDate = d => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const dateText = () => longDate(new Date(`${state.date}T12:00:00`));

  // Mensagem montada com o que já foi preenchido
  function message() {
    if (!state.spec) return 'Olá! Gostaria de agendar uma consulta. Podem me ajudar?';
    const name = form.elements.nome.value.trim(), phone = form.elements.tel.value.trim();
    let text = `Olá! Gostaria de agendar: ${state.spec}`;
    if (state.date) text += `, ${dateText()}`;
    if (state.hour) text += `, às ${state.hour}`;
    text += '.';
    if (name) text += ` Paciente: ${name}.`;
    if (phone) text += ` Telefone: ${phone}.`;
    return `${text} Podem confirmar?`;
  }
  const refresh = () => { bubble.textContent = message(); };

  function nextDays(total) {
    const days = [], d = new Date();
    d.setHours(12, 0, 0, 0);
    while (days.length < total) {
      d.setDate(d.getDate() + 1);           // a partir de amanhã
      if (d.getDay() !== 0) days.push(new Date(d));
    }
    return days;
  }

  function renderDates() {
    datesBox.replaceChildren(...nextDays(10).map(day => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.date = day.toISOString().slice(0, 10);
      b.setAttribute('aria-label', longDate(day));
      b.setAttribute('aria-pressed', String(state.date === b.dataset.date));
      const part = opts => day.toLocaleDateString('pt-BR', opts).replace('.', '');
      b.innerHTML = `<small>${part({ weekday: 'short' })}</small><b>${part({ day: '2-digit' })}</b><small>${part({ month: 'short' })}</small>`;
      return b;
    }));
  }

  function renderSlots() {
    slotsBox.replaceChildren(...HOURS[state.period].map(hour => {
      const b = document.createElement('button');
      const busy = hash(state.date + state.spec + hour) % 100 < 35;
      b.type = 'button';
      b.textContent = hour;
      b.disabled = busy;
      b.dataset.hour = hour;
      b.setAttribute('aria-label', `${hour}, ${busy ? 'indisponível' : 'disponível'}`);
      b.setAttribute('aria-pressed', String(state.hour === hour));
      return b;
    }));
  }

  function show(step, focus) {
    state.step = step;
    error.textContent = '';
    $$('fieldset[data-step]', form).forEach(f => { f.hidden = Number(f.dataset.step) !== step; });
    $$('.progress li', wizard).forEach((li, i) => {
      li.classList.toggle('done', i + 1 < step);
      if (i + 1 === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    back.hidden = step === 1;
    next.textContent = step === 3 ? 'Preparar pedido' : step === 4 ? 'Fazer outro pedido' : 'Continuar';
    next.classList.toggle('pill-line', step === 4);
    next.classList.toggle('pill-dark', step !== 4);
    if (step === 2) {
      $('.chosen', form).textContent = `${state.spec} · ${dateText()}`;
      renderSlots();
    }
    refresh();
    if (focus) {
      $(`fieldset[data-step="${step}"] legend`, form).focus({ preventScroll: true });
      wizard.scrollIntoView({ behavior: behavior(), block: 'start' });
    }
  }

  function reset() {
    state = { step: 1, spec: '', date: '', hour: '', period: 'manha' };
    form.reset();
    $$('[data-period]', form).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.period === 'manha')));
    renderDates();
  }

  function summary(name, phone) {
    const rows = [['Atendimento', state.spec], ['Dia e horário', `${dateText()}, às ${state.hour}`], ['Paciente', name], ['Telefone', phone]];
    $('.summary', form).replaceChildren(...rows.flatMap(([label, value]) => {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      return [dt, dd];
    }));
    $('.send', form).href = waLink(message());
  }

  select.addEventListener('change', () => { state.spec = select.value; state.hour = ''; error.textContent = ''; refresh(); });
  datesBox.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    state.date = b.dataset.date;
    state.hour = '';
    error.textContent = '';
    $$('button', datesBox).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    refresh();
  });
  $$('[data-period]', form).forEach(b => b.addEventListener('click', () => {
    state.period = b.dataset.period;
    $$('[data-period]', form).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderSlots();
  }));
  slotsBox.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    state.hour = b.dataset.hour;
    error.textContent = '';
    $$('button', slotsBox).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    refresh();
  });
  $('#nome').addEventListener('input', refresh);
  $('#tel').addEventListener('input', e => {
    const n = e.target.value.replace(/\D/g, '').slice(0, 11);
    const cut = n.length > 10 ? 7 : 6;
    e.target.value = n.length > 6 ? `(${n.slice(0, 2)}) ${n.slice(2, cut)}-${n.slice(cut)}`
      : n.length > 2 ? `(${n.slice(0, 2)}) ${n.slice(2)}` : n;
    refresh();
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fail = text => { error.textContent = text; };
    if (state.step === 1) {
      if (!state.spec) { select.focus(); return fail('Escolha a especialidade ou o exame.'); }
      if (!state.date) return fail('Escolha um dia.');
      return show(2, true);
    }
    if (state.step === 2) return state.hour ? show(3, true) : fail('Escolha um horário disponível.');
    if (state.step === 3) {
      const name = form.elements.nome.value.trim(), phone = form.elements.tel.value.trim();
      if (name.length < 3) { form.elements.nome.focus(); return fail('Digite o nome completo do paciente.'); }
      if (phone.replace(/\D/g, '').length < 10) { form.elements.tel.focus(); return fail('Digite o telefone com DDD.'); }
      if (!form.elements.consent.checked) { form.elements.consent.focus(); return fail('Marque a autorização para continuar.'); }
      summary(name, phone);
      return show(4, true);
    }
    reset();
    show(1, true);
  });
  back.addEventListener('click', () => show(state.step - 1, true));

  // Especialidades e exames levam ao agendamento já preenchido
  $$('[data-book]').forEach(button => button.addEventListener('click', () => {
    reset();
    state.spec = select.value = button.dataset.book;
    show(1, true);
  }));

  reset();
  show(1, false);
  layout();
})();
