const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "node_modules", "freeport-async", "index.js");

if (!fs.existsSync(target)) {
  process.exit(0);
}

const source = fs.readFileSync(target, "utf8");
const before = "server.listen({ port: port, host: hostname }, function(err) {";
const after = "var listenOptions = hostname == null ? { port: port } : { port: port, host: hostname };\n    server.listen(listenOptions, function(err) {";

if (source.includes(after)) {
  process.exit(0);
}

if (source.includes(before)) {
  fs.writeFileSync(target, source.replace(before, after));
  console.log("Patched freeport-async for local Expo port detection.");
}
