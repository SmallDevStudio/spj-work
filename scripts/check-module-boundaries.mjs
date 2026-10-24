import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("src");
const extensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const forbiddenSource = [
  /\/api\/v1\/leave\/notifications\b/,
  /\/api\/v1\/leave\/hr-delegations\b/,
  /\/api\/v1\/leave\/hr-takeover\b/,
  /\/api\/v1\/users\b/,
  /\/api\/v1\/companies\b/,
  /["'`]\/leave\/notifications\b/,
  /["'`]\/leave\/hr-delegations\b/,
  /["'`]\/leave\/hr-takeover\b/,
  /["'`]\/users\/company-access\b/,
  /["'`]\/companies\b/,
  /["'`]\/employee\/[^"'`]+\/access-role\b/,
  /@\/components\/hr\//,
  /@\/components\/settings\//,
  /@\/repositories\/leave\/leave-(?:notification|hr-delegation)/,
];

const forbiddenPaths = [
  /^app\/api\/v1\/(?:users|companies|hr)(?:\/|$)/,
  /^app\/api\/v1\/leave\/(?:notifications|hr-delegations|hr-takeover)(?:\/|$)/,
  /^(?:components|repositories|services)\/hr(?:\/|$)/,
  /^components\/settings(?:\/|$)/,
];

const errors = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    const relative = path.relative(root, filename).split(path.sep).join("/");

    if (entry.isDirectory()) {
      if (forbiddenPaths.some((pattern) => pattern.test(relative))) {
        errors.push(`Legacy directory: src/${relative}`);
      }
      await visit(filename);
      continue;
    }

    if (!extensions.has(path.extname(filename))) continue;

    if (forbiddenPaths.some((pattern) => pattern.test(relative))) {
      errors.push(`Legacy source path: src/${relative}`);
    }

    const content = await readFile(filename, "utf8");

    for (const pattern of forbiddenSource) {
      if (pattern.test(content)) {
        errors.push(`Legacy reference ${pattern}: src/${relative}`);
      }
    }
  }
}

await visit(root);

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Module boundaries: OK");
}
