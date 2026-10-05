const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const root = path.resolve(__dirname, "..");
const assetDir = path.join(root, "assets/assets_v4/continent");
const outDir = path.join(root, "tmp/work-placement");

const planetWidth = 1126;
const planetHeight = 1397;

const workAssets = {
  1: {
    left: { file: "work_lv1_apple_tree_left.png", alphaBox: { width: 1291, height: 951 }, alphaCenter: { x: 778, y: 590 } },
    right: { file: "work_lv1_apple_tree_right.png", alphaBox: { width: 1418, height: 662 }, alphaCenter: { x: 756, y: 558 } }
  },
  2: {
    left: { file: "work_lv2_house_left.png", alphaBox: { width: 1033, height: 1052 }, alphaCenter: { x: 645, y: 649 } },
    right: { file: "work_lv2_house_right.png", alphaBox: { width: 1074, height: 979 }, alphaCenter: { x: 625, y: 683 } }
  },
  3: {
    left: { file: "work_lv3_farmers_left.png", alphaBox: { width: 989, height: 962 }, alphaCenter: { x: 634, y: 626 } },
    right: { file: "work_lv3_farmers_right.png", alphaBox: { width: 989, height: 962 }, alphaCenter: { x: 634, y: 626 } }
  },
  4: {
    right: { file: "work_lv4_cow_right.png", alphaBox: { width: 1101, height: 982 }, alphaCenter: { x: 640, y: 606 } }
  }
};

const slots = [
  {
    key: "land_01", box: { x: 44, y: 705, width: 554, height: 479 },
    centers: { 1: { x: 235, y: 805 }, 2: { x: 428, y: 811 }, 3: { x: 295, y: 925 }, 4: { x: 445, y: 1032 } },
    sides: { 1: "left", 2: "left", 3: "left", 4: "right" }, ratios: { 1: .33, 2: .124659, 3: .18, 4: .0648 }
  },
  {
    key: "land_02", box: { x: 62, y: 249, width: 425, height: 506 },
    centers: { 1: { x: 300, y: 390 }, 2: { x: 385, y: 445 }, 3: { x: 205, y: 535 }, 4: { x: 345, y: 595 } },
    sides: { 1: "left", 2: "left", 3: "left", 4: "right" }, ratios: { 1: .33, 2: .17, 3: .16, 4: .098415 }
  },
  {
    key: "land_03", box: { x: 601, y: 340, width: 363, height: 285 },
    centers: { 1: { x: 805, y: 360 }, 2: { x: 860, y: 460 }, 3: { x: 710, y: 465 }, 4: { x: 750, y: 540 } },
    sides: { 1: "right", 2: "right", 3: "right", 4: "right" }, ratios: { 1: .33, 2: .1815, 3: .14, 4: .1134 }
  },
  {
    key: "land_04", box: { x: 404, y: 145, width: 461, height: 248 },
    centers: { 1: { x: 625, y: 260 }, 2: { x: 535, y: 295 }, 3: { x: 730, y: 295 }, 4: { x: 620, y: 325 } },
    sides: { 1: "right", 2: "right", 3: "right", 4: "right" }, ratios: { 1: .33, 2: .1444, 3: .1023435, 4: .09503325 }
  },
  {
    key: "land_05", box: { x: 633, y: 857, width: 379, height: 287 },
    centers: { 1: { x: 850, y: 900 }, 2: { x: 840, y: 970 }, 3: { x: 735, y: 970 }, 4: { x: 730, y: 1035 } },
    sides: { 1: "right", 2: "right", 3: "right", 4: "right" }, ratios: { 1: .33, 2: .15, 3: .091854, 4: .072576 }
  },
  {
    key: "land_06", box: { x: 816, y: 603, width: 227, height: 170 },
    centers: { 1: { x: 940, y: 620 }, 2: { x: 880, y: 650 }, 3: { x: 955, y: 670 }, 4: { x: 890, y: 705 } },
    sides: { 1: "right", 2: "right", 3: "right", 4: "right" }, ratios: { 1: .33, 2: .12, 3: .11, 4: .11 }
  }
];

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function clonePng(source) {
  const target = new PNG({ width: source.width, height: source.height });
  source.data.copy(target.data);
  return target;
}

function assetFor(level, side) {
  return workAssets[level][side] || workAssets[level].right || workAssets[level].left;
}

function scaleFor(slot, asset, image, level) {
  const slotArea = slot.box.width * slot.box.height;
  const assetArea = asset.alphaBox.width * asset.alphaBox.height;
  const areaFit = Math.sqrt((slotArea * slot.ratios[level]) / assetArea);
  const cap = Math.min(slot.box.width / asset.alphaBox.width, slot.box.height / asset.alphaBox.height) * .92;
  return Math.min(areaFit, cap, planetWidth / image.width, planetHeight / image.height);
}

function compositeScaled(target, source, left, top, scale) {
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  for (let y = 0; y < height; y += 1) {
    const targetY = top + y;
    if (targetY < 0 || targetY >= target.height) continue;
    const sourceY = Math.min(source.height - 1, Math.floor(y / scale));
    for (let x = 0; x < width; x += 1) {
      const targetX = left + x;
      if (targetX < 0 || targetX >= target.width) continue;
      const sourceX = Math.min(source.width - 1, Math.floor(x / scale));
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const alpha = source.data[sourceOffset + 3] / 255;
      if (alpha <= 0) continue;
      const targetOffset = (targetY * target.width + targetX) * 4;
      const inverse = 1 - alpha;
      target.data[targetOffset] = Math.round(source.data[sourceOffset] * alpha + target.data[targetOffset] * inverse);
      target.data[targetOffset + 1] = Math.round(source.data[sourceOffset + 1] * alpha + target.data[targetOffset + 1] * inverse);
      target.data[targetOffset + 2] = Math.round(source.data[sourceOffset + 2] * alpha + target.data[targetOffset + 2] * inverse);
      target.data[targetOffset + 3] = 255;
    }
  }
}

function renderSlot(base, slot) {
  const output = clonePng(base);
  for (const level of [1, 2, 3, 4]) {
    const asset = assetFor(level, slot.sides[level]);
    const image = readPng(path.join(assetDir, asset.file));
    const scale = scaleFor(slot, asset, image, level);
    const center = slot.centers[level];
    const left = Math.round(center.x - asset.alphaCenter.x * scale);
    const top = Math.round(center.y - asset.alphaCenter.y * scale);
    compositeScaled(output, image, left, top, scale);
  }
  return output;
}

function copyInto(target, source, left, top) {
  for (let y = 0; y < source.height; y += 1) {
    source.data.copy(target.data, ((top + y) * target.width + left) * 4, y * source.width * 4, (y + 1) * source.width * 4);
  }
}

if (require.main === module) {
  fs.mkdirSync(outDir, { recursive: true });
  const bare = readPng(path.join(assetDir, "bare_planet.png"));
  const rendered = slots.map((slot) => {
    const result = renderSlot(bare, slot);
    fs.writeFileSync(path.join(outDir, `work-${slot.key}-lv1-4.png`), PNG.sync.write(result));
    return result;
  });

  const montage = new PNG({ width: planetWidth * 3, height: planetHeight * 2 });
  rendered.forEach((image, index) => copyInto(montage, image, (index % 3) * planetWidth, Math.floor(index / 3) * planetHeight));
  fs.writeFileSync(path.join(outDir, "work-all-slots-lv1-4.png"), PNG.sync.write(montage));
  console.log(path.join(outDir, "work-all-slots-lv1-4.png"));
}

module.exports = {
  assetDir,
  planetWidth,
  planetHeight,
  slots,
  readPng,
  clonePng,
  scaleFor,
  compositeScaled,
  copyInto
};
