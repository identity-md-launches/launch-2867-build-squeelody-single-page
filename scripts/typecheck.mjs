// Typecheck the inline <script> of site/index.html with TypeScript (checkJs, strict).
// The script is extracted to a temporary folder outside the repository.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ts = createRequire(import.meta.url)("typescript");
const html = readFileSync(join(root, "site", "index.html"), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (scripts.length !== 1) { console.error(`expected 1 inline script, found ${scripts.length}`); process.exit(1); }

// Keep line numbers aligned with index.html for readable errors.
const offset = html.slice(0, html.indexOf(scripts[0])).split("\n").length - 1;
const dir = mkdtempSync(join(tmpdir(), "squeelody-tc-"));
const file = join(dir, "app.js");
writeFileSync(file, "\n".repeat(offset) + scripts[0]);
const program = ts.createProgram([file], {
  allowJs: true, checkJs: true, noEmit: true, strict: true, noImplicitAny: false,
  target: ts.ScriptTarget.ES2022, lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
});
const diags = ts.getPreEmitDiagnostics(program);
for (const d of diags) {
  const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
  if (d.file && d.start != null) {
    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
    console.error(`site/index.html:${line + 1}:${character + 1} ${msg}`);
  } else console.error(msg);
}
rmSync(dir, { recursive: true, force: true });
console.log(diags.length ? `typecheck: ${diags.length} error(s)` : "typecheck: 0 errors (strict checkJs on the inline script)");
process.exit(diags.length ? 1 : 0);
