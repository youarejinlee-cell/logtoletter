export type PlanetLayout = "original" | "companion-seat-v1";
export type PlanetPoint = { x: number; y: number };
export type PlanetBounds = PlanetPoint & { width: number; height: number };
export const PLANET_CANVAS = { width: 1126, height: 1397 };

// Sprite canvas and seated contact point, measured on the transparent Romi asset.
export const ROMI_SEATED_GEOMETRY = {
  canvas: { width: 1086, height: 1448 },
  seatAnchor: { x: 360, y: 1090 },
  planetAnchor: { x: 335, y: 205 },
  width: 220
};

export function companionFrame(geometry: typeof ROMI_SEATED_GEOMETRY, visualWidth: number, visualHeight: number) {
  const scale = geometry.width / geometry.canvas.width;
  return {
    left: (geometry.planetAnchor.x - geometry.seatAnchor.x * scale) / PLANET_CANVAS.width * visualWidth,
    top: (geometry.planetAnchor.y - geometry.seatAnchor.y * scale) / PLANET_CANVAS.height * visualHeight,
    width: geometry.width / PLANET_CANVAS.width * visualWidth,
    height: geometry.canvas.height * scale / PLANET_CANVAS.height * visualHeight
  };
}

const offsets: Record<string, { x: number; y: number; scale: number }> = {
  land_02: { x: 0, y: 35, scale: 0.94 },
  land_04: { x: 20, y: 10, scale: 0.93 }
};

export function companionSlotOffset(slot: string, layout: PlanetLayout) {
  return layout === "companion-seat-v1" ? offsets[slot] : undefined;
}

export function adjustCompanionPlacement<T extends {
  levelCenters: Record<1 | 2 | 3 | 4, PlanetPoint>;
  areaRatio: Record<1 | 2 | 3 | 4, number>;
}>(slot: string, placement: T, layout: PlanetLayout): T {
  const offset = companionSlotOffset(slot, layout);
  if (!offset) return placement;
  const next = { ...placement, levelCenters: { ...placement.levelCenters }, areaRatio: { ...placement.areaRatio } };
  for (const level of [1, 2, 3, 4] as const) {
    next.levelCenters[level] = { x: placement.levelCenters[level].x + offset.x, y: placement.levelCenters[level].y + offset.y };
    next.areaRatio[level] = placement.areaRatio[level] * offset.scale ** 2;
  }
  return next;
}

// Exclude the raised seat from the neighboring continent's hit target.
export function companionHitBounds(slot: string, bounds: PlanetBounds, layout: PlanetLayout): PlanetBounds {
  if (layout !== "companion-seat-v1") return bounds;
  if (slot === "land_02") return { ...bounds, y: bounds.y + 70, height: bounds.height - 70 };
  if (slot === "land_04") return { ...bounds, x: bounds.x + 35, width: bounds.width - 35 };
  return bounds;
}

export function companionDeco<T extends { key: string; center: PlanetPoint; width: number }>(asset: T, layout: PlanetLayout): T {
  if (layout !== "companion-seat-v1" || asset.key !== "rocket") return asset;
  return { ...asset, center: { x: 175, y: 360 }, width: 280 };
}
