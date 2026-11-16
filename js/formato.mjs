// Presentación numérica compartida por tablas, tarjetas y gráficos.
export const numero = (valor, decimales = 2) => valor == null || !Number.isFinite(Number(valor))
  ? "—" : new Intl.NumberFormat("es-CL", { maximumFractionDigits: decimales }).format(valor).replace("-", "−");

export const diferencia = (valor) => valor == null || !Number.isFinite(Number(valor)) ? "—"
  : `${valor < 0 ? "−" : "+"}${Math.abs(valor).toFixed(2).replace(".", ",")}`;

export const valorP = (valor) => valor == null || !Number.isFinite(Number(valor)) ? "—"
  : valor < 0.001 ? "< 0,001"
    : new Intl.NumberFormat("es-CL", { maximumSignificantDigits: 2 }).format(valor);
