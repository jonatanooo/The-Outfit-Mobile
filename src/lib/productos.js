import { db } from './firebaseClient';
import { collection, getDocs } from 'firebase/firestore';

export const ID_CATEGORIA_MUJER = 56;
export const ID_CATEGORIA_HOMBRE = 57;

/**
 * Obtiene los productos de nuevos ingresos directamente desde Firestore
 * con fotos completas, tallas disponibles, cálculo de descuentos y clasificación por género.
 */
export async function obtenerNuevosIngresosPorGenero() {
  try {
    const [catSnap, prodSnap, fotosSnap, varSnap, tallaSnap, tiposTallaSnap] = await Promise.all([
      getDocs(collection(db, 'Categorias_Producto')),
      getDocs(collection(db, 'Productos')),
      getDocs(collection(db, 'Fotos_Productos')),
      getDocs(collection(db, 'Variante_Producto')),
      getDocs(collection(db, 'Talla')),
      getDocs(collection(db, 'Tipos_Talla')),
    ]);

    // 1. Mapear CategoriaPadre por ID_Categoria
    const catPadreMap = {};
    catSnap.docs.forEach((d) => {
      const data = d.data();
      const id = data.ID_categoria ?? d.id;
      const padre = data.ID_CategoriaPadre || id;
      catPadreMap[id] = padre;
      catPadreMap[String(id)] = padre;
    });

    // 2. Mapear Tipos_Talla (ej. 'S', 'M', 'L', 'XL')
    const tiposTallaMap = {};
    tiposTallaSnap.docs.forEach((d) => {
      const data = d.data();
      const id = data.ID_TipoTalla ?? d.id;
      tiposTallaMap[id] = data.Nombre_TipoTalla;
      tiposTallaMap[String(id)] = data.Nombre_TipoTalla;
    });

    // 3. Mapear Talla a Nombre_TipoTalla
    const tallaMap = {};
    tallaSnap.docs.forEach((d) => {
      const data = d.data();
      const id = data.ID_Talla ?? d.id;
      const nombre = tiposTallaMap[data.ID_TipoTalla] || null;
      tallaMap[id] = nombre;
      tallaMap[String(id)] = nombre;
    });

    // 4. Indexar fotos por ID_Producto
    const fotosMap = {};
    fotosSnap.docs.forEach((d) => {
      const f = d.data();
      const pid = String(f.ID_Producto);
      if (!fotosMap[pid]) fotosMap[pid] = [];
      fotosMap[pid].push(f);
    });
    Object.keys(fotosMap).forEach((pid) => {
      fotosMap[pid].sort((a, b) => (Number(a.Orden) ?? 0) - (Number(b.Orden) ?? 0));
    });

    // 5. Indexar Variantes: Tallas disponibles y precios por ID_Producto
    const tallasPorProducto = {};
    const preciosPorProducto = {};
    varSnap.docs.forEach((doc) => {
      const v = doc.data();
      const pid = String(v.ID_Producto);

      // Tallas
      if (!tallasPorProducto[pid]) tallasPorProducto[pid] = new Set();
      const nombreTalla = tallaMap[v.ID_Talla];
      if (nombreTalla) tallasPorProducto[pid].add(nombreTalla);

      // Precios y ofertas
      const precioActual = Number(v.Precio_Actual);
      const precioOferta = v.Precio_Oferta != null ? Number(v.Precio_Oferta) : null;
      const tieneDesc = Boolean(v.Tiene_Descuento || (precioOferta && precioOferta < precioActual));

      if (!preciosPorProducto[pid] || (precioOferta || precioActual) < preciosPorProducto[pid].precioFinal) {
        preciosPorProducto[pid] = {
          precioOriginal: precioActual || 30.99,
          precioFinal: tieneDesc && precioOferta ? precioOferta : (precioActual || 30.99),
          enOferta: tieneDesc,
          porcentajeDescuento: Number(v.Porcentaje_Descuento || 0),
        };
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

      // Fotos del producto
      const fotosUrls = (fotosMap[pid] || []).map((f) => f.URL_Foto).filter(Boolean);
      if (fotosUrls.length === 0 && (p.URL_Foto || p.imagen)) {
        fotosUrls.push(p.URL_Foto || p.imagen);
      }
      const imagenPrincipal = fotosUrls[0] || null;

      // Cálculo de precio y descuento
      const precioInfo = preciosPorProducto[pid] || {
        precioOriginal: Number(p.Precio ?? p.precio) || 30.99,
        precioFinal: Number(p.Precio ?? p.precio) || 30.99,
        enOferta: Boolean(p.Tiene_Descuento),
        porcentajeDescuento: Number(p.Porcentaje_Descuento || 0),
      };

      const tieneOferta = Boolean(p.Tiene_Descuento || precioInfo.enOferta);
      const pctDesc = Number(p.Porcentaje_Descuento || precioInfo.porcentajeDescuento || (tieneOferta ? 20 : 0));
      const precioOriginal = precioInfo.precioOriginal || Number(p.Precio ?? p.precio) || 30.99;
      let precioFinal = tieneOferta
        ? (precioInfo.precioFinal < precioOriginal ? precioInfo.precioFinal : +(precioOriginal * (1 - pctDesc / 100)).toFixed(2))
        : precioOriginal;

      // Tallas ordenadas
      let tallas = tallasPorProducto[pid] ? Array.from(tallasPorProducto[pid]) : [];
      if (tallas.length === 0) {
        tallas = ['S', 'M', 'L', 'XL'];
      }
      const ordenTallas = { 'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6 };
      tallas.sort((a, b) => (ordenTallas[a] || 99) - (ordenTallas[b] || 99));

      const item = {
        id: pid,
        nombre: p.Nombre_Producto || p.nombre || 'Prenda The Outfit',
        descripcion: p.Descripcion || 'Prenda exclusiva con un diseño moderno, cómodo y versátil confeccionado con los mejores materiales.',
        precio: precioFinal,
        precioOriginal: precioOriginal,
        enOferta: tieneOferta,
        porcentajeDescuento: pctDesc,
        imagen: imagenPrincipal,
        fotos: fotosUrls.length > 0 ? fotosUrls : (imagenPrincipal ? [imagenPrincipal] : []),
        tallas: tallas,
        idGenero: idPadre,
        referencia: p.Referencia || String(pid).padStart(9, '7'),
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
