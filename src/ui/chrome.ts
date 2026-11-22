import { PERSON, CLASSIC } from '../data/resume';
import { icon } from './icons';

export interface ChromeHooks {
  onRun(): void;
}

function byId(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`missing #${id}`);
  return e;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export interface ChromeApi {
  log(ts: string, text: string, cls?: string): void;
  clearLog(): void;
  openLog(): void;
  status(msg: string): void;
  setReady(): void;
  toast(msg: string): void;
}

export function initChrome(hooks: ChromeHooks): ChromeApi {
  // иконки в кнопках топбара
  byId('btn-run').insertAdjacentHTML('afterbegin', icon('play'));
  byId('btn-reset').insertAdjacentHTML('afterbegin', icon('rotate-ccw'));
  byId('btn-classic').insertAdjacentHTML('afterbegin', icon('file-text'));
  byId('btn-pdf').insertAdjacentHTML('afterbegin', icon('download'));
  byId('btn-gh').insertAdjacentHTML('afterbegin', icon('github'));

  // кнопки топбара
  byId('btn-run').addEventListener('click', () => hooks.onRun());
  byId('btn-reset').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cv-reset'));
  });
  byId('btn-classic').addEventListener('click', () => openClassic());

  // лог-док: свёртка
  byId('log-toggle').addEventListener('click', () => {
    byId('logdock').classList.toggle('collapsed');
  });

  // зум-ридaут в статусбаре
  window.addEventListener('cv-zoom', (e) => {
    byId('zoom-chip').textContent = `${(e as CustomEvent<number>).detail}%`;
  });

  // esc закрывает модалку
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModals();
  });

  const api: ChromeApi = {
    log(ts, text, cls) {
      const body = byId('log-body');
      const empty = body.querySelector('.empty-hint');
      if (empty) empty.remove();
      const line = document.createElement('div');
      line.className = `logline${cls ? ` ${cls}` : ''}`;
      const t = document.createElement('span');
      t.className = 'lt';
      t.textContent = ts;
      const s = document.createElement('span');
      s.textContent = text;
      line.append(t, s);
      body.appendChild(line);
      body.scrollTop = body.scrollHeight;
    },
    clearLog() {
      const body = byId('log-body');
      body.innerHTML = '<div class="empty-hint">— лог пуст · запусти сценарий</div>';
    },
    openLog() {
      byId('logdock').classList.remove('collapsed');
    },
    status(msg) {
      const chip = byId('status-chip');
      chip.textContent = msg;
      chip.classList.remove('ready');
      chip.classList.add('flash');
      setTimeout(() => chip.classList.remove('flash'), 1600);
    },
    setReady() {
      const chip = byId('status-chip');
      chip.textContent = 'готов к интервью';
      chip.classList.remove('flash');
      chip.classList.add('ready');
      openContacts();
    },
    toast(msg) {
      const t = byId('toast');
      t.textContent = msg;
      t.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
    },
  };

  api.clearLog();
  if (!location.search.includes('nointro')) showIntro(hooks);
  return api;
}

/* ---------- модалки ---------- */

function closeModals(): void {
  byId('modal-root').classList.remove('open');
  byId('modal-root').innerHTML = '';
}

function modal(inner: string, onOpen?: (card: HTMLElement) => void): void {
  const root = byId('modal-root');
  root.innerHTML = `<div class="modal-card">${inner}</div>`;
  root.classList.add('open');
  root.onclick = (e) => {
    if (e.target === root) closeModals();
  };
  const card = root.querySelector('.modal-card') as HTMLElement;
  card.querySelectorAll('[data-close]').forEach((b) =>
    b.addEventListener('click', closeModals),
  );
  onOpen?.(card);
}

function showIntro(hooks: ChromeHooks): void {
  modal(`
    <div class="modal-brand">
      <span class="modal-mark">${icon('workflow')}</span>
      <div>
        <div class="modal-eyebrow">${PERSON.name} · ${PERSON.city}</div>
        <div class="modal-eyebrow-sub">${PERSON.role}</div>
      </div>
    </div>
    <h2>Резюме как workflow</h2>
    <p class="modal-lead">Этот холст — живой редактор сценария автоматизации заказов Ozon/WB. Слева палитра, справа карточки, внизу лог конвейера.</p>
    <div class="modal-hints">
      <div class="hint-row"><span class="hint-num">01</span><span><b>Клик по ноде</b> — карточка: что нода делает в сценарии и какой мой опыт за ней стоит.</span></div>
      <div class="hint-row"><span class="hint-num">02</span><span><b>Ноды можно тянуть, порты — соединять</b>, двойной клик по связи удаляет её. Редактор живой, как n8n.</span></div>
      <div class="hint-row"><span class="hint-num">03</span><span><b>Запустить сценарий</b> — пакет пройдёт через конвейер, а лог выдаст ключевые факты и контакты.</span></div>
    </div>
    <p class="modal-tagline">${PERSON.tagline}</p>
    <div class="modal-actions">
      <button class="btn btn-primary" data-run>${icon('play')} Запустить сценарий</button>
      <button class="btn" data-close>Исследовать самому</button>
    </div>
  `, (card) => {
    card.querySelector('[data-run]')?.addEventListener('click', () => {
      closeModals();
      hooks.onRun();
    });
  });
}

function openContacts(): void {
  modal(`
    <div class="modal-eyebrow">сценарий выполнен</div>
    <h2>Контакты</h2>
    <p class="modal-lead">Конвейер отработал: заказ Ozon/WB дошёл до клиента за 1.2 с. Со мной можно связаться здесь:</p>
    <div class="contact-grid">
      <a href="mailto:${PERSON.email}"><span class="c-ic">${icon('mail')}</span><span class="c-label">EMAIL</span>${PERSON.email}</a>
      <a href="${PERSON.tg}" target="_blank" rel="noopener"><span class="c-ic">${icon('send')}</span><span class="c-label">TELEGRAM</span>t.me/Kerarty</a>
      <a href="${PERSON.gh}" target="_blank" rel="noopener"><span class="c-ic">${icon('github')}</span><span class="c-label">GITHUB</span>${PERSON.ghUser} — все проекты из резюме</a>
    </div>
    <p class="modal-note">Скрытые ноды в палитре слева разблокированы — там честные ответы про 1С, Linux и Ozon/WB API.</p>
    <div class="modal-actions">
      <button class="btn btn-primary" data-close>Закрыть</button>
    </div>
  `);
}

function openClassic(): void {
  const projects = CLASSIC.projects
    .map(
      (p) => `<div class="proj-item"><a href="${p.url}" target="_blank" rel="noopener">${p.name} ${icon('external-link')}</a><p>${p.desc}</p></div>`,
    )
    .join('');
  const fit = CLASSIC.fit
    .map((f) => {
      const [a, b] = f.split('→');
      return `<li class="fit-li"><b>${a.trim()}</b> → ${b.trim()}</li>`;
    })
    .join('');
  modal(`
    <h2 class="classic-name">Ярослав Кукар</h2>
    <p class="classic-sub">${PERSON.role} · Минск · ${PERSON.email}</p>
    <h3>О себе</h3>
    <p>${CLASSIC.summary}</p>
    <h3>Навыки</h3>
    <ul>${CLASSIC.skills.map((s) => `<li>${s}</li>`).join('')}</ul>
    <h3>Проекты (всё — github.com/Kerarty)</h3>
    ${projects}
    <h3>Образование</h3>
    <p>${PERSON.edu}</p>
    <h3>Соответствие вакансии</h3>
    <ul>${fit}</ul>
    <div class="modal-actions">
      <a class="btn btn-primary" href="/cv-plastontim/cv-yaroslav-kukar.pdf" download="cv-yaroslav-kukar.pdf">${icon('download')} Скачать PDF</a>
      <button class="btn" id="btn-print">${icon('printer')} Печать</button>
      <button class="btn" data-close>Закрыть</button>
    </div>
  `, (card) => {
    card.querySelector('#btn-print')?.addEventListener('click', () => window.print());
  });
}
