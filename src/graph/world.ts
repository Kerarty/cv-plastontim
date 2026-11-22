import type { NodeDef } from '../data/resume';

export const NODE_W = 232;
export const HEAD_H = 56;
const SVG_NS = 'http://www.w3.org/2000/svg';
const WORLD_W = 4200;
const WORLD_H = 3000;

export interface RNode { def: NodeDef; el: HTMLElement }
export interface REdge { id: string; from: string; to: string; g: SVGGElement; path: SVGPathElement }

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

function svg(tag: string, attrs: Record<string, string> = {}): SVGElement {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k of Object.keys(attrs)) e.setAttribute(k, attrs[k]);
  return e;
}

export function edgeId(from: string, to: string): string { return `${from}→${to}`; }

export function portOut(n: RNode): { x: number; y: number } {
  return { x: n.def.x + NODE_W, y: n.def.y + HEAD_H / 2 };
}
export function portIn(n: RNode): { x: number; y: number } {
  return { x: n.def.x, y: n.def.y + HEAD_H / 2 };
}

export class World {
  readonly viewport: HTMLElement;
  readonly world: HTMLElement;
  readonly svgRoot: SVGSVGElement;
  private nodesLayer: HTMLElement;
  readonly nodes = new Map<string, RNode>();
  readonly edges = new Map<string, REdge>();
  panX = 264; // палитра слева (232px) + отступ — ноды не должны уезжать под неё
  panY = -30;
  zoom = 0.95;

  constructor(root: HTMLElement) {
    this.viewport = el('div', 'viewport');
    this.world = el('div', 'world');
    this.svgRoot = svg('svg', { id: 'edges-svg' }) as SVGSVGElement;
    this.svgRoot.setAttribute('width', String(WORLD_W));
    this.svgRoot.setAttribute('height', String(WORLD_H));

    const defs = svg('defs');
    const pat = svg('pattern', { id: 'dots', width: '24', height: '24', patternUnits: 'userSpaceOnUse' });
    pat.appendChild(svg('circle', { cx: '1.5', cy: '1.5', r: '1.2', fill: '#232935' }));
    defs.appendChild(pat);
    this.svgRoot.appendChild(defs);
    this.svgRoot.appendChild(svg('rect', { width: String(WORLD_W), height: String(WORLD_H), fill: 'url(#dots)' }));

    this.nodesLayer = el('div', 'nodes-layer');
    this.world.append(this.svgRoot, this.nodesLayer);
    this.viewport.appendChild(this.world);
    root.appendChild(this.viewport);
    this.applyTransform();
  }

  screenToWorld(cx: number, cy: number): { x: number; y: number } {
    const r = this.viewport.getBoundingClientRect();
    return { x: (cx - r.left - this.panX) / this.zoom, y: (cy - r.top - this.panY) / this.zoom };
  }

  applyTransform(): void {
    this.world.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  addNode(def: NodeDef): RNode {
    const node = el('div', `node k-${def.kind}`);
    node.dataset.id = def.id;
    node.style.transform = `translate(${def.x}px, ${def.y}px)`;

    const head = el('div', 'node-head');
    const ico = el('span', 'node-ico');
    ico.textContent = def.icon;
    const names = el('span', 'node-names');
    const t = el('span', 'node-title');
    t.textContent = def.title;
    const s = el('span', 'node-sub');
    s.textContent = def.sub;
    names.append(t, s);
    head.append(ico, names);
    node.appendChild(head);

    if (def.tags.length) {
      const tags = el('div', 'node-tags');
      for (const tg of def.tags.slice(0, 3)) {
        const c = el('span', 'tag');
        c.textContent = tg;
        tags.appendChild(c);
      }
      node.appendChild(tags);
    }

    const pin = el('button', 'port in');
    pin.setAttribute('aria-label', `вход: ${def.title}`);
    const pout = el('button', 'port out');
    pout.setAttribute('aria-label', `выход: ${def.title}`);
    node.append(pin, pout);

    this.nodesLayer.appendChild(node);
    const r: RNode = { def, el: node };
    this.nodes.set(def.id, r);
    return r;
  }

  removeNode(id: string): boolean {
    const n = this.nodes.get(id);
    if (!n) return false;
    for (const [eid, e] of [...this.edges]) {
      if (e.from === id || e.to === id) this.removeEdge(eid);
    }
    n.el.remove();
    this.nodes.delete(id);
    return true;
  }

  addEdge(from: string, to: string, label?: string): REdge | null {
    const a = this.nodes.get(from);
    const b = this.nodes.get(to);
    if (!a || !b || from === to) return null;
    const id = edgeId(from, to);
    if (this.edges.has(id)) return null;

    const g = svg('g', { class: 'edge' }) as SVGGElement;
    g.dataset.id = id;
    const path = svg('path', { d: this.edgePath(a, b) }) as SVGPathElement;
    g.appendChild(path);
    if (label) {
      const mid = this.edgeMid(a, b);
      const t = svg('text', { x: String(mid.x), y: String(mid.y - 6), 'text-anchor': 'middle' });
      t.textContent = label;
      g.appendChild(t);
    }
    this.svgRoot.appendChild(g);
    const e: REdge = { id, from, to, g, path };
    this.edges.set(id, e);
    return e;
  }

  removeEdge(id: string): boolean {
    const e = this.edges.get(id);
    if (!e) return false;
    e.g.remove();
    this.edges.delete(id);
    return true;
  }

  private updateEdge(id: string): void {
    const e = this.edges.get(id);
    if (!e) return;
    const a = this.nodes.get(e.from);
    const b = this.nodes.get(e.to);
    if (a && b) e.path.setAttribute('d', this.edgePath(a, b));
  }

  updateAllEdges(): void {
    for (const id of this.edges.keys()) this.updateEdge(id);
  }

  private edgePath(a: RNode, b: RNode): string {
    const p1 = portOut(a);
    const p2 = portIn(b);
    const dx = Math.max(40, Math.min(140, Math.abs(p2.x - p1.x) / 2));
    return `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
  }

  private edgeMid(a: RNode, b: RNode): { x: number; y: number } {
    const p1 = portOut(a);
    const p2 = portIn(b);
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  setNodePos(id: string, x: number, y: number): void {
    const n = this.nodes.get(id);
    if (!n) return;
    n.def.x = Math.round(x);
    n.def.y = Math.round(y);
    n.el.style.transform = `translate(${n.def.x}px, ${n.def.y}px)`;
    for (const e of this.edges.values()) {
      if (e.from === id || e.to === id) this.updateEdge(e.id);
    }
  }

  /** может ли from достичь to (для проверки циклов) */
  hasPath(from: string, to: string): boolean {
    const adj = new Map<string, string[]>();
    for (const e of this.edges.values()) {
      const list = adj.get(e.from);
      if (list) list.push(e.to);
      else adj.set(e.from, [e.to]);
    }
    const seen = new Set<string>([from]);
    const queue = [from];
    while (queue.length) {
      const cur = queue.shift() as string;
      if (cur === to) return true;
      for (const nxt of adj.get(cur) ?? []) {
        if (!seen.has(nxt)) { seen.add(nxt); queue.push(nxt); }
      }
    }
    return false;
  }

  focusNode(id: string): void {
    const n = this.nodes.get(id);
    if (!n) return;
    const r = this.viewport.getBoundingClientRect();
    this.panX = r.width / 2 - (n.def.x + NODE_W / 2) * this.zoom;
    this.panY = r.height / 2 - (n.def.y + 45) * this.zoom;
    this.applyTransform();
  }

  clearStates(): void {
    for (const n of this.nodes.values()) n.el.classList.remove('active', 'done');
  }
}
