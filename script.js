(() => {
  const WHATSAPP = '5521999464757';
  // DEMONSTRAÇÃO: os horários são de exemplo. Para uso real, ligar à agenda da clínica.
  const HOURS = {
    manha: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
    tarde: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
  };

  const root = document.documentElement;
  root.classList.add('js');
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const waLink = text => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

  // Links de WhatsApp com mensagem pronta
  $$('[data-wa]').forEach(a => {
    a.href = waLink(a.dataset.wa);
    a.target = '_blank';
    a.rel = 'noopener';
  });

  // Letra grande
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
  });

  // Menu do celular
  const nav = $('.navigation'), menu = $('.menu-toggle');
  const setMenu = open => {
    nav.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
  };
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menu.focus(); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.site-header')) setMenu(false); });

  // Entrada suave das seções
  if ('IntersectionObserver' in window && !calm.matches) {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
    }), { threshold: 0.06 });
    $$('[data-reveal]').forEach(el => { el.classList.add('will-reveal'); io.observe(el); });
  }

  // Agendamento
  const wizard = $('.wizard'), form = $('form', wizard);
  const select = $('#spec'), datesBox = $('.dates'), slotsBox = $('.slots'), error = $('.error', wizard);
  const back = $('.back', wizard), next = $('.next', wizard);
  let state;

  const addGroup = (label, names) => {
    const group = document.createElement('optgroup');
    group.label = label;
    names.forEach(n => group.append(new Option(n, n)));
    select.append(group);
  };
  const bookable = selector => $$(selector).map(b => b.dataset.book);
  addGroup('Especialidades', bookable('.spec-grid [data-book]'));
  addGroup('Exames', bookable('.exam-list [data-book]'));
  addGroup('Programas', ['Nutrição e Emagrecimento', 'Reabilitação Cardíaca']);

  const hash = text => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const longDate = d => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });

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

  const dateText = () => longDate(new Date(`${state.date}T12:00:00`));

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
    next.classList.toggle('button-line', step === 4);
    if (step === 2) {
      $('.chosen', form).textContent = `${state.spec} · ${dateText()}`;
      renderSlots();
    }
    if (focus) {
      $(`fieldset[data-step="${step}"] legend`, form).focus({ preventScroll: true });
      wizard.scrollIntoView({ behavior: calm.matches ? 'auto' : 'smooth', block: 'start' });
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
    $('.send', form).href = waLink(`Olá! Gostaria de agendar: ${state.spec}, ${dateText()}, às ${state.hour}. Paciente: ${name}. Telefone: ${phone}. Podem confirmar?`);
  }

  select.addEventListener('change', () => { state.spec = select.value; state.hour = ''; error.textContent = ''; });
  datesBox.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    state.date = b.dataset.date;
    state.hour = '';
    error.textContent = '';
    $$('button', datesBox).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
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
  });
  $('#tel').addEventListener('input', e => {
    const n = e.target.value.replace(/\D/g, '').slice(0, 11);
    const cut = n.length > 10 ? 7 : 6;
    e.target.value = n.length > 6 ? `(${n.slice(0, 2)}) ${n.slice(2, cut)}-${n.slice(cut)}`
      : n.length > 2 ? `(${n.slice(0, 2)}) ${n.slice(2)}` : n;
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fail = message => { error.textContent = message; };
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
})();
