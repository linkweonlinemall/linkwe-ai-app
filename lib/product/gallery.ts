export type PhotoPoint = { x: number; y: number };
export const MAX_PHOTO_ZOOM = 4;

export function clampPhotoZoom(value: number) {
  return Math.min(MAX_PHOTO_ZOOM, Math.max(1, value));
}

export function clampPhotoPan(point: PhotoPoint, zoom: number, width: number, height: number): PhotoPoint {
  const limitX = Math.max(0, width * (zoom - 1) / 2);
  const limitY = Math.max(0, height * (zoom - 1) / 2);
  return { x: Math.min(limitX, Math.max(-limitX, point.x)), y: Math.min(limitY, Math.max(-limitY, point.y)) };
}

/** Keep the detail under the cursor/fingers in place while changing magnification. */
export function zoomPhotoAt(pan: PhotoPoint, previousZoom: number, nextZoom: number, focal: PhotoPoint): PhotoPoint {
  const ratio = nextZoom / previousZoom;
  return { x: focal.x - (focal.x - pan.x) * ratio, y: focal.y - (focal.y - pan.y) * ratio };
}
