import { json, fmt, options } from "./datos.mjs";
export async function mapa(el, focos, id = 1) {
  const paises = await json("assets/costa.json");
  let local = false;
  function dibujar() {
    const sitios = focos;
    const f = sitios.find((g) => g.id === id),
      W = 680,
      H = 400;
    const lat = local ? f.nucleo[1] : -31,
      kx = Math.cos((lat * Math.PI) / 180),
      k = local
        ? Math.min(183, 530 / (f.cajas.costa[1] - f.cajas.referencia[0]))
        : 18.6;
    const lon = local ? (f.cajas.referencia[0] + f.cajas.costa[1]) / 2 : -72.5;
    const xy = ([x, y]) => [W / 2 + (x - lon) * kx * k, H / 2 - (y - lat) * k],
      pt = (p) =>
        xy(p)
          .map((v) => v.toFixed(1))
          .join(",");
    const path = (coords) =>
      coords.map((r) => "M" + r.map(pt).join("L") + "Z").join("");
    let shapes = paises
      .map(
        ({ forma: g }) =>
          '<path fill="#e8e6d7" stroke="#8ca8a0" stroke-width="0.8" fill-rule="evenodd" d="' +
          (g.type === "MultiPolygon" ? g.coordinates : [g.coordinates])
            .map(path)
            .join("") +
          '"/>',
      )
      .join("");
    const label = (x, y, s) =>
      '<text x="' +
      x +
      '" y="' +
      y +
      '" font-family="sans-serif" font-size="12" fill="#305e64">' +
      s +
      "</text>";
    if (local) {
      const colors = {
        costa: "#178577",
        referencia: "#b35d32",
        viento: "#5576a8",
      };
      for (const [tipo, b] of Object.entries(f.cajas)) {
        const [x, y] = xy([b[0], b[3]]),
          [x2, y2] = xy([b[1], b[2]]);
        shapes +=
          '<rect x="' +
          x +
          '" y="' +
          y +
          '" width="' +
          (x2 - x) +
          '" height="' +
          (y2 - y) +
          '" fill="' +
          colors[tipo] +
          '" fill-opacity=".12" stroke="' +
          colors[tipo] +
          '" stroke-width="2"/>' +
          label(x, y - 6, tipo);
      }
      for (const c of f.celdas) {
        const [x, y] = xy([c.lon, c.lat]);
        shapes +=
          '<circle cx="' +
          x +
          '" cy="' +
          y +
          '" r="3" fill="' +
          (c.tipo === "viento" ? "#4d6791" : "#a94a2e") +
          '"/>';
      }
      for (const [p, s, color] of [
        [f.cabo, "Cabo", "#152f44"],
        [f.nucleo, "Núcleo", "#cc5e35"],
      ]) {
        const [x, y] = xy(p);
        shapes +=
          '<circle cx="' +
          x +
          '" cy="' +
          y +
          '" r="5" fill="' +
          color +
          '"/>' +
          label(x + 8, y + (s === "Cabo" ? 14 : -10), s);
      }
      const [x, y] = xy(f.nucleo),
        a = (f.normal * Math.PI) / 180;
      shapes +=
        '<path d="M' +
        x +
        " " +
        y +
        "l" +
        44 * Math.cos(a) +
        " " +
        -44 * Math.sin(a) +
        '" stroke="#a84137" stroke-width="2" marker-end="url(#normal)"/>';
    } else {
      shapes += label(35, 220, "OCÉANO PACÍFICO");
      for (const g of sitios) {
        const [x, y] = xy(g.cabo),
          yt = y + (g.id === 1 ? -6 : g.id === 2 || g.id === 10 ? 7 : 4);
        shapes +=
          '<g role="button" tabindex="0" data-f="' +
          g.id +
          '" aria-label="' +
          g.nombre +
          '" style="cursor:pointer"><circle cx="' +
          x +
          '" cy="' +
          y +
          '" r="8" fill="transparent"/><circle cx="' +
          x +
          '" cy="' +
          y +
          '" r="' +
          (g.id === id ? 6 : 4) +
          '" fill="' +
          (g.id === id ? "#ba572e" : g.id > 8 ? "#86663a" : "#107773") +
          '" stroke="white"/><path d="M' +
          (x + 6) +
          " " +
          y +
          "L" +
          (x + 19) +
          " " +
          yt +
          '" stroke="#688780"/>' +
          label(
            x + 22,
            yt + 4,
            g.nombre.replace("Bahía Antofagasta / ", "").replace("Punta ", ""),
          ) +
          "</g>";
      }
    }
    el.innerHTML =
      '<div class="atlas-grid"><div class="map-pane"><svg viewBox="0 0 680 400" aria-label="Mapa del litoral chileno"><defs><marker id="normal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#a84137"/></marker></defs>' +
      shapes +
      label(20, 30, "↑ N") +
      '</svg><small class="credit">Natural Earth</small><button class="control map-mode">' +
      (local ? "Ver todo Chile" : "Ver cajas y celdas") +
      '</button></div><div class="map-info"><label class="field">Foco de estudio<select>' +
      options(
        sitios.map((g) => [g.id, g.nombre]),
        id,
      ) +
      "</select></label><h3>" +
      f.nombre +
      '</h3><span class="tag">' +
      f.zona +
      "</span><dl><dt>Cabo nominal</dt><dd>" +
      coord(f.cabo) +
      "</dd><dt>Núcleo térmico</dt><dd>" +
      coord(f.nucleo) +
      "</dd><dt>Centros de viento (azul) / flujo oceánico (ocre)</dt><dd>" +
      f.celdas.filter((c) => c.tipo === "viento").length +
      " / " +
      f.celdas.filter((c) => c.tipo !== "viento").length +
      "</dd><dt>Normal UI / métrica¹</dt><dd>" +
      fmt(f.normal, 1) +
      "° / " +
      (f.metrica == null ? "—" : fmt(f.metrica, 1) + "°") +
      "</dd><dt>Días con viento favorable²</dt><dd>" +
      fmt(f.frecuencia, 1) +
      ' %</dd></dl><p class="dim">¹ Desde el este en sentido antihorario. ² Mediana de los porcentajes anuales. ' +
      (id <= 2
        ? "Angamos y Coloso comparten un régimen atmosférico regional."
        : "Referencia térmica a 200 km hacia el oeste.") +
      '</p><a class="link" href="' +
      ("#explorar/" + id) +
      '">' +
      "Explorar las series →" +
      "</a></div></div>";
    el.querySelector("select").onchange = (e) => {
      id = +e.target.value;
      dibujar();
    };
    el.querySelector(".map-mode").onclick = () => {
      local = !local;
      dibujar();
    };
    el.querySelectorAll("[data-f]").forEach((n) => {
      const select = () => {
        id = +n.dataset.f;
        dibujar();
        el.querySelector("select").focus();
      };
      n.onclick = select;
      n.onkeydown = (e) => {
        if (["Enter", " "].includes(e.key)) {
          e.preventDefault();
          select();
        }
      };
    });
  }
  dibujar();
}
function coord([lon, lat]) {
  return fmt(-lat, 2) + "° S · " + fmt(-lon, 2) + "° O";
}
