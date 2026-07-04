// ============================================================================
// GRID PROJECTION UTILITY (top-down 2D)
// ----------------------------------------------------------------------------
// Pure functions converting between logical grid coordinates {row, col} and
// screen pixel coordinates {x, y} using simple linear mapping:
//
//   x = col * cellW
//   y = row * cellH
//
// No isometric math, no diagonal projection, no depth sorting. Each cell is
// a square/rectangle; items occupy their footprint cells directly with no
// overlap (enforced by the occupancy grid in FarmGameService).
//
// All placement logic in the game uses logical {row, col}. This projection
// is a pure render-time concern — change cellW/cellH here and the entire
// farm rescales without touching game logic.
// ============================================================================

/** Cell dimensions in pixels. Tune to rescale the whole farm. */
export const CELL_W = 64;
export const CELL_H = 64;

export interface GridPos {
  row: number;
  col: number;
}

export interface ScreenPos {
  x: number;
  y: number;
}

/**
 * Project a logical grid position to screen-space pixel coordinates.
 * The returned {x, y} is the TOP-LEFT corner of the cell.
 */
export function project(pos: GridPos, _origin: ScreenPos = { x: 0, y: 0 }): ScreenPos {
  return {
    x: pos.col * CELL_W,
    y: pos.row * CELL_H,
  };
}

/**
 * Project the bounding box for an item with a multi-cell footprint.
 * Returns the screen position of the top-left corner, plus total width/height.
 */
export function projectFootprint(
  pos: GridPos,
  footprint: { w: number; h: number },
  _origin: ScreenPos = { x: 0, y: 0 },
): { topLeft: ScreenPos; width: number; height: number } {
  return {
    topLeft: { x: pos.col * CELL_W, y: pos.row * CELL_H },
    width: footprint.w * CELL_W,
    height: footprint.h * CELL_H,
  };
}

/**
 * Inverse projection: convert a screen pixel position back to the nearest
 * logical grid cell (floor-rounded). Used by drag-and-drop to determine
 * which cell the pointer is over.
 */
export function unproject(screen: ScreenPos, _origin: ScreenPos = { x: 0, y: 0 }): GridPos {
  return {
    row: Math.floor(screen.y / CELL_H),
    col: Math.floor(screen.x / CELL_W),
  };
}

/**
 * Returns true if a footprint at the given position is fully in bounds.
 */
export function isInBounds(pos: GridPos, footprint: { w: number; h: number }, gridRows: number, gridCols: number): boolean {
  return (
    pos.row >= 0 &&
    pos.col >= 0 &&
    pos.row + footprint.h <= gridRows &&
    pos.col + footprint.w <= gridCols
  );
}

/**
 * Returns the list of cells occupied by a footprint at the given position.
 * Useful for collision detection (build an occupancy set keyed by "row,col").
 */
export function cellsOccupiedBy(pos: GridPos, footprint: { w: number; h: number }): string[] {
  const cells: string[] = [];
  for (let dr = 0; dr < footprint.h; dr++) {
    for (let dc = 0; dc < footprint.w; dc++) {
      cells.push(`${pos.row + dr},${pos.col + dc}`);
    }
  }
  return cells;
}

/** Build a "row,col" key for use in occupancy maps. */
export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}
