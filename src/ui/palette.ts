import type { NodeDef } from '../data/resume';
import { icon } from './icons';

export interface PaletteHooks {
  onAdd(def: NodeDef): void;
  onFocus(def: NodeDef): void;
  status(msg: string): void;
}

export interface PaletteApi {
  markAdded(id: string): void;
  revealHidden(): void;
}

function item(def: NodeDef, cls: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `pal-item ${cls}`;
  el.dataset.id = def.id;
  el.innerHTML = `
    <span class="pal-chip k-${def.kind}">${icon(def.icon)}</span>
    <span class="pal-text"><div class="pal-name">${def.title}</div><div class="pal-sub">${def.sub}</div></span>
    ${cls.includes('locked') ? `<span class="pal-lock">${icon('lock')}</span>` : ''}
  `;
  return el;
}

export function initPalette(
  defs: { scenario: NodeDef[]; info: NodeDef[]; hidden: NodeDef[] },
  hooks: PaletteHooks,
): PaletteApi {
  const root = document.getElementById('palette');
  if (!root) return { markAdded: () => {}, revealHidden: () => {} };

  const h3a = document.createElement('h3');
  h3a.textContent = 'Сценарий';
  root.appendChild(h3a);
  const navNote = document.createElement('div');
  navNote.className = 'pal-note';
  navNote.textContent = 'Клик — приблизить и открыть карточку.';
  root.appendChild(navNote);
  for (const def of defs.scenario) {
    const it = item(def, 'pal-nav');
    it.addEventListener('click', () => hooks.onFocus(def));
    root.appendChild(it);
  }

  const h3b = document.createElement('h3');
  h3b.textContent = 'Резюме';
  root.appendChild(h3b);
  const addNote = document.createElement('div');
  addNote.className = 'pal-note';
  addNote.textContent = 'Клик — добавить ноду на холст.';
  root.appendChild(addNote);
  for (const def of defs.info) {
    const it = item(def, 'pal-add');
    it.addEventListener('click', () => hooks.onAdd(def));
    root.appendChild(it);
  }

  const h3c = document.createElement('h3');
  h3c.textContent = 'Скрытые ноды';
  root.appendChild(h3c);
  const lockNote = document.createElement('div');
  lockNote.className = 'pal-note';
  lockNote.innerHTML = `${icon('lock', 'note-ic')} Разблокируются после успешного запуска сценария — честные ответы про пробелы.`;
  lockNote.dataset.note = 'locked';
  root.appendChild(lockNote);
  for (const def of defs.hidden) {
    const it = item(def, 'pal-hidden locked');
    it.addEventListener('click', () => {
      if (it.classList.contains('locked')) {
        hooks.status('сначала запусти сценарий — нода разблокируется');
        return;
      }
      hooks.onAdd(def);
    });
    root.appendChild(it);
  }

  return {
    markAdded(id: string): void {
      const it = root.querySelector(`.pal-add[data-id="${id}"]`);
      it?.classList.add('used');
    },
    revealHidden(): void {
      for (const it of root.querySelectorAll('.pal-hidden')) {
        it.classList.remove('locked');
        it.querySelector('.pal-lock')?.remove();
      }
      const note = root.querySelector('[data-note="locked"]');
      if (note) note.innerHTML = `${icon('check', 'note-ic ok')} Разблокированы — клик добавит ноду на холст.`;
    },
  };
}
