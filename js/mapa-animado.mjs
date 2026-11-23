import { merc, diarios } from "./campos.mjs";

export const escalas = {
  tau: { label: "Esfuerzo del viento", unit: "N m⁻²", min: 0, max: 0.18 },
  vel: { label: "Rapidez a 10 m", unit: "m s⁻¹", min: 0, max: 12 },
  sst: { label: "TSM MUR", unit: "°C", min: 10, max: 24 },
  q: { label: "Flujo sensible ERA5", unit: "W m⁻²", min: -40, max: 40 },
};
export const regiones = {
  norte: [-74.9, -70.02, -24.9, -21.65],
  central: [-77.8, -70.15, -34.9, -29.3],
  sur: [-79.8, -71.1, -40.85, -35.2],
};
const rad = Math.PI / 180;
function inversa(y) {
  let a = Math.atan(Math.sinh(y * rad)) / rad;
  for (let i = 0; i < 4; i++) a += (y - merc(a)) * Math.cos(a * rad);
  return a;
}
export function proyeccion(ext, w, h) {
  const [o, e, s, n] = ext,
    escala = Math.min(w / (e - o), h / (merc(n) - merc(s)));
  const west = Math.min(
    -70.01 - w / escala,
    Math.max(-81, (o + e - w / escala) / 2),
  );
  const norte = (merc(n) + merc(s) + h / escala) / 2;
  return {
    x: (lon) => (lon - west) * escala,
    y: (lat) => (norte - merc(lat)) * escala,
    lon: (px) => west + px / escala,
    lat: (py) => inversa(norte - py / escala),
    escala,
  };
}
export function dominio(id, f) {
  if (regiones[id]) return regiones[id];
  const [x, y] = f.cabo;
  return [x - 2.65, Math.min(-70.01, x + 0.7), y - 1.03, y + 1.03];
}
export async function leerDia(indice, fecha, signal) {
  const base = "animaciones/datos/" + fecha;
  const [response, img] = await Promise.all([
    fetch(base + ".json", { signal }),
    fetch(base + ".png", { signal }),
  ]);
  if (!response.ok || !img.ok) throw Error("Falta un campo diario");
  const obj = await response.json();
  if (obj.fecha !== fecha) throw Error("Las fechas de los campos difieren");
  const bitmap = await createImageBitmap(await img.blob(), {
    colorSpaceConversion: "none",
  });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  if (canvas.width !== indice.sst.width || canvas.height !== indice.sst.height)
    throw Error("Malla MUR inesperada");
  const sst = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const fields = diarios(indice, obj);
  const buf = Uint8Array.from(atob(obj.q), (c) => c.charCodeAt(0));
  const view = new DataView(buf.buffer);
  fields.q = Float64Array.from(fields.u, (_, i) => {
    const v = view.getInt16(i * 2, true);
    return v === -32768 ? NaN : v * 0.01;
  });
  return { fields, sst, isol: obj.isolineas, fecha };
}
function valorEra(z, grid, x, y) {
  const i = Math.floor(x),
    j = Math.floor(y),
    nx = grid.lon.length;
  if (i < 0 || j < 0 || i + 1 >= nx || j + 1 >= grid.lat.length) return NaN;
  const k = j * nx + i,
    a = z[k],
    b = z[k + 1],
    c = z[k + nx],
    d = z[k + nx + 1];
  const dx = x - i,
    dy = y - j;
  if (Number.isFinite(a + b + c + d))
    return (1 - dy) * (a * (1 - dx) + b * dx) + dy * (c * (1 - dx) + d * dx);
  return z[Math.round(y) * nx + Math.round(x)];
}
function pintarCampo(c, p, w, h, grid, frame, k) {
  const img = c.createImageData(w, h),
    pal = grid.paletas[k],
    esc = escalas[k],
    mur = grid.sst;
  const lon = Float64Array.from({ length: w }, (_, i) => p.lon(i + 0.5));
  const xs = lon.map((v) =>
    k === "sst" ? Math.floor((v - mur.west) / mur.step) : (v - grid.lon[0]) * 4,
  );
  for (let j = 0; j < h; j++) {
    const lat = p.lat(j + 0.5),
      y =
        k === "sst"
          ? Math.floor((mur.north - lat) / mur.step)
          : (lat - grid.lat[0]) * 4;
    for (let i = 0; i < w; i++) {
      const x = xs[i];
      let v;
      if (k === "sst") {
        const n =
          x >= 0 && x < mur.width && y >= 0 && y < mur.height
            ? frame.sst[4 * (mur.width * y + x)]
            : 0;
        v = n ? (n - 1) / 8 : NaN;
      } else v = valorEra(frame.fields[k], grid, x, y);
      // Bandas rellenas cada 0,01 N/m² sobre la interpolación de la malla ERA5.
      if (k === "tau") v = Math.floor(v / 0.01) * 0.01;
      const color = Number.isFinite(v)
        ? pal[
            Math.round(
              Math.max(0, Math.min(1, (v - esc.min) / (esc.max - esc.min))) *
                127,
            )
          ]
        : [10, 21, 29];
      let off = 4 * (w * j + i);
      img.data[off] = color[0];
      img.data[off + 1] = color[1];
      img.data[off + 2] = color[2];
      img.data[off + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
}
function flechas(c, p, w, h, grid, f, tipo) {
  if (tipo === "none") return;
  const wind = tipo === "aire",
    u = wind ? f.u : f.qx,
    v = wind ? f.v : f.qy;
  const sc = wind ? 8 : 1,
    px = Math.max(23, Math.min(33, w * 0.058)),
    step = Math.max(1, Math.ceil(36 / (p.escala * 0.25)));
  c.lineWidth = 1.3;
  c.lineJoin = "round";
  c.lineCap = "round";
  for (let j = 0; j < grid.lat.length; j += step)
    for (let i = 0; i < grid.lon.length; i += step) {
      const k = j * grid.lon.length + i,
        x = p.x(grid.lon[i]),
        y = p.y(grid.lat[j]);
      if (
        x < 8 ||
        y < 8 ||
        x > w - 8 ||
        y > h - 8 ||
        !Number.isFinite(u[k] + v[k])
      )
        continue;
      const dx = (u[k] * px) / sc,
        dy = (-v[k] * px) / sc,
        len = Math.hypot(dx, dy);
      if (len < 1.8) continue;
      const xx = x + dx / 2,
        yy = y + dy / 2,
        ang = Math.atan2(dy, dx),
        head = Math.min(5, len * 0.36);
      c.beginPath();
      c.moveTo(x - dx / 2, y - dy / 2);
      c.lineTo(xx, yy);
      for (const a of [-0.55, 0.55]) {
        c.moveTo(xx, yy);
        c.lineTo(xx - head * Math.cos(ang + a), yy - head * Math.sin(ang + a));
      }
      c.strokeStyle = "#10202aba";
      c.lineWidth = 3.1;
      c.stroke();
      c.strokeStyle = wind ? "#f4fbf8" : "#ffce81";
      c.lineWidth = 1.35;
      c.stroke();
    }
  return { px, txt: wind ? "8 m/s" : "1 m²/s" };
}
function isolineas(c, p, w, h, isol) {
  const etiquetas = [];
  for (const [nivel, lineas] of Object.entries(isol)) {
    const valor = Number(nivel);
    const candidatos = [];
    for (const linea of lineas) {
      if (linea.length < 2) continue;
      c.beginPath();
      let tramo = 0,
        mejor = 0,
        puntos = [];
      for (let k = 0; k < linea.length; k++) {
        const [lon, lat] = linea[k],
          x = p.x(lon),
          y = p.y(lat);
        if (k === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
        if (x > 28 && x < w - 55 && y > 30 && y < h - 24) {
          if (k)
            tramo += Math.hypot(
              x - p.x(linea[k - 1][0]),
              y - p.y(linea[k - 1][1]),
            );
          mejor = Math.max(tramo, mejor);
          puntos.push([x, y]);
        } else tramo = 0;
      }
      c.strokeStyle = valor === 0 ? "#ffffff" : "#f9f6e7e8";
      c.lineWidth = valor === 0 ? 1.8 : 1.3;
      c.setLineDash(valor < 0 ? [6, 4] : valor === 0 ? [2, 3] : []);
      c.shadowBlur = 2;
      c.shadowColor = "#15202d";
      c.stroke();
      c.shadowBlur = 0;
      c.setLineDash([]);
      if (mejor > 37 && puntos.length) candidatos.push({ l: mejor, p: puntos });
    }
    for (const tramo of candidatos.sort((a, b) => b.l - a.l)) {
      const candidatosTexto = [0.5, 0.25, 0.75, 0.1, 0.9].map(
        (fr) => tramo.p[Math.floor((tramo.p.length - 1) * fr)],
      );
      const pt = candidatosTexto.find(([x, y]) =>
        etiquetas.every(([a, b]) => Math.hypot(a - x, b - y) > 47),
      );
      if (pt) {
        etiquetas.push([
          ...pt,
          (valor > 0 ? "+" : valor < 0 ? "−" : "") + Math.abs(valor),
        ]);
        break;
      }
    }
  }
  for (const [x, y, txt] of etiquetas) {
    c.font = "bold 11px sans-serif";
    c.fillStyle = "#111c28d9";
    c.fillRect(x - 13, y - 8, 26, 15);
    c.textAlign = "center";
    c.fillStyle = "#fff";
    c.fillText(txt, x, y + 3);
  }
}
function tierra(c, p, polys) {
  c.fillStyle = "#535c62";
  c.strokeStyle = "#b7c4c7";
  c.lineWidth = 0.85;
  for (const rings of polys) {
    c.beginPath();
    for (const ring of rings) {
      ring.forEach(([x, y], k) =>
        k ? c.lineTo(p.x(x), p.y(y)) : c.moveTo(p.x(x), p.y(y)),
      );
      c.closePath();
    }
    c.fill("evenodd");
    c.stroke();
  }
}
function rotulos(c, p, w, h, fs, foco) {
  c.font = "600 12px sans-serif";
  c.textBaseline = "middle";
  const placed = [];
  for (const f of [foco, ...fs.filter((g) => g.id !== foco.id)]) {
    const x = p.x(f.cabo[0]),
      y = p.y(f.cabo[1]);
    if (x < 5 || x > w - 5 || y < 4 || y > h - 4) continue;
    c.fillStyle = "#f2fbf8";
    c.strokeStyle = "#142730";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(x, y, f.id === foco.id ? 4.2 : 3, 0, 2 * Math.PI);
    c.fill();
    c.stroke();
    const label =
      f.id === 2
        ? "Coloso"
        : f.nombre.replace(/^Punta /, "").replace(/^Bahía /, "");
    const width = c.measureText(label).width,
      flip = x + width + 14 > w - 3;
    if (placed.some((v) => Math.abs(v - y) < 15)) continue;
    c.textAlign = flip ? "right" : "left";
    let xx = x + (flip ? -8 : 8);
    c.lineWidth = 3;
    c.strokeText(label, xx, y);
    c.fillText(label, xx, y);
    placed.push(y);
  }
  c.textBaseline = "alphabetic";
  c.textAlign = "left";
}
// Las posiciones se proyectan; las componentes físicas E/N conservan el rumbo en Mercator conforme.
export function mapa(
  canvas,
  grid,
  frame,
  polys,
  fs,
  foco,
  dom,
  k,
  vector,
  contornos,
) {
  const w = Math.max(320, Math.round(canvas.getBoundingClientRect().width)),
    h = Math.round(w * 0.605);
  const factor = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * factor);
  canvas.height = Math.round(h * factor);
  const p = proyeccion(dom, w, h),
    c = canvas.getContext("2d");
  pintarCampo(
    c,
    proyeccion(dom, canvas.width, canvas.height),
    canvas.width,
    canvas.height,
    grid,
    frame,
    k,
  );
  c.scale(canvas.width / w, canvas.height / h);
  if (contornos) isolineas(c, p, w, h, frame.isol);
  const ref = flechas(c, p, w, h, grid, frame.fields, vector);
  tierra(c, p, polys);
  rotulos(c, p, w, h, fs, foco);
  c.font = "11px sans-serif";
  c.fillStyle = "#edf5f6";
  c.strokeStyle = "#172832";
  c.lineWidth = 2.5;
  const paso = p.escala > 120 ? 1 : 2;
  for (let lon = -80; lon <= -70; lon += paso) {
    const xx = p.x(lon);
    if (xx < 24 || xx > w - 30) continue;
    c.textAlign = "center";
    const t = Math.abs(lon) + "°O";
    c.strokeText(t, xx, h - 7);
    c.fillText(t, xx, h - 7);
  }
  c.textAlign = "left";
  for (let lat = -42; lat <= -20; lat += paso) {
    const yy = p.y(lat);
    if (yy < 27 || yy > h - 22) continue;
    const t = Math.abs(lat) + "°S";
    c.strokeText(t, 6, yy);
    c.fillText(t, 6, yy);
  }
  if (ref) {
    c.fillStyle = "#0a1d29db";
    c.fillRect(8, 8, ref.px + 68, 24);
    c.strokeStyle = "#fff";
    c.lineWidth = 1.6;
    const x = 15 + ref.px;
    c.beginPath();
    c.moveTo(15, 20);
    c.lineTo(x, 20);
    c.lineTo(x - 4, 17);
    c.moveTo(x, 20);
    c.lineTo(x - 4, 23);
    c.stroke();
    c.fillStyle = "#fff";
    c.fillText(ref.txt, x + 5, 24);
  }
}
