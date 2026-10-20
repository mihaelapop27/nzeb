// Shared by the site (src/lib/sanity.ts) and the PDF export (studio/scripts/export-pdf.ts).

/**
 * Without a hotspot set in the Studio, crops sit a little above the middle of a photo (40% down),
 * so heads near the top edge aren't cut off while people framed lower stay whole. A hotspot set in
 * the Studio still wins.
 */
export const withDefaultHotspot = <T extends object>(photo: T): T =>
  'hotspot' in photo && photo.hotspot ? photo : { ...photo, hotspot: { x: 0.5, y: 0.4, width: 1, height: 0 } };
