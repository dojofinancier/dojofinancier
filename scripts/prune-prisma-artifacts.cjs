const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const targets = [
  // Prisma can leave temporary native engine copies on some platforms.
  "node_modules/.prisma/client/query_engine-*.tmp*",
  "node_modules/.prisma/client/query_engine-windows.dll.node.tmp*",
];

function globLikeMatch(pattern, relPath) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(relPath.replace(/\\/g, "/"));
}

function collectFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

const files = collectFiles(path.join(projectRoot, "node_modules"));
let removed = 0;

for (const abs of files) {
  const rel = path.relative(projectRoot, abs).replace(/\\/g, "/");
  if (targets.some((p) => globLikeMatch(p, rel))) {
    try {
      fs.unlinkSync(abs);
      removed += 1;
    } catch {
      // best-effort
    }
  }
}

console.log(`[prune-prisma-artifacts] Removed ${removed} file(s).`);
