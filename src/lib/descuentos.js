// Ofertas y descuentos: misma regla que la web (repo The-Outfit, src/lib/descuentos.js), para que
// la app y la web muestren y cobren el mismo precio.

// Una oferta es VIGENTE si: el porcentaje está entre 1 y 100, está activa (Activo o
// Tiene_Descuento verdadero) y tiene Fecha_Fin_Oferta en el futuro. Sin fecha de fin no es oferta.
export function esOfertaVigente(item, ahora = Date.now()) {
  if (!item) return false;

  const porcentaje = Number(
    item.Porcentaje_Descuento ??
      item.porcentajeDescuento ??
      item.porcentaje ??
      item.Productos?.Porcentaje_Descuento ??
      0
  );
  if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100) return false;

  const rawActivo =
    item.Activo ??
    item.activo ??
    item.Tiene_Descuento ??
    item.tieneDescuento ??
    item.Productos?.Activo ??
    item.Productos?.Tiene_Descuento;
  const esActivo = rawActivo === 1 || rawActivo === true || rawActivo === '1';
  if (!esActivo) return false;

  const fechaFin =
    item.Fecha_Fin_Oferta ??
    item.Fecha_Fin ??
    item.fechaFinOferta ??
    item.Productos?.Fecha_Fin_Oferta ??
    null;
  if (!fechaFin) return false;

  const tFin = new Date(fechaFin).getTime();
  if (isNaN(tFin) || tFin <= ahora) return false;

  return true;
}

// Oferta vigente que además ya empezó (con 1 minuto de margen por diferencias de reloj).
export function esOfertaActiva(item, ahora = Date.now()) {
  if (!esOfertaVigente(item, ahora)) return false;

  const fechaInicio =
    item.Fecha_Inicio_Oferta ??
    item.Fecha_Inicio ??
    item.fechaInicioOferta ??
    item.Productos?.Fecha_Inicio_Oferta ??
    null;

  if (fechaInicio) {
    const tInicio = new Date(fechaInicio).getTime();
    if (!isNaN(tInicio) && ahora + 60000 < tInicio) return false;
  }

  return true;
}

// Precio con descuento: base × (1 − %), redondeado a 2 decimales.
export function calcularPrecioConDescuento(precioOriginal, porcentaje) {
  const pBase = Number(precioOriginal ?? 0);
  const desc = Number(porcentaje ?? 0);
  if (isNaN(pBase) || pBase <= 0) return 0;
  if (isNaN(desc) || desc <= 0) return pBase;
  const precioFinal = pBase * (1 - Math.min(desc, 100) / 100);
  return Math.round(precioFinal * 100) / 100;
}

// Precio de una variante a partir de sus datos y los de su producto. Primero cuenta la oferta de
// la variante y, si no tiene, la del producto (igual que la cesta y el pago de la web).
export function precioDeVariante(variante, producto = null, ahora = Date.now()) {
  const precioOriginal = Number(
    variante?.Precio_Actual ?? producto?.Precio_Base ?? producto?.Precio ?? 0
  );
  let enOferta = false;
  let porcentaje = 0;
  if (esOfertaActiva(variante, ahora)) {
    enOferta = true;
    porcentaje = Number(variante.Porcentaje_Descuento ?? 0);
  } else if (producto && esOfertaActiva(producto, ahora)) {
    enOferta = true;
    porcentaje = Number(producto.Porcentaje_Descuento ?? 0);
  }
  const precio = enOferta ? calcularPrecioConDescuento(precioOriginal, porcentaje) : precioOriginal;
  return {
    precioOriginal,
    precio,
    enOferta,
    porcentajeDescuento: enOferta ? porcentaje : 0,
  };
}
