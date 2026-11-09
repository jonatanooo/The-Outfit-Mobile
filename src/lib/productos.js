import { db } from './firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import { calcularPrecioConDescuento, esOfertaActiva, precioDeVariante } from './descuentos';
import { esWinterSeason } from './temporadas';

export const ID_CATEGORIA_MUJER = 56;
export const ID_CATEGORIA_HOMBRE = 57;

// Precio vigente de una variante: misma regla que la web (ver descuentos.js). `producto` son los
// datos del documento Productos, porque la oferta puede estar en la variante o en el producto.
export function calcularPrecioVariante(v, producto = null, ahora = Date.now()) {
  return precioDeVariante(v, producto, ahora);
}

/**
 * Obtiene los productos de nuevos ingresos directamente desde Firestore
 * con fotos completas, tallas disponibles, cálculo de descuentos y clasificación por género.
 */
export async function obtenerNuevosIngresosPorGenero() {
  try {
    const [catSnap, prodSnap, fotosSnap, varSnap, tallaSnap, tiposTallaSnap, invSnap, colorSnap, tempSnap] = await Promise.all([
      getDocs(collection(db, 'Categorias_Producto')),
      getDocs(collection(db, 'Productos')),
      getDocs(collection(db, 'Fotos_Productos')),
      getDocs(collection(db, 'Variante_Producto')),
      getDocs(collection(db, 'Talla')),
      getDocs(collection(db, 'Tipos_Talla')),
      getDocs(collection(db, 'Inventario')),
      getDocs(collection(db, 'Colores')),
      // Como la web: si no se puede leer (sin sesión), se sigue sin los nombres de temporada.
      getDocs(collection(db, 'Temporadas')).catch(() => ({ docs: [] })),
    ]);

    // Stock por variante y nombre de color (para poder añadir una variante concreta al carrito)
    const stockPorVariante = {};
    invSnap.docs.forEach((d) => {
      const inv = d.data();
      stockPorVariante[String(inv.ID_Variante)] =
        (stockPorVariante[String(inv.ID_Variante)] || 0) + Number(inv.Cantidad_Disponible || 0);
    });
    const colorMap = {};
    const colorHexMap = {}; // código hexadecimal del color (Codigo_Hex), para mostrarlo en el filtro
    colorSnap.docs.forEach((d) => {
      const c = d.data();
      if (c.Nombre_Color) colorMap[String(c.ID_Color ?? d.id)] = c.Nombre_Color;
      if (c.Nombre_Color && /^#[0-9a-fA-F]{3,8}$/.test(String(c.Codigo_Hex || '').trim())) {
        colorHexMap[String(c.ID_Color ?? d.id)] = String(c.Codigo_Hex).trim();
      }
    });

    // Temporadas por id (para reconocer Winter Season por su nombre, como la web)
    const temporadasPorId = {};
    tempSnap.docs.forEach((d) => {
      const data = d.data();
      const id = data.ID_Temporada ?? d.id;
      temporadasPorId[id] = data;
      temporadasPorId[String(id)] = data;
    });

    // 1. Mapear CategoriaPadre por ID_Categoria
    const catPadreMap = {};
    const catPorId = {};
    catSnap.docs.forEach((d) => {
      const data = d.data();
      const id = data.ID_categoria ?? d.id;
      catPorId[String(id)] = data;
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
    const productoPorId = {};
    prodSnap.docs.forEach((d) => {
      const dato = d.data();
      productoPorId[String(dato.ID_Producto ?? d.id)] = dato;
    });
    const tallasPorProducto = {};
    const variantesRawPorProducto = {};
    const variantesPorProducto = {};
    varSnap.docs.forEach((doc) => {
      const v = doc.data();
      const pid = String(v.ID_Producto);

      // Tallas disponibles (descartar valores nulos, vacíos o que representen 'única'/'talla única')
      const rawTalla = tallaMap[v.ID_Talla] || v.Talla || v.talla || null;
      const esTallaInvalida =
        !rawTalla ||
        /^(única|unica|talla\s*única|talla\s*unica)$/i.test(String(rawTalla).trim());
      const nombreTalla = esTallaInvalida ? null : String(rawTalla).trim();

      if (nombreTalla) {
        if (!tallasPorProducto[pid]) tallasPorProducto[pid] = new Set();
        tallasPorProducto[pid].add(nombreTalla);
      }

      // Variantes comprables (talla/color/precio/stock)
      const idVariante = v.ID_Variante ?? doc.id;
      if (!variantesPorProducto[pid]) variantesPorProducto[pid] = [];
      variantesPorProducto[pid].push({
        id: idVariante,
        talla: nombreTalla,
        color: v.ID_Color != null ? colorMap[String(v.ID_Color)] || '' : '',
        colorHex: v.ID_Color != null ? colorHexMap[String(v.ID_Color)] || null : null,
        stock: stockPorVariante[String(idVariante)] ?? 0,
        ...calcularPrecioVariante(v, productoPorId[pid]),
      });

      (variantesRawPorProducto[pid] ||= []).push(v);
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

      // Precio de la tarjeta (igual que el listado de la web): el precio base más bajo de sus
      // variantes y, si el producto o alguna variante tiene oferta vigente, con su descuento.
      const variantesRaw = variantesRawPorProducto[pid] || [];
      const preciosBase = variantesRaw.map((v) => Number(v.Precio_Actual)).filter((n) => n > 0);
      const precioOriginal = preciosBase.length
        ? Math.min(...preciosBase)
        : Number(p.Precio_Base ?? p.Precio ?? p.precio) || 0;
      const varianteEnOferta = variantesRaw.find((v) => esOfertaActiva(v));
      const tieneOferta = esOfertaActiva(p) || Boolean(varianteEnOferta);
      const pctDesc = tieneOferta
        ? Number(p.Porcentaje_Descuento ?? varianteEnOferta?.Porcentaje_Descuento ?? 0)
        : 0;
      const precioFinal = tieneOferta
        ? calcularPrecioConDescuento(precioOriginal, pctDesc)
        : precioOriginal;

      // Tallas ordenadas (sin fallbacks ficticios ni tallas únicas)
      let tallas = tallasPorProducto[pid]
        ? Array.from(tallasPorProducto[pid]).filter(
            (t) => t && !/^(única|unica|talla\s*única|talla\s*unica)$/i.test(String(t).trim())
          )
        : [];
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
        variantes: variantesPorProducto[pid] || [],
        idGenero: idPadre,
        idTemporada: p.ID_Temporada != null ? Number(p.ID_Temporada) : null,
        esWinterSeason: esWinterSeason(p, catPorId[String(catId)], temporadasPorId),
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
