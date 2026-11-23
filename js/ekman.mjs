import { head, options, field, year, day, fmt, yes, table } from "./datos.mjs";
import { modelo, desdeFavorable } from "./fisica.mjs";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const range = (s, id, lo, hi, v, step = 1) =>
  '<label class="field">' +
  s +
  ' <output id="' +
  id +
  'v"></output><input id="' +
  id +
  '" type="range" min="' +
  lo +
  '" max="' +
  hi +
  '" value="' +
  v +
  '" step="' +
  step +
  '"></label>';
const col = { v: "#1c6063", t: "#a14b2f", q: "#22538a", n: "#53695e" };
function vector(x, y, u, v, k, color, name) {
  const ex = x + u * k,
    ey = y - v * k,
    len = Math.hypot(u * k, v * k);
  if (len < 0.1)
    return '<circle cx="' + x + '" cy="' + y + '" r="3" fill="' + color + '"/>';
  const dx = (ex - x) / len,
    dy = (ey - y) / len;
  return (
    '<path d="M' +
    x +
    " " +
    y +
    "L" +
    ex +
    " " +
    ey +
    '" fill="none" stroke="' +
    color +
    '" stroke-width="3"/><path fill="' +
    color +
    '" d="M' +
    ex +
    " " +
    ey +
    "l" +
    (-9 * dx + 4 * dy) +
    " " +
    (-9 * dy - 4 * dx) +
    "l" +
    -8 * dy +
    " " +
    8 * dx +
    'Z"><title>' +
    name +
    "</title></path>"
  );
}
function plano(d, normal) {
  const a = (normal * Math.PI) / 180;
  const arr = [
    [d.u, d.v, 1, col.v, "Viento", "m s⁻¹"],
    [d.tx, d.ty, 2, col.t, "Esfuerzo", "N m⁻²"],
    [d.qx, d.qy, 3, col.q, "Transporte", "m² s⁻¹"],
  ];
  return (
    '<svg class="lab-scene" viewBox="0 0 660 170" role="img" aria-label="Vectores calculados en el plano este–norte. La flecha gris indica la normal oceánica.">' +
    arr
      .map(([u, v, i, c, l, un]) => {
        const x = 110 + 220 * (i - 1),
          y = 79,
          len = Math.hypot(u, v),
          k = len ? 47 / len : 0;
        return (
          '<circle cx="' +
          x +
          '" cy="' +
          y +
          '" r="54" fill="#f6faf5" stroke="#b5ceca"/><path d="M' +
          (x - 47) +
          " " +
          y +
          "h94 M" +
          x +
          " " +
          (y - 46) +
          'v92" stroke="#cbdad3"/><g font-family="sans-serif" font-size="11" fill="#435e64"><text x="' +
          (x + 3) +
          '" y="22">N</text><text x="' +
          (x + 60) +
          '" y="' +
          (y + 4) +
          '">E</text></g>' +
          vector(x, y, Math.cos(a), Math.sin(a), 45, col.n, "Normal") +
          vector(x, y, u, v, k, c, l) +
          '<text x="' +
          x +
          '" y="149" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="' +
          c +
          '">' +
          l +
          '</text><text x="' +
          x +
          '" y="165" text-anchor="middle" font-family="sans-serif" font-size="12">' +
          fmt(len, i === 2 ? 3 : 2) +
          " " +
          un +
          "</text>"
        );
      })
      .join("") +
    "</svg>"
  );
}
function seccion(d, normal, play, speed) {
  const ui = d.ui,
    a = (normal * Math.PI) / 180;
  // En el dibujo x apunta a tierra. El eje que sale hacia el lector es la tangente (-ny,nx).
  const proyectar = (u, v) => ({
    mar: u * Math.cos(a) + v * Math.sin(a),
    fuera: -u * Math.sin(a) + v * Math.cos(a),
  });
  const viento = proyectar(d.u, d.v),
    esfuerzo = proyectar(d.tx, d.ty);
  const simbolo = (p, mag) => {
    if (mag < 1e-9) return "·";
    const parte = p.mar / mag,
      prof = p.fuera / mag;
    return (
      (parte > 0.08 ? "←" : parte < -0.08 ? "→" : "") +
      (prof > 0.08 ? " ⊙" : prof < -0.08 ? " ⊗" : "")
    );
  };
  const superficie =
    '<text x="190" y="29" font-size="14" fill="#124f54" font-family="sans-serif">Viento ' +
    simbolo(viento, Math.hypot(d.u, d.v)) +
    '</text><text x="330" y="50" font-size="14" fill="#8a4029" font-family="sans-serif">Esfuerzo ' +
    simbolo(esfuerzo, Math.hypot(d.tx, d.ty)) +
    "</text>";
  const dir = ui > 1e-6 ? 1 : ui < -1e-6 ? -1 : 0;
  const flow =
    dir > 0
      ? "M450 102 C418 86 349 90 286 90 H76"
      : "M76 90 H290 Q402 88 446 106";
  const deep =
    dir > 0 ? "M390 201 Q446 165 449 114" : "M449 114 Q446 165 390 201";
  const title =
    dir > 0
      ? "Hacia mar abierto · ascenso compensatorio posible"
      : dir < 0
        ? "Hacia la costa · hundimiento posible"
        : "Sin proyección apreciable";
  const arrow = (p, color) =>
    '<path d="' +
    p +
    '" stroke="' +
    color +
    '" fill="none" stroke-width="4" marker-end="url(#sarr)"/>';
  const particle = (p) =>
    play
      ? '<circle r="4" fill="#fcf7d4"><animateMotion dur="' +
        4 / speed +
        's" repeatCount="indefinite" path="' +
        p +
        '"/></circle>'
      : "";
  const strength = Math.min(1, Math.abs(ui) / 900);
  return (
    '<svg class="lab-scene" viewBox="0 0 640 235" role="img" aria-label="Corte conceptual normal a la costa: ' +
    title +
    '"><defs><linearGradient id="agua" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#66c2b3"/><stop offset="1" stop-color="#194e72"/></linearGradient><marker id="sarr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5 0 10Z" fill="#f2f8dd"/></marker></defs><rect width="640" height="235" fill="#ecf1df"/><path d="M0 65H514L466 235H0Z" fill="url(#agua)"/><path d="M0 65H510L490 85C360 104 286 84 0 98Z" fill="#c7c887" opacity=".82"/><path d="M346 235Q436 195 469 133L512 65 556 35 640 22V235Z" fill="#af9873"/><path d="M0 65H512" stroke="#367c84"/><g font-family="sans-serif" font-size="14" fill="#224b58"><text x="18" y="29">Mar abierto</text><text x="532" y="90">Continente</text><text x="18" y="59">Capa superficial</text></g><text x="18" y="212" font-family="sans-serif" font-size="14" fill="white">Agua relativamente fría</text>' +
    '<g opacity="' +
    (0.15 + 0.85 * strength) +
    '">' +
    (dir
      ? arrow(flow, "#eef5d8") +
        arrow(deep, "#d4ede3") +
        particle(flow) +
        particle(deep)
      : "") +
    "</g>" +
    superficie +
    '</svg><p class="dim">' +
    title +
    ". Sección según la normal local. ⊙ sale del plano y ⊗ entra. Partículas ilustrativas, sin escala de velocidad ni distancia. El estado térmico real depende de la historia del océano.</p>"
  );
}
export function laboratorio(el, fs) {
  el.innerHTML =
    head(
      "Oceanografía interactiva",
      "Laboratorio de Ekman",
      "Gira el viento y observa cómo cambia el transporte integrado respecto de una costa local. Después recorre los vectores derivados de ERA5.",
    ) +
    '<div class="wrap section stack"><div class="tabs"><button class="pill" id="sim">Modelo conceptual</button><button class="pill" id="real">Reproducir ERA5</button><a class="pill" href="#campos">Campos espaciales ERA5 →</a></div><div id="banco"></div></div>';
  const $ = (id) => el.querySelector("#" + id);
  let mode = "",
    playing = false,
    timer,
    seq = 0,
    rows = [],
    idx = 0;
  function stop() {
    playing = false;
    clearInterval(timer);
    if ($("play")) $("play").textContent = "Reproducir";
  }
  function frame() {
    if (!el.isConnected) return stop();
    const actual = mode === "real",
      d = actual
        ? rows[idx]
        : modelo(
            +$("mag").value,
            +$("dir").value,
            +$("lat").value,
            +$("normal").value,
          );
    if (!d) return;
    const f = fs[(actual ? +$("focus").value : 1) - 1],
      ang = actual ? f.normal : +$("normal").value;
    if (!actual) {
      for (const [k, u] of [
        ["mag", " m s⁻¹"],
        ["dir", "°"],
        ["lat", "°"],
        ["normal", "°"],
      ])
        $(k + "v").textContent = $(k).value + u;
    } else {
      $("dia").value = d.fecha;
      $("paso").value = idx;
      $("ahora").textContent = d.fecha;
    }
    $("vectores").innerHTML = plano(d, ang);
    $("corte").innerHTML = seccion(
      d,
      ang,
      playing && !actual && !!window.SVGAnimateMotionElement,
      +$("speed").value,
    );
    $("valor").innerHTML =
      '<span class="stat">' +
      fmt(d.ui, 1) +
      "</span> m³ s⁻¹ km⁻¹<p>Proyección sobre la normal " +
      fmt(ang, 1) +
      "°. " +
      (Math.abs(d.ui) < 1e-6
        ? "Transporte normal nulo."
        : d.ui > 0
          ? "Dirección favorable a surgencia."
          : "Transporte hacia la costa.") +
      "</p>";
    $("nums").innerHTML =
      table(
        ["Componente", "Este", "Norte"],
        [
          ["Viento (m s⁻¹)", fmt(d.u), fmt(d.v)],
          ["Esfuerzo (N m⁻²)", fmt(d.tx, 4), fmt(d.ty, 4)],
          ["Transporte (m² s⁻¹)", fmt(d.qx, 3), fmt(d.qy, 3)],
        ],
      ) +
      (actual
        ? table(
            ["Episodio conjunto", "Viento desde (°)", "Rapidez media (m s⁻¹)", "TSM costa (°C)", "CUISST (°C)", "Flujo oceánico (W m⁻²)"],
            [[yes(d.episodio), fmt(d.dir,1), fmt(d.vel), fmt(d.tc), fmt(d.cu), fmt(d.sshf)]],
          )
        : "");
  }
  function play() {
    if (playing) {
      stop();
      frame();
      return;
    }
    playing = true;
    $("play").textContent = "Pausar";
    if (mode === "real") {
      if (idx >= rows.length - 1) idx = 0;
      timer = setInterval(
        () => {
          if (idx >= rows.length - 1) {
            stop();
            frame();
            return;
          }
          idx++;
          frame();
        },
        1000 / +$("speed").value,
      );
    }
    frame();
  }
  async function cargardatos(pick) {
    stop();
    const tok = ++seq;
    rows = [];
    $("play").disabled = true;
    const ini = $("ini").value,
      fin = $("fin").value;
    if (!ini || !fin || fin < ini || ini < "2002-01-01" || fin > "2025-12-31") {
      $("nums").textContent = "Intervalo fuera del calendario.";
      $("vectores").innerHTML =
        $("corte").innerHTML =
        $("valor").innerHTML =
          "";
      return;
    }
    try {
      const years = Array.from(
        { length: Number(fin.slice(0, 4)) - Number(ini.slice(0, 4)) + 1 },
        (_, i) => +ini.slice(0, 4) + i,
      );
      const data = (
        await Promise.all(years.map((y) => year(+$("focus").value, y)))
      ).flat();
      if (tok !== seq || !el.isConnected) return;
      rows = data.filter((r) => r.fecha >= ini && r.fecha <= fin);
      idx = Math.max(
        0,
        rows.findIndex((r) => r.fecha === pick),
      );
      $("dia").min = ini;
      $("dia").max = fin;
      $("paso").max = rows.length - 1;
      $("play").disabled = false;
      frame();
    } catch (e) {
      if (tok === seq) $("nums").textContent = e.message;
    }
  }
  function demo(id) {
    const f = fs[id - 1];
    $("focus").value = id;
    $("ini").value = day(f.caso, -5);
    $("fin").value = day(f.caso, 10);
    $("yr").value = +f.caso.slice(0, 4);
    cargardatos(f.caso);
  }
  function preset(tipo) {
    const n = +$("normal").value;
    $("dir").value = (desdeFavorable(n) + (tipo === "h" ? 180 : 0)) % 360;
    $("mag").value = tipo === "r" ? 0 : 8;
    frame();
  }
  function set(m) {
    stop();
    seq++;
    mode = m;
    const real = m === "real";
    $("real").setAttribute("aria-pressed", real);
    $("sim").setAttribute("aria-pressed", !real);
    $("banco").innerHTML =
      '<div class="panel"><h2>' +
      (real ? "ERA5 por foco y fecha" : "Viento y orientación de la costa") +
      "</h2>" +
      (real
        ? '<div class="toolbar">' +
          field(
            "Foco",
            "focus",
            options(
              fs.map((f) => [f.id, f.nombre]),
              1,
            ),
          ) +
          field(
            "Año completo",
            "yr",
            options(
              Array.from({ length: 24 }, (_, i) => [i + 2002, i + 2002]),
              2015,
            ),
          ) +
          '<label class="field">Inicio<input id="ini" type="date"></label><label class="field">Fin<input id="fin" type="date"></label><label class="field">Fecha visible<input id="dia" type="date"></label></div><div class="actions"><button class="pill" id="norte">Caso Angamos</button><button class="pill" id="sur">Caso Galera</button></div><p class="dim">Casos elegidos por el primer inicio de viento favorable de 2015 con TSM disponible en la ventana −5…+10 días. Las fechas se eligieron a partir del viento.</p>' +
          range("Calendario", "paso", 0, 15, 5) +
          '<output id="ahora"></output>'
        : '<div class="actions"><button class="pill" id="fav">Favorable</button><button class="pill" id="inv">Desfavorable</button><button class="pill" id="rel">Viento en calma</button></div><div class="lab-controls">' +
          range("Viento desde", "dir", 0, 360, 180) +
          range("Intensidad", "mag", 0, 20, 8, 0.5) +
          range("Latitud", "lat", -55, -15, -33, 0.1) +
          range("Normal oceánica desde el este", "normal", 0, 360, 180, 0.01) +
          field("Usar normal métrica de un foco", "geom", options([["", "Costa idealizada"], ...fs.map(f=>[f.id,f.nombre])], "")) +
          "</div>") +
      '<div class="toolbar">' +
      field(
        "Velocidad de reproducción",
        "speed",
        options(
          [
            [0.5, "0,5×"],
            [1, "1×"],
            [2, "2×"],
            [4, "4×"],
          ],
          1,
        ),
      ) +
      '<button class="control" id="play">Reproducir</button><button class="control" id="reinicio">Reiniciar</button></div></div><div class="two-col" style="margin-top:18px"><div class="panel"><h2>Vectores horizontales</h2><div id="vectores"></div><p class="dim">Gris: normal oceánica. Las flechas de color muestran hacia dónde apunta cada vector. Longitudes normalizadas, magnitudes indicadas debajo.</p><h3>Índice de surgencia</h3><div id="valor"></div></div><div class="panel"><h2>Sección conceptual</h2><div id="corte"></div></div></div><div class="panel lab-values" style="margin-top:18px"><h2>Lectura cuantitativa</h2><div id="nums"></div><p class="dim">' +
      (real
        ? "ERA5 diario. La magnitud del vector medio de viento puede diferir de la rapidez media de las celdas. Se calculan esfuerzo y transporte por celda antes del promedio espacial. El UI conserva la normal histórica del foco."
        : "ρₐ = 1,22 kg m⁻³ · ρw = 1025 kg m⁻³ · Cᴅ = 0,0014 · Ω = 7,2921 × 10⁻⁵ s⁻¹. En el hemisferio sur, M se orienta 90° a la izquierda del esfuerzo.") +
      "</p></div>";
    $("play").onclick = play;
    $("speed").onchange = () => {
      if (playing) {
        stop();
        play();
      } else frame();
    };
    if (real) {
      $("norte").onclick = () => demo(1);
      $("sur").onclick = () => demo(8);
      $("focus").onchange = () => cargardatos($("dia").value);
      $("yr").onchange = () => {
        const y = $("yr").value;
        $("ini").value = y + "-01-01";
        $("fin").value = y + "-12-31";
        cargardatos();
      };
      $("ini").onchange = $("fin").onchange = () => cargardatos();
      $("reinicio").onclick = () => {
        stop();
        idx = 0;
        frame();
      };
      $("dia").onchange = () => {
        const j = rows.findIndex((r) => r.fecha === $("dia").value);
        if (j >= 0) {
          stop();
          idx = j;
          frame();
        }
      };
      $("paso").oninput = () => {
        stop();
        idx = +$("paso").value;
        frame();
      };
      demo(1);
    } else {
      for (const k of ["dir", "mag", "lat", "normal"]) {
        $(k).oninput = () => { if(k==="lat"||k==="normal") $("geom").value=""; frame(); };
      }
      $("geom").onchange = () => {
        const f=fs.find(g=>g.id===Number($("geom").value));
        $("lat").value=f?f.cabo[1]:-33;
        $("normal").value=f?(f.metrica+360)%360:180;
        frame();
      };
      $("fav").onclick = () => preset("f");
      $("inv").onclick = () => preset("h");
      $("rel").onclick = () => preset("r");
      $("reinicio").onclick = () => set("sim");
      frame();
    }
  }
  $("sim").onclick = () => set("sim");
  $("real").onclick = () => set("real");
  set("sim");
  const pause = () => {
    if (document.hidden) {
      stop();
      frame();
    }
  };
  document.addEventListener("visibilitychange", pause);
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  const motion = () => {
    if (reduced()) {
      stop();
      frame();
    }
  };
  mq.addEventListener("change", motion);
  return () => {
    seq++;
    stop();
    document.removeEventListener("visibilitychange", pause);
    mq.removeEventListener("change", motion);
  };
}
