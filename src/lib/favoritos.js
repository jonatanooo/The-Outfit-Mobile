// Favoritos sincronizados con la web: colección `Favoritos` de Firestore, un documento por
// prenda marcada, con los campos ID_User (número del usuario) e ID_Producto (número de la prenda).
// La web los lee por esos dos campos, así que aquí también se busca por ellos y no por el id del
// documento (que puede ser distinto según quién lo creó).

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseClient';

const COLECCION = 'Favoritos';

// Valores con los que puede estar guardado un id numérico (número o texto).
function variantes(valor) {
  const n = Number(valor);
  if (valor == null || valor === '' || !Number.isFinite(n)) return [];
  return [n, String(n)];
}

export function idUsuarioFavoritos(perfil) {
  const n = Number(perfil?.ID_User);
  return Number.isFinite(n) ? n : null;
}

function consultaDeUsuario(perfil) {
  const opciones = variantes(perfil?.ID_User);
  if (opciones.length === 0) return null;
  return query(collection(db, COLECCION), where('ID_User', 'in', opciones));
}

// Escucha en tiempo real los favoritos del usuario: lo que se marque en la web o en la app
// llega aquí al momento. Devuelve la función para dejar de escuchar.
// `alCambiar` recibe un Set con los id de producto (en texto).
export function escucharFavoritos(perfil, alCambiar, alFallar) {
  const consulta = consultaDeUsuario(perfil);
  if (!consulta) return () => {};
  return onSnapshot(
    consulta,
    (snap) => {
      const ids = new Set(
        snap.docs.map((d) => d.data().ID_Producto).filter((v) => v != null).map(String)
      );
      alCambiar(ids);
    },
    (error) => alFallar?.(error)
  );
}

async function documentosDe(perfil, idProducto) {
  const usuarios = variantes(perfil?.ID_User);
  const productos = variantes(idProducto);
  if (usuarios.length === 0 || productos.length === 0) return [];
  const snap = await getDocs(
    query(
      collection(db, COLECCION),
      where('ID_User', 'in', usuarios),
      where('ID_Producto', 'in', productos)
    )
  );
  return snap.docs;
}

// Marca una prenda como favorita (si ya lo estaba, no hace nada).
export async function agregarFavorito(perfil, idProducto) {
  const idUser = idUsuarioFavoritos(perfil);
  const idProd = Number(idProducto);
  if (idUser == null || !Number.isFinite(idProd)) return;
  const existentes = await documentosDe(perfil, idProd);
  if (existentes.length > 0) return;
  await setDoc(doc(db, COLECCION, `${idUser}_${idProd}`), {
    ID_User: idUser,
    ID_Producto: idProd,
    Fecha_Creacion: new Date().toISOString(),
  });
}

// Quita la prenda de favoritos (borra todos los documentos de ese usuario y esa prenda).
export async function quitarFavorito(perfil, idProducto) {
  const existentes = await documentosDe(perfil, idProducto);
  await Promise.all(existentes.map((d) => deleteDoc(d.ref)));
}
