// Cesta compartida con la web (colecciones `Carrito` y `Carrito_Detalle`).
// Mismo formato que la web (repo The-Outfit, src/lib/CarritoContext.js):
//  - Carrito: un documento por usuario { ID_Carrito, ID_User, Fecha_Creacion }, con id = ID_Carrito.
//  - Carrito_Detalle: una línea por variante { ID_CarritoDetalle, ID_Carrito, ID_Variante, Cantidad,
//    Fecha_agregado }, con id `${ID_Carrito}_${ID_Variante}`.

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseClient';

const CARRITO = 'Carrito';
const DETALLE = 'Carrito_Detalle';

// Documentos de plantilla del esquema: la web los ignora.
function esPlantilla(d) {
  const data = d.data();
  if (!data) return true;
  if (d.id === '_schema_init' || d.id === '_placeholder') return true;
  return data._is_schema_template === true || Boolean(data._info);
}

function numero(valor) {
  const n = Number(valor);
  return valor != null && valor !== '' && Number.isFinite(n) ? n : null;
}

// Valores con los que puede estar guardado un id numérico (número o texto).
function variantes(valor) {
  const n = numero(valor);
  return n == null ? [] : [n, String(n)];
}

function carritoValido(d) {
  return !esPlantilla(d) && Number(d.data().ID_Carrito) !== 0;
}

function idDeCarrito(d) {
  const crudo = d.data().ID_Carrito ?? d.id;
  const n = numero(crudo);
  return n == null ? crudo : n;
}

// Escucha en tiempo real las líneas de la cesta del usuario: lo que se agregue en la web o en la
// app llega aquí al momento. `alCambiar` recibe [{ idVariante, cantidad }]. Devuelve la función
// para dejar de escuchar.
export function escucharCarrito(perfil, alCambiar, alFallar) {
  const usuarios = variantes(perfil?.ID_User);
  if (usuarios.length === 0) return () => {};

  let dejarDetalle = () => {};
  const dejarCarrito = onSnapshot(
    query(collection(db, CARRITO), where('ID_User', 'in', usuarios)),
    (snap) => {
      dejarDetalle();
      dejarDetalle = () => {};
      // Igual que la web: se usa el primer carrito válido del usuario.
      const carrito = snap.docs.find(carritoValido);
      if (!carrito) {
        alCambiar([]);
        return;
      }
      const idCarrito = idDeCarrito(carrito);
      dejarDetalle = onSnapshot(
        query(collection(db, DETALLE), where('ID_Carrito', 'in', variantes(idCarrito).length ? variantes(idCarrito) : [idCarrito])),
        (detalle) => {
          alCambiar(
            detalle.docs
              .filter((d) => !esPlantilla(d))
              .map((d) => ({
                idVariante: d.data().ID_Variante,
                cantidad: Math.floor(Number(d.data().Cantidad ?? 0)),
              }))
              .filter((l) => l.idVariante != null && l.cantidad > 0)
          );
        },
        (error) => alFallar?.(error)
      );
    },
    (error) => alFallar?.(error)
  );

  return () => {
    dejarDetalle();
    dejarCarrito();
  };
}

const carritosEnMemoria = new Map(); // ID_User -> ID_Carrito

async function obtenerOCrearIdCarrito(perfil, crearSiNoExiste) {
  const idUser = numero(perfil?.ID_User);
  if (idUser == null) return null;
  if (carritosEnMemoria.has(idUser)) return carritosEnMemoria.get(idUser);

  const existentes = await getDocs(
    query(collection(db, CARRITO), where('ID_User', 'in', variantes(idUser)))
  );
  const valido = existentes.docs.find(carritoValido);
  if (valido) {
    const id = idDeCarrito(valido);
    carritosEnMemoria.set(idUser, id);
    return id;
  }
  if (!crearSiNoExiste) return null;

  // Siguiente ID_Carrito numérico (como la web: máximo actual + 1).
  const todos = await getDocs(collection(db, CARRITO));
  let maximo = 0;
  todos.docs.forEach((d) => {
    if (esPlantilla(d)) return;
    const n = Number(d.data().ID_Carrito ?? d.id);
    if (Number.isFinite(n) && n > maximo && n < 1000000000) maximo = n;
  });
  const nuevo = maximo + 1;
  await setDoc(doc(db, CARRITO, String(nuevo)), {
    ID_Carrito: nuevo,
    ID_User: idUser,
    Fecha_Creacion: new Date().toISOString(),
  });
  carritosEnMemoria.set(idUser, nuevo);
  return nuevo;
}

async function lineasDeVariante(idCarrito, idVariante) {
  const snap = await getDocs(
    query(collection(db, DETALLE), where('ID_Carrito', 'in', variantes(idCarrito)))
  );
  return snap.docs.filter(
    (d) => !esPlantilla(d) && String(d.data().ID_Variante) === String(idVariante)
  );
}

// Deja la cesta con `cantidad` unidades de la variante (0 o menos la quita).
export async function fijarCantidadRemota(perfil, idVariante, cantidad) {
  const idVar = numero(idVariante) ?? idVariante;
  const cant = Math.floor(Number(cantidad ?? 0));
  const idCarrito = await obtenerOCrearIdCarrito(perfil, cant > 0);
  if (idCarrito == null) return;

  const coincidentes = await lineasDeVariante(idCarrito, idVar);
  if (cant <= 0) {
    await Promise.all(coincidentes.map((d) => deleteDoc(d.ref)));
    return;
  }

  const ahora = new Date().toISOString();
  if (coincidentes.length > 0) {
    const principal = coincidentes[0];
    await updateDoc(principal.ref, {
      ID_Carrito: idCarrito,
      ID_Variante: idVar,
      Cantidad: cant,
      Fecha_agregado: principal.data().Fecha_agregado || ahora,
    });
    await Promise.all(coincidentes.slice(1).map((d) => deleteDoc(d.ref)));
  } else {
    const idDetalle = `${idCarrito}_${idVar}`;
    const idDetalleNumero = Number(`${idCarrito}${idVar}`);
    await setDoc(doc(db, DETALLE, idDetalle), {
      ID_CarritoDetalle: Number.isFinite(idDetalleNumero) ? idDetalleNumero : idDetalle,
      ID_Carrito: idCarrito,
      ID_Variante: idVar,
      Cantidad: cant,
      Fecha_agregado: ahora,
    });
  }
}

// Vacía la cesta del usuario (después de una compra).
export async function vaciarCarritoRemoto(perfil) {
  const idCarrito = await obtenerOCrearIdCarrito(perfil, false);
  if (idCarrito == null) return;
  const snap = await getDocs(
    query(collection(db, DETALLE), where('ID_Carrito', 'in', variantes(idCarrito)))
  );
  await Promise.all(snap.docs.filter((d) => !esPlantilla(d)).map((d) => deleteDoc(d.ref)));
}
