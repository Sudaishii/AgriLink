const fs = require("fs");
const path = require("path");

const root = process.cwd();
const pairs = [
  { source: "client/.env.example", target: "client/.env" },
  { source: "server/.env.example", target: "server/.env" },
];

for (const pair of pairs) {
  const sourcePath = path.join(root, pair.source);
  const targetPath = path.join(root, pair.target);

  if (!fs.existsSync(sourcePath)) {
    console.log(`[skip] Missing template: ${pair.source}`);
    continue;
  }

  if (fs.existsSync(targetPath)) {
    console.log(`[keep] Already exists: ${pair.target}`);
    continue;
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log(`[create] ${pair.target} from ${pair.source}`);
}

console.log("Environment setup done.");
