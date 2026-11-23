import { json, fmt, head, table, options } from "./datos.mjs";
import { flujoEstacional } from "./flujo-estacional.mjs";

const wrap = content => '<div class="wrap section stack">' + content + '</div>';

export function investigar(el, focos) {
  el.innerHTML = head("Resultados · 2002–2025", "El intercambio de calor cambia con la estación",
    "En verano, la anomalía media del flujo es mayor durante los episodios que en los demás días en los ocho focos. En invierno es menor en siete.") + wrap(`
    <section class="panel"><h2>¿El océano recibe o cede calor?</h2><p>Flujo superficial de calor sensible medio en episodios y en los demás días con datos del mismo período. Los valores negativos indican pérdida de calor del océano; los positivos, ganancia.</p><div id="flujo-estacional"></div></section>
    <section class="panel"><h2>Diferencia de anomalías</h2><p>Para cada foco se resta la anomalía media de los demás días a la de los episodios. Una diferencia positiva puede producirse aunque el océano ceda calor en ambos grupos.</p>
    <label class="field">Período<select id="periodo-contraste"><option value="DJF">Verano · diciembre a febrero</option><option value="JJA">Invierno · junio a agosto</option><option value="todo">Año completo</option></select></label><div id="tabla-contraste" aria-live="polite"></div>
    <details><summary>Cómo leer la incertidumbre</summary><p>Intervalos puntuales del 95 % con bloques de tres años. La significación se evalúa con el valor p ajustado por Holm para ocho focos dentro de cada período. Cuatro diferencias estivales y cinco invernales alcanzan el criterio. Ninguna diferencia anual lo alcanza.</p></details></section>
    <section class="panel"><h2>El ciclo mensual por zona</h2><a href="./atlas/figuras/climatologia.webp"><img class="figura-ciclo" loading="lazy" src="./atlas/figuras/climatologia.webp" alt="Flujo medio de cada mes en episodios y demás días del norte, centro y centro-sur. En el centro-sur las curvas divergen en invierno."></a><p>Las líneas comparan los mismos meses. Cada foco tiene el mismo peso en su zona. Un círculo abierto señala soporte escaso en al menos un foco.</p><a class="link" href="./atlas/climatologia.csv" download>Descargar los valores por zona</a></section>
    <section class="panel"><h2>Discusión</h2><p>En Galera el océano recibe en promedio +7,0 W m⁻² durante los episodios de verano y +2,0 W m⁻² en los demás días estivales. La ganancia también se observa en ambos grupos en Nugurne y Lavapié. El flujo absoluto y la diferencia de anomalías responden a preguntas distintas.</p><p>El contraste térmico puede intensificarse al enfriarse la costa o al calentarse mar abierto. El viento influye tanto en la selección como en el intercambio de calor. Al exigir fracción terrestre cero, la extracción del flujo se desplaza entre 31 y 48 km en Coloso, Lengua de Vaca y Lavapié. Esos lugares pierden comparabilidad con la posición costera inicial. Angamos y Coloso comparten forzamiento atmosférico regional.</p>
    <h2>Conclusión</h2><p>El flujo describe el intercambio aire–mar asociado a estos episodios según la estación y el lugar. Evaluar su capacidad diagnóstica requiere mediciones independientes del ascenso de agua subsuperficial.</p><a class="link" href="#resultados">Explorar las figuras del estudio</a></section>`);
  flujoEstacional(el.querySelector("#flujo-estacional"), focos);
  const sel = el.querySelector("#periodo-contraste");
  function mostrar() {
    el.querySelector("#tabla-contraste").innerHTML = table(["Foco","Días de episodio / referencia","Diferencia (W m⁻²)","IC del 95 % (W m⁻²)","Significación ajustada"],
      focos.map(f => { const a=f.contrastes[sel.value].anom;
        return [f.nombre, a.n+" / "+a.resto, fmt(a.valor), fmt(a.lo)+" a "+fmt(a.hi), a.p<.05?"Significativa":"No concluyente"]; }));
  }
  sel.onchange=mostrar; mostrar();
}
export function metodo(el) {
  el.innerHTML=head("Materiales y métodos","Cómo se identifican los episodios","Viento favorable persistente y contraste térmico excepcional, en ocho focos de Chile.")+wrap(`<div class="prose">
    <h2>Dos condiciones para una misma fecha</h2>
    <p>Primero se identifican rachas de viento favorable a partir del transporte de Ekman hacia mar abierto. Por separado se identifican rachas en que el contraste térmico supera su umbral local. Un día pertenece al episodio estudiado cuando coinciden ambas banderas. Cada racha original requiere al menos dos días consecutivos. Su intersección puede durar un solo día.</p>
    <h2>Viento y transporte de Ekman</h2><p>Con el viento ERA5 a 10 m se calcula el esfuerzo en cada celda, τ = ρₐ Cᴅ |U| U. El transporte integrado, con componentes este y norte, es M = (τᵧ, −τₓ)/(ρw f), con f = 2Ω sen φ. La proyección sobre la normal oceánica del foco, multiplicada por 1.000, da el índice de surgencia en m³ s⁻¹ km⁻¹. Se conservan las celdas de viento y la orientación originales. El transporte estimado hacia mar abierto indica forzamiento favorable.</p>
    <details><summary>Umbrales de viento y constantes</summary><p>Se usan ρₐ = 1,22 kg m⁻³, Cᴅ = 0,0014, ρw = 1.025 kg m⁻³ y Ω = 7,2921 × 10⁻⁵ s⁻¹. La primera pasada selecciona rachas con índice ≥ 80 durante al menos dos días. La mitad de la media de sus valores diarios agrupados por zona fija el umbral de la segunda pasada, también con ≥ y dos días consecutivos. Los umbrales son 476,468 en el norte, 544,282 en la zona central y 540,544 en el centro-sur, en m³ s⁻¹ km⁻¹.</p></details>
    <h2>Temperatura y umbral diario</h2><p>MUR v4.1 aporta la temperatura superficial diaria en una rejilla de 0,01°. El núcleo se localiza por su baja variabilidad térmica. Se resta la temperatura costera a la temperatura de la caja situada unos 200 km al oeste, a la misma latitud. Se toman el mínimo costero y el máximo oceánico diarios, promediados con sus vecinos válidos. Las cajas miden 0,5° de latitud por 0,25° de longitud.</p>
    <p>El contraste debe superar estrictamente la media climatológica diaria suavizada más una desviación local. La media y la media de los residuos cuadrados se suavizan con una ventana circular de 15 días; la raíz cuadrada de la segunda aporta la desviación. Se usa un calendario térmico de 365 posiciones por mes y día, con el 29 de febrero asignado al 28. Un día sin temperatura corta la racha térmica.</p>
    <h2>Flujo y fechas de referencia</h2><p>ERA5 proporciona el flujo sensible instantáneo en W m⁻², agregado por día. Se promedian únicamente centros de la rejilla de 0,25° con fracción terrestre exactamente cero en la máscara del producto. Esta selección se aplica al flujo. La bandera que clasifica el viento se conserva en su geometría original.</p>
    <p>El período 2002–2025 contiene 8.766 días de viento. Hay 8.611 días comunes con temperaturas MUR y flujo por foco. Los días de referencia tienen ambos productos y quedan fuera de la coincidencia de las dos condiciones. Pueden incluir días de viento favorable.</p>
    <p>El flujo absoluto es positivo hacia el océano. Su anomalía resta el ciclo climatológico diario suavizado del flujo oceánico con el operador original (ordinal limitado a 365). El contraste es la diferencia entre las anomalías medias de los dos grupos dentro del período indicado.</p>
    <a class="link" href="#investigacion">Ver resultados y límites de interpretación</a></div>`);
}
export function fuentes(el) {
  el.innerHTML=head("Fuentes","Bibliografía y descargas","Publicaciones, productos y tablas que acompañan al póster.")+wrap(`<section class="panel"><h2>Datos del estudio</h2><div class="actions"><a class="btn" href="./atlas/tabla-maestra.csv" download>Contrastes e incertidumbre · CSV</a><a class="btn" href="./atlas/flujo-mensual.csv" download>Flujo y soporte por foco · CSV</a><a class="btn" href="./atlas/climatologia.csv" download>Ciclos por zona · CSV</a><a class="btn" href="./atlas/variables.csv" download>Diccionario de series</a></div></section>
    <section class="panel"><h2>Lecturas para interpretar los resultados</h2><ul>
    <li>Transporte de Ekman y viento favorable. <a href="https://doi.org/10.1029/2018JC014187">Jacox et al. (2018)</a></li>
    <li>Contraste térmico entre la costa y mar abierto. <a href="https://doi.org/10.1016/j.csr.2014.03.012">Benazzouz et al. (2014)</a></li>
    <li>Flujos turbulentos y variabilidad térmica observada en Chile central. <a href="https://doi.org/10.3389/fmars.2021.702051">Aguirre et al. (2021)</a></li>
    <li>Atmósfera y flujo sensible. <a href="https://doi.org/10.1002/qj.3803">ERA5 · Hersbach et al. (2020)</a></li>
    <li>Temperatura superficial diaria. <a href="https://doi.org/10.5067/GHGMR-4FJ04">Producto MUR v4.1 · JPL</a></li></ul>
    <p>Los ciclos y anomalías específicos del estudio se definen en <a href="#metodo">Materiales y métodos</a>.</p><div class="actions"><a class="btn primary" href="./bibliografia/">Biblioteca científica</a><a class="btn" href="./qr/">Códigos QR</a></div></section>`);
}
export async function poster(el) {
  const figuras=await json("atlas/galeria.json");
  if (!el.isConnected) return;
  el.innerHTML=head("OFMC 2026","El póster y sus figuras","Flujo de calor sensible superficial como indicador de eventos de surgencia costera · Vicente Jara Juleff.")+wrap(`
    <div class="actions"><a class="btn primary" href="./atlas/poster-ofmc.pdf">Abrir el póster en PDF</a><a class="btn" href="#investigacion">Ver los resultados</a></div><div class="gallery">`+
      figuras.slice(0,6).map(f=>`<article class="card figure-card"><a href="./atlas/figuras/${f.id}.webp"><img loading="lazy" src="./atlas/figuras/${f.id}-mini.webp" alt="${f.pregunta}"><div class="body"><h3>${f.titulo}</h3></div></a></article>`).join("")+"</div>");
}
export async function cicloGeneral(el,focos) {
  const datos=await json("atlas/ciclos.json");
  if(!el.isConnected) return;
  const meses=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const nombres={costa:["Temperatura costera","°C"],oceano:["Temperatura en mar abierto","°C"],viento:["Rapidez del viento","m s⁻¹"],flujo:["Flujo sensible oceánico","W m⁻²"]};
  el.innerHTML='<h2>Climatología de todos los días disponibles</h2><p>Media mensual para cada foco antes de seleccionar episodios. Temperaturas sobre días MUR y variables atmosféricas sobre días ERA5.</p><div class="toolbar"><label class="field">Foco<select class="ciclo-foco">'+options(focos.map(f=>[f.id,f.nombre]),1)+'</select></label><label class="field">Variable<select class="ciclo-var">'+options(Object.entries(nombres).map(([k,v])=>[k,v[0]]),"costa")+'</select></label></div><div class="curva-clima"></div>';
  function dibujar(){
    const id=Number(el.querySelector(".ciclo-foco").value), k=el.querySelector(".ciclo-var").value;
    const v=datos.filter(d=>d.foco===id).map(d=>d[k]),unit=nombres[k][1];
    const lo=Math.floor(Math.min(...v)),hi=Math.ceil(Math.max(...v))+0.01;
    const pos=i=>[52+54*i,132-100*(v[i]-lo)/(hi-lo)];
    el.querySelector(".curva-clima").innerHTML=`<svg class="grafico-clima" viewBox="0 0 690 174" role="img" aria-label="${nombres[k][0]} por mes en ${focos[id-1].nombre}"><text x="4" y="20">${unit}</text><path fill="none" stroke="#167674" stroke-width="3" d="M${v.map((_,i)=>pos(i).join(",")).join(" L")}"/>${v.map((z,i)=>{const [x,y]=pos(i);return `<circle fill="#146969" cx="${x}" cy="${y}" r="4"><title>${meses[i]} · ${fmt(z)} ${unit}</title></circle><text x="${x}" y="${y-8}" text-anchor="middle">${fmt(z,1)}</text><text x="${x}" y="160" text-anchor="middle">${meses[i]}</text>`;}).join("")}</svg>`+
      '<details><summary>Ver los doce valores</summary>'+table(["Mes",nombres[k][0]+" ("+unit+")"],v.map((z,i)=>[meses[i],fmt(z)]))+'</details>';
  }
  el.onchange=dibujar;dibujar();
}
