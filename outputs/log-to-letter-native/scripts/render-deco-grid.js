const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const { readPng, compositeScaled } = require("./render-work-placement");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/screens/UniverseScreen.tsx"), "utf8");
const assetDir = path.join(root, "assets/assets_v4");
const outputPath = path.join(root, "tmp/deco-placement/deco-grid.png");
const width = 1126;
const height = 1397;
const pattern = /\{ key: "([^"]+)", source: require\("\.\.\/\.\.\/assets\/assets_v4\/deco\/([^"]+)"\), group: "([^"]+)", layer: "([^"]+)", center: \{ x: (\d+), y: (\d+) \}, width: (\d+), aspectRatio: ([^}]+) \}/g;
const assets = [...source.matchAll(pattern)].map((match) => ({
  key: match[1],
  file: match[2],
  group: match[3],
  layer: match[4],
  center: { x: Number(match[5]), y: Number(match[6]) },
  width: Number(match[7])
}));

function blendPixel(image, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const index = (Math.floor(y) * image.width + Math.floor(x)) * 4;
  const sourceAlpha = alpha / 255;
  const destinationAlpha = image.data[index + 3] / 255;
  const outAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
  if (!outAlpha) return;
  for (let channel = 0; channel < 3; channel += 1) {
    image.data[index + channel] = Math.round((color[channel] * sourceAlpha + image.data[index + channel] * destinationAlpha * (1 - sourceAlpha)) / outAlpha);
  }
  image.data[index + 3] = Math.round(outAlpha * 255);
}

function line(image, x1, y1, x2, y2, color, alpha, thickness = 1) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let step = 0; step <= steps; step += 1) {
    const x = x1 + ((x2 - x1) * step) / steps;
    const y = y1 + ((y2 - y1) * step) / steps;
    for (let offset = 0; offset < thickness; offset += 1) blendPixel(image, x + offset, y, color, alpha);
  }
}

const canvas = new PNG({ width, height });
const bare = readPng(path.join(assetDir, "continent/bare_planet.png"));
const layers = ["background", "boundary", "foreground"];

for (const layer of layers) {
  if (layer === "boundary") compositeScaled(canvas, bare, 0, 0, width / bare.width);
  for (const asset of assets.filter((item) => item.layer === layer)) {
    const image = readPng(path.join(assetDir, "deco", asset.file));
    const scale = asset.width / image.width;
    compositeScaled(
      canvas,
      image,
      Math.round(asset.center.x - image.width * scale / 2),
      Math.round(asset.center.y - image.height * scale / 2),
      scale
    );
  }
}

for (let x = 0; x <= width; x += 50) {
  const major = x % 100 === 0;
  line(canvas, x, 0, x, height - 1, major ? [255, 214, 80] : [255, 255, 255], major ? 145 : 65, major ? 2 : 1);
}
for (let y = 0; y <= height; y += 50) {
  const major = y % 100 === 0;
  line(canvas, 0, y, width - 1, y, major ? [255, 214, 80] : [255, 255, 255], major ? 145 : 65, major ? 2 : 1);
}

const groupColors = {
  base: [93, 255, 155],
  positive: [255, 224, 77],
  negative: [255, 100, 112],
  neutral: [105, 210, 255]
};
for (const asset of assets) {
  const color = groupColors[asset.group];
  line(canvas, asset.center.x - 9, asset.center.y, asset.center.x + 9, asset.center.y, color, 255, 2);
  line(canvas, asset.center.x, asset.center.y - 9, asset.center.x, asset.center.y + 9, color, 255, 2);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, PNG.sync.write(canvas));
console.log(outputPath);
