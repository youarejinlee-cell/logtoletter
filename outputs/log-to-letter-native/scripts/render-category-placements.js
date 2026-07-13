const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const {
  assetDir,
  planetWidth,
  planetHeight,
  slots,
  readPng,
  clonePng,
  scaleFor,
  compositeScaled,
  copyInto
} = require("./render-work-placement");

const root = path.resolve(__dirname, "..");
const screenSource = fs.readFileSync(path.join(root, "src/screens/UniverseScreen.tsx"), "utf8");
const outDir = path.join(root, "tmp/category-placement");
const categories = ["work", "taste", "relationship", "self-discipline", "wealth", "health"];
const assetPattern = /source: require\("\.\.\/\.\.\/assets\/assets_v4\/continent\/([^"/]+\.png)"\), canvas: \{ width: (\d+), height: (\d+) \}, alphaBox: \{ x: (\d+), y: (\d+), width: (\d+), height: (\d+) \}, alphaCenter: \{ x: (\d+), y: (\d+) \}/g;
const assets = {};
const tasteLv2Placements = {
  land_01: { center: { x: 409, y: 866 }, ratio: .248897 },
  land_02: { center: { x: 385, y: 445 }, ratio: .17 },
  land_03: { center: { x: 868, y: 451 }, ratio: .2317762381 },
  land_04: { center: { x: 656, y: 288 }, ratio: .19155061 },
  land_05: { center: { x: 914, y: 942 }, ratio: .19155061 },
  land_06: { center: { x: 978, y: 645 }, ratio: .19155061 }
};
const finalAdjustments = {
  work: {
    land_01: { 3: { scale: .95 }, 4: { x: -25 } }, land_03: { 3: { x: 50, scale: .9 }, 4: { x: 50 } },
    land_04: { 2: { y: -25, scale: .95 } }, land_05: { 2: { x: 25, scale: .95 }, 3: { scale: .9 }, 4: { x: 25 } },
    land_06: { 1: { y: -25, scale: 1.1 }, 2: { x: 50 }, 3: { x: 50 }, 4: { x: 50 } }
  },
  taste: {
    land_02: { 4: { x: -50, scale: .9 } }, land_03: { 2: { x: 50, scale: 1.05 }, 3: { x: 25 }, 4: { x: 25 } },
    land_04: { 2: { y: -25, scale: .95 } }, land_05: { 1: { y: -25 }, 2: { x: 30 }, 3: { x: 50 }, 4: { x: 25 } },
    land_06: { 1: { y: -25 }, 3: { x: 50 }, 4: { x: 50, y: 25 } }
  },
  relationship: {
    land_01: { 2: { scale: .95 }, 4: { x: -25, scale: 1.1 } },
    land_02: { 1: { x: -50 }, 2: { x: -50 }, 3: { x: -50 }, 4: { x: -50 } },
    land_03: { 2: { y: -25, scale: 1.05 }, 3: { x: 25 }, 4: { x: 25 } },
    land_05: { 2: { y: -25, scale: 1.05 }, 3: { x: 50 }, 4: { x: 50 } },
    land_06: { 1: { x: 10 }, 2: { x: 50 }, 3: { x: 50 }, 4: { x: 50 } }
  },
  "self-discipline": {
    land_01: { 1: { x: -50, y: -50 }, 2: { x: -50, scale: .95 }, 4: { x: -25, y: -25 } },
    land_02: { 2: { scale: .9 }, 4: { x: -50, scale: .9 } }, land_03: { 1: { y: -25 }, 3: { x: 25 }, 4: { x: 50 } },
    land_04: { 2: { scale: .95 }, 4: { scale: .95 } }, land_05: { 2: { scale: .95 }, 3: { x: 20 }, 4: { x: 50 } },
    land_06: { 1: { y: -35 }, 2: { x: 25 }, 3: { x: 50 }, 4: { x: 50, y: 25 } }
  },
  wealth: {
    land_01: { 2: { y: 50, scale: .9 }, 4: { x: -25 } }, land_02: { 2: { scale: .85 }, 4: { x: -70 } },
    land_03: { 2: { y: -50, scale: .95 }, 3: { x: 25, y: -25 }, 4: { x: 25 } }, land_04: { 2: { scale: .95 } },
    land_05: { 2: { x: 25, scale: .95 }, 3: { x: 25, scale: 1.05 }, 4: { x: 50 } }, land_06: { 2: { x: 100 }, 4: { x: 50, y: 50 } }
  },
  health: {
    land_01: { 1: { y: -25 } }, land_02: { 3: { y: -25, scale: .9 }, 4: { x: -50, scale: .9 } },
    land_03: { 2: { y: -25 }, 3: { x: 25 }, 4: { x: 25 } }, land_04: { 2: { y: -25 }, 4: { scale: .95 } },
    land_05: { 1: { x: 25 }, 2: { x: 25, y: -25 }, 3: { x: 25 }, 4: { x: 25 } },
    land_06: { 1: { x: 25 }, 2: { x: 25 }, 3: { x: 25 }, 4: { x: 50, y: 25 } }
  }
};

for (const match of screenSource.matchAll(assetPattern)) {
  const [, file, canvasWidth, canvasHeight, alphaX, alphaY, alphaWidth, alphaHeight, centerX, centerY] = match;
  const category = categories.find((candidate) => file.startsWith(`${candidate}_lv`));
  const levelMatch = file.match(/_lv([1-4])/);
  if (!category || !levelMatch) continue;
  const side = file.includes("_left") ? "left" : file.includes("_right") ? "right" : "center";
  const level = Number(levelMatch[1]);
  assets[category] ||= {};
  assets[category][level] ||= {};
  assets[category][level][side] = {
    file,
    canvas: { width: Number(canvasWidth), height: Number(canvasHeight) },
    alphaBox: { x: Number(alphaX), y: Number(alphaY), width: Number(alphaWidth), height: Number(alphaHeight) },
    alphaCenter: { x: Number(centerX), y: Number(centerY) }
  };
}

function assetFor(category, level, side) {
  const levelAssets = assets[category]?.[level];
  if (!levelAssets) throw new Error(`Missing ${category} lv${level} asset metadata`);
  return levelAssets[side] || levelAssets.center || levelAssets.right || levelAssets.left;
}

function renderSlot(base, category, slot) {
  const output = clonePng(base);
  const selfDisciplineRatioScales = {
    land_01: { 1: .81, 3: .64, 4: .64 },
    land_02: { 1: .81, 2: .81, 3: .64, 4: .5184 },
    land_03: { 4: .81 },
    land_04: { 4: .64 },
    land_05: { 4: .6561 },
    land_06: { 1: 1.21, 4: .5184 }
  };
  const selfDisciplineOffsets = {
    land_02: { 1: { x: -25, y: -30 } },
    land_03: { 1: { x: 0, y: -20 }, 3: { x: 0, y: -20 } },
    land_05: { 1: { x: 20, y: -40 } },
    land_06: { 1: { x: 10, y: -12 } }
  };
  const ratioScales = category === "health"
    ? { 4: .7225 }
    : category === "work"
      ? { 4: .9025 }
    : category === "relationship"
      ? { 2: .64, 3: .64, 4: .5625 }
      : category === "wealth"
        ? { 2: .81, 4: .81 }
        : {};
  const slotRatioScales = category === "self-discipline" ? selfDisciplineRatioScales[slot.key] || {} : {};
  const slotOffsets = category === "self-discipline" ? selfDisciplineOffsets[slot.key] || {} : {};
  const adjustedCenters = Object.fromEntries(Object.entries(slot.centers).map(([level, center]) => {
    const offset = slotOffsets[level] || { x: 0, y: 0 };
    return [level, { x: center.x + offset.x, y: center.y + offset.y }];
  }));
  const wealthCenters = category === "wealth"
    ? { ...adjustedCenters, 1: { ...adjustedCenters[1], x: adjustedCenters[1].x + 20 } }
    : adjustedCenters;
  const tasteLv2 = category === "taste" ? tasteLv2Placements[slot.key] : undefined;
  let categoryCenters = category === "relationship" && slot.key === "land_05"
    ? { ...slot.centers, 1: { ...slot.centers[1], x: slot.centers[1].x + 60 } }
    : wealthCenters;
  if (category === "relationship" && slot.key === "land_03") categoryCenters = {
    ...categoryCenters,
    3: { x: categoryCenters[3].x + 10, y: categoryCenters[3].y - 20 }
  };
  if (category === "taste" && slot.key === "land_03") categoryCenters = {
    ...categoryCenters,
    1: { ...categoryCenters[1], x: categoryCenters[1].x - 20 },
    4: { ...categoryCenters[4], x: categoryCenters[4].x + 20 }
  };
  if (category === "taste" && slot.key === "land_04") categoryCenters = {
    ...categoryCenters,
    1: { ...categoryCenters[1], y: categoryCenters[1].y - 20 }
  };
  if (category === "taste" && slot.key === "land_06") categoryCenters = {
    ...categoryCenters,
    1: { x: categoryCenters[1].x - 20, y: categoryCenters[1].y - 20 },
    4: { ...categoryCenters[4], y: categoryCenters[4].y - 15 }
  };
  const categoryRatios = Object.fromEntries(
    Object.entries(slot.ratios).map(([level, ratio]) => [
      level,
      ratio
        * (ratioScales[level] || 1)
        * (slotRatioScales[level] || 1)
        * (category === "relationship" && slot.key === "land_03" && level === "3" ? 1.1025 : 1)
        * (category === "relationship" && slot.key === "land_05" ? .6561 : 1)
    ])
  );
  let finalCenters = tasteLv2 ? { ...categoryCenters, 2: tasteLv2.center } : categoryCenters;
  if (category === "taste" && slot.key === "land_04") finalCenters = {
    ...finalCenters,
    2: { ...categoryCenters[3], x: categoryCenters[3].x - 210 },
    3: tasteLv2.center
  };
  let categorySlot = {
    ...slot,
    centers: finalCenters,
    ratios: tasteLv2
      ? Object.fromEntries(Object.entries({ ...categoryRatios, 2: tasteLv2.ratio }).map(([level, ratio]) => [
          level,
          ratio
            * (slot.key === "land_06" ? 1.21 : 1)
            * (slot.key === "land_04" && level === "4" ? .81 : 1)
            * (slot.key === "land_01" && level === "3" ? .9025 : 1)
        ]))
      : categoryRatios
  };
  const adjustments = finalAdjustments[category]?.[slot.key] || {};
  categorySlot = {
    ...categorySlot,
    centers: Object.fromEntries(Object.entries(categorySlot.centers).map(([level, center]) => {
      const adjustment = adjustments[level] || {};
      return [level, { x: center.x + (adjustment.x || 0), y: center.y + (adjustment.y || 0) }];
    })),
    ratios: Object.fromEntries(Object.entries(categorySlot.ratios).map(([level, ratio]) => {
      const scale = adjustments[level]?.scale || 1;
      return [level, ratio * scale * scale];
    }))
  };
  for (const level of [1, 2, 3, 4]) {
    const asset = assetFor(category, level, categorySlot.sides[level]);
    const image = readPng(path.join(assetDir, asset.file));
    const scale = scaleFor(categorySlot, asset, image, level);
    const center = categorySlot.centers[level];
    const left = Math.round(center.x - asset.alphaCenter.x * scale);
    const top = Math.round(center.y - asset.alphaCenter.y * scale);
    compositeScaled(output, image, left, top, scale);
  }
  return output;
}

if (require.main === module) {
  fs.mkdirSync(outDir, { recursive: true });
  const bare = readPng(path.join(assetDir, "bare_planet.png"));
  for (const category of categories) {
    const rendered = slots.map((slot) => {
      const result = renderSlot(bare, category, slot);
      fs.writeFileSync(path.join(outDir, `${category}-${slot.key}-lv1-4.png`), PNG.sync.write(result));
      return result;
    });
    const montage = new PNG({ width: planetWidth * 3, height: planetHeight * 2 });
    rendered.forEach((image, index) => copyInto(montage, image, (index % 3) * planetWidth, Math.floor(index / 3) * planetHeight));
    const outputPath = path.join(outDir, `${category}-all-slots-lv1-4.png`);
    fs.writeFileSync(outputPath, PNG.sync.write(montage));
    console.log(outputPath);
  }
}

module.exports = { categories, renderSlot };
