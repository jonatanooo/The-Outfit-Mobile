// Winter Season: misma regla que la web (repo The-Outfit, ListadoPrendas.jsx).
// Una prenda es de Winter Season si cumple alguna de estas condiciones:
//  1. Su subcategoría se llama "winter season", "winter" o "invierno" (o lo contiene).
//  2. Su ID_Temporada es 1 (temporada inicial = Invierno), o la temporada con ese id tiene un nombre
//     que contiene "winter" o "invierno" (colección `Temporadas`).
//  3. El campo Temporada del producto contiene "winter" o "invierno".
//  4. Alguno de sus campos de colección/subcategoría lo contiene.

export const ID_TEMPORADA_INVIERNO = 1;

export function nombreEsInvierno(nombre) {
  const t = String(nombre || '').trim().toLowerCase();
  return t === 'winter season' || t === 'winter' || t === 'invierno' || t.includes('winter') || t.includes('invierno');
}

// categoria: documento de la subcategoría del producto; temporadasPorId: { [id]: documento Temporadas }
export function esWinterSeason(producto, categoria = null, temporadasPorId = {}) {
  if (!producto) return false;

  if (nombreEsInvierno(categoria?.Nombre_Categoria)) return true;

  const idTemp = producto.ID_Temporada ?? producto.ID_temporada ?? producto.idTemporada ?? null;
  if (idTemp != null) {
    if (Number(idTemp) === ID_TEMPORADA_INVIERNO) return true;
    const temporada = temporadasPorId[idTemp] || temporadasPorId[String(idTemp)] || temporadasPorId[Number(idTemp)] || null;
    if (temporada && nombreEsInvierno(temporada.Nombre_Temporada || temporada.Nombre || temporada.Descripcion)) {
      return true;
    }
  }

  if (producto.Temporada) {
    const nombreTemporada =
      typeof producto.Temporada === 'string'
        ? producto.Temporada
        : producto.Temporada?.Nombre_Temporada || producto.Temporada?.Nombre || '';
    if (nombreEsInvierno(nombreTemporada)) return true;
  }

  const coleccion =
    producto.Coleccion ||
    producto.Nombre_Coleccion ||
    producto.Subcategoria ||
    producto.Nombre_Subcategoria ||
    producto.Temporada_Nombre ||
    '';
  return nombreEsInvierno(coleccion);
}
