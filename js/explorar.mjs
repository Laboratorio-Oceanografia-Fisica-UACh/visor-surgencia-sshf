import {
  vars,
  fmt,
  day,
  season,
  year,
  options,
  field,
  table,
  download,
  head,
} from "./datos.mjs";
const months = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];
const mean = (a, key) => {
  const v = a.map((r) => r[key]).filter(Number.isFinite);
  return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null;
};
function grafico(el, rows, key, cat, zooma) {
  const W = 860,
    H = 180,
    L = 65,
    R = 15,
    T = 12,
    B = 29,
    dibujo = W - L - R,
    h = H - T - B;
  const vals = rows.map((d) => d[key]).filter(Number.isFinite);
  if (!vals.length) {
    el.innerHTML =
      "<p>Sin observaciones de " + vars[key][0] + " en esta selección.</p>";
    return;
  }
  let lo = Math.min(...vals),
    hi = Math.max(...vals);
  if (lo === hi) {
    lo--;
    hi++;
  }
  const times = rows.map((r) => Date.parse(r.fecha + "T00:00:00Z")),
    span = Math.max(86400000, times.at(-1) - times[0]);
  const delta = (dibujo * 86400000) / span,
    x = (i) => L + (dibujo * (times[i] - times[0])) / span,
    y = (v) => T + (h * (hi - v)) / (hi - lo);
  let shade = "",
    line = "",
    pen = false,
    run = 0,
    color = "";
  function close(i) {
    if (color)
      shade +=
        '<rect x="' +
        (x(run) - delta / 2).toFixed(2) +
        '" y="' +
        T +
        '" width="' +
        (x(i) - x(run) + delta).toFixed(2) +
        '" height="' +
        h +
        '" fill="' +
        color +
        '"/>';
  }
  rows.forEach((r, i) => {
    const fill = cat && r.episodio ? "#cce8df" : "";
    const gap = i > 0 && times[i] - times[i - 1] !== 86400000;
    if (i === 0 || fill !== color || gap) {
      if (i > 0) close(i - 1);
      run = i;
      color = fill;
    }
    if (
      gap ||
      (key === "dir" && i && Math.abs(r[key] - rows[i - 1][key]) > 180)
    )
      pen = false;
    if (r[key] == null) {
      pen = false;
      return;
    }
    const coord = x(i).toFixed(2) + " " + y(r[key]).toFixed(2);
    line += pen ? "L" + coord : "M" + coord + "l0 0";
    pen = true;
  });
  close(rows.length - 1);
  let grid = "";
  for (let j = 0; j < 4; j++) {
    let v = lo + ((hi - lo) * j) / 3;
    grid +=
      '<path d="M' +
      L +
      " " +
      y(v) +
      "H" +
      (W - R) +
      '" stroke="#cddbd6"/><text x="' +
      (L - 6) +
      '" y="' +
      (y(v) + 4) +
      '" text-anchor="end">' +
      fmt(v, 1) +
      "</text>";
  }
  el.innerHTML =
    "<h3>" +
    vars[key][0] +
    " <small>" +
    vars[key][1] +
    '</small></h3><svg class="chart" viewBox="0 0 ' +
    W +
    " " +
    H +
    '" xmlns="http://www.w3.org/2000/svg" tabindex="0" role="img" aria-label="' +
    vars[key].join(", ") +
    '; flechas para consultar días"><g font-family="sans-serif" font-size="12" fill="#405f63"><svg x="' +
    L +
    '" y="0" width="' +
    dibujo +
    '" height="' +
    H +
    '" viewBox="' +
    L +
    " 0 " +
    dibujo +
    " " +
    H +
    '">' +
    shade +
    "</svg>" +
    grid +
    '<path fill="none" stroke="' +
    (key.startsWith("sshf") ? "#a95335" : "#147976") +
    '" stroke-width="2" stroke-linecap="round" d="' +
    line +
    '"/><path class="cursor" stroke="#172f42" stroke-dasharray="3 2"/><text x="' +
    L +
    '" y="' +
    (H - 5) +
    '">' +
    rows[0].fecha +
    '</text><text x="' +
    (W - R) +
    '" y="' +
    (H - 5) +
    '" text-anchor="end">' +
    rows.at(-1).fecha +
    '</text></g></svg><div class="inline"><output></output><button class="textbtn">Descargar SVG</button></div>';
  const svg = el.querySelector("svg"),
    out = el.querySelector("output");
  let i = 0,
    start = null;
  function show(j) {
    i = Math.max(0, Math.min(rows.length - 1, j));
    out.textContent =
      rows[i].fecha + " · " + fmt(rows[i][key]) + " " + vars[key][1];
    svg
      .querySelector(".cursor")
      .setAttribute("d", "M" + x(i) + " " + T + "V" + (T + h));
  }
  const idx = (e) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.getScreenCTM().inverse(),
    );
    const t = times[0] + ((p.x - L) * span) / dibujo;
    let a = 0,
      b = times.length - 1;
    while (a < b) {
      const mid = (a + b) >> 1;
      if (times[mid] < t) a = mid + 1;
      else b = mid;
    }
    return a > 0 && t - times[a - 1] < times[a] - t ? a - 1 : a;
  };
  svg.onpointermove = (e) => show(idx(e));
  svg.onpointerdown = (e) => {
    start = idx(e);
    show(start);
    svg.setPointerCapture(e.pointerId);
  };
  svg.onpointerup = (e) => {
    const end = idx(e);
    if (start != null && Math.abs(end - start) > 2)
      zooma(rows[Math.min(start, end)].fecha, rows[Math.max(start, end)].fecha);
    start = null;
  };
  svg.onkeydown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      show(i + (e.key === "ArrowRight" ? 1 : -1));
    }
  };
  show(0);
  el.querySelector("button").onclick = () =>
    download(
      key + "_" + rows[0].fecha + "_" + rows.at(-1).fecha + ".svg",
      svg.outerHTML,
      "image/svg+xml",
    );
}
export function explorar(el, focos, id, ed, fecha) {
  const ys = Array.from({ length: 24 }, (_, i) => [2002 + i, 2002 + i]),
    v = Object.entries(vars).map(([k, [n, u]]) => [k, n + " (" + u + ")"]);
  el.innerHTML =
    head(
      "Series diarias · 2002–2025",
      "Explorar datos",
      "Compara viento, temperaturas y flujo sensible en el calendario que elijas. Cada variable conserva su escala.",
    ) +
    '<div class="wrap section stack"><div class="panel"><div class="toolbar">' +
    field(
      "Foco",
      "foco",
      options(
        focos.map((f) => [f.id, f.nombre]),
        id,
      ),
    ) +
    field("Año", "anio", options(ys, 2015)) +
    '<label class="field">Desde<input type="date" id="desde" min="2002-01-01" max="2025-12-31" value="2015-01-01"></label><label class="field">Hasta<input type="date" id="hasta" min="2002-01-01" max="2025-12-31" value="2015-12-31"></label>' +
    field(
      "Estación austral",
      "estacion",
      options([
        ["t", "Todas"],
        ...["DJF", "MAM", "JJA", "SON"].map((s) => [s, s]),
      ]),
    ) +
    '</div><div class="toolbar">' +
    field(
      "Tipo de serie",
      "tipo",
      options(
        [
          ["t", "Todos"],
          ["raw", "Sin prima"],
          ["anom", "Anomalías climatológicas"],
        ],
        "t",
      ),
    ) +
    field("Serie principal", "v1", options(v, "ui")) +
    field("Segunda escala", "v2", options([["", "Oculta"], ...v], "sshf_p")) +
    field(
      "Sombreado",
      "cat",
      options(
        [
          ["si", "Resaltar episodios"],
          ["", "Oculto"],
        ],
        "si",
      ),
    ) +
    '<button id="reset" class="control">Restablecer año</button></div></div><div class="panel"><p class="dim">El sombreado turquesa indica días en que coinciden viento favorable y contraste térmico persistente. Los vacíos indican datos faltantes. Arrastra sobre una curva para acercar o ajusta las fechas. Usa ← y → para leer valores.</p><div id="graficas"></div><button class="control" id="csv">Descargar selección CSV</button></div><div class="panel" id="comparar"></div></div>';
  const q = (s) => el.querySelector("#" + s);
  let token = 0,
    actual = [];
  const reset = () => {
    q("desde").value = q("anio").value + "-01-01";
    q("hasta").value = q("anio").value + "-12-31";
    render();
  };
  q("tipo").onchange = () => {
    const type = q("tipo").value,
      list = v.filter(
        ([k]) => type === "t" || (type === "anom") === k.endsWith("_p"),
      );
    for (const key of ["v1", "v2"]) {
      const prev = q(key).value,
        base = prev.replace(/_p$/, "");
      const wanted = list.some(([k]) => k === prev)
        ? prev
        : list.find(([k]) => k === base || k === base + "_p")?.[0];
      q(key).innerHTML = options(
        key === "v2" ? [["", "Oculta"], ...list] : list,
        wanted || (key === "v2" ? "" : list[0][0]),
      );
    }
    render();
  };
  q("anio").onchange = reset;
  q("reset").onclick = reset;
  for (const s of ["foco", "desde", "hasta", "estacion", "v1", "v2", "cat"])
    q(s).onchange = render;
  function keys() {
    return [...new Set([q("v1").value, q("v2").value].filter(Boolean))];
  }
  q("csv").onclick = () => {
    const kk = ["fecha", ...keys(), "episodio"];
    download(
      "foco_" +
        q("foco").value +
        "_" +
        q("desde").value +
        "_" +
        q("hasta").value +
        ".csv",
      [
        kk.join(","),
        ...actual.map((r) => kk.map((k) => r[k] ?? "").join(",")),
      ].join("\n"),
      "text/csv;charset=utf-8",
    );
  };
  async function render() {
    const seq = ++token,
      a = q("desde").value,
      b = q("hasta").value;
    actual = [];
    q("comparar").innerHTML = "";
    q("csv").disabled = true;
    if (!a || !b || a > b || a < "2002-01-01" || b > "2025-12-31") {
      q("graficas").textContent =
        "Selecciona un intervalo válido entre 2002 y 2025.";
      return;
    }
    q("graficas").textContent = "Cargando selección…";
    try {
      const yy = Array.from(
        { length: +b.slice(0, 4) - Number(a.slice(0, 4)) + 1 },
        (_, i) => Number(a.slice(0, 4)) + i,
      );
      const data = (
        await Promise.all(yy.map((y) => year(q("foco").value, y)))
      ).flat();
      if (!el.isConnected || seq !== token || !q("graficas")) return;
      actual = data.filter(
        (r) =>
          r.fecha >= a &&
          r.fecha <= b &&
          (q("estacion").value === "t" ||
            season(r.fecha) === q("estacion").value),
      );
      q("graficas").innerHTML = "";
      q("csv").disabled = !actual.length;
      keys().forEach((key) => {
        const div = document.createElement("div");
        q("graficas").append(div);
        grafico(div, actual, key, q("cat").value, (a, b) => {
          q("desde").value = a;
          q("hasta").value = b;
          render();
        });
      });
      const m = actual.filter((r) => r.tc != null && r.sshf != null);
      const grupo = (label, arr) => [
        label,
        arr.length,
        ...["tc", "cu", "sshf", "sshf_p"].map((k) => fmt(mean(arr, k))),
      ];
      const fr = (nombre, dias) => [
        nombre,
        dias.length,
        dias.filter((r) => r.episodio).length,
        fmt((100 * dias.filter((r) => r.episodio).length) / dias.length, 1),
      ];
      q("comparar").innerHTML =
        "<h2>Episodios y días restantes</h2><p>" +
        focos[+q("foco").value - 1].nombre +
        " · " +
        actual.length +
        " días elegidos · " +
        m.length +
        " con soporte común de TSM y flujo. Medias descriptivas sobre las mismas fechas.</p>" +
        table(
          [
            "Grupo",
            "Días",
            "TSM costa (°C)",
            "CUISST (°C)",
            "Flujo absoluto (W m⁻²)",
            "Anomalía del flujo (W m⁻²)",
          ],
          [
            grupo(
              "Episodios",
              m.filter((r) => r.episodio),
            ),
            grupo(
              "Días restantes",
              m.filter((r) => !r.episodio),
            ),
          ],
        ) +
        "<details><summary>Frecuencia sobre los días con ambas fuentes</summary>" +
        table(
          ["Mes", "Días comunes", "En episodios", "%"],
          months.map((s, i) =>
            fr(
              s,
              m.filter((r) => Number(r.fecha.slice(5, 7)) === i + 1),
            ),
          ),
        ) +
        "</details>";
    } catch (e) {
      if (seq === token && q("graficas")) q("graficas").textContent = e.message;
    }
  }
  if (
    /^(200[2-9]|201[0-9]|202[0-5])-\d{2}-\d{2}$/.test(fecha || "") &&
    Number.isFinite(Date.parse(fecha))
  ) {
    q("anio").value = fecha.slice(0, 4);
    q("desde").value = fecha;
    q("hasta").value = fecha;
  }
  render();
}
