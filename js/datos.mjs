export const vars = {
  ui: ["UI", "m³ s⁻¹ km⁻¹"],
  ui_p: ["UI′", "m³ s⁻¹ km⁻¹"],
  vel: ["Rapidez del viento", "m s⁻¹"],
  dir: ["Dirección meteorológica (desde)", "°"],
  u: ["Viento hacia el este", "m s⁻¹"],
  v: ["Viento hacia el norte", "m s⁻¹"],
  tau: ["Magnitud del esfuerzo medio", "N m⁻²"],
  tx: ["Esfuerzo hacia el este", "N m⁻²"],
  ty: ["Esfuerzo hacia el norte", "N m⁻²"],
  tal: ["Esfuerzo paralelo", "N m⁻²"],
  qx: ["Transporte hacia el este", "m² s⁻¹"],
  qy: ["Transporte hacia el norte", "m² s⁻¹"],
  ta: ["Temperatura del aire a 2 m (muestreo original)", "°C"],
  ta_p: ["Temperatura del aire′", "°C"],
  tc: ["TSM costera", "°C"],
  tc_p: ["TSM costera′", "°C"],
  to: ["TSM offshore", "°C"],
  to_p: ["TSM offshore′", "°C"],
  umbral_termico: ["Umbral térmico diario", "°C"],
  cu: ["CUISST", "°C"],
  cu_p: ["CUISST′", "°C"],
  sshf: ["Flujo sensible absoluto", "W m⁻²"],
  sshf_p: ["Anomalía del flujo sensible", "W m⁻²"],
  dt: ["Aire ERA5 original − mar MUR (media costera)", "°C"],
};
export const fmt = (v, k = 2) =>
  v == null || !Number.isFinite(v)
    ? "Sin dato"
    : v.toLocaleString("es-CL", {
        maximumFractionDigits: k,
        minimumFractionDigits: k,
      });
export const day = (d, n) =>
  new Date(Date.parse(d + "T00:00:00Z") + 86400000 * n)
    .toISOString()
    .slice(0, 10);
export const season = (d) =>
  ["DJF", "MAM", "JJA", "SON"][Math.floor((Number(d.slice(5, 7)) % 12) / 3)];
const cache = new Map();
export async function json(path) {
  if (!cache.has(path)) {
    if (cache.size > 30) cache.delete(cache.keys().next().value);
    cache.set(
      path,
      fetch("./" + path)
        .then((r) => {
          if (!r.ok) throw Error("No se pudo leer " + path);
          return r.json();
        })
        .catch((e) => {
          cache.delete(path);
          throw e;
        }),
    );
  }
  return cache.get(path);
}
export async function year(id, y) {
  const a = await json("atlas/dias/" + id + "/" + y + ".json");
  return a.filas.map((row, i) =>
    Object.fromEntries([
      ["fecha", day(a.inicio, i)],
      ...a.columnas.map((s, j) => [s, row[j]]),
    ]),
  );
}
export const options = (arr, sel) =>
  arr
    .map(
      ([v, t]) =>
        '<option value="' +
        v +
        '"' +
        (String(v) === String(sel) ? " selected" : "") +
        ">" +
        t +
        "</option>",
    )
    .join("");
export const field = (title, id, html) =>
  '<label class="field">' +
  title +
  '<select id="' +
  id +
  '">' +
  html +
  "</select></label>";
export const head = (label, title, desc) =>
  '<div class="page-head"><div class="wrap"><span class="cap">' +
  label +
  "</span><h1>" +
  title +
  "</h1><p>" +
  desc +
  "</p></div></div>";
export async function download(name, body, type) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function table(headers, rows) {
  return (
    '<div class="scroll"><table><thead><tr>' +
    headers.map((x) => '<th scope="col">' + x + "</th>").join("") +
    "</tr></thead><tbody>" +
    rows
      .map(
        (r) => "<tr>" + r.map((x) => "<td>" + x + "</td>").join("") + "</tr>",
      )
      .join("") +
    "</tbody></table></div>"
  );
}
export const yes = (v) => (v === null ? "Sin MUR" : v ? "Sí" : "No");
