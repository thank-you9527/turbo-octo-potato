const fs = require("fs");
const path = require("path");

const root = process.cwd();
const srcDir = path.join(root, "src", "renderer");
const distDir = path.join(root, "dist", "renderer");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

for (const file of ["index.html", "styles.css"]) {
  fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file));
}

console.log("Renderer static files copied.");
