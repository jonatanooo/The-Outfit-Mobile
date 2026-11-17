// Mensajes emergentes de la tienda, con las mismas reglas que la web (AlertaContext).
// Se pueden lanzar desde cualquier archivo, sin hooks:
//   await mostrarAlerta({ titulo, mensaje, tipo })            → cuadro con un botón
//   const ok = await mostrarConfirmacion({ mensaje, ... })    → cuadro con dos botones, devuelve true/false
// El componente AlertaProvider (src/components/MensajeEmergente.js) es quien los dibuja.

let despachador = null;
const colaPendiente = [];

// Normaliza título, tipo y textos de botones, igual que la web.
function personalizar(entrada, esConfirmacion) {
  const base = typeof entrada === 'string' ? { mensaje: entrada } : { ...(entrada || {}) };
  const lower = String(base.mensaje || '').toLowerCase();

  if (!base.titulo) {
    if (esConfirmacion) {
      base.titulo = 'Confirmar acción';
    } else if (lower.includes('stock') || lower.includes('unidades disponibles')) {
      base.titulo = 'Disponibilidad de stock';
      base.tipo = base.tipo || 'aviso';
    } else if (lower.includes('cuenta creada') || lower.includes('éxito') || lower.includes('correctamente')) {
      base.titulo = '¡Operación exitosa!';
      base.tipo = base.tipo || 'exito';
    } else if (lower.includes('error') || lower.includes('no se pudo') || lower.includes('inválid')) {
      base.titulo = 'Atención';
      base.tipo = base.tipo || 'error';
    } else {
      base.titulo = 'Aviso de The Outfit';
    }
  }

  return {
    tipo: base.tipo || (esConfirmacion ? 'confirmar' : 'info'),
    titulo: base.titulo,
    mensaje: base.mensaje || '',
    textoConfirmar: base.textoConfirmar || (esConfirmacion ? 'Confirmar' : 'Aceptar'),
    textoCancelar: base.textoCancelar || (esConfirmacion ? 'Cancelar' : null),
    esConfirmacion,
  };
}

function encolar(entrada, esConfirmacion) {
  const mensaje = personalizar(entrada, esConfirmacion);
  return new Promise((resolve) => {
    const item = { ...mensaje, resolve };
    if (despachador) despachador(item);
    else colaPendiente.push(item);
  });
}

export const mostrarAlerta = (entrada) => encolar(entrada, false);
export const mostrarConfirmacion = (entrada) => encolar(entrada, true);

// Lo usa el proveedor para empezar a recibir mensajes; devuelve la función que lo desconecta.
export function conectarAlertas(recibir) {
  despachador = recibir;
  colaPendiente.splice(0).forEach(recibir);
  return () => {
    if (despachador === recibir) despachador = null;
  };
}
