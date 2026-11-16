// Prueba ligera del contrato y de las rutas que usa la interfaz.
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const carpeta = process.argv[2] || "data";
assert.match(carpeta, /^data(?:_ejemplo)?$/, "Carpeta de datos no permitida");
const leer = ruta => JSON.parse(readFileSync(resolve(raiz, carpeta, ruta), "utf8"));
const html = readFileSync(resolve(raiz, "index.html"), "utf8");
const app = readFileSync(resolve(raiz, "js", "app.js"), "utf8");
assert.match(html, /\.\/js\/app\.js/);
assert.match(app, /urlDato\("focos\.json"\)/, "La página debe cargar focos.json");
const version = leer("version.json");
const datos = leer("focos.json");
assert.equal(version.esquema, datos.esquema);
assert.equal(datos.focos.length, 8);
const ids = new Set();
for (const foco of datos.focos) {
  assert.ok(!ids.has(foco.id), `ID repetido: ${foco.id}`);
  ids.add(foco.id);
  assert.match(foco.serie, /^series\/[a-z_]+\.json$/);
  const serie = leer(foco.serie);
  assert.equal(serie.id, foco.id);
  assert.equal(serie.esquema, datos.esquema);
  for (const [bloque, eje] of [[serie.mensual, "fechas"], [serie.anual, "anios"]]) {
    for (const [clave, valores] of Object.entries(bloque)) {
      if (Array.isArray(valores)) assert.equal(valores.length, bloque[eje].length, `${foco.id}: ${clave}`);
    }
  }
  for (const figura of foco.figuras) assert.ok(existsSync(resolve(raiz, figura.archivo)), `Falta ${figura.archivo}`);
  if (foco.estacional.estado === "exploratorio") assert.ok(foco.estacional.nota, `${foco.id}: falta nota exploratoria`);
}
for (const figura of datos.proyecto.figuras) assert.ok(existsSync(resolve(raiz, figura.archivo)), `Falta ${figura.archivo}`);
console.log(`Datos válidos: ${datos.focos.length} focos y sus series en ${carpeta}.`);
