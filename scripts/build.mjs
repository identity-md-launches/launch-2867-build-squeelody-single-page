// Production build: checks that site/index.html is self-contained, then copies
// site/ to dist/. No bundler, no transforms: the file you edit is the file you ship.
import { readFileSync, rmSync, mkdirSync, cpSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "site");
const out = join(root, "dist");
const html = readFileSync(join(src, "index.html"), "utf8");

const problems = [];
if (/<script[^>]+src=/i.test(html)) problems.push("external <script src> found");
if (/<link[^>]+rel=["']stylesheet/i.test(html)) problems.push("external stylesheet found");
if (/\.(mp3|wav|ogg|m4a|flac)\b/i.test(html)) problems.push("audio file reference found");
for (const tag of ["<title>", 'name="description"', 'property="og:title"', 'property="og:image"', 'rel="icon"'])
  if (!html.includes(tag)) problems.push("missing " + tag);
// Local assets referenced by relative URL must exist.
for (const m of html.matchAll(/(?:href|src|content)="(?!https?:|data:|#|mailto:)([\w./-]+\.(?:png|svg|jpg|webp|ico))"/g)) {
  try { statSync(join(src, m[1])); } catch { problems.push("missing local asset " + m[1]); }
}
if (problems.length) {
  console.error("build failed:\n- " + problems.join("\n- "));
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(src, out, { recursive: true });
const files = readdirSync(out).map((f) => `${f} (${statSync(join(out, f)).size} bytes)`);
console.log("dist/ written: " + files.join(", "));
