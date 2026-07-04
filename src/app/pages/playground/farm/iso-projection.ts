// ============================================================================
// ISOMETRIC PROJECTION UTILITY
// ----------------------------------------------------------------------------
// Pure functions converting between logical grid coordinates {row, col} and
// screen pixel coordinates {x, y}. Standard 2:1 isometric tile math:
//
//   x = (col - row) * (tileW / 2)
//   y = (col + row) * (tileH / 2)
//
// where tileW is the tile's pixel width and tileH is half its height.
// Typical ratio: tileW=64, tileH=32 (2:1 iso diamond).
//
// Inverse (screen → grid, for drag/drop):
//
//   row = (y / tileH) - (x / tileW)
//   col = (y / tileH) + (x / tileW)
//
// All placement logic in the game uses logical {row, col}. The isometric
// view is a pure projection layer — change tileW/tileH here and the entire
// farm rescales without touching game logic.
// ============================================================================

/** Tile dimensions in pixels. Tune to rescale the whole farm. */
export const ISO_TILE_W = 64;
export const ISO_TILE_H = 32;

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
 * The returned {x, y} is the CENTER of the cell.
 *
 * For multi-cell footprints, project the top-left corner and offset
 * by footprint dimensions (see `projectFootprint`).
 */
export function project(pos: GridPos, origin: ScreenPos = { x: 0, y: 0 }): ScreenPos {
  const x = origin.x + (pos.col - pos.row) * (ISO_TILE_W / 2);
  const y = origin.y + (pos.col + pos.row) * (ISO_TILE_H / 2);
  return { x, y };
}

/**
 * Project the bounding box (top-left + width/height in screen space) for an
 * item with a multi-cell footprint. Returns the screen position of the
 * top-left corner of the footprint's bounding diamond, plus the total
 * diamond width/height.
 */
export function projectFootprint(
  pos: GridPos,
  footprint: { w: number; h: number },
  origin: ScreenPos = { x: 0, y: 0 },
): { center: ScreenPos; width: number; height: number } {
  // Top-left corner cell of the footprint
  const topLeft = project(pos, origin);
  // Bottom-right corner cell of the footprint (exclusive)
  const bottomRight = project(
    { row: pos.row + footprint.h, col: pos.col + footprint.w },
    origin,
  );
  // Center of the bounding diamond
  const centerX = (topLeft.x + bottomRight.x) / 2;
  const centerY = (topLeft.y + bottomRight.y) / 2;
  // Bounding box dims
  const width = (footprint.w + footprint.h) * (ISO_TILE_W / 2);
  const height = (footprint.w + footprint.h) * (ISO_TILE_H / 2);
  return {
    center: { x: centerX, y: centerY },
    width,
    height,
  };
}

/**
 * Inverse projection: convert a screen pixel position back to the nearest
 * logical grid cell (floor-rounded). Used by drag-and-drop to determine
 * which cell the pointer is over.
 *
 * The `origin` must match the one used in `project()` for the same view.
 */
export function unproject(screen: ScreenPos, origin: ScreenPos = { x: 0, y: 0 }): GridPos {
  const dx = screen.x - origin.x;
  const dy = screen.y - origin.y;
  const row = Math.floor((dy / ISO_TILE_H) - (dx / ISO_TILE_W));
  const col = Math.floor((dy / ISO_TILE_H) + (dx / ISO_TILE_W));
  return { row, col };
}

/**
 * Compute the painter's-algorithm z-index for an item at the given position.
 * Items further "back" (lower row+col) paint FIRST, items further "front"
 * (higher row+col) paint LATER (on top).
 *
 * For multi-cell footprints, use the BOTTOM-RIGHT corner (max row+col) so
 * the entire footprint paints in front of any item whose front edge is
 * behind this item's front edge.
 */
export function zIndexFor(pos: GridPos, footprint: { w: number; h: number } = { w: 1, h: 1 }): number {
  return (pos.row + footprint.h - 1) + (pos.col + footprint.w - 1);
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
