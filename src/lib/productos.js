import { db } from './firebaseClient';
import { collection, getDocs } from 'firebase/firestore';

export const ID_CATEGORIA_MUJER = 56;
export const ID_CATEGORIA_HOMBRE = 57;

/**
 * Obtiene los productos de nuevos ingresos directamente desde Firestore
 * y los clasifica en 2 listas: ropa de mujer y ropa de hombre.
 */
export async function obtenerNuevosIngresosPorGenero() {
  try {
    const [catSnap, prodSnap, fotosSnap, varSnap] = await Promise.all([
      getDocs(collection(db, 'Categorias_Producto')),
      getDocs(collection(db, 'Productos')),
      getDocs(collection(db, 'Fotos_Productos')),
      getDocs(collection(db, 'Variante_Producto')),
    ]);

    // Indexar CategoriaPadre por ID_Categoria
    const catPadreMap = {};
    catSnap.docs.forEach((d) => {
      const data = d.data();
      const id = data.ID_categoria ?? d.id;
      const padre = data.ID_CategoriaPadre || id;
      catPadreMap[id] = padre;
      catPadreMap[String(id)] = padre;
    });

    // Indexar fotos por ID_Producto
    const fotosMap = {};
    fotosSnap.docs.forEach((d) => {
      const f = d.data();
      const pid = String(f.ID_Producto);
      if (!fotosMap[pid]) fotosMap[pid] = [];
      fotosMap[pid].push(f);
    });

    // Indexar precios por ID_Producto
    const preciosMap = {};
    varSnap.docs.forEach((doc) => {
      const v = doc.data();
      const pid = String(v.ID_Producto);
      const precio = v.Precio_Oferta ?? v.Precio_Actual;
      if (precio != null) {
        const val = Number(precio);
        if (!preciosMap[pid] || val < preciosMap[pid]) {
          preciosMap[pid] = val;
        }
      }
    });

    const mujer = [];
    const hombre = [];

    prodSnap.docs.forEach((doc) => {
      const p = doc.data();
      const pid = String(p.ID_Producto ?? doc.id);

      // Omitir inactivos
      if (Number(p.ID_EstadoProducto) === 2) return;

      const catId = p.ID_Categoria ?? p.ID_categoria;
      const idPadre = Number(catPadreMap[catId] ?? catId);

      const fotos = fotosMap[pid] || [];
      fotos.sort((a, b) => (Number(a.Orden) ?? 0) - (Number(b.Orden) ?? 0));
      const imagenUrl = fotos[0]?.URL_Foto || p.URL_Foto || p.imagen || null;
      const precio = preciosMap[pid] ?? (Number(p.Precio ?? p.precio) || 30.99);

      const item = {
        id: pid,
        nombre: p.Nombre_Producto || p.nombre || 'Prenda The Outfit',
        precio: precio,
        imagen: imagenUrl,
        enOferta: Boolean(p.Tiene_Descuento || p.enOferta),
        porcentajeDescuento: Number(p.Porcentaje_Descuento || 0),
        idGenero: idPadre,
      };

      if (idPadre === ID_CATEGORIA_MUJER) {
        mujer.push(item);
      } else if (idPadre === ID_CATEGORIA_HOMBRE) {
        hombre.push(item);
      }
    });

    return { mujer, hombre };
  } catch (error) {
    console.error('Error al obtener nuevos ingresos por género:', error);
    return { mujer: [], hombre: [] };
  }
}

/**
 * Obtiene todos los productos de nuevos ingresos juntos (compatibilidad)
 */
export async function obtenerNuevosIngresos() {
  const { mujer, hombre } = await obtenerNuevosIngresosPorGenero();
  return [...mujer, ...hombre];
}
