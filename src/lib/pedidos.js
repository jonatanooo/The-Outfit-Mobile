import { collection, doc, getDocs, query, runTransaction, setDoc, where } from 'firebase/firestore';
import { db } from './firebaseClient';
import { calcularPrecioVariante } from './productos';
import { TIENDA_DIRECCION, calcularEnvio, redondear } from './tienda';

const ID_ESTADO_PENDIENTE = 4; // "Pendiente / Pago recibido" (se busca por nombre; este es el respaldo)

export class PedidoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PedidoError';
  }
}

function idUsuario(perfil) {
  const id = Number(perfil?.ID_User);
  if (!Number.isFinite(id)) throw new PedidoError('No se encontró tu perfil de usuario. Cierra sesión e inicia de nuevo.');
  return id;
}

/* ---------- Direcciones ---------- */

export function textoDireccion(dir) {
  if (!dir) return '';
  return [dir.Calle, dir.Ciudad, dir.Departamento].filter(Boolean).join(', ');
}

export function validarDireccion({ calle, ciudad, departamento }) {
  const errores = {};
  if (!calle || calle.trim().length < 5) errores.calle = 'Escribe la calle y número de casa (mín. 5 caracteres)';
  if (!ciudad || ciudad.trim().length < 3) errores.ciudad = 'Escribe la ciudad o municipio';
  if (!departamento) errores.departamento = 'Elige un departamento';
  return errores;
}

export async function listarDirecciones(perfil) {
  const id = idUsuario(perfil);
  const snap = await getDocs(query(collection(db, 'Direcciones'), where('ID_User', 'in', [id, String(id)])));
  return snap.docs
    .map((d) => ({ ...d.data(), ID_Direccion: d.data().ID_Direccion ?? d.id }))
    .filter((d) => d.Calle)
    .sort((a, b) => String(a.Fecha_Creacion || '').localeCompare(String(b.Fecha_Creacion || '')));
}

export async function crearDireccion(perfil, { calle, ciudad, departamento }) {
  const nueva = {
    ID_Direccion: Date.now(),
    ID_User: idUsuario(perfil),
    Calle: calle.trim(),
    Ciudad: ciudad.trim(),
    Departamento: departamento,
    Pais: 'El Salvador',
    Fecha_Creacion: new Date().toISOString(),
  };
  await setDoc(doc(db, 'Direcciones', String(nueva.ID_Direccion)), nueva);
  return nueva;
}

/* ---------- Pedido ---------- */

const trozos = (lista, n) => {
  const salida = [];
  for (let i = 0; i < lista.length; i += n) salida.push(lista.slice(i, i + n));
  return salida;
};

// Lee documentos de una colección por ID_Variante (límite de 30 valores por consulta "in").
async function documentosPorVariante(coleccion, ids) {
  const mapa = {};
  for (const grupo of trozos(ids, 30)) {
    const snap = await getDocs(query(collection(db, coleccion), where('ID_Variante', 'in', grupo)));
    snap.docs.forEach((d) => {
      const clave = String(d.data().ID_Variante);
      (mapa[clave] ||= []).push(d);
    });
  }
  return mapa;
}

async function idEstadoPendiente() {
  try {
    const snap = await getDocs(query(collection(db, 'Estado_Pedido'), where('Estado', '==', 'Pendiente')));
    if (!snap.empty) return snap.docs[0].data().ID_EstadoPedido ?? ID_ESTADO_PENDIENTE;
  } catch {
    // Se usa el valor por defecto.
  }
  return ID_ESTADO_PENDIENTE;
}

// entrega: { tipo: 'tienda' | 'domicilio', direccion?: registro de Direcciones }
// metodoPago: nombre que se guarda en Transacciones_Pago (p. ej. "Tarjeta bancaria")
// procesarPago: async (total) => ({ referencia, detalle }); lanza si el pago es rechazado.
//
// Orden: 1) valida stock y precios vigentes  2) cobra (simulado)  3) registra pedido, detalle,
// transacción y descuenta inventario en una sola transacción de Firestore.
export async function crearPedido({ perfil, correo, items, entrega, metodoPago, procesarPago }) {
  if (!items?.length) throw new PedidoError('Tu cesta está vacía.');
  const idUser = idUsuario(perfil);
  if (entrega.tipo === 'domicilio' && !entrega.direccion) throw new PedidoError('Elige una dirección de entrega.');

  // 1. Precios vigentes y stock
  const ids = items.map((i) => Number(i.idVariante));
  const [variantes, inventarios] = await Promise.all([
    documentosPorVariante('Variante_Producto', ids),
    documentosPorVariante('Inventario', ids),
  ]);

  const lineas = items.map((item) => {
    const varDoc = variantes[String(item.idVariante)]?.[0];
    if (!varDoc) throw new PedidoError(`"${item.nombre}" ya no está disponible. Quítalo de tu cesta.`);
    const invDocs = inventarios[String(item.idVariante)] || [];
    const invDoc = [...invDocs].sort(
      (a, b) => Number(b.data().Cantidad_Disponible || 0) - Number(a.data().Cantidad_Disponible || 0)
    )[0];
    const disponible = Number(invDoc?.data().Cantidad_Disponible || 0);
    if (!invDoc || disponible < item.cantidad) {
      throw new PedidoError(
        disponible > 0
          ? `Solo quedan ${disponible} unidades de "${item.nombre}" (talla ${item.talla}).`
          : `"${item.nombre}" (talla ${item.talla}) se agotó. Quítalo de tu cesta.`
      );
    }
    return { item, invRef: invDoc.ref, ...calcularPrecioVariante(varDoc.data()) };
  });

  const subtotalOriginal = redondear(lineas.reduce((a, l) => a + l.precioOriginal * l.item.cantidad, 0));
  const subtotal = redondear(lineas.reduce((a, l) => a + l.precio * l.item.cantidad, 0));
  const ahorro = redondear(subtotalOriginal - subtotal);
  const envio = calcularEnvio(entrega.tipo, subtotal);
  const total = redondear(subtotal + envio);

  // 2. Pago simulado (si se rechaza, no se escribe nada)
  const pago = await procesarPago(total);

  // 3. Registro atómico
  const estado = await idEstadoPendiente();
  const base = Date.now();
  const fecha = new Date(base).toISOString();
  const idPedido = base;
  const idTransaccion = base + lineas.length + 1;

  await runTransaction(db, async (tx) => {
    // Todas las lecturas primero
    const lecturas = [];
    for (const l of lineas) {
      const snap = await tx.get(l.invRef);
      const disponible = Number(snap.data()?.Cantidad_Disponible || 0);
      if (disponible < l.item.cantidad) {
        throw new PedidoError(`"${l.item.nombre}" (talla ${l.item.talla}) se agotó mientras pagabas.`);
      }
      lecturas.push(disponible);
    }

    tx.set(doc(db, 'Pedido', String(idPedido)), {
      ID_Pedido: idPedido,
      ID_User: idUser,
      ID_Direccion: entrega.tipo === 'domicilio' ? entrega.direccion.ID_Direccion : null,
      Fecha_Pedido: fecha,
      Subtotal: subtotalOriginal,
      Descuento: ahorro,
      Total: total,
      ID_EstadoPedidoo: estado,
      Tipo_Entrega: entrega.tipo === 'domicilio' ? 'Domicilio' : 'Tienda',
      Costo_Envio: envio,
    });

    lineas.forEach((l, i) => {
      const idDetalle = base + 1 + i;
      tx.set(doc(db, 'Pedido_Detalle', String(idDetalle)), {
        ID_PedidoDetalle: idDetalle,
        ID_Pedido: idPedido,
        ID_Variante: Number(l.item.idVariante),
        Cantidad: l.item.cantidad,
        Precio_Unitario: l.precio,
        Subtotal: redondear(l.precio * l.item.cantidad),
      });
      tx.update(l.invRef, {
        Cantidad_Disponible: lecturas[i] - l.item.cantidad,
        Fecha_Actualizacion: fecha,
      });
    });

    tx.set(doc(db, 'Transacciones_Pago', String(idTransaccion)), {
      ID_Transaccion: idTransaccion,
      ID_Pedido: idPedido,
      Monto: total,
      Metodo_Pago: metodoPago,
      Referencia_Pago: pago.referencia,
      Fecha_Transaccion: fecha,
      Estado_transaccion: 'Aprobado',
      Simulado: true,
    });
  });

  return {
    idPedido,
    idTransaccion,
    fecha,
    correo,
    items: lineas.map((l) => ({
      idVariante: l.item.idVariante,
      nombre: l.item.nombre,
      imagen: l.item.imagen,
      talla: l.item.talla,
      color: l.item.color,
      precio: l.precio,
      precioOriginal: l.precioOriginal,
      enOferta: l.enOferta,
      porcentajeDescuento: l.porcentajeDescuento,
      cantidad: l.item.cantidad,
    })),
    subtotal,
    subtotalOriginal,
    ahorro,
    envio,
    total,
    entrega: {
      tipo: entrega.tipo,
      texto: entrega.tipo === 'tienda' ? TIENDA_DIRECCION : textoDireccion(entrega.direccion),
    },
    metodoPago,
    detallePago: pago.detalle,
  };
}
