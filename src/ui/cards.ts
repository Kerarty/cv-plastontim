import type { NodeDef, NodeKind } from '../data/resume';

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
      <span class="card-ico">${def.icon}</span>
      <div>
        <div class="card-title">${def.title}</div>
        <span class="kind-badge k-${def.kind}">${KIND_LABEL[def.kind]}</span>
      </div>
      <button class="card-close" aria-label="закрыть карточку">×</button>
    </div>
    <div class="card-sub">${def.sub}</div>
    <h4>В сценарии</h4>
    <ul>${def.tech.map((s) => `<li>${s}</li>`).join('')}</ul>
    <h4 class="mine-h">Мой опыт</h4>
    <ul>${def.mine.map((s) => `<li>${s}</li>`).join('')}</ul>
    <div class="card-tags">${def.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
    ${def.links?.length
      ? `<div class="card-links">${def.links
          .map((l) => `<a href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`)
          .join('')}</div>`
      : ''}
  `;
  panel.querySelector('.card-close')?.addEventListener('click', closeCard);
}

export function closeCard(): void {
  document.getElementById('card')?.classList.add('hidden');
}
