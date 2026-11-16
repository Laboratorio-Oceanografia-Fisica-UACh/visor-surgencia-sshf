// Verifica el inventario y evita publicar material ajeno al visor.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const listar = (dir, prefijo = "") => readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  if ([".git", ".local", "node_modules"].includes(e.name)) return [];
  const ruta = prefijo + e.name;
  return e.isDirectory() ? listar(resolve(dir, e.name), ruta + "/") : [ruta];
});
const archivos = listar(raiz).sort();
const inventario = JSON.parse(readFileSync(resolve(raiz, "inventario-publico.json"), "utf8"));
assert.deepEqual(archivos, [...inventario.archivos.map(f => f.archivo), "inventario-publico.json"].sort());
const privadas = /(?<![a-z])[a-z]:[\\/](?!\/)|\/Users\/|\/home\/|Datos_(?:tesis|proyectoR)|gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,}|BEGIN [A-Z ]*PRIVATE KEY/ig;
for (const f of inventario.archivos) {
  assert.match(f.archivo, /(?:\.(?:html|css|js|mjs|json|webp|png|md)$|^\.(?:gitattributes|gitignore|nojekyll)$)/);
  const raw = readFileSync(resolve(raiz, f.archivo));
  assert.equal(raw.length, f.bytes, f.archivo);
  assert.equal(createHash("sha256").update(raw).digest("hex"), f.sha256, f.archivo);
  if (!/\.(webp|png)$/.test(f.archivo)) {
    privadas.lastIndex = 0;
    assert.equal(privadas.test(raw.toString("utf8")), false, `Posible contenido privado: ${f.archivo}`);
  }
}
const html = readFileSync(resolve(raiz, "index.html"), "utf8");
assert.match(html, /href="\.\/assets\/favicon.png"/);
assert.match(html, /src="\.\/assets\/logo-lofa.webp"/);
assert.equal((html.match(/integrity="sha384-/g) || []).length, 3);
assert.doesNotMatch(html, /href="\.\/TERCEROS.md"/);
console.log(`Publicación válida: ${archivos.length} archivos, inventario SHA-256 y recursos obligatorios.`);
