import { json, field, options, head } from "./datos.mjs";
export async function galeria(el, ed) {
  const data = await json("atlas/galeria.json");
  if (!el.isConnected) return;
  const all = "Todas",
    selectors = (key) => [
      [all, all],
      ...[...new Set(data.map((d) => d[key]))].sort().map((s) => [s, s]),
    ];
  el.innerHTML =
    head(
      "Resultados y figuras",
      "Galería científica",
      "Del mapa de los ocho focos a los contrastes del flujo sensible. Cada figura incluye la pregunta, el soporte científico y su procedencia.",
    ) +
    '<div class="wrap section stack"><div class="toolbar">' +
    field("Tema", "tema", options(selectors("categoria"), all)) +
    field(
      "Contenido",
      "clas",
      options(selectors("catalogo"), all),
    ) +
    '<label class="field">Buscar en títulos<input type="search" id="buscar" placeholder="Ej. Galera"></label><output id="total"></output></div><div class="gallery" id="imagenes"></div><dialog aria-labelledby="figtitle"><button class="control close">Cerrar ×</button><div class="ficha"></div></dialog></div>';
  const $ = (s) => el.querySelector(s),
    dialog = $("dialog");
  function render() {
    const str = $("#buscar").value.trim().toLocaleLowerCase("es"),
      picked = data.filter(
        (d) =>
          ($("#tema").value === all || $("#tema").value === d.categoria) &&
          ($("#clas").value === all || $("#clas").value === d.catalogo) &&
          d.titulo.toLowerCase().includes(str),
      );
    const priority = (k) => {
      let i = ed.figurasPrincipales.indexOf(k);
      return i === -1 ? 100 : i;
    };
    picked.sort((a, b) => priority(a.id) - priority(b.id));
    $("#total").textContent = picked.length + " de " + data.length + " figuras";
    $("#imagenes").innerHTML =
      picked
        .map(
          (d) =>
            '<article class="card figure-card"><button data-id="' +
            d.id +
            '"><img loading="lazy" width="480" height="340" src="./atlas/figuras/' +
            d.id +
            '-mini.webp" alt="' +
            d.pregunta +
            '"><div class="body"><span class="tag">' +
            d.categoria +
            "</span><h3>" +
            d.titulo +
            '</h3><p class="dim">' +
            d.catalogo +
            " · 2002–2025</p></div></button></article>",
        )
        .join("") || "<p>Ninguna figura coincide con la selección.</p>";
    $("#imagenes")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const d = data.find((d) => d.id === b.dataset.id),
              image = "./atlas/figuras/" + d.id + ".webp";
            $(".ficha").innerHTML =
              '<span class="cap">' +
              d.categoria +
              '</span><h2 id="figtitle" class="section-title">' +
              d.titulo +
              '</h2><a href="' +
              image +
              '" target="_blank" rel="noopener" title="Abrir a tamaño completo"><img src="' +
              image +
              '" alt="' +
              d.pregunta +
              '"></a><p class="dim">Toca la figura para abrirla a tamaño completo y ampliarla.</p><h3>' +
              d.pregunta +
              "</h3><p>" +
              d.descripcion +
              "</p><p><b>" +
              d.catalogo +
              "</b> · " +
              d.periodo +
              " · " +
              d.unidad +
              " · " +
              'ERA5 y MUR</p><p><a class="link" href="' +
              image +
              '" download>Descargar figura ampliada ↓</a></p>';
            dialog.showModal();
            $(".close").focus();
          }),
      );
  }
  $(".close").onclick = () => dialog.close();
  dialog.onclick = (e) => {
    if (e.target === dialog) dialog.close();
  };
  $("#tema").onchange = $("#clas").onchange = $("#buscar").oninput = render;
  render();
}
