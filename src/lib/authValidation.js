// Validaciones de los formularios de Inicio de sesión y Registro.

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Teléfonos de El Salvador: 8 dígitos que empiezan con 2 (fijo), 6 o 7 (móvil).
const REGEX_TELEFONO = /^[267]\d{7}$/;

export const REQUISITOS_PASSWORD = [
  { id: 'largo', texto: 'Mínimo 8 caracteres', cumple: (p) => p.length >= 8 },
  { id: 'mayuscula', texto: 'Al menos una mayúscula', cumple: (p) => /[A-Z]/.test(p) },
  { id: 'minuscula', texto: 'Al menos una minúscula', cumple: (p) => /[a-z]/.test(p) },
  { id: 'numero', texto: 'Al menos un número', cumple: (p) => /[0-9]/.test(p) },
  { id: 'simbolo', texto: 'Al menos un símbolo', cumple: (p) => /[^A-Za-z0-9\s]/.test(p) },
];

// Nivel de seguridad para la barra de 3 segmentos: 0 (vacía) a 3.
export function evaluarPassword(password) {
  if (!password) return { nivel: 0, etiqueta: '', color: '#D9D9D9', faltantes: [] };

  const faltantes = REQUISITOS_PASSWORD.filter((r) => !r.cumple(password)).map((r) => r.texto);
  const cumplidos = REQUISITOS_PASSWORD.length - faltantes.length;

  if (cumplidos <= 2) return { nivel: 1, etiqueta: 'Insegura', color: '#E02424', faltantes };
  if (cumplidos <= 4) return { nivel: 2, etiqueta: 'Media', color: '#F59E0B', faltantes };
  return { nivel: 3, etiqueta: 'Segura', color: '#16A34A', faltantes };
}

export function normalizarCorreo(correo) {
  return (correo || '').trim().toLowerCase();
}

export function validarCorreo(correo) {
  const valor = normalizarCorreo(correo);
  if (!valor) return 'El correo es obligatorio';
  if (!REGEX_CORREO.test(valor)) return 'Ingresa un correo válido';
  return '';
}

// Nombre de usuario: 3 a 20 caracteres, letras/números/punto/guion bajo, empezando con letra o número.
const REGEX_USERNAME = /^[A-Za-z0-9][A-Za-z0-9._]{2,19}$/;

export function normalizarUsername(username) {
  return (username || '').trim();
}

export function validarUsername(username) {
  const valor = normalizarUsername(username);
  if (!valor) return 'El nombre de usuario es obligatorio';
  if (valor.length < 3) return 'Mínimo 3 caracteres';
  if (valor.length > 20) return 'Máximo 20 caracteres';
  if (!REGEX_USERNAME.test(valor)) {
    return 'Solo letras, números, punto y guion bajo (sin espacios)';
  }
  return '';
}

// ---------- Teléfono (El Salvador: +503 y 8 dígitos) ----------

// Deja solo dígitos y limita a 8.
export function soloDigitosTelefono(valor) {
  return (valor || '').replace(/\D/g, '').slice(0, 8);
}

// "71234567" -> "7123 4567"
export function formatearTelefono(digitos) {
  const d = soloDigitosTelefono(digitos);
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
}

// Lee el teléfono guardado en cualquier formato ("+50371234567", "7123-4567"...) y devuelve los 8 dígitos.
export function extraerTelefono(guardado) {
  const d = (guardado || '').replace(/\D/g, '');
  return d.length >= 8 ? d.slice(-8) : d;
}

export function validarTelefono(digitos) {
  if (!digitos) return 'El teléfono es obligatorio';
  if (!REGEX_TELEFONO.test(digitos)) return 'Ingresa 8 dígitos válidos (debe iniciar con 2, 6 o 7)';
  return '';
}

export function validarLogin({ correo, password }) {
  const errores = {};
  const errCorreo = validarCorreo(correo);
  if (errCorreo) errores.correo = errCorreo;
  if (!password) errores.password = 'La contraseña es obligatoria';
  return errores;
}

export function validarRegistro({ correo, username, password, confirmar, telefono, aceptaTerminos }) {
  const errores = {};

  const errCorreo = validarCorreo(correo);
  if (errCorreo) errores.correo = errCorreo;

  const errUsername = validarUsername(username);
  if (errUsername) errores.username = errUsername;

  if (!password) {
    errores.password = 'La contraseña es obligatoria';
  } else {
    const { faltantes } = evaluarPassword(password);
    if (faltantes.length > 0) errores.password = faltantes.join(', ');
  }

  if (!confirmar) errores.confirmar = 'Confirma tu contraseña';
  else if (confirmar !== password) errores.confirmar = 'Las contraseñas no coinciden';

  const errTelefono = validarTelefono(telefono);
  if (errTelefono) errores.telefono = errTelefono;

  if (!aceptaTerminos) errores.aceptaTerminos = 'Debes aceptar los términos y condiciones';

  return errores;
}

export function mensajeErrorAuth(error) {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'Correo o contraseña incorrectos.';
    case 'auth/invalid-email':
      return 'El correo no es válido.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con este correo. Inicia sesión o restablece tu contraseña.';
    case 'auth/weak-password':
      return 'La contraseña es demasiado débil.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
    case 'auth/user-disabled':
      return 'Esta cuenta fue deshabilitada.';
    case 'auth/account-exists-with-different-credential':
      return 'Ya existe una cuenta con ese correo usando otro método de acceso.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'permission-denied':
      return 'No tienes permiso para realizar este cambio.';
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return 'Este método de acceso no está habilitado en Firebase Console (Authentication > Método de acceso).';
    default:
      return error?.message || 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }
}
