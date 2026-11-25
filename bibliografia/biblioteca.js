const q = (id) => document.getElementById(id);
const normal = (t) =>
  String(t)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
const crear = (tag, t, cls) => {
  const e = document.createElement(tag);
  if (t) e.textContent = t;
  if (cls) e.className = cls;
  return e;
};
const link = (t, url) => {
  const a = crear("a", t, "link");
  a.href = url;
  return a;
};
let refs = [],
  limite = 25;
function render() {
  const term = normal(q("buscar").value.trim()),
    tag = q("tema").value,
    uso = q("uso").value,
    orden = q("orden").value;
  const data = refs.filter(
    (r) =>
      (!tag || r.temas.includes(tag)) &&
      (!uso || r.uso === uso) &&
      normal([r.autores, r.titulo, r.anio, r.doi].join(" ")).includes(term),
  );
  const usoRango = (r) => (r.uso === "Citada en documentos" ? 0 : 1);
  data.sort((a, b) =>
    orden === "relevancia"
      ? (a.relevancia || 999) - (b.relevancia || 999) ||
        usoRango(a) - usoRango(b) ||
        Number(b.anio) - Number(a.anio) ||
        a.titulo.localeCompare(b.titulo, "es")
      : orden === "titulo"
      ? a.titulo.localeCompare(b.titulo, "es")
      : orden === "autor"
        ? a.autores.localeCompare(b.autores, "es")
        : (orden === "reciente" ? 1 : -1) * (Number(b.anio) - Number(a.anio)) ||
          a.titulo.localeCompare(b.titulo, "es"),
  );
  q("n").textContent =
    data.length + " referencias · " + refs.length + " en el inventario";
  q("lista").replaceChildren();
  for (const r of data.slice(0, limite)) {
    const item = crear("article", "", "referencia"),
      txt =
        r.autores +
        " (" +
        r.anio +
        "). " +
        r.titulo +
        ". " +
        r.publicacion +
        (r.url ? ". " + r.url : "");
    if (r.rol_poster)
      item.append(crear("span", "Base del póster · " + r.rol_poster, "principal"));
    item.append(
      crear("small", r.anio + " · " + r.uso),
      crear("h2", r.titulo),
      crear("p", r.autores),
      crear("p", r.publicacion),
    );
    const acts = crear("div", "", "inline");
    if (r.url)
      acts.append(
        link(r.doi ? "DOI · " + r.doi : "Fuente bibliográfica ↗", r.url),
      );
    if (r.abierto) acts.append(link("Texto abierto ↗", r.abierto));
    const copiar = crear("button", "Copiar cita", "control");
    copiar.onclick = async () => {
      try {
        await navigator.clipboard.writeText(txt);
        copiar.textContent = "Cita copiada";
      } catch {
        const a = crear("textarea");
        a.value = txt;
        acts.append(a);
        a.select();
        copiar.textContent = "Cita seleccionada";
      }
    };
    acts.append(copiar);
    item.append(acts);
    const detalle = crear("details");
    detalle.append(
      crear("summary", "Temas y procedencia"),
      crear("p", r.temas.join(" · ")),
      crear("p", "Verificación: " + r.verificacion),
      crear("p", r.fuentes.join(" · "), "dim"),
    );
    item.append(detalle);
    q("lista").append(item);
  }
  q("mas").hidden = data.length <= limite;
}
try {
  const response = await fetch("./referencias.json");
  if (!response.ok) throw Error();
  refs = await response.json();
  q("tema").append(new Option("Todos los temas", ""));
  [...new Set(refs.flatMap((r) => r.temas))]
    .sort()
    .forEach((t) => q("tema").append(new Option(t, t)));
  for (const k of ["buscar", "tema", "uso", "orden"])
    q(k).addEventListener(k === "buscar" ? "input" : "change", () => {
      limite = 25;
      render();
    });
  q("mas").onclick = () => {
    limite += 25;
    render();
  };
  render();
} catch {
  q("n").textContent =
    "No se pudo cargar el inventario. Las descargas BibTeX y CSV están disponibles arriba.";
}
