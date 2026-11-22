import type { NodeDef, NodeKind } from '../data/resume';
import { icon } from './icons';

const KIND_LABEL: Record<NodeKind, string> = {
  trigger: 'триггер',
  process: 'обработка',
  ai: 'ИИ',
  storage: 'данные',
  notify: 'уведомления',
  monitor: 'мониторинг',
  security: 'безопасность',
  info: 'резюме',
};

export function openCard(def: NodeDef): void {
  const panel = document.getElementById('card');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.innerHTML = `
    <div class="card-top">
      <span class="card-chip k-${def.kind}">${icon(def.icon)}</span>
      <div class="card-headtext">
        <div class="card-title">${def.title}</div>
        <span class="kind-badge k-${def.kind}">${KIND_LABEL[def.kind]}</span>
      </div>
      <button class="card-close" aria-label="закрыть карточку">${icon('x')}</button>
    </div>
    <div class="card-sub">${def.sub}</div>
    <h4 class="scen-h">В сценарии</h4>
    <ul class="card-list">${def.tech.map((s) => `<li>${s}</li>`).join('')}</ul>
    <h4 class="mine-h">Мой опыт</h4>
    <ul class="card-list">${def.mine.map((s) => `<li>${s}</li>`).join('')}</ul>
    <div class="card-tags">${def.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
    ${def.links?.length
      ? `<div class="card-links">${def.links
          .map((l) => `<a href="${l.url}" target="_blank" rel="noopener">${icon('external-link')}${l.label}</a>`)
          .join('')}</div>`
      : ''}
  `;
  panel.querySelector('.card-close')?.addEventListener('click', closeCard);
}

export function closeCard(): void {
  document.getElementById('card')?.classList.add('hidden');
}
