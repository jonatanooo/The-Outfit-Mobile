import { db } from './firebaseClient';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Obtiene los productos de nuevos ingresos directamente desde Firestore.
 * Cruza las colecciones 'Productos', 'Fotos_Productos' y 'Variante_Producto'
 * para obtener la información completa (Nombre, URL de Imagen real y Precio).
 */
export async function obtenerNuevosIngresos() {
  try {
    const [prodSnap, fotosSnap, varSnap] = await Promise.all([
      getDocs(collection(db, 'Productos')),
      getDocs(collection(db, 'Fotos_Productos')),
      getDocs(collection(db, 'Variante_Producto')),
    ]);

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
    varSnap.docs.forEach((d) => {
      const v = d.data();
      const pid = String(v.ID_Producto);
      const precio = v.Precio_Oferta ?? v.Precio_Actual;
      if (precio != null) {
        const val = Number(precio);
        if (!preciosMap[pid] || val < preciosMap[pid]) {
          preciosMap[pid] = val;
        }
      }
    });

    // Ensamblar productos
    const productos = [];
    prodSnap.docs.forEach((d) => {
      const p = d.data();
      const pid = String(p.ID_Producto ?? d.id);

      // Si el estado es 2 (inactivo), omitir
      if (Number(p.ID_EstadoProducto) === 2) return;

      const fotos = fotosMap[pid] || [];
      fotos.sort((a, b) => (Number(a.Orden) ?? 0) - (Number(b.Orden) ?? 0));
      const imagenUrl = fotos[0]?.URL_Foto || p.URL_Foto || p.imagen || null;
      const precio = preciosMap[pid] ?? (Number(p.Precio ?? p.precio) || 30.99);

      productos.push({
        id: pid,
        nombre: p.Nombre_Producto || p.nombre || 'Prenda The Outfit',
        precio: precio,
        imagen: imagenUrl,
        enOferta: Boolean(p.Tiene_Descuento || p.enOferta),
        porcentajeDescuento: Number(p.Porcentaje_Descuento || 0),
      });
    });

    return productos;
  } catch (error) {
    console.error('Error al obtener nuevos ingresos de Firebase:', error);
    return [];
  }
}

