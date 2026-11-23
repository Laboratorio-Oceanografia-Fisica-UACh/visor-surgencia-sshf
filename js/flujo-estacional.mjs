import { fmt } from "./datos.mjs";
export function flujoEstacional(el, focos) {
  const meses = {
    DJF: "Verano · diciembre a febrero",
    JJA: "Invierno · junio a agosto",
  };
  el.innerHTML =
    '<div class="tabs" aria-label="Estación austral"></div><div class="flujo-scroll"></div><p class="dim">● Viento favorable y señal térmica · ○ Días restantes. La línea vertical marca flujo sensible nulo. Unidades: W m⁻². Los valores medios se leen en cada par de puntos.</p>';
  const cont = el.querySelector(".flujo-scroll"),
    tabs = el.querySelector(".tabs");
  for (const [key, nombre] of Object.entries(meses)) {
    const b = document.createElement("button");
    b.className = "pill";
    b.textContent = nombre;
    b.dataset.est = key;
    b.onclick = () => dibujar(key);
    tabs.append(b);
  }
  const all = focos.flatMap((f) =>
    Object.keys(meses).flatMap((e) =>
      ["episodio", "resto"].map((k) => f.contrastes[e][k].valor),
    ),
  );
  const lo = Math.floor(Math.min(...all, 0) / 5) * 5,
    hi = Math.ceil(Math.max(...all, 0) / 5) * 5,
    x = (v) => 188 + ((v - lo) / (hi - lo)) * 450;
  function dibujar(est) {
    for (const b of tabs.children)
      b.setAttribute("aria-pressed", String(b.dataset.est === est));
    const guias = [];
    for (let k = lo; k <= hi; k += 5)
      guias.push(
        '<path d="M' +
          x(k) +
          ' 10v237" stroke="' +
          (k === 0 ? "#31535f" : "#d4dfda") +
          '"/><text x="' +
          x(k) +
          '" y="265" text-anchor="middle">' +
          k +
          "</text>",
      );
    cont.innerHTML =
      '<svg role="img" aria-label="Flujo absoluto medio por foco en ' +
      meses[est] +
      '" viewBox="0 0 665 280"><g font-family="sans-serif" font-size="12" fill="#25464d">' +
      guias.join("") +
      focos
        .map((f, i) => {
          const a = f.contrastes[est].episodio.valor,
            b = f.contrastes[est].resto.valor,
            y = 24 + i * 30;
          return (
            "<g><title>" +
            f.nombre +
            " · episodios " +
            fmt(a) +
            " y resto " +
            fmt(b) +
            ' W m⁻²</title><text x="3" y="' +
            (y + 4) +
            '">' +
            f.nombre.replace("Bahía Antofagasta / ", "").replace(/^Punta /, "") +
            '</text><path d="M' +
            x(a) +
            " " +
            y +
            "H" +
            x(b) +
            '" stroke="#529b8a" stroke-width="2"/><circle cx="' +
            x(b) +
            '" cy="' +
            y +
            '" r="5" fill="white" stroke="#17485a" stroke-width="2"/><circle cx="' +
            x(a) +
            '" cy="' +
            y +
            '" r="4" fill="#147d71"/></g>'
          );
        })
        .join("") +
      "</g></svg>";
  }
  dibujar("DJF");
}
