import assert from "node:assert/strict";
import { numero, diferencia, valorP } from "./formato.mjs";

assert.equal(valorP(1.16584e-8), "< 0,001");
assert.equal(valorP(5e-6), "< 0,001");
assert.equal(valorP(0.962017), "0,96");
assert.equal(valorP(0.00894066), "0,0089");
assert.equal(diferencia(0.0292), "+0,03");
assert.equal(diferencia(-5.18), "−5,18");
assert.equal(diferencia(null), "—");
assert.equal(numero(null), "—");
console.log("Formato válido: p pequeños, signos y datos ausentes.");
