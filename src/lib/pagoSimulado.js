// Pagos SIMULADOS (tarjeta bancaria, PayPal y tarjeta de regalo).
// No hay ninguna pasarela real: solo se comprueba que los datos tengan el FORMATO correcto
// y el pago siempre se aprueba. Se puede escribir cualquier dato (no hay tarjetas de prueba).
// Ningún dato de pago (número, fecha, CVV, titular, correo, código) se guarda en la base de datos.

export const METODOS_PAGO = {
  tarjeta: 'Tarjeta bancaria',
  paypal: 'PayPal',
  regalo: 'Tarjeta de regalo',
};

export class PagoRechazadoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PagoRechazadoError';
  }
}

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- Tarjeta bancaria ---------- */

export const soloDigitos = (valor, max = 32) => (valor || '').replace(/\D/g, '').slice(0, max);

export function detectarMarca(numero) {
  const n = soloDigitos(numero);
  if (/^4/.test(n)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'MASTERCARD';
  if (/^3[47]/.test(n)) return 'AMEX';
  return null;
}

// Visa/Mastercard: #### #### #### ####  |  Amex: #### ###### #####
export function formatearNumeroTarjeta(valor) {
  const marca = detectarMarca(valor);
  const n = soloDigitos(valor, marca === 'AMEX' ? 15 : 16);
  if (marca === 'AMEX') {
    return [n.slice(0, 4), n.slice(4, 10), n.slice(10, 15)].filter(Boolean).join(' ');
  }
  return n.replace(/(.{4})/g, '$1 ').trim();
}

// Solo formato: 16 dígitos (15 si es American Express).
export function validarNumeroTarjeta(valor) {
  const n = soloDigitos(valor);
  if (!n) return 'Ingresa el número de la tarjeta';
  const largo = detectarMarca(n) === 'AMEX' ? 15 : 16;
  if (n.length !== largo) return `El número de la tarjeta debe tener ${largo} dígitos`;
  return '';
}

// DD/MM/YY mientras se escribe
export function formatearFechaCaducidad(valor) {
  const n = soloDigitos(valor, 6);
  return [n.slice(0, 2), n.slice(2, 4), n.slice(4, 6)].filter(Boolean).join('/');
}

// Solo formato DD/MM/YY con una fecha de calendario posible (no se exige que sea futura).
export function validarFechaCaducidad(valor) {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(valor || '');
  if (!m) return 'Usa el formato DD/MM/YY';
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const fecha = new Date(2000 + Number(m[3]), mes - 1, dia);
  if (mes < 1 || mes > 12 || dia < 1 || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    return 'La fecha no es válida';
  }
  return '';
}

export function validarCVV(valor, marca) {
  const n = soloDigitos(valor);
  const largo = marca === 'AMEX' ? 4 : 3;
  if (!n) return 'Ingresa el CVV';
  if (n.length !== largo) return `El CVV debe tener ${largo} dígitos`;
  return '';
}

export function validarTitular(valor) {
  const t = (valor || '').trim();
  if (!t) return 'Ingresa el nombre del titular';
  if (t.length < 3 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(t)) return 'El nombre del titular no es válido';
  return '';
}

export function validarTarjeta({ numero, fecha, cvv, titular }) {
  const errores = {};
  const eNumero = validarNumeroTarjeta(numero);
  if (eNumero) errores.numero = eNumero;
  const eFecha = validarFechaCaducidad(fecha);
  if (eFecha) errores.fecha = eFecha;
  const eCvv = validarCVV(cvv, detectarMarca(numero));
  if (eCvv) errores.cvv = eCvv;
  const eTitular = validarTitular(titular);
  if (eTitular) errores.titular = eTitular;
  return errores;
}

/* ---------- PayPal ---------- */

export function validarPayPal({ correo, password }) {
  const errores = {};
  const c = (correo || '').trim();
  if (!c) errores.correo = 'Ingresa tu correo de PayPal';
  else if (!REGEX_CORREO.test(c)) errores.correo = 'Ingresa un correo válido';
  if (!password) errores.password = 'Ingresa tu contraseña';
  else if (password.length < 6) errores.password = 'Mínimo 6 caracteres';
  return errores;
}

/* ---------- Tarjeta de regalo ---------- */

export const limpiarCodigoRegalo = (valor) => (valor || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);

// XXXX-XXXX-XXXX-XXXX
export function formatearCodigoRegalo(valor) {
  return (limpiarCodigoRegalo(valor).match(/.{1,4}/g) || []).join('-');
}

export function validarRegalo({ codigo, pin }) {
  const errores = {};
  if (limpiarCodigoRegalo(codigo).length !== 16) errores.codigo = 'El código debe tener 16 caracteres';
  if (soloDigitos(pin, 4).length !== 4) errores.pin = 'El PIN debe tener 4 dígitos';
  return errores;
}

/* ---------- Pasarela simulada ---------- */

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function referencia() {
  return `SIM-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// metodo: 'tarjeta' | 'paypal' | 'regalo'. Siempre aprueba tras una pequeña espera.
// `detalle` es solo para mostrar en la pantalla de confirmación (no se guarda en la base de datos).
// Una pasarela real lanzaría PagoRechazadoError si el pago fuera rechazado.
export async function procesarPagoSimulado({ metodo, datos }) {
  await esperar(1400);

  if (metodo === 'tarjeta') {
    const n = soloDigitos(datos.numero);
    return { referencia: referencia(), detalle: `${detectarMarca(n) || 'TARJETA'} TERMINADA EN ${n.slice(-4)}` };
  }

  if (metodo === 'paypal') {
    return { referencia: referencia(), detalle: `PAYPAL (${datos.correo.trim().toLowerCase()})` };
  }

  if (metodo === 'regalo') {
    return { referencia: referencia(), detalle: `TARJETA DE REGALO TERMINADA EN ${limpiarCodigoRegalo(datos.codigo).slice(-4)}` };
  }

  throw new PagoRechazadoError('Método de pago no disponible.');
}
