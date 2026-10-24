
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';

export async function cargarCategoriasCatalogo() {
  const [categoriasSnap, productosSnap] = await Promise.all([
    getDocs(collection(db, 'Categorias_Producto')),
    getDocs(collection(db, 'Productos')),
  ]);

  const categoriasPorId = new Map();
  const nombresMujer = new Set();
  const nombresHombre = new Set();

  // Obtener las subcategorías reales
  categoriasSnap.docs.forEach((doc) => {
    const categoria = doc.data();

    const id = String(
      categoria.ID_categoria ?? categoria.ID_Categoria ?? doc.id
    );

    const padre = String(categoria.ID_CategoriaPadre ?? '');
    const nombre = String(
      categoria.Nombre_Categoria ?? ''
    ).trim();

    if (!nombre || (padre !== '56' && padre !== '57')) {
      return;
    }

    categoriasPorId.set(id, { nombre, padre });

    if (padre === '56') nombresMujer.add(nombre);
    if (padre === '57') nombresHombre.add(nombre);
  });

  // Relacionar productos con sus categorías
  const categoriaPorProducto = {};

  // Guardar las fechas para ordenar por "Más nuevo"
  const fechaPorProducto = {};

  productosSnap.docs.forEach((doc) => {
    const producto = doc.data();

    if (Number(producto.ID_EstadoProducto) === 2) {
      return;
    }

    // Primero obtener el identificador del producto
    const idProducto = String(
      producto.ID_Producto ?? doc.id
    );

    // Recuperar la fecha de creación
    const fechaOriginal = producto.Fecha_Creacion;

    let fecha = NaN;

    // Fecha como Timestamp de Firestore
    if (typeof fechaOriginal?.toMillis === 'function') {
      fecha = fechaOriginal.toMillis();
    }

    // Fecha como objeto Date
    else if (fechaOriginal instanceof Date) {
      fecha = fechaOriginal.getTime();
    }

    // Fecha como texto o número
    else if (
      typeof fechaOriginal === 'string' ||
      typeof fechaOriginal === 'number'
    ) {
      fecha = new Date(fechaOriginal).getTime();
    }

    // Guardar solo fechas válidas
    if (Number.isFinite(fecha)) {
      fechaPorProducto[idProducto] = fecha;
    }

    // Obtener la categoría del producto
    const idCategoria = String(
      producto.ID_Categoria ?? producto.ID_categoria ?? ''
    );

    const categoria = categoriasPorId.get(idCategoria);

    if (categoria) {
      categoriaPorProducto[idProducto] = categoria.nombre;
    }
  });

  return {
    categoriaPorProducto,
    fechaPorProducto,
    categoriasPorGenero: {
      mujer: [...nombresMujer].sort(),
      hombre: [...nombresHombre].sort(),
    },
  };
}
