import { json, fmt, head, table } from "./datos.mjs";
import { investigar, metodo, fuentes as refs, poster, cicloGeneral } from "./estudio.mjs";
import { mapa } from "./mapa.mjs";
import { explorar } from "./explorar.mjs";
const main = document.querySelector("main"),
  nav = document.querySelector("#nav"),
  menu = document.querySelector("#menu");
const pages = [
  ["inicio", "Inicio"],
  ["investigacion", "Investigación"],
  ["explorar", "Explorar datos"],
  ["ekman", "Ekman"],
  ["campos", "Campos ERA5"],
  ["resultados", "Figuras"],
  ["metodo", "Metodología"],
  ["referencias", "Fuentes"],
];
let fs, ed;
try {
  [fs, ed] = await Promise.all([
    json("atlas/focos.json"),
    json("atlas/edicion.json"),
  ]);
} catch (err) {
  main.textContent =
    "No se pudo cargar la edición del atlas. Comprueba la conexión con el servidor y recarga la página.";
  throw err;
}
const cards = (items) =>
  '<div class="cards">' +
  items
    .map(
      ([a, b]) =>
        '<article class="card"><h3>' + a + "</h3><p>" + b + "</p></article>",
    )
    .join("") +
  "</div>";
const wrap = (s) => '<div class="wrap section stack">' + s + "</div>";
const btn = (to, t) => '<a class="btn" href="' + to + '">' + t + "</a>";
const section = (a, t) =>
  '<div class="heading"><div><span class="cap">' +
  a +
  '</span><h2 class="section-title">' +
  t +
  "</h2></div></div>";
function home(el) {
  el.innerHTML =
    '<section class="hero"><div class="wrap"><span class="eyebrow">Laboratorio de Oceanografía Física · Chile</span><h1>Surgencia en el<br><em>Pacífico chileno</em></h1><p>¿Cómo cambia el flujo de calor sensible cuando coinciden viento favorable y una costa más fría que mar abierto? Ocho focos de Chile, a lo largo de 24 años.</p><div class="actions"><a class="btn primary" href="#investigacion">Ver los resultados</a><a class="btn ghost" href="#explorar">Explorar series</a></div><div class="hero-mark" aria-hidden="true"><span>N</span></div><small class="byline">Costa de Chile · Terra / MODIS · NASA, 2009</small></div></section><div class="facts"><div class="wrap">' +
    [
      ["8", "Focos costeros"],
      ["24", "Años · 2002–2025"],
      ["8.611", "Días de soporte común"],
      ["2", "Productos · ERA5 y MUR"],
    ]
      .map(
        ([n, s]) =>
          '<div class="fact"><strong>' +
          n +
          "</strong><small>" +
          s +
          "</small></div>",
      )
      .join("") +
    "</div></div>" +
    wrap(
      section("Área de estudio", "Ocho focos de surgencia") +
        '<div id="mapa"></div>' +
        section("Resultados", "Lo que muestran los datos") +
        cards([["Verano", "La anomalía media del flujo supera a la de los demás días en los ocho focos."],["Invierno", "La diferencia de anomalías es negativa en siete focos. El promedio anual varía con el lugar."],["El signo del flujo", "El océano también puede ganar calor durante días que quedan fuera de los episodios."]]) +
        '<a class="link" href="#investigacion">Leer la interpretación científica →</a><section class="panel" id="ciclo-general"></section>',
    );
  cicloGeneral(el.querySelector("#ciclo-general"),fs).catch(e=>{if(el.isConnected) el.querySelector("#ciclo-general").textContent=e.message;});
  mapa(el.querySelector("#mapa"), fs).catch((e) => {
    if (el.isConnected) el.querySelector("#mapa").textContent = e.message;
  });
}
async function figuras(el) {
  const { galeria } = await import("./galeria.mjs");
  if (el.isConnected) await galeria(el, ed);
}
let cleanup;
async function route() {
  cleanup?.();
  cleanup = null;
  const [raw, i, fecha] = location.hash.slice(1).split("/");
  if (raw?.startsWith("foco=")) {
    const foco = fs.find((f) => f.slug === raw.slice(5));
    location.replace("#explorar/" + (foco?.id || 1));
    return;
  }
  if (raw === "contenido") {
    main.focus();
    return;
  }
  const r = pages.some(([k]) => k === raw) || raw === "poster" ? raw : "inicio";
  const id = +i >= 1 && +i <= 8 ? +i : 1;
  nav.innerHTML = pages
    .map(
      ([k, s]) =>
        '<a href="#' +
        k +
        '" ' +
        (r === k ? 'aria-current="page"' : "") +
        ">" +
        s +
        "</a>",
    )
    .join("");
  const enlaceAnimaciones = document.createElement("a");
  enlaceAnimaciones.href = "./animaciones/";
  enlaceAnimaciones.textContent = "Animaciones";
  nav.querySelector('a[href="#campos"]').after(enlaceAnimaciones);
  nav.classList.remove("open");
  menu.setAttribute("aria-expanded", "false");
  const el = document.createElement("div");
  main.replaceChildren(el);
  document.title =
    (pages.find(([k]) => k === r)?.[1] || "Póster") +
    " · Atlas de surgencia UACh";
  try {
    if (r === "explorar") explorar(el, fs, id, ed, fecha);
    else if (r === "campos") {
      const { campos } = await import("./campos.mjs");
      if (el.isConnected) {
        const salir = await campos(el, fs);
        if (el.isConnected) cleanup = salir;
        else salir?.();
      }
    } else if (r === "ekman") {
      const { laboratorio } = await import("./ekman.mjs");
      if (el.isConnected) cleanup = laboratorio(el, fs);
    } else
      await {
        inicio: home,
        investigacion: (el) => investigar(el, fs),
        metodo,
        referencias: refs,
        poster,
        resultados: figuras,
      }[r](el);
  } catch (e) {
    el.textContent = "No se pudo abrir esta vista: " + e.message;
  }
  window.scrollTo(0, 0);
}
menu.onclick = () =>
  menu.setAttribute("aria-expanded", String(nav.classList.toggle("open")));
document.querySelector(".skip").onclick = (e) => {
  e.preventDefault();
  main.focus();
  main.scrollIntoView();
};
window.addEventListener("hashchange", route);
route();
