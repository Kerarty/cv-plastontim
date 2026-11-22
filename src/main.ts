import {
  SCENARIO_NODES,
  SCENARIO_EDGES,
  PALETTE_INFO,
  HIDDEN_NODES,
  ALL_NODE_DEFS,
  RUN_FINALE,
  PERSON,
  FLOW_ORDER,
  type NodeDef,
} from './data/resume';
import { World } from './graph/world';
import { attachInteractions } from './graph/interact';
import { Simulator } from './ui/simulate';
import { openCard, closeCard } from './ui/cards';
import { initPalette } from './ui/palette';
import { initChrome } from './ui/chrome';
import { icon } from './ui/icons';
import './style.css';

// ---------- мир ----------

const stage = document.getElementById('stage');
if (!stage) throw new Error('missing #stage');
const world = new World(stage);

const canonPos = new Map(SCENARIO_NODES.map((d) => [d.id, { x: d.x, y: d.y }]));
const canonEdges = SCENARIO_EDGES;

for (const def of SCENARIO_NODES) world.addNode(def);
for (const e of SCENARIO_EDGES) world.addEdge(e.from, e.to, e.label);

// хореография появления: ноды въезжают каскадом с задержкой
let enterIdx = 0;
for (const r of world.nodes.values()) {
  r.el.style.animationDelay = `${180 + enterIdx++ * 55}ms`;
}

// ---------- chrome ----------

const chrome = initChrome({
  onRun: () => {
    chrome.openLog();
    void sim.run(RUN_FINALE);
  },
});

// ---------- симулятор ----------

const sim = new Simulator(world, {
  log: (ts, text, cls) => chrome.log(ts, text, cls),
  nodeActive: () => {},
  done: () => {
    chrome.setReady();
    palette.revealHidden();
  },
  status: (s) => chrome.status(s),
});

// ---------- палитра ----------

const palette = initPalette(
  { scenario: SCENARIO_NODES, info: PALETTE_INFO, hidden: HIDDEN_NODES },
  {
    onAdd: (def) => addPaletteNode(def),
    onFocus: (def) => {
      world.focusNode(def.id);
      interactions.selectNode(def.id);
      openCard(def);
    },
    status: (s) => chrome.status(s),
  },
);

function addPaletteNode(def: NodeDef): void {
  if (world.nodes.has(def.id)) {
    world.focusNode(def.id);
    interactions.selectNode(def.id);
    openCard(def);
    chrome.status('нода уже на холсте');
    return;
  }
  world.addNode({ ...def, added: true });
  palette.markAdded(def.id);
  world.focusNode(def.id);
  interactions.selectNode(def.id);
  openCard(def);
}

// ---------- интеракции ----------

const interactions = attachInteractions(world, {
  onNodeClick: (def) => openCard(def),
  onConnect: (from, to) => world.addEdge(from, to) !== null,
  onEdgeRemoved: () => {},
  onNodeRemoved: () => {},
  onBackgroundClick: () => closeCard(),
  status: (s) => chrome.status(s),
});

// начальный зум в статусбаре
window.dispatchEvent(new CustomEvent('cv-zoom', { detail: Math.round(world.zoom * 100) }));

// dev-параметры превью: ?nointro — без модалки, &autorun — сразу запустить сценарий
if (location.search.includes('autorun')) {
  setTimeout(() => (document.getElementById('btn-run') as HTMLElement)?.click(), 900);
}

// ---------- сброс сцены ----------

window.addEventListener('cv-reset', () => {
  for (const [id, e] of [...world.edges]) {
    const canonical = canonEdges.some((c) => c.from === e.from && c.to === e.to);
    if (!canonical) world.removeEdge(id);
  }
  for (const c of canonEdges) {
    const exists = [...world.edges.values()].some((e) => e.from === c.from && e.to === c.to);
    if (!exists) world.addEdge(c.from, c.to, c.label);
  }
  for (const [id, pos] of canonPos) world.setNodePos(id, pos.x, pos.y);
  world.clearStates();
  closeCard();
  chrome.clearLog();
  chrome.status('сцена сброшена к каноническому сценарию');
});

// ---------- мобильный флоу ----------

function buildFlow(): void {
  const flow = document.getElementById('flow');
  if (!flow) return;
  for (const id of FLOW_ORDER) {
    const def = ALL_NODE_DEFS.find((d) => d.id === id);
    if (!def) continue;
    const item = document.createElement('div');
    item.className = 'flow-item';
    item.innerHTML = `
      <div class="flow-head">
        <span class="flow-chip k-${def.kind}">${icon(def.icon)}</span>
        <span><div class="flow-title">${def.title}</div><div class="flow-sub">${def.sub}</div></span>
      </div>
      <div class="flow-body">
        <h4>В сценарии</h4>
        <ul>${def.tech.map((s) => `<li>${s}</li>`).join('')}</ul>
        <h4>Мой опыт</h4>
        <ul>${def.mine.map((s) => `<li>${s}</li>`).join('')}</ul>
        ${def.links?.length
          ? `<div class="card-links">${def.links
              .map((l) => `<a href="${l.url}" target="_blank" rel="noopener">${icon('external-link')}${l.label}</a>`)
              .join('')}</div>`
          : ''}
      </div>
    `;
    item.querySelector('.flow-head')?.addEventListener('click', () => {
      item.classList.toggle('open');
    });
    flow.appendChild(item);
  }
  const contacts = document.createElement('div');
  contacts.className = 'flow-contacts';
  contacts.innerHTML = `
    <b>Ярослав Кукар</b> · автоматизация бизнес-процессов (ИИ)<br/>
    <a href="mailto:${PERSON.email}">${PERSON.email}</a>
    <a href="${PERSON.tg}" target="_blank" rel="noopener">t.me/Kerarty</a>
    <a href="${PERSON.gh}" target="_blank" rel="noopener">github.com/Kerarty</a>
  `;
  flow.appendChild(contacts);
}

buildFlow();
