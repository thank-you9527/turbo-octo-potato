const fs = require("fs");
const path = require("path");

const root = process.cwd();
const source = path.join(root, "baseware_root");
const distDir = path.join(root, "dist");
const target = path.join(distDir, "baseware_root");

if (!fs.existsSync(distDir)) {
  console.error("dist/ does not exist. Run the build first.");
  process.exit(1);
}

const copyRecursive = (src, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

copyRecursive(source, target);
console.log("Copied baseware_root to dist/");
