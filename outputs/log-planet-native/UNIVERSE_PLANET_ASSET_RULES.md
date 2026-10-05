# Universe Planet Asset Rules

## Current Layered Planet Assets

The universe home now uses a layered planet structure. The planet is assembled from one bare base planet and fixed-position continent overlays.

- `assets/universe-planet-base-bare.png`: bare ocean planet with no continents
- `assets/universe-continent-north.png`: north continent overlay
- `assets/universe-continent-west.png`: west continent overlay
- `assets/universe-continent-east.png`: east continent overlay
- `assets/universe-continent-south.png`: south continent overlay

Each overlay uses the same transparent square canvas as the base planet, so it can be placed with `absoluteFillObject` without extra positioning math.

The previous count-based full planet assets are kept as concept references:

- `assets/universe-planet-continent-1.png`
- `assets/universe-planet-continent-2.png`
- `assets/universe-planet-continent-3.png`
- `assets/universe-planet-continent-4.png`

The app should prefer the layered assets for future development.

## Continent Rules

- Continents represent record categories.
- The app shows up to 4 visible continents on the front-facing planet.
- The visible category order maps to fixed continent slots:
  - Rank 1: north
  - Rank 2: west
  - Rank 3: east
  - Rank 4: south
- If more than 4 categories matter, the remaining categories are handled as hidden-side continents, small islands, or another rotation state.
- Continent size should not scale directly with raw record count.
- Continent size only shows relative category priority:
  - Rank 1: large
  - Rank 2: medium
  - Rank 3: small-medium
  - Rank 4: small
- Ocean channels must remain visible between continents.

## Category Color Slots

- Work: lavender
- Health: mint
- Relationships: powder blue
- Love: pale rose
- Family: cream
- Taste: coral/sand
- Dream: soft gold
- Habit: soft green
- Attitude: violet
- Other: neutral grey

## Biome Level Rules

Biomes are not one-to-one visual objects per record. They use coarse levels so the planet does not become cluttered.

- Lv.0: fewer than 5 records, bare continent
- Lv.1: 5-19 records, sparse biome
- Lv.2: 20-49 records, medium biome
- Lv.3: 50+ records, rich biome

Note: The original discussion mentioned "25+" for Lv.3, but that overlaps with the 20-49 Lv.2 range. This document uses 50+ for Lv.3 unless revised.

## Emotion Layer Rules

Emotion layers sit above the continent/biome layer.

- Positive emotions: light layer, glowing flowers, warm light clusters
- Negative emotions: cloud/fog layer
- Neutral emotions only: no extra emotional weather layer for now

Layer selection:

- If positive count is 0 and negative count is 0: no emotion layer
- If positive count is at least 1 and positive count is greater than negative count: light layer
- If negative count is greater than positive count: mixed light + cloud layer
- There is no fully cloud-covered planet state.

## Energy Rules

Energy uses the same coarse level idea as biome records. It should not increase object count directly.

Energy affects:

- biome height
- biome size
- terrain relief
- glow intensity
- cloud/fog thickness
