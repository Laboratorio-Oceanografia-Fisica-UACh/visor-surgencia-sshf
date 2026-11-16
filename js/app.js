import { dataDir } from "./config.js";
import { numero, diferencia, valorP } from "./formato.mjs";

const $ = (id) => document.getElementById(id);
const texto = (valor) => String(valor ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const par = (valores, unidad) => `${diferencia(valores?.[0])} a ${diferencia(valores?.[1])} ${texto(unidad)}`;
const estado = (bloque) => bloque?.estado === "exploratorio"
  ? `<div class="estado-exploratorio"><strong>Exploratorio</strong><span>${texto(bloque.nota || "Nota no disponible en los datos.")}</span></div>` : "";
const colorCategoria = { evidencia: "#C8553D", positivo_sin_ajuste: "#087E8B", sin_diferencia: "#648398" };
const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const variables = ["ui", "cuisst", "sshf", "sst_costera", "t2", "dT", "frec_evento"];
const cacheSeries = new Map();
let datos, version, mapa, marcadores = new Map(), cajas = [], focoActivo = null, solicitud = 0;

function unidad(clave) { return datos?.proyecto.unidades?.[clave]?.unidad || ""; }
function nombreVariable(clave) { return datos?.proyecto.unidades?.[clave]?.nombre || clave.replaceAll("_", " "); }
function valorConUnidad(valor, clave, decimales = 2) { return valor == null ? "—" : `${numero(valor, decimales)} ${texto(unidad(clave))}`.trim(); }
function diferenciaConUnidad(valor, clave) { return valor == null ? "—" : `${diferencia(valor)} ${texto(unidad(clave))}`.trim(); }
function fechaCorta(fecha) { return fecha ? new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CL", { year: "numeric", month: "long" }) : ""; }
function urlDato(ruta) { return `./${dataDir}/${ruta}`; }

async function pedirJson(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) throw new Error(`No se pudo cargar ${ruta} (${respuesta.status}).`);
  return respuesta.json();
}

function avisoEjemplo(activo) { if (activo) $("aviso-ejemplo").hidden = false; }

function renderGeneral() {
  const p = datos.proyecto;
  document.title = p.titulo;
  $("marca-autor").textContent = p.autor;
  $("titulo-proyecto").textContent = p.titulo;
  $("subtitulo-proyecto").textContent = p.subtitulo;
  $("resumen-proyecto").textContent = p.resumen;
  $("hero-numero").textContent = numero(datos.focos.length, 0).padStart(2, "0");
  $("meta-proyecto").innerHTML = `<span>${texto(p.autor)}</span><span>${texto(p.institucion)}</span><span>${texto(fechaCorta(p.periodo.inicio))} — ${texto(fechaCorta(p.periodo.fin))}</span>`;
  $("resultado-general").innerHTML = `${estado(p.resultado_general)}<div class="resultado-tarjeta"><strong>${numero(p.resultado_general.focos_con_evidencia, 0)} / ${numero(p.resultado_general.focos_total, 0)}</strong><div><span>Focos con evidencia</span><p>${texto(p.resultado_general.texto)}</p></div></div>`;
  $("pasos-metodo").innerHTML = p.metodo.map(m => `<article class="paso"><span>${numero(m.paso, 0).padStart(2,"0")}</span><h3>${texto(m.titulo)}</h3><p>${texto(m.texto)}</p></article>`).join("");
  $("fuentes-lista").innerHTML = p.fuentes.map(f => `<p class="fuente"><strong>${texto(f.nombre)}</strong><span>${texto(f.detalle)}</span>${f.doi ? `<a href="https://doi.org/${encodeURIComponent(f.doi)}" target="_blank" rel="noopener noreferrer">DOI ↗</a>` : ""}</p>`).join("");
  $("limitaciones-generales").innerHTML = p.limitaciones.map(l => `<li>${texto(l)}</li>`).join("");
  $("figuras-generales").innerHTML = p.figuras.map(figuraHtml).join("");
  $("credito").textContent = `${p.autor} · ${p.institucion}`;
  $("version").textContent = `Datos ${version.generado} · esquema ${version.esquema}`;
}

function figuraHtml(figura) {
  const ruta = `./${figura.archivo.replace(/^\/+/, "")}`;
  return `<figure class="figura">${estado(figura)}<a href="${texto(ruta)}" target="_blank" rel="noopener noreferrer"><img src="${texto(ruta)}" alt="${texto(figura.titulo)}" loading="lazy" width="${Number(figura.ancho)}" height="${Number(figura.alto)}"></a><figcaption><strong>${texto(figura.titulo)}</strong><span>${texto(figura.pie)}</span><a href="${texto(ruta)}" download>Descargar figura ↓</a></figcaption></figure>`;
}

function crearMapa() {
  if (!window.L) { $("mapa").textContent = "El mapa no pudo cargar. Selecciona un foco en la lista."; return; }
  mapa = L.map("mapa", { scrollWheelZoom: false, zoomControl: false }).setView([-31, -72], 5);
  mapa.attributionControl.setPrefix(false);
  L.control.zoom({ position: "bottomright" }).addTo(mapa);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>', maxZoom: 13 }).addTo(mapa);
  const limites = [];
  for (const f of datos.focos) {
    const color = colorCategoria[f.sshf_anual.categoria] || colorCategoria.sin_diferencia;
    const clase = f.sshf_anual.significativo_holm ? "relleno" : "hueco";
    const icono = L.divIcon({ className: "icono-foco", html: `<span class="punto ${clase}" style="--foco-color:${color}"></span>`, iconSize: [34,34], iconAnchor: [17,17] });
    const marcador = L.marker([f.lat, f.lon], { icon: icono, title: f.nombre }).addTo(mapa);
    marcador.bindTooltip(f.nombre, { direction: "right", offset: [12,0] });
    marcador.on("click", () => seleccionar(f.id));
    marcadores.set(f.id, marcador);
    limites.push([f.lat, f.lon]);
  }
  mapa.fitBounds(limites, { padding: [32,32] });
}

function dibujarCajas(f) {
  if (!mapa) return;
  cajas.forEach(c => mapa.removeLayer(c));
  cajas = [];
  const colores = { nucleo: "#C8553D", oceanica: "#00A6B5", viento: "#0B3954" };
  for (const [nombre, c] of Object.entries(f.cajas)) {
    const capa = L.rectangle([[c[2],c[0]], [c[3],c[1]]], { color: colores[nombre], weight: 2, fillOpacity: .10, dashArray: nombre === "viento" ? "5 5" : undefined }).addTo(mapa);
    capa.bindTooltip(({ nucleo: "Núcleo costero", oceanica: "Referencia oceánica", viento: "Área de viento" })[nombre]);
    cajas.push(capa);
  }
  mapa.fitBounds(L.featureGroup(cajas).getBounds(), { padding: [24,24], maxZoom: 8 });
}

function renderLista() {
  $("lista-focos").innerHTML = datos.focos.map((f, i) => `<button type="button" class="foco-boton ${f.id === focoActivo ? "activo" : ""}" data-foco="${texto(f.id)}"><span class="foco-indice">${numero(i+1,0).padStart(2,"0")}</span><span class="foco-nombre">${texto(f.nombre)}<small>${texto(f.zona_nombre)}</small></span><span class="foco-valor">${diferencia(f.sshf_anual.dif)}<small>${texto(unidad("sshf"))}</small></span><span class="flecha">↗</span></button>`).join("");
  $("lista-focos").querySelectorAll("button").forEach(b => b.addEventListener("click", () => seleccionar(b.dataset.foco)));
}

function estadistica(f) {
  const s = f.sshf_anual;
  return `${estado(s)}<div class="estadistica-cifra"><span>ΔSSHF′ · evento − resto</span><strong>${diferenciaConUnidad(s.dif, "sshf")}</strong><em>${texto(s.etiqueta)}</em></div><div class="estadistica-dos"><div><span>IC individual del 95 %</span><strong>${par(s.ic95, unidad("sshf"))}</strong></div><div><span>Decisión tras Holm</span><strong>${s.significativo_holm ? "Supera el ajuste" : "No supera el ajuste"}</strong><small>p ajustado: ${texto(valorP(s.p_holm))} · p: ${texto(valorP(s.p))}</small></div></div>`;
}

function renderPanel(f) {
  const u = f.umbrales;
  const indices = f.indices;
  $("panel").innerHTML = `<div class="panel-cabecera"><p class="sobretitulo">${texto(f.zona_nombre)} · ${numero(Math.abs(f.lat))}° S · ${numero(Math.abs(f.lon))}° O</p><h3>${texto(f.nombre)}</h3><p>${texto(f.resumen)}</p><a class="enlace-directo" href="#foco=${encodeURIComponent(f.id)}">Enlace directo a este foco ↗</a></div>
  <nav class="panel-nav" aria-label="Secciones del foco"><a href="#foco-resultado">Resultado</a><a href="#foco-indices">Índices</a><a href="#foco-series">Series</a><a href="#foco-estacional">Estaciones</a><a href="#foco-contexto">Contexto</a></nav>
  <section id="foco-resultado" class="panel-seccion"><p class="sobretitulo">RESULTADO ANUAL</p>${estadistica(f)}<div class="leyenda-bosque"><span><i class="muestra evidencia"></i> Relleno: supera Holm</span><span><i class="muestra hueco"></i> Hueco: no supera Holm</span><span><i class="marca-activo"></i> Foco seleccionado</span></div><div id="bosque" class="grafico bosque" aria-label="Comparación entre focos"></div></section>
  <section id="foco-indices" class="panel-seccion"><p class="sobretitulo">ÍNDICES Y UMBRALES</p>${estado(indices)}<div class="tabla-scroll"><table><thead><tr><th>Variable</th><th>Días evaluables</th><th>Días de evento</th></tr></thead><tbody>${["ui","cuisst","sshf","dT"].map(k => `<tr><th>${texto(nombreVariable(k))}</th><td>${valorConUnidad(indices.todos[k], k)}</td><td>${valorConUnidad(indices.evento[k], k)}</td></tr>`).join("")}</tbody></table></div><div class="umbral-ui"><span>Umbral UI</span><strong>${valorConUnidad(u.ui,"ui")}</strong></div><div id="umbral-cuisst" class="grafico" aria-label="Umbral mensual de CUISST"></div></section>
  <section id="foco-series" class="panel-seccion"><p class="sobretitulo">VARIABILIDAD ESTACIONAL</p><div id="series-carga" class="series-carga">Cargando serie…</div><div id="series-contenido" hidden><div class="control-grafico"><label for="variable-clima">Climatología mensual</label><select id="variable-clima">${variables.map(v => `<option value="${v}">${texto(nombreVariable(v))}</option>`).join("")}</select></div><div id="climatologia" class="grafico"></div><div id="serie-mensual" class="grafico"></div><div id="serie-anual" class="grafico"></div></div></section>
  <section id="foco-estacional" class="panel-seccion panel-exploratorio"><p class="sobretitulo">CONTRASTES POR ESTACIÓN</p>${estado(f.estacional)}<div class="tabla-scroll tabla-estacional"><table><thead><tr><th>Estación</th><th>ΔSSHF′</th><th>IC 95 %</th><th>Holm<small>${numero(f.estacional.estaciones.length * datos.focos.length,0)} pruebas · exploratorio</small></th></tr></thead><tbody>${f.estacional.estaciones.map(e => `<tr><th>${texto(e.nombre)} <small>${texto(e.est)}</small></th><td data-label="ΔSSHF′">${diferenciaConUnidad(e.dif,"sshf")}</td><td data-label="IC 95 %">${par(e.ic95,unidad("sshf"))}</td><td data-label="Holm · exploratorio">${e.supera_holm32 ? "Supera ajuste" : "No supera ajuste"}<small>p ${texto(valorP(e.p_holm32))}</small></td></tr>`).join("")}</tbody></table></div></section>
  <section id="foco-contexto" class="panel-seccion"><p class="sobretitulo">CONTEXTO DEL FOCO</p><div class="cajas-leyenda"><span><i class="caja-muestra nucleo"></i>Núcleo costero</span><span><i class="caja-muestra oceanica"></i>Referencia oceánica</span><span><i class="caja-muestra viento"></i>Área de viento</span></div><p class="contexto-nota">Las tres cajas de muestreo aparecen sobre el mapa al seleccionar este foco.</p><div class="metrica-eventos"><div><strong>${numero(f.eventos.dias_evento,0)}</strong><span>Días de evento</span></div><div><strong>${numero(f.eventos.rachas,0)}</strong><span>Rachas</span></div><div><strong>${numero(f.eventos.duracion_media_dias)}</strong><span>Duración media · días</span></div></div><h4>Limitaciones</h4><ul>${f.limitaciones.map(l=>`<li>${texto(l)}</li>`).join("")}</ul><h4>Referencia</h4><p>${texto(f.referencia)}</p><div class="galeria">${f.figuras.map(figuraHtml).join("")}</div></section>`;
  $("variable-clima").addEventListener("change", () => dibujarClimatologia(cacheSeries.get(f.id)));
  dibujarBosque(f);
  dibujarUmbral(f);
}

const plotBase = { responsive: true, displaylogo: false, displayModeBar: window.innerWidth > 540 ? "hover" : false, locale: "es", modeBarButtonsToRemove: ["lasso2d", "select2d"] };
const layoutBase = { paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", font: { family: "Arial, sans-serif", color: "#25475b", size: 12 }, margin: { l: 55, r: 16, t: 36, b: 45 }, hoverlabel: { bgcolor: "#0B3954", font: {color:"#fff"} } };
function graficar(id, trazas, layout) {
  if (!window.Plotly) { $(id).textContent = "El gráfico no pudo cargar."; return; }
  Plotly.newPlot(id, trazas, { ...layoutBase, ...layout }, plotBase);
}
function dibujarBosque(activo) {
  const focos = [...datos.focos].reverse();
  const nombres = focos.map(f=>f.nombre_corto);
  const trazas = focos.map(f => ({ type: "scatter", mode: "markers", x: [f.sshf_anual.dif], y: [f.nombre_corto], marker: { size: f.id === activo.id ? 17 : 11, color: f.sshf_anual.significativo_holm ? colorCategoria[f.sshf_anual.categoria] : "#fff", line: { width: f.id === activo.id ? 4 : 2.5, color: f.id === activo.id ? "#0B3954" : colorCategoria[f.sshf_anual.categoria] || "#648398" } }, error_x: { type: "data", symmetric: false, array: [f.sshf_anual.ic95[1]-f.sshf_anual.dif], arrayminus: [f.sshf_anual.dif-f.sshf_anual.ic95[0]], color: "#7894a2", thickness: 1.5 }, hovertemplate: `${texto(f.nombre)}<br>ΔSSHF′ ${diferenciaConUnidad(f.sshf_anual.dif,"sshf")}<br>IC 95 %: ${par(f.sshf_anual.ic95,unidad("sshf"))}<extra></extra>` }));
  const minimo = Math.floor(Math.min(...focos.map(f => f.sshf_anual.ic95[0])));
  const maximo = Math.ceil(Math.max(...focos.map(f => f.sshf_anual.ic95[1])));
  const marcas = Array.from({ length: maximo - minimo + 1 }, (_, i) => minimo + i);
  graficar("bosque", trazas, { title: { text: `Comparación de ${numero(datos.focos.length,0)} focos`, font: { size: 15 } }, height: 355, showlegend: false, xaxis: { title: `ΔSSHF′ (${unidad("sshf")})`, tickmode: "array", tickvals: marcas, ticktext: marcas.map(diferencia), zeroline: true, zerolinecolor: "#9cabb2", gridcolor: "#e4e9e9" }, yaxis: { categoryorder: "array", categoryarray: nombres, automargin: true }, margin: { l: 110, r: 25, t: 48, b: 55 } });
}
function dibujarUmbral(f) {
  graficar("umbral-cuisst", [{ type: "scatter", mode: "lines+markers", x: meses, y: f.umbrales.cuisst_mensual, line: { color: "#087E8B", width: 2 }, marker: { size: 5 }, hovertemplate: `%{x}: %{y:.2f} ${texto(unidad("cuisst"))}<extra></extra>` }], { title: { text: "Umbral mensual CUISST", font: { size: 15 } }, height: 250, xaxis: { type: "category" }, yaxis: { title: unidad("cuisst"), gridcolor: "#e4e9e9" }, margin: { l: 55, r: 10, t: 48, b: 35 } });
}
function dibujarClimatologia(serie) {
  if (!serie) return;
  const clave = $("variable-clima").value;
  const y = serie.climatologia[clave];
  graficar("climatologia", [{ type: "scatter", mode: "lines+markers", x: meses, y, line: { color: "#087E8B", width: 3, shape: "spline" }, marker: { size: 5 }, hovertemplate: `%{x}: %{y:.2f} ${texto(unidad(clave))}<extra></extra>` }], { title: { text: `${nombreVariable(clave)} · promedio mensual`, font: { size: 15 } }, height: 280, xaxis: { type: "category" }, yaxis: { title: unidad(clave), gridcolor: "#e4e9e9" } });
}
function dibujarMensual(serie) {
  graficar("serie-mensual", [{ type: "scatter", mode: "lines", x: serie.mensual.fechas, y: serie.mensual.sshf_anom, connectgaps: false, line: { color: "#C8553D", width: 1.8 }, hovertemplate: `%{x}: %{y:.2f} ${texto(unidad("sshf_anom") || unidad("sshf"))}<extra></extra>` }], { title: { text: "Anomalía mensual de SSHF", font: { size: 15 } }, height: 280, xaxis: { type: "date", rangeslider: { visible: false } }, yaxis: { title: unidad("sshf_anom") || unidad("sshf"), gridcolor: "#e4e9e9" } });
}
function dibujarAnual(serie) {
  const anual = serie.anual;
  const trazas = [
    { nombre: "Días de evento", clave: "sshf_anom_evento", color: "#C8553D" },
    { nombre: "Resto de los días", clave: "sshf_anom_resto", color: "#087E8B" }
  ].map(({ nombre, clave, color }) => ({ type: "scatter", mode: "lines+markers", name: nombre,
    x: anual.anios, y: anual[clave], connectgaps: false,
    line: { color, width: 2 }, marker: { size: 5 },
    hovertemplate: `%{x}: %{y:.2f} ${texto(unidad("sshf_anom"))}<extra>${nombre}</extra>` }));
  graficar("serie-anual", trazas, { title: { text: "Anomalía anual de SSHF por grupo", font: { size: 15 } },
    height: 310, xaxis: { title: "Año", dtick: 4 },
    yaxis: { title: unidad("sshf_anom"), gridcolor: "#e4e9e9" },
    legend: { orientation: "h", y: -0.3 }, margin: { l: 55, r: 16, t: 40, b: 70 } });
}

async function cargarSerie(f, token) {
  try {
    if (!cacheSeries.has(f.id)) cacheSeries.set(f.id, await pedirJson(urlDato(f.serie)));
    if (token !== solicitud) return;
    const serie = cacheSeries.get(f.id);
    if (serie.id !== f.id) throw new Error(`La serie ${f.serie} no corresponde al foco ${f.id}.`);
    avisoEjemplo(serie.ejemplo);
    $("series-carga").hidden = true;
    $("series-contenido").hidden = false;
    dibujarClimatologia(serie);
    dibujarMensual(serie);
    dibujarAnual(serie);
  } catch (error) { if (token === solicitud) $("series-carga").textContent = error.message; }
}

function seleccionar(id, actualizarHash = true) {
  const f = datos.focos.find(x => x.id === id);
  if (!f) return;
  focoActivo = id;
  const token = ++solicitud;
  renderLista();
  renderPanel(f);
  dibujarCajas(f);
  if (actualizarHash && location.hash !== `#foco=${encodeURIComponent(id)}`) history.replaceState(null, "", `#foco=${encodeURIComponent(id)}`);
  cargarSerie(f, token);
  if (window.innerWidth < 850) $("panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function focoDesdeHash() { const match = location.hash.match(/^#foco=([^&]+)/); return match ? decodeURIComponent(match[1]) : null; }
window.addEventListener("hashchange", () => { const id = focoDesdeHash(); if (id && id !== focoActivo && datos) seleccionar(id, false); });

async function iniciar() {
  try {
    [version, datos] = await Promise.all([pedirJson(urlDato("version.json")), pedirJson(urlDato("focos.json"))]);
    if (version.esquema !== datos.esquema) throw new Error("La versión del contrato no coincide entre version.json y focos.json.");
    avisoEjemplo(version.ejemplo);
    renderGeneral();
    crearMapa();
    renderLista();
    const id = focoDesdeHash();
    if (id) seleccionar(id, false);
  } catch (error) {
    $("error-carga").hidden = false;
    $("error-carga").textContent = `${error.message} Sirve la raíz del sitio con un servidor HTTP local para abrir el visor.`;
  }
}
iniciar();
