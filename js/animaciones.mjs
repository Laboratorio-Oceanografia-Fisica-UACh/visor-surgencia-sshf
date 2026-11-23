import { json, year, fmt } from "./datos.mjs";
import { escalas, regiones, dominio, leerDia, mapa } from "./mapa-animado.mjs";

const by = (id) => document.getElementById(id);
const paneles = document.querySelector(".paneles"),
  escena = document.querySelector(".escena");
const casos = document.querySelectorAll("[data-caso]");
const formFecha = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const fechaLarga = (s) => formFecha.format(new Date(s + "T12:00:00Z"));
const opt = (k, v) => new Option(v, k);
let indice,
  tierra,
  focos,
  caso,
  frame,
  foco,
  serie,
  request = 0,
  timer,
  playing = false,
  controller;
const cache = new Map();
const movimiento = matchMedia("(prefers-reduced-motion: reduce)");
function detener() {
  playing = false;
  clearTimeout(timer);
  by("play").textContent = "▶ Reproducir";
  by("play").setAttribute("aria-label", "Reproducir");
}
function programar() {
  clearTimeout(timer);
  if (!playing) return;
  if (+by("dia").value >= caso.fechas.length - 1) {
    detener();
    return;
  }
  timer = setTimeout(() => {
    by("dia").stepUp();
    actualizar();
  }, +by("velocidad").value);
}
function leyenda(id, k) {
  const v = escalas[k],
    steps = indice.paletas[k].filter((_, i) => i % 8 === 0 || i === 127);
  const precision = k === "tau" ? 2 : 0;
  by(id).innerHTML =
    "<b>" +
    v.label +
    " · " +
    v.unit +
    '</b><div class="escala"><span></span><i>≤ ' +
    fmt(v.min, precision) +
    "</i><i>" +
    fmt((v.min + v.max) / 2, precision) +
    "</i><i>≥ " +
    fmt(v.max, precision) +
    "</i></div>";
  by(id).querySelector(".escala span").style.background =
    "linear-gradient(90deg," +
    steps.map((rgb) => "rgb(" + rgb.join(",") + ")").join(",") +
    ")";
}
function opcionesCampo() {
  const doble = by("vista").value === "doble",
    prev = by("campo").value;
  by("campo").replaceChildren(
    ...(doble ? ["tau", "vel"] : ["tau", "vel", "sst", "q"]).map((k) =>
      opt(k, escalas[k].label),
    ),
  );
  if ([...by("campo").options].some((o) => o.value === prev))
    by("campo").value = prev;
}
function dibujar() {
  if (!frame || !foco || !serie) return;
  const doble = by("vista").value === "doble",
    k = by("campo").value,
    v = by("vector").value;
  const id = by("dominio").value,
    ext = dominio(id, foco),
    esTermico = k === "sst";
  const ubic = regiones[id]
    ? by("dominio").selectedOptions[0].text
    : foco.nombre;
  const lineas = by("contornos").checked;
  by("panel-b").hidden = !doble;
  paneles.classList.toggle("simple", !doble);
  by("titulo-a").textContent = doble
    ? "Viento y transporte de Ekman"
    : escalas[k].label;
  by("fuente-a").textContent = esTermico
    ? "MUR · malla nativa 0,01°"
    : "ERA5 · malla 0,25°";
  by("contornos").disabled = !(doble || esTermico);
  mapa(
    by("mapa-a"),
    indice,
    frame,
    tierra,
    focos,
    foco,
    ext,
    k,
    v,
    !doble && esTermico && lineas,
  );
  leyenda("leyenda-a", k);
  if (doble) {
    mapa(
      by("mapa-b"),
      indice,
      frame,
      tierra,
      focos,
      foco,
      ext,
      "sst",
      "none",
      lineas,
    );
    leyenda("leyenda-b", "sst");
  }
  by("clave-viento").textContent =
    (v === "aire"
      ? "Flechas blancas · viento ERA5 hacia su destino"
      : v === "ek"
        ? "Flechas ámbar · transporte integrado de Ekman"
        : "Vectores ocultos") + "   ·   gris: tierra";
  by("clave-calor").textContent =
    (doble || esTermico) && lineas
      ? "Flujo sensible · W/m²    ━ positivo (hacia el océano)    ┄ negativo    ··· cero"
      : k === "tau"
        ? "Bandas de esfuerzo cada 0,01 N/m²"
        : k === "q"
          ? "Flujo sensible positivo: calor hacia el océano."
          : "Tiempo de los análisis en UTC.";
  by("lugar").textContent = ubic;
  by("marca-episodio").textContent = "Muestreo diario · UTC";
  by("fecha").textContent = fechaLarga(frame.fecha);
  by("fecha").dateTime = frame.fecha;
  by("mapa-a").setAttribute(
    "aria-label",
    escalas[k].label + " · " + ubic + " · " + frame.fecha,
  );
  by("mapa-b").setAttribute(
    "aria-label",
    "Temperatura MUR" +
      (lineas ? " e isolíneas de Flujo sensible ERA5" : "") +
      " · " +
      ubic +
      " · " +
      frame.fecha,
  );
  by("nombre-foco").textContent = "Serie costera · " + foco.nombre;
  by("serie-link").href = "./#explorar/" + foco.id + "/" + frame.fecha;
  const items = [
    ["UI · m³ s⁻¹ km⁻¹", fmt(serie.ui, 0)],
    ["Viento y señal térmica", serie.episodio ? "En episodio" : "Fuera de episodio"],
    ["TSM costera · °C", fmt(serie.tc, 2)],
    ["TSM costera′ · °C", fmt(serie.tc_p, 2)],
    ["CUISST · °C", fmt(serie.cu, 2)],
    ["Flujo sensible · W m⁻²", fmt(serie.sshf, 2)],
  ];
  by("lecturas").innerHTML = items
    .map(([k, n]) => "<div><dt>" + k + "</dt><dd>" + n + "</dd></div>")
    .join("");
  by("sensibilidad").textContent = [2, 3, 7].includes(foco.id)
    ? "El flujo oceánico de este foco se muestrea en celdas desplazadas respecto de la posición costera original." +
      (foco.id === 3
        ? " En Lengua de Vaca la serie usa una sola celda efectiva."
        : "")
    : "";
}
async function actualizar() {
  const turno = ++request;
  controller?.abort();
  controller = new AbortController();
  const idx = +by("dia").value,
    fecha = caso.fechas[idx],
    id = by("dominio").value;
  const sel = regiones[id]
    ? focos.find((f) => f.id === caso.foco && zona(f) === id) ||
      focos.find((f) => zona(f) === id)
    : focos.find((f) => f.id === Number(id));
  escena.setAttribute("aria-busy", "true");
  by("estado").textContent = "";
  by("dia").setAttribute("aria-valuetext", fechaLarga(fecha));
  by("menos").disabled = idx === 0;
  by("mas").disabled = idx === caso.fechas.length - 1;
  try {
    const [nuevo, rows] = await Promise.all([
      cache.get(fecha) || leerDia(indice, fecha, controller.signal),
      year(sel.id, 2015),
    ]);
    if (turno !== request) return;
    if (!cache.has(fecha) && cache.size >= 4)
      cache.delete(cache.keys().next().value);
    cache.set(fecha, nuevo);
    foco = sel;
    frame = nuevo;
    serie = rows.find((r) => r.fecha === fecha);
    if (!serie) throw Error("Falta la fila diaria");
    escena.hidden = false;
    by("alternativa").hidden = true;
    dibujar();
    escena.dataset.fecha = fecha;
    escena.setAttribute("aria-busy", "false");
    by("play").disabled = false;
    programar();
  } catch (e) {
    if (turno !== request || e.name === "AbortError") return;
    detener();
    mostrarFotograma();
    escena.removeAttribute("data-fecha");
    escena.setAttribute("aria-busy", "false");
    frame = null;
    serie = null;
    for (const id of ["mapa-a", "mapa-b"]) {
      const c = by(id);
      c.width = c.width;
    }
    by("lecturas").replaceChildren();
    by("fecha").textContent = fechaLarga(fecha);
    by("estado").textContent =
      "No se pudo mostrar esta fecha. Puedes cambiar de día o abrir el fotograma PNG.";
  }
}
function zona(f) {
  return f.id <= 2 ? "norte" : f.id <= 5 ? "central" : "sur";
}
function mostrarFotograma() {
  const sur = caso?.id !== "angamos",
    fig = by("alternativa");
  fig.querySelector("img").src =
    "animaciones/media/" + (sur ? "lavapie-doble" : "angamos-viento") + ".png";
  fig.querySelector("figcaption").textContent =
    "Fotograma de referencia · " +
    (sur ? "Lavapié, 22 de enero de 2015" : "Angamos, 11 de junio de 2015");
  fig.hidden = false;
  escena.hidden = true;
}
function elegir(id) {
  detener();
  caso = indice.casos.find((v) => v.id === id);
  casos.forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.caso === id)),
  );
  by("dominio").value = String(caso.foco);
  by("dia").max = caso.fechas.length - 1;
  by("dia").value = caso.fechas.indexOf(caso.inicio);
  by("primero").textContent = fechaLarga(caso.fechas[0]);
  by("ultimo").textContent = fechaLarga(caso.fechas.at(-1));
  actualizar();
}
try {
  [indice, tierra, focos] = await Promise.all([
    json("animaciones/datos/indice.json"),
    json("animaciones/datos/costa.json"),
    json("atlas/focos.json"),
  ]);
  const grupos = [
    [
      "Regiones",
      [
        ["norte", "Zona norte"],
        ["central", "Zona central"],
        ["sur", "Zona centro-sur"],
      ],
    ],
    ["Focos", focos.map((f) => [f.id, f.nombre])],
  ];
  for (const [titulo, items] of grupos) {
    const grupo = document.createElement("optgroup");
    grupo.label = titulo;
    grupo.append(...items.map(([k, v]) => opt(k, v)));
    by("dominio").append(grupo);
  }
  opcionesCampo();
  elegir("lavapie");
  casos.forEach((b) => (b.onclick = () => elegir(b.dataset.caso)));
  by("vista").onchange = () => {
    opcionesCampo();
    dibujar();
  };
  for (const id of ["campo", "vector", "contornos"]) by(id).onchange = dibujar;
  by("dominio").onchange = () => {
    detener();
    actualizar();
  };
  by("dia").oninput = () => {
    detener();
    actualizar();
  };
  by("menos").onclick = () => {
    detener();
    by("dia").stepDown();
    actualizar();
  };
  by("mas").onclick = () => {
    detener();
    by("dia").stepUp();
    actualizar();
  };
  by("play").onclick = () => {
    if (playing) {
      detener();
      return;
    }
    playing = true;
    by("play").textContent = "Ⅱ Pausar";
    by("play").setAttribute("aria-label", "Pausar");
    if (+by("dia").value === caso.fechas.length - 1) {
      by("dia").value = 0;
      actualizar();
    } else programar();
  };
  by("velocidad").onchange = programar;
  movimiento.addEventListener("change", detener);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) detener();
  });
  let resize;
  window.addEventListener("resize", () => {
    clearTimeout(resize);
    resize = setTimeout(dibujar, 100);
  });
  window.addEventListener("pagehide", () => {
    detener();
    controller?.abort();
  });
} catch (e) {
  mostrarFotograma();
  by("estado").textContent =
    "Campos no disponibles. Puedes abrir los fotogramas PNG y los vídeos de esta página.";
}
