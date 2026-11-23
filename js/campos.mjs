import { json, fmt, options, field, head, year } from "./datos.mjs";

const escalas = {
  tau: ["Módulo del esfuerzo", "N m⁻²", 0, 0.16],
  vel: ["Rapidez del viento a 10 m", "m s⁻¹", 0, 16],
  tx: ["Esfuerzo hacia el este", "N m⁻²", -0.16, 0.16],
  ty: ["Esfuerzo hacia el norte", "N m⁻²", -0.16, 0.16],
};
const vectores = {
  esf: ["Esfuerzo", "tx", "ty", 0.1, "N m⁻²"],
  aire: ["Viento a 10 m", "u", "v", 8, "m s⁻¹"],
  ek: ["Transporte integrado", "qx", "qy", 1, "m² s⁻¹"],
};
const ramp = [
  "#f7fbff",
  "#dbe9f6",
  "#b5d4e9",
  "#80b4d5",
  "#478ec0",
  "#2266a5",
  "#104374",
  "#082748",
];
const diverge = [
  "#2e447e",
  "#6688b5",
  "#adc6d6",
  "#f4f0df",
  "#ddb585",
  "#b36e45",
  "#853d30",
];
const color = (v, lo, hi) => {
  const pal = lo < 0 ? diverge : ramp;
  const p = Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * (pal.length - 1),
    i = Math.floor(p),
    t = p - i;
  const rgb = (s) => [1, 3, 5].map((j) => parseInt(s.slice(j, j + 2), 16)),
    a = rgb(pal[i]),
    b = rgb(pal[Math.min(i + 1, pal.length - 1)]);
  return (
    "rgb(" + a.map((x, j) => Math.round(x + (b[j] - x) * t)).join(",") + ")"
  );
};
// Mercator elipsoidal WGS84. Las componentes físicas este/norte conservan su rumbo.
export function merc(lat) {
  const phi = (lat * Math.PI) / 180,
    e = Math.sqrt(0.0066943799901413165),
    s = e * Math.sin(phi);
  return (
    (180 / Math.PI) *
    Math.log(Math.tan(Math.PI / 4 + phi / 2) * ((1 - s) / (1 + s)) ** (e / 2))
  );
}
function unpack(s, k) {
  const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
    d = new DataView(bytes.buffer);
  return Float64Array.from({ length: bytes.length / 2 }, (_, i) => {
    const a = d.getInt16(2 * i, true);
    return a === -32768 ? NaN : a * k;
  });
}
export function diarios(grid, a) {
  const u = unpack(a.u, 0.001),
    v = unpack(a.v, 0.001),
    n = u.length;
  const f = { u, v };
  for (const k of ["vel", "tx", "ty", "tau", "qx", "qy"])
    f[k] = new Float64Array(n);
  for (let j = 0; j < grid.lat.length; j++) {
    const rf = 1025 * 2 * 7.2921e-5 * Math.sin((grid.lat[j] * Math.PI) / 180);
    for (let i = 0; i < grid.lon.length; i++) {
      const k = j * grid.lon.length + i,
        w = Math.hypot(u[k], v[k]),
        kdrag = 1.22 * 0.0014 * w;
      f.vel[k] = w;
      f.tx[k] = kdrag * u[k];
      f.ty[k] = kdrag * v[k];
      f.tau[k] = Math.hypot(f.tx[k], f.ty[k]);
      f.qx[k] = f.ty[k] / rf;
      f.qy[k] = -f.tx[k] / rf;
    }
  }
  return f;
}
// Intersecciones lineales entre centros oceánicos. En una silla, el determinante fija las parejas.
export function segmentos(z, t) {
  if (z.some((v) => !Number.isFinite(v))) return [];
  const pts = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    p = [];
  for (let e = 0; e < 4; e++) {
    const h = (e + 1) % 4;
    if (z[e] > t === z[h] > t) continue;
    const f = (t - z[e]) / (z[h] - z[e]);
    p.push(pts[e].map((v, k) => v + (pts[h][k] - v) * f));
  }
  if (p.length === 2) return [[p[0], p[1]]];
  if (p.length < 4) return [];
  return (z[0] - t) * (z[2] - t) > (z[1] - t) * (z[3] - t)
    ? [
        [p[0], p[1]],
        [p[2], p[3]],
      ]
    : [
        [p[0], p[3]],
        [p[1], p[2]],
      ];
}
function flecha(c, x, y, dx, dy) {
  const l = Math.hypot(dx, dy);
  if (l < 0.7) return;
  const a = Math.atan2(dy, dx),
    h = Math.min(5, l * 0.4);
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + dx, y + dy);
  c.lineTo(x + dx - h * Math.cos(a - 0.52), y + dy - h * Math.sin(a - 0.52));
  c.moveTo(x + dx, y + dy);
  c.lineTo(x + dx - h * Math.cos(a + 0.52), y + dy - h * Math.sin(a + 0.52));
  c.stroke();
}
export async function campos(el, fs) {
  el.innerHTML =
    head(
      "Cartografía · ERA5",
      "Campos de viento y transporte de Ekman",
      "Explora el campo diario en la malla de 0,25° y compáralo con el esfuerzo medio de 2002–2025.",
    ) +
    '<div class="wrap section stack"><div class="panel"><div class="toolbar" id="capas"></div><div class="toolbar" id="tiempo"></div></div><div class="panel"><h2 id="tituloCampo"></h2><p id="referencia"></p><canvas id="campo" width="840" height="540" tabindex="0" aria-label="Mapa geográfico de valores por celda. Usa las flechas para inspeccionar la malla."></canvas><output id="lectura" class="note"></output><p id="leyenda"></p></div><div class="panel" id="vinculo"></div></div>';
  const entrada = document.createElement("a");
  entrada.className = "btn";
  entrada.href = "./animaciones/";
  entrada.textContent = "Ver animaciones de campos oceanográficos →";
  el.querySelector(".stack").prepend(entrada);
  const [ind, costa] = await Promise.all([
    json("atlas/campos/indice.json"),
    json("assets/costa.json"),
  ]);
  if (!el.isConnected) return;
  const q = (k) => el.querySelector("#" + k),
    sel = (t, id, arr, k) => field(t, id, options(arr, k)),
    check = (id, s, on = true) =>
      '<label><input type="checkbox" id="' +
      id +
      '" ' +
      (on ? "checked" : "") +
      "> " +
      s +
      "</label>";
  q("capas").innerHTML =
    sel("Producto", "producto", [
      ["diario", "Campo diario"],
      ["media", "Media de los 8.766 días"],
    ]) +
    sel("Ámbito", "dom", [
      ["foco", "Entorno del foco"],
      ["todo", "Dominio disponible 18–45° S"],
      ["norte", "Norte"],
      ["central", "Central"],
      ["sur", "Centro-sur"],
    ]) +
    sel(
      "Foco asociado",
      "f",
      fs.map((f) => [f.id, f.nombre]),
      1,
    ) +
    sel(
      "Color",
      "z",
      Object.entries(escalas).map(([k, v]) => [k, v[0]]),
      "tau",
    ) +
    sel("Flechas", "vec", [
      ["esf", "Esfuerzo"],
      ["ek", "Transporte de Ekman"],
      ["aire", "Viento ERA5"],
      ["", "Ocultas"],
    ]) +
    sel(
      "Separación de flechas",
      "paso",
      [
        [2, "0,5°"],
        [4, "1°"],
        [6, "1,5°"],
      ],
      2,
    ) +
    sel("Escala de color", "esc", [
      ["fija", "Fija entre fechas"],
      ["auto", "Ajustar al dominio"],
    ]) +
    check("curvas", "Isolíneas", false) +
    check("geom", "Focos y cajas");
  q("tiempo").innerHTML =
    '<label class="field">Fecha ERA5<input type="date" id="fecha"></label><button class="control" id="ant" aria-label="Día anterior">←</button><button class="control" id="play">Reproducir</button><button class="control" id="sig" aria-label="Día siguiente">→</button>' +
    sel("Ir a un caso", "caso", [
      ["", "Elegir inicio o control"],
      [fs[0].caso, "Angamos · inicio"],
      [fs[7].caso, "Galera · inicio"],
      ["2010-01-15", "Control de 2010"],
    ]) +
    sel(
      "Velocidad",
      "hz",
      [
        [1, "1 día/s"],
        [2, "2 días/s"],
        [4, "4 días/s"],
      ],
      1,
    );
  const fechas = ind.fechas;
  let date = fs[0].caso,
    current,
    geo,
    cohort,
    serial = 0,
    timer = null,
    playing = false,
    pick = null,
    transform = null;
  const canvas = q("campo"),
    ctx = canvas.getContext("2d");
  let W = 840,
    H = 540;
  q("fecha").value = date;
  q("fecha").min = fechas[0];
  q("fecha").max = fechas.at(-1);
  function stop() {
    playing = false;
    clearTimeout(timer);
    q("play").textContent = "Reproducir";
  }
  function schedule() {
    if (!playing) return;
    timer = setTimeout(
      () => {
        if (!paso(1)) stop();
      },
      1000 / +q("hz").value,
    );
  }
  function paso(d) {
    const k = fechas.indexOf(date) + d;
    if (
      k < 0 ||
      k >= fechas.length ||
      Math.abs(Date.parse(fechas[k]) - Date.parse(date)) > 86400000
    )
      return false;
    date = fechas[k];
    q("fecha").value = date;
    load();
    return true;
  }
  function clear() {
    current = null;
    transform = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const k of ["lectura", "leyenda", "vinculo", "tituloCampo"])
      q(k).textContent = "";
  }
  async function load() {
    const req = ++serial,
      media = q("producto").value === "media",
      f = fs[+q("f").value - 1];
    clear();
    q("dom").disabled = media;
    if (media) q("dom").value = "foco";
    q("caso").disabled = media;
    q("fecha").disabled = media;
    q("ant").disabled =
      q("sig").disabled =
      q("play").disabled =
      q("hz").disabled =
        media;
    for (const [id, value] of [
      ["z", "vel"],
      ["vec", "aire"],
    ]) {
      q(id).querySelector('[value="' + value + '"]').disabled = media;
      if (media && q(id).value === value)
        q(id).value = id === "z" ? "tau" : "esf";
    }
    if (!media && !fechas.includes(date)) {
      stop();
      q("referencia").textContent =
        "Disponibilidad diaria: 15 de enero de 2010 (control) y 27 de diciembre de 2014 a 8 de febrero de 2015. Selecciona una fecha disponible.";
      return;
    }
    q("referencia").textContent = "Cargando campo…";
    try {
      const [a, serie] = await Promise.all([
        json("atlas/campos/" + (media ? "media-" + f.id : date) + ".json"),
        media ? null : year(f.id, +date.slice(0, 4)),
      ]);
      if (req !== serial || !el.isConnected) return;
      geo = media ? a : ind;
      cohort = media ? null : serie.find((r) => r.fecha === date);
      current = media
        ? Object.fromEntries(
            Object.entries(ind.escalas_media).map(([k, v]) => [
              k,
              unpack(a[k], v),
            ]),
          )
        : diarios(geo, a);
      q("referencia").textContent = media
        ? "Composición original · 8.766 días · 2002–2025 · ventana de " +
          f.nombre
        : "Día UTC " +
          date +
          " · casos 27 dic 2014–8 feb 2015 y control 15 ene 2010 · foco asociado: " +
          f.nombre;
      q("vinculo").innerHTML = cohort
        ? "<h2>" +
          f.nombre +
          " · " +
          date +
          "</h2><p>UI <b>" +
          fmt(cohort.ui, 1) +
          " m³ s⁻¹ km⁻¹</b> · " +
          (cohort.episodio == null ? "Sin temperatura evaluable" : cohort.episodio ? "Viento y señal térmica" : "Día restante") +
          " · viento " +
          fmt(cohort.vel) +
          " m s⁻¹ · |τ medio| " +
          fmt(cohort.tau, 3) +
          " N m⁻² · TSM costera " +
          fmt(cohort.tc) +
          " °C · CUISST " +
          fmt(cohort.cu) +
          " °C · flujo sensible oceánico " +
          fmt(cohort.sshf) +
          ' W m⁻².</p><a href="#explorar/' +
          f.id +
          "/" +
          date +
          '">Examinar esta fecha en las series →</a>'
        : "<h2>Composición del estudio original</h2><p>El color por defecto es la media de los módulos diarios. Las flechas son las medias de las componentes. El cálculo precede al promedio temporal.</p>";
      draw();
      schedule();
    } catch (e) {
      if (req === serial) {
        stop();
        q("referencia").textContent = e.message;
      }
    }
  }
  function draw() {
    if (!current) return;
    W = Math.min(
      960,
      Math.max(265, Math.round(canvas.getBoundingClientRect().width)),
    );
    H = W < 550 ? 420 : 540;
    const media = q("producto").value === "media",
      f = fs[+q("f").value - 1],
      domain = media ? "compos" : q("dom").value,
      lon = geo.lon,
      lat = geo.lat,
      dx = 0.25,
      nx = lon.length;
    let b = [
      lon[0] - 0.125,
      lon.at(-1) + 0.125,
      lat[0] - 0.125,
      lat.at(-1) + 0.125,
    ];
    const clip = (a) => [
      Math.max(b[0], a[0]),
      Math.min(b[1], a[1]),
      Math.max(b[2], a[2]),
      Math.min(b[3], a[3]),
    ];
    if (domain === "foco")
      b = clip([
        f.nucleo[0] - 4.5,
        f.nucleo[0] + 1.25,
        f.cabo[1] - 2.5,
        f.cabo[1] + 2.5,
      ]);
    else if (["norte", "central", "sur"].includes(domain))
      b = clip(
        {
          norte: [-78, -68, -27, -18],
          central: [-80, -68, -35.5, -27],
          sur: [-81, -69, -45, -35.5],
        }[domain],
      );
    const scale = Math.min(
        (W - (W < 550 ? 90 : 140)) / (b[1] - b[0]),
        (H - (W <= 650 ? 115 : 90)) / (merc(b[3]) - merc(b[2])),
      ),
      ww = (b[1] - b[0]) * scale,
      hh = (merc(b[3]) - merc(b[2])) * scale,
      x0 = (W - ww) / 2,
      y0 = 30,
      X = (l) => x0 + (l - b[0]) * scale,
      Y = (l) => y0 + (merc(b[3]) - merc(l)) * scale;
    transform = { X, Y, b };
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#f4f7f3";
    ctx.fillRect(0, 0, W, H);
    const key = q("z").value,
      z = current[key],
      unit = escalas[key][1],
      inside = (x, y) => x >= b[0] && x <= b[1] && y >= b[2] && y <= b[3];
    let [lo, hi] = escalas[key].slice(2);
    if (q("esc").value === "auto") {
      let max = 0;
      lat.forEach((y, j) =>
        lon.forEach((x, i) => {
          if (inside(x, y) && Number.isFinite(z[j * nx + i]))
            max = Math.max(max, Math.abs(z[j * nx + i]));
        }),
      );
      hi = max || 1;
      if (lo < 0) lo = -hi;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, ww, hh);
    ctx.clip();
    ctx.fillStyle = "#dce4e3";
    ctx.fillRect(x0, y0, ww, hh);
    lat.forEach((y, j) =>
      lon.forEach((x, i) => {
        const n = j * nx + i;
        if (!Number.isFinite(z[n]) || !inside(x, y)) return;
        ctx.fillStyle = color(z[n], lo, hi);
        ctx.fillRect(
          X(x - 0.125),
          Y(y + 0.125),
          scale * 0.25 + 0.4,
          Y(y - 0.125) - Y(y + 0.125) + 0.4,
        );
      }),
    );
    if (q("curvas").checked) {
      ctx.strokeStyle = "#233e4f";
      ctx.lineWidth = 0.85;
      for (let c = 1; c <= 5; c++) {
        const level = lo + ((hi - lo) * c) / 6;
        ctx.beginPath();
        for (let j = 0; j < lat.length - 1; j++)
          for (let i = 0; i < nx - 1; i++) {
            if (!inside(lon[i], lat[j])) continue;
            const n = j * nx + i;
            for (const [a, h] of segmentos(
              [z[n], z[n + 1], z[n + nx + 1], z[n + nx]],
              level,
            )) {
              ctx.moveTo(X(lon[i] + a[0] * dx), Y(lat[j] + a[1] * dx));
              ctx.lineTo(X(lon[i] + h[0] * dx), Y(lat[j] + h[1] * dx));
            }
          }
        ctx.stroke();
      }
    }
    for (const { forma: g } of costa) {
      ctx.beginPath();
      for (const poly of g.type === "Polygon" ? [g.coordinates] : g.coordinates)
        for (const ring of poly) {
          ring.forEach(([x, y], i) => {
            if (i) ctx.lineTo(X(x), Y(y));
            else ctx.moveTo(X(x), Y(y));
          });
          ctx.closePath();
        }
      ctx.fillStyle = "#ede8d8";
      ctx.fill("evenodd");
      ctx.strokeStyle = "#899a8e";
      ctx.lineWidth = 0.65;
      ctx.stroke();
    }
    const vec = vectores[q("vec").value],
      stride = Math.max(+q("paso").value, Math.ceil(18 / (scale * 0.25)));
    if (vec) {
      ctx.strokeStyle = "#102936";
      ctx.lineWidth = 1.35;
      for (let j = 0; j < lat.length; j += stride)
        for (let i = 0; i < nx; i += stride) {
          const n = j * nx + i;
          if (inside(lon[i], lat[j]) && Number.isFinite(current[vec[1]][n]))
            flecha(
              ctx,
              X(lon[i]),
              Y(lat[j]),
              (current[vec[1]][n] * 24) / vec[3],
              (-current[vec[2]][n] * 24) / vec[3],
            );
        }
    }
    if (q("geom").checked) {
      for (const g of fs) {
        const [x, y] = g.cabo;
        if (!inside(x, y)) continue;
        ctx.fillStyle = "#842e1e";
        ctx.beginPath();
        ctx.arc(X(x), Y(y), 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "12px sans-serif";
        ctx.fillText(
          g.nombre.replace("Bahía Antofagasta / ", "").replace("Punta ", ""),
          X(x) + 5,
          Y(y) - 4,
        );
        for (const [typ, r] of Object.entries(g.cajas)) {
          ctx.strokeStyle = {
            costa: "#ab3a27",
            viento: "#342f65",
            referencia: "#18784f",
          }[typ];
          ctx.lineWidth = 1.3;
          ctx.strokeRect(
            X(r[0]),
            Y(r[3]),
            (r[1] - r[0]) * scale,
            Y(r[2]) - Y(r[3]),
          );
        }
      }
    }
    ctx.restore();
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#203e47";
    ctx.strokeStyle = "#82959a";
    ctx.strokeRect(x0, y0, ww, hh);
    const step = hh / scale > 12 ? 4 : 1;
    for (let v = Math.ceil(b[0] / step) * step; v <= b[1]; v += step)
      ctx.fillText(Math.abs(v) + "° O", X(v) - 14, y0 + hh + 19);
    for (let v = Math.ceil(b[2] / step) * step; v <= b[3]; v += step)
      ctx.fillText(Math.abs(v) + "° S", x0 - 48, Y(v) + 4);
    const axisY = W <= 650 ? H - 32 : H - 10,
      bw = Math.min(220, W - 175);
    for (let i = 0; i < bw; i++) {
      ctx.fillStyle = color(lo + ((hi - lo) * i) / (bw - 1), lo, hi);
      ctx.fillRect(62 + i, axisY - 11, 2, 9);
    }
    ctx.fillStyle = "#203e47";
    ctx.fillText(fmt(lo, 2), 12, axisY);
    ctx.fillText(fmt(hi, 2) + " " + unit, 70 + bw, axisY);
    if (vec) {
      const vx = W <= 650 ? 16 : 485;
      ctx.strokeStyle = "#102936";
      flecha(ctx, vx, H - 16, 24, 0);
      ctx.fillText(
        vec[0] + " · " + fmt(vec[3], vec[3] < 1 ? 1 : 0) + " " + vec[4],
        vx + 32,
        H - 10,
      );
    }
    q("tituloCampo").textContent =
      (media ? "Promedio · " : "") + escalas[key][0] + " (" + unit + ")";
    q("leyenda").textContent =
      (vec
        ? "Flecha de referencia: 24 unidades de dibujo = " +
          vec[3] +
          " " +
          vec[4] +
          "; muestreo de flechas cada " +
          fmt(stride * 0.25, 2) +
          "°. "
        : "") +
      "Celdas ERA5 de 0,25°. Gris claro: fracción oceánica MUR < 0,7 o sin cobertura. Tierra: Natural Earth. Cajas de viento (violeta), costa (rojo) y referencia (verde). Transporte integrado estimado en m² s⁻¹. La proyección offshore solo se informa en el foco." +
      (q("curvas").checked
        ? " Isolíneas en " +
          [1, 2, 3, 4, 5]
            .map((i) => fmt(lo + ((hi - lo) * i) / 6, 3))
            .join(" / ") +
          " " +
          unit +
          "."
        : "");
    const centro = [(b[0] + b[1]) / 2, (b[2] + b[3]) / 2];
    if (!pick || !inside(...pick)) pick = centro;
    inspect(pick[0], pick[1]);
  }
  function inspect(lon, lat) {
    const i = Math.max(
        0,
        Math.min(geo.lon.length - 1, Math.round((lon - geo.lon[0]) / 0.25)),
      ),
      j = Math.max(
        0,
        Math.min(geo.lat.length - 1, Math.round((lat - geo.lat[0]) / 0.25)),
      );
    pick = [geo.lon[i], geo.lat[j]];
    const k = q("z").value;
    q("lectura").textContent =
      fmt(-pick[1]) +
      "° S · " +
      fmt(-pick[0]) +
      "° O · " +
      escalas[k][0] +
      ": " +
      fmt(current[k][j * geo.lon.length + i], 3) +
      " " +
      escalas[k][1];
  }
  canvas.onpointerdown = (e) => {
    if (!transform) return;
    const r = canvas.getBoundingClientRect(),
      x = ((e.clientX - r.left) * W) / r.width,
      y = ((e.clientY - r.top) * H) / r.height,
      { X, Y, b } = transform;
    if (x < X(b[0]) || x > X(b[1]) || y < Y(b[3]) || y > Y(b[2])) return;
    const closest = (arr, fn, v) =>
      arr.reduce((a, c) => (Math.abs(fn(a) - v) < Math.abs(fn(c) - v) ? a : c));
    inspect(closest(geo.lon, X, x), closest(geo.lat, Y, y));
  };
  canvas.onkeydown = (e) => {
    const off = {
      ArrowLeft: [-0.25, 0],
      ArrowRight: [0.25, 0],
      ArrowUp: [0, 0.25],
      ArrowDown: [0, -0.25],
    }[e.key];
    if (off && pick && current) {
      e.preventDefault();
      const b = transform.b;
      inspect(
        Math.min(b[1], Math.max(b[0], pick[0] + off[0])),
        Math.min(b[3], Math.max(b[2], pick[1] + off[1])),
      );
    }
  };
  for (const k of ["z", "vec", "paso", "esc", "curvas", "geom"])
    q(k).onchange = draw;
  const zona = (f) =>
    f.cabo[1] >= -27 ? "norte" : f.cabo[1] >= -35.5 ? "central" : "sur";
  q("dom").onchange = () => {
    const d = q("dom").value;
    if (
      ["norte", "central", "sur"].includes(d) &&
      zona(fs[+q("f").value - 1]) !== d
    ) {
      q("f").value = fs.find((f) => zona(f) === d).id;
      stop();
      load();
    } else draw();
  };
  q("caso").onchange = () => {
    if (!q("caso").value) return;
    stop();
    date = q("caso").value;
    q("fecha").value = date;
    if (date === fs[0].caso) q("f").value = 1;
    else if (date === fs[7].caso) q("f").value = 8;
    q("dom").value = "foco";
    q("caso").value = "";
    pick = null;
    load();
  };
  for (const k of ["f", "producto", "fecha"])
    q(k).onchange = () => {
      stop();
      if (
        k === "f" &&
        ["norte", "central", "sur"].includes(q("dom").value) &&
        zona(fs[+q("f").value - 1]) !== q("dom").value
      )
        q("dom").value = "foco";
      date = q("fecha").value;
      pick = null;
      load();
    };
  q("ant").onclick = () => {
    stop();
    paso(-1);
  };
  q("sig").onclick = () => {
    stop();
    paso(1);
  };
  q("play").onclick = () => {
    if (playing) return stop();
    if (!current) return;
    playing = true;
    q("play").textContent = "Pausar";
    schedule();
  };
  let lastWidth = 0;
  const resize = new ResizeObserver(() => {
    const w = canvas.clientWidth;
    if (w !== lastWidth) {
      lastWidth = w;
      draw();
    }
  });
  resize.observe(canvas);
  const hide = () => {
    if (document.hidden) stop();
  };
  document.addEventListener("visibilitychange", hide);
  await load();
  return () => {
    resize.disconnect();
    stop();
    serial++;
    document.removeEventListener("visibilitychange", hide);
  };
}
