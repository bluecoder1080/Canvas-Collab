/**
 * Camera math: the canvas shows an INFINITE world through a movable window.
 *   screen = (world - camera) * zoom
 *   world  = screen / zoom + camera
 *
 * Pan = move camera. Zoom = scale around the mouse pointer.
 */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export function screenToWorld(
  sx: number,
  sy: number,
  camera: Camera,
): { x: number; y: number } {
  return { x: sx / camera.zoom + camera.x, y: sy / camera.zoom + camera.y };
}

export function worldToScreen(
  wx: number,
  wy: number,
  camera: Camera,
): { x: number; y: number } {
  return { x: (wx - camera.x) * camera.zoom, y: (wy - camera.y) * camera.zoom };
}

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 4;

/** Zoom keeping the point under the cursor fixed. */
export function zoomAt(
  camera: Camera,
  sx: number,
  sy: number,
  deltaY: number,
): Camera {
  const factor = Math.exp(-deltaY * 0.0015);
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * factor));
  // World point under cursor before zoom...
  const wx = sx / camera.zoom + camera.x;
  const wy = sy / camera.zoom + camera.y;
  // ...must stay under cursor after zoom.
  return { zoom, x: wx - sx / zoom, y: wy - sy / zoom };
}
