const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const root = path.resolve(__dirname, "..");
const dir = path.join(root, "tmp/deco-category-full");
const tileWidth = 1126;
const tileHeight = 1397;

function blendPixel(image, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (y * image.width + x) * 4;
  const sourceAlpha = alpha / 255;
  const destinationAlpha = image.data[offset + 3] / 255;
  const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
  for (let channel = 0; channel < 3; channel += 1) {
    image.data[offset + channel] = Math.round(
      (color[channel] * sourceAlpha + image.data[offset + channel] * destinationAlpha * (1 - sourceAlpha)) / outputAlpha
    );
  }
  image.data[offset + 3] = Math.round(outputAlpha * 255);
}

function vertical(image, x, top, bottom, major) {
  const color = major ? [255, 210, 64] : [255, 255, 255];
  const alpha = major ? 145 : 55;
  const thickness = major ? 2 : 1;
  for (let y = top; y < bottom; y += 1) {
    for (let offset = 0; offset < thickness; offset += 1) blendPixel(image, x + offset, y, color, alpha);
  }
}

function horizontal(image, y, left, right, major) {
  const color = major ? [255, 210, 64] : [255, 255, 255];
  const alpha = major ? 145 : 55;
  const thickness = major ? 2 : 1;
  for (let x = left; x < right; x += 1) {
    for (let offset = 0; offset < thickness; offset += 1) blendPixel(image, x, y + offset, color, alpha);
  }
}

function addTileGrid(image, left, top) {
  for (let localX = 0; localX < tileWidth; localX += 25) {
    vertical(image, left + localX, top, Math.min(top + tileHeight, image.height), localX % 100 === 0);
  }
  for (let localY = 0; localY < tileHeight; localY += 25) {
    horizontal(image, top + localY, left, Math.min(left + tileWidth, image.width), localY % 100 === 0);
  }
}

const files = fs.readdirSync(dir).filter((file) => file.endsWith("full-deco.png"));
for (const file of files) {
  const image = PNG.sync.read(fs.readFileSync(path.join(dir, file)));
  const columns = Math.ceil(image.width / tileWidth);
  const rows = Math.ceil(image.height / tileHeight);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) addTileGrid(image, column * tileWidth, row * tileHeight);
  }
  const outputPath = path.join(dir, file.replace(".png", "-grid25.png"));
  fs.writeFileSync(outputPath, PNG.sync.write(image));
  console.log(outputPath);
}
