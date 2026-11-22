import { World } from '../graph/world';
import type { NodeDef } from '../data/resume';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface SimHooks {
  log(ts: string, text: string, cls?: string): void;
  nodeActive(def: NodeDef): void;
  done(): void;
  status(msg: string): void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class Simulator {
  private clock = 12 * 3600 * 1000; // 12:00:00.000
  private running = false;

  constructor(
    private world: World,
    private hooks: SimHooks,
  ) {}

  private stamp(): string {
    this.clock += 200 + Math.random() * 700;
    const s = Math.floor(this.clock / 1000);
    const hh = String(Math.floor(s / 3600) % 24).padStart(2, '0');
    const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    const ms = String(Math.floor(this.clock % 1000)).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  }

  /** волны топологического порядка (Кан) + хвост циклов в последнюю волну */
  private computeWaves(): string[][] {
    const ids = [...this.world.nodes.keys()];
    const indeg = new Map<string, number>(ids.map((id) => [id, 0]));
    for (const e of this.world.edges.values()) {
      if (indeg.has(e.to)) indeg.set(e.to, (indeg.get(e.to) as number) + 1);
    }
    const waves: string[][] = [];
    let frontier = ids.filter((id) => (indeg.get(id) as number) === 0);
    const placed = new Set(frontier);
    while (frontier.length) {
      waves.push(frontier);
      const next: string[] = [];
      for (const id of frontier) {
        for (const e of this.world.edges.values()) {
          if (e.from === id && !placed.has(e.to)) {
            const d = (indeg.get(e.to) as number) - 1;
            indeg.set(e.to, d);
            if (d <= 0) { next.push(e.to); placed.add(e.to); }
          }
        }
      }
      frontier = next;
    }
    const rest = ids.filter((id) => !placed.has(id));
    if (rest.length) waves.push(rest);
    return waves;
  }

  private flyPacket(path: SVGPathElement): Promise<void> {
    return new Promise((resolve) => {
      const dot = document.createElementNS(SVG_NS, 'circle') as SVGCircleElement;
      dot.setAttribute('r', '8');
      dot.setAttribute('class', 'packet');
      this.world.svgRoot.appendChild(dot);
      path.classList.add('flowing');
      let len = 0;
      try { len = path.getTotalLength(); } catch { len = 0; }
      const dur = Math.max(320, Math.min(620, len * 1.4));
      const t0 = performance.now();
      const step = (t: number): void => {
        const k = Math.min(1, (t - t0) / dur);
        if (len > 0) {
          const p = path.getPointAtLength(len * k);
          dot.setAttribute('cx', String(p.x));
          dot.setAttribute('cy', String(p.y));
        }
        if (k < 1) requestAnimationFrame(step);
        else {
          dot.remove();
          path.classList.remove('flowing');
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  async run(finale: string[]): Promise<void> {
    if (this.running) return;
    if (this.world.nodes.size === 0) {
      this.hooks.status('холст пуст — нечего запускать');
      return;
    }
    this.running = true;
    this.world.clearStates();
    this.world.viewport.classList.add('running');
    this.hooks.log(this.stamp(), 'запуск сценария «заказ Ozon/WB → клиент»', 'finale');

    try {
      const waves = this.computeWaves();
      for (const wave of waves) {
        const anims: Promise<void>[] = [];
        for (const id of wave) {
          for (const e of this.world.edges.values()) {
            if (e.to === id) anims.push(this.flyPacket(e.path));
          }
        }
        await Promise.all(anims);
        for (const id of wave) {
          const n = this.world.nodes.get(id);
          if (!n) continue;
          n.el.classList.add('active');
          this.hooks.nodeActive(n.def);
          await sleep(150);
          n.el.classList.remove('active');
          n.el.classList.add('done');
          for (const line of n.def.log) this.hooks.log(this.stamp(), line);
        }
        await sleep(240);
      }

      await sleep(200);
      for (const line of finale) this.hooks.log(this.stamp(), line, 'finale');
      this.hooks.done();
    } finally {
      this.world.viewport.classList.remove('running');
      this.running = false;
    }
  }
}
