import { World, NODE_W, HEAD_H, type RNode } from './world';
import type { NodeDef } from '../data/resume';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface InteractHooks {
  onNodeClick(def: NodeDef): void;
  onConnect(from: string, to: string): boolean;
  onEdgeRemoved(id: string): void;
  onNodeRemoved(id: string): void;
  onBackgroundClick(): void;
  status(msg: string): void;
}

export interface InteractApi {
  deleteSelected(): void;
  selectNode(id: string): void;
  clearSelection(): void;
}

export function attachInteractions(world: World, hooks: InteractHooks): InteractApi {
  const vp = world.viewport;
  let selectedEdge: string | null = null;
  let selectedNode: string | null = null;

  let connFrom: string | null = null;
  let ghost: SVGPathElement | null = null;

  let dragNode: RNode | null = null;
  let dragOff = { x: 0, y: 0 };
  let panStart: { x: number; y: number; px: number; py: number } | null = null;
  let downPos = { x: 0, y: 0 };

  function clearSel(): void {
    if (selectedEdge) { world.edges.get(selectedEdge)?.g.classList.remove('selected'); selectedEdge = null; }
    if (selectedNode) { world.nodes.get(selectedNode)?.el.classList.remove('selected'); selectedNode = null; }
  }

  function selectEdge(id: string): void {
    clearSel();
    selectedEdge = id;
    world.edges.get(id)?.g.classList.add('selected');
  }

  function selectNode(id: string): void {
    clearSel();
    selectedNode = id;
    world.nodes.get(id)?.el.classList.add('selected');
  }

  vp.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0) return;
    downPos = { x: e.clientX, y: e.clientY };
    const t = e.target as HTMLElement;
    const nodeEl = t.closest('.node') as HTMLElement | null;
    const inPort = t.closest('.port.in');
    const edgeG = t.closest('.edge') as SVGGElement | null;

    // старт соединения из выходного порта
    if (t.closest('.port.out') && nodeEl?.dataset.id) {
      connFrom = nodeEl.dataset.id;
      ghost = document.createElementNS(SVG_NS, 'path') as SVGPathElement;
      ghost.setAttribute('class', 'ghost');
      world.svgRoot.appendChild(ghost);
      vp.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (edgeG?.dataset.id) {
      selectEdge(edgeG.dataset.id);
      vp.setPointerCapture(e.pointerId);
      return;
    }
    if (nodeEl?.dataset.id && !inPort) {
      const n = world.nodes.get(nodeEl.dataset.id);
      if (!n) return;
      const w = world.screenToWorld(e.clientX, e.clientY);
      dragNode = n;
      dragOff = { x: w.x - n.def.x, y: w.y - n.def.y };
      selectNode(n.def.id);
      vp.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    // панорамирование фона
    panStart = { x: e.clientX, y: e.clientY, px: world.panX, py: world.panY };
    vp.classList.add('panning');
    vp.setPointerCapture(e.pointerId);
  });

  vp.addEventListener('pointermove', (e: PointerEvent) => {
    if (ghost && connFrom) {
      const a = world.nodes.get(connFrom);
      if (a) {
        const w = world.screenToWorld(e.clientX, e.clientY);
        const p1 = { x: a.def.x + NODE_W, y: a.def.y + HEAD_H / 2 };
        const dx = Math.max(40, Math.min(140, Math.abs(w.x - p1.x) / 2));
        ghost.setAttribute('d', `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${w.x - dx} ${w.y}, ${w.x} ${w.y}`);
      }
      return;
    }
    if (dragNode) {
      const w = world.screenToWorld(e.clientX, e.clientY);
      world.setNodePos(dragNode.def.id, w.x - dragOff.x, w.y - dragOff.y);
      return;
    }
    if (panStart) {
      world.panX = panStart.px + (e.clientX - panStart.x);
      world.panY = panStart.py + (e.clientY - panStart.y);
      world.applyTransform();
    }
  });

  vp.addEventListener('pointerup', (e: PointerEvent) => {
    vp.classList.remove('panning');
    const moved = Math.abs(e.clientX - downPos.x) + Math.abs(e.clientY - downPos.y) > 4;

    if (ghost && connFrom) {
      const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const targetEl = under?.closest('.node') as HTMLElement | null;
      const targetId = targetEl?.dataset.id ?? null;
      if (targetId && targetId !== connFrom) {
        if (world.hasPath(targetId, connFrom)) {
          hooks.status('цикл: соединение создаст бесконечную петлю');
        } else if (!hooks.onConnect(connFrom, targetId)) {
          hooks.status('такая связь уже есть');
        }
      }
      ghost.remove();
      ghost = null;
      connFrom = null;
      return;
    }
    if (dragNode) {
      if (!moved) hooks.onNodeClick(dragNode.def);
      dragNode = null;
      return;
    }
    if (panStart) {
      if (!moved) { clearSel(); hooks.onBackgroundClick(); }
      panStart = null;
    }
  });

  vp.addEventListener('dblclick', (e: MouseEvent) => {
    const edgeG = (e.target as HTMLElement).closest('.edge') as SVGGElement | null;
    if (edgeG?.dataset.id) {
      world.removeEdge(edgeG.dataset.id);
      hooks.onEdgeRemoved(edgeG.dataset.id);
      hooks.status('связь удалена');
    }
  });

  vp.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const k0 = world.zoom;
    const k1 = Math.min(1.6, Math.max(0.4, k0 * (e.deltaY > 0 ? 0.92 : 1.08)));
    const r = world.viewport.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    world.panX = mx - (mx - world.panX) * (k1 / k0);
    world.panY = my - (my - world.panY) * (k1 / k0);
    world.zoom = k1;
    world.applyTransform();
  }, { passive: false });

  function deleteSelected(): void {
    if (selectedEdge) {
      const id = selectedEdge;
      world.removeEdge(id);
      hooks.onEdgeRemoved(id);
      hooks.status('связь удалена');
      clearSel();
    } else if (selectedNode) {
      const n = world.nodes.get(selectedNode);
      if (n?.def.added) {
        world.removeNode(n.def.id);
        hooks.onNodeRemoved(n.def.id);
        hooks.status('нода убрана с холста');
        clearSel();
      } else {
        hooks.status('ноды сценария не удаляются — можно удалять связи');
      }
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    if (e.key === 'Escape') clearSel();
  });

  return { deleteSelected, selectNode, clearSelection: () => clearSel() };
}
