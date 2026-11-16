# visor-surgencia-sshf
Visor interactivo de surgencia costera y flujos de calor sensible en Chile.

Presenta resultados precalculados de la tesis de Biología Marina de Vicente Jara
Juleff, «Flujo de calor sensible como proxy de surgencia costera en el centro y norte
de Chile» (UACh, 2026), en el Laboratorio de Oceanografía Física de la Universidad
Austral de Chile. El mapa, las fichas de ocho focos, los gráficos y las figuras
permiten explorar el período junio de 2002–diciembre de 2025.

Las fuentes científicas son ERA5 (viento, SSHF y temperatura del aire;
[Hersbach et al., 2020](https://doi.org/10.1002/qj.3803)) y MUR SST v4.1
(TSM, JPL/PO.DAAC; cita formal pendiente de completar). Los resultados anuales
incluyen intervalos individuales del 95 % por remuestreo de años completos y
valores p ajustados por Holm sobre ocho focos. Los contrastes por estación están
marcados como **exploratorios**. SSHF positivo significa que el océano gana calor;
ΔSSHF′ es la anomalía en días de evento menos la del resto.

## Ejecutar localmente

Desde la raíz del repositorio, con Python 3:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8000/`. Un enlace directo puede terminar en
`/#foco=pta_topocalma`. No se requiere instalación ni compilación. El navegador
necesita internet para Leaflet 1.9.4, Plotly básico 2.35.2 y OpenStreetMap.
Python se usa únicamente como servidor local: el sitio publicado es estático.

Comprobaciones locales con Node.js:

```sh
node js/comprobar_datos.mjs data
node js/comprobar_formato.mjs
```

Los contratos JSON están en `data/esquema/`. `data/version.json` conserva la
procedencia técnica de los resultados; `inventario-publico.json` registra tamaños
y SHA-256 de los archivos importados y preparados.

## Actualizar los datos públicos

1. Preparar y validar una nueva exportación en el entorno científico privado,
   usando su empaquetador autorizado. El pipeline permanece fuera de este repositorio.
2. Revisar que el paquete contenga únicamente agregados públicos, figuras y frontend;
   comprobar sus metadatos y comparar los contrastes con la tabla científica validada.
3. En una rama, sustituir conjuntamente `data/focos.json`, `data/version.json`, las
   ocho series agregadas de `data/series/` y las figuras de `figuras/`.
4. Ejecutar las pruebas anteriores, validar los contratos, actualizar el inventario y
   revisar escritorio, teléfono y rutas bajo `/visor-surgencia-sshf/` antes de integrar.

El sitio solo visualiza la exportación: no ejecuta MATLAB ni calcula estadísticas
científicas en Python o en el navegador. No incorporar datos originales ni herramientas
internas de procesamiento.

## GitHub Pages

**Despliegue pendiente de auditoría y autorización.** Después de la revisión y de la
integración autorizada en `main`, configurar Settings → Pages → Deploy from a branch →
`main` → `/(root)`, según la [guía de GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
La URL prevista es
<https://laboratorio-oceanografia-fisica-uach.github.io/visor-surgencia-sshf/>.
Las rutas son relativas y `.nojekyll` permite servir los archivos estáticos desde la raíz.
No se incluye un workflow de despliegue propio.

## Autorizaciones pendientes

No se ha establecido una licencia para el proyecto: queda pendiente de autorización
institucional. Los logos aún no están incorporados. Ver [créditos y contenidos de
terceros](TERCEROS.md), incluidas las referencias cuya atribución a cada foco requiere
revisión documental antes de publicar.
