// One decoration unlocks every three records in the selected month.
// Missing artwork retains its milestone, so later decorations never unlock early.
export const planetDecoOrder = [
  "alien-1", "airship", "venus", "mars", "pirateship",
  "alien-2", "satellite", "rocket", "saturn", "mercury"
] as const;

export function unlockedPlanetDeco<T extends { key: string }>(assets: readonly T[], totalEntries: number): T[] {
  const count = Math.max(0, Math.min(planetDecoOrder.length, Math.floor(totalEntries / 3)));
  return planetDecoOrder.slice(0, count).flatMap(key => {
    const asset = assets.find(item => item.key === key);
    return asset ? [asset] : [];
  });
}
