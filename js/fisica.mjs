// Modelo clásico en el plano este–norte. Ángulos matemáticos desde el este.
export const constantes = Object.freeze({
  aire: 1.22,
  agua: 1025,
  cd: 0.0014,
  omega: 7.2921e-5,
});
const rad = (a) => (a * Math.PI) / 180;
export const proyeccion = (qx, qy, normal) =>
  1000 * (qx * Math.cos(rad(normal)) + qy * Math.sin(rad(normal)));
export function modelo(rapidez, desde, lat, normal) {
  if (
    ![rapidez, desde, lat, normal].every(Number.isFinite) ||
    rapidez < 0 ||
    lat === 0 ||
    Math.abs(lat) > 90
  )
    throw RangeError("Velocidad o latitud fuera del modelo.");
  const u = -rapidez * Math.sin(rad(desde)),
    v = -rapidez * Math.cos(rad(desde));
  const escala = constantes.aire * constantes.cd * rapidez,
    tx = escala * u,
    ty = escala * v;
  const f = 2 * constantes.omega * Math.sin(rad(lat)),
    qx = ty / (constantes.agua * f),
    qy = -tx / (constantes.agua * f);
  return { u, v, tx, ty, qx, qy, f, ui: proyeccion(qx, qy, normal) };
}
// Rumbo meteorológico desde el cual debe soplar para maximizar la componente oceánica en el sur.
export const desdeFavorable = (normal) => (((360 - normal) % 360) + 360) % 360;
