import { byAbsDeltaKwhDesc } from "./metrics";
import type { EnergyNode, Equipment } from "./types";

/**
 * Flattening of the plant tree into the row list the table renders.
 *
 * The table is one `<tbody>` of sibling rows rather than nested tables, so
 * every column stays aligned across all depths. Depth is communicated by
 * padding and a chevron, not by markup nesting.
 */

export interface NodeRow {
  kind: "node";
  node: EnergyNode;
  depth: number;
  /** Has further sections/subsections beneath it. */
  expandable: boolean;
  expanded: boolean;
  /** Deepest level: no child sections, machines directly attached. */
  isDeepest: boolean;
  equipmentOpen: boolean;
  /** Largest bar value among this row's siblings, for in-level bar scaling. */
  siblingScale: number;
}

export interface EquipmentRow {
  kind: "equipment";
  /** The node whose machines these are. */
  parentId: string;
  parentName: string;
  depth: number;
  items: Equipment[];
}

export type VisibleRow = NodeRow | EquipmentRow;

export function hasChildren(node: EnergyNode): boolean {
  return (node.children?.length ?? 0) > 0;
}

export function isDeepest(node: EnergyNode): boolean {
  return !hasChildren(node) && (node.equipment?.length ?? 0) > 0;
}

/** Sorted children — biggest absolute mover first at every level. */
export function rankedChildren(node: EnergyNode): EnergyNode[] {
  return byAbsDeltaKwhDesc(node.children ?? []);
}

function barScale(nodes: readonly EnergyNode[]): number {
  return nodes.reduce(
    (max, n) => Math.max(max, n.current_kwh, n.previous_kwh),
    0,
  );
}

/**
 * Walks the tree in display order, emitting only rows the user can currently
 * see. Equipment panels are emitted as their own row directly beneath the node
 * they belong to, so they render inline instead of on a separate page.
 */
export function flattenVisible(
  root: EnergyNode,
  expanded: ReadonlySet<string>,
  equipmentOpen: ReadonlySet<string>,
): VisibleRow[] {
  const rows: VisibleRow[] = [];

  const walk = (node: EnergyNode, depth: number, scale: number) => {
    const expandable = hasChildren(node);
    const deepest = isDeepest(node);
    const isOpen = expanded.has(node.id);
    const machinesOpen = deepest && equipmentOpen.has(node.id);

    rows.push({
      kind: "node",
      node,
      depth,
      expandable,
      expanded: isOpen,
      isDeepest: deepest,
      equipmentOpen: machinesOpen,
      siblingScale: scale,
    });

    if (machinesOpen) {
      rows.push({
        kind: "equipment",
        parentId: node.id,
        parentName: node.name,
        depth,
        items: byAbsDeltaKwhDesc(node.equipment ?? []),
      });
    }

    if (expandable && isOpen) {
      const children = rankedChildren(node);
      const childScale = barScale(children);
      children.forEach((child) => walk(child, depth + 1, childScale));
    }
  };

  walk(root, 0, barScale([root]));
  return rows;
}

/** Every node id in the tree — used by "Expand all". */
export function allNodeIds(node: EnergyNode): string[] {
  const ids = [node.id];
  (node.children ?? []).forEach((child) => ids.push(...allNodeIds(child)));
  return ids;
}

/** Ids of nodes that own machines — the ones a "View equipment" pill sits on. */
export function allDeepestIds(node: EnergyNode): string[] {
  if (isDeepest(node)) return [node.id];
  return (node.children ?? []).flatMap(allDeepestIds);
}

/** The chain of names from the root down to `targetId`, inclusive. */
export function pathTo(root: EnergyNode, targetId: string): string[] {
  if (root.id === targetId) return [root.name];
  for (const child of root.children ?? []) {
    const rest = pathTo(child, targetId);
    if (rest.length) return [root.name, ...rest];
  }
  return [];
}
