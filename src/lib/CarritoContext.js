import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { redondear } from './tienda';

const CLAVE_STORAGE = 'theoutfit.carrito.v1';

const CarritoContext = createContext(null);

// Elige la variante a comprar para una talla: la de mayor stock (o la primera si todas están agotadas).
export function elegirVariante(producto, talla) {
  const candidatas = (producto?.variantes || []).filter((v) => v.talla === talla);
  if (candidatas.length === 0) return null;
  return [...candidatas].sort((a, b) => b.stock - a.stock)[0];
}

function itemValido(i) {
  return i && i.idVariante != null && Number(i.cantidad) > 0 && Number.isFinite(Number(i.precio));
}

export function CarritoProvider({ children }) {
  const [items, setItems] = useState([]);
  const [cargado, setCargado] = useState(false);
  const itemsRef = useRef([]);
  // Con sesión, la cesta se guarda también en Firestore (la comparte con la web). La pantalla que
  // conoce al usuario registra aquí la función que escribe cada cambio.
  const sincronizadorRef = useRef(null);

  const aplicar = useCallback((nuevos) => {
    itemsRef.current = nuevos;
    setItems(nuevos);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_STORAGE)
      .then((raw) => {
        if (!raw) return;
        const datos = JSON.parse(raw);
        if (Array.isArray(datos)) aplicar(datos.filter(itemValido));
      })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, [aplicar]);

  useEffect(() => {
    if (cargado) AsyncStorage.setItem(CLAVE_STORAGE, JSON.stringify(items)).catch(() => {});
  }, [items, cargado]);

  // Devuelve { ok, mensaje } para que la pantalla informe al usuario.
  const agregar = useCallback(
    (producto, variante, cantidad = 1) => {
      if (!producto || !variante) return { ok: false, mensaje: 'Esta prenda no está disponible por ahora.' };
      if (!(variante.stock > 0)) return { ok: false, mensaje: 'Esta talla está agotada.' };

      const actual = itemsRef.current;
      const existente = actual.find((i) => String(i.idVariante) === String(variante.id));
      const nuevaCantidad = (existente?.cantidad || 0) + cantidad;
      if (nuevaCantidad > variante.stock) {
        return { ok: false, mensaje: `Solo hay ${variante.stock} unidades disponibles de esta talla.` };
      }

      sincronizadorRef.current?.({ tipo: 'fijar', idVariante: variante.id, cantidad: nuevaCantidad });
      if (existente) {
        aplicar(actual.map((i) => (i === existente ? { ...i, cantidad: nuevaCantidad } : i)));
      } else {
        aplicar([
          ...actual,
          {
            idVariante: variante.id,
            idProducto: producto.id,
            idGenero: producto.idGenero,
            nombre: producto.nombre,
            imagen: producto.imagen,
            talla: variante.talla,
            color: variante.color || '',
            precio: variante.precio,
            precioOriginal: variante.precioOriginal,
            enOferta: variante.enOferta,
            porcentajeDescuento: variante.porcentajeDescuento,
            stockDisponible: variante.stock,
            cantidad,
          },
        ]);
      }
      return { ok: true, mensaje: '' };
    },
    [aplicar]
  );

  // Cantidad 0 (o menos) quita la prenda. Devuelve { ok, mensaje } si supera el stock.
  const cambiarCantidad = useCallback(
    (idVariante, cantidad) => {
      const actual = itemsRef.current;
      const item = actual.find((i) => String(i.idVariante) === String(idVariante));
      if (!item) return { ok: false, mensaje: '' };
      if (cantidad <= 0) {
        aplicar(actual.filter((i) => i !== item));
        sincronizadorRef.current?.({ tipo: 'fijar', idVariante, cantidad: 0 });
        return { ok: true, mensaje: '' };
      }
      if (item.stockDisponible != null && cantidad > item.stockDisponible) {
        return { ok: false, mensaje: `Solo hay ${item.stockDisponible} unidades disponibles de esta talla.` };
      }
      aplicar(actual.map((i) => (i === item ? { ...i, cantidad } : i)));
      sincronizadorRef.current?.({ tipo: 'fijar', idVariante, cantidad });
      return { ok: true, mensaje: '' };
    },
    [aplicar]
  );

  const vaciar = useCallback(() => {
    aplicar([]);
    sincronizadorRef.current?.({ tipo: 'vaciar' });
  }, [aplicar]);

  // Registra (o quita, con null) la función que guarda los cambios de la cesta en Firestore.
  const registrarSincronizador = useCallback((funcion) => {
    sincronizadorRef.current = funcion;
  }, []);

  // Reemplaza la cesta con lo que llega de Firestore. No vuelve a escribir en Firestore.
  const reemplazarItems = useCallback((nuevos) => aplicar((nuevos || []).filter(itemValido)), [aplicar]);

  // Pone al día los artículos de la cesta con los datos vigentes de cada variante:
  // lista de { idVariante, precio, precioOriginal, enOferta, porcentajeDescuento, stock? }.
  // Así la cesta nunca muestra el precio de una oferta que ya venció. Solo cambia (y vuelve a
  // dibujar) si algún dato es distinto.
  // Con { quitarAusentes: true } (cuando `vigentes` es el catálogo completo) se quitan las prendas que ya
  // no existen o se agotaron, como hace la web con su cesta.
  const actualizarPrecios = useCallback(
    (vigentes, { quitarAusentes = false } = {}) => {
      if (!Array.isArray(vigentes) || vigentes.length === 0) return;
      const porVariante = new Map(vigentes.map((v) => [String(v.idVariante), v]));
      let hayCambios = false;
      const conservados = quitarAusentes
        ? itemsRef.current.filter((item) => {
            const v = porVariante.get(String(item.idVariante));
            return v && !(v.stock != null && !(v.stock > 0));
          })
        : itemsRef.current;
      if (conservados.length !== itemsRef.current.length) hayCambios = true;
      const nuevos = conservados.map((item) => {
        const v = porVariante.get(String(item.idVariante));
        if (!v) return item;
        const siguiente = {
          ...item,
          precio: v.precio,
          precioOriginal: v.precioOriginal,
          enOferta: v.enOferta,
          porcentajeDescuento: v.porcentajeDescuento,
          stockDisponible: v.stock != null ? v.stock : item.stockDisponible,
        };
        const distinto =
          siguiente.precio !== item.precio ||
          siguiente.precioOriginal !== item.precioOriginal ||
          siguiente.enOferta !== item.enOferta ||
          siguiente.porcentajeDescuento !== item.porcentajeDescuento ||
          siguiente.stockDisponible !== item.stockDisponible;
        if (!distinto) return item;
        hayCambios = true;
        return siguiente;
      });
      if (hayCambios) aplicar(nuevos);
    },
    [aplicar]
  );

  const valor = useMemo(() => {
    const subtotal = redondear(items.reduce((acc, i) => acc + i.precio * i.cantidad, 0));
    const subtotalOriginal = redondear(items.reduce((acc, i) => acc + (i.precioOriginal || i.precio) * i.cantidad, 0));
    return {
      items,
      cargado,
      cantidadTotal: items.reduce((acc, i) => acc + i.cantidad, 0),
      subtotal,
      subtotalOriginal,
      totalAhorro: redondear(subtotalOriginal - subtotal),
      agregar,
      cambiarCantidad,
      vaciar,
      actualizarPrecios,
      registrarSincronizador,
      reemplazarItems,
    };
  }, [items, cargado, agregar, cambiarCantidad, vaciar, actualizarPrecios, registrarSincronizador, reemplazarItems]);

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error('useCarrito debe usarse dentro de CarritoProvider');
  return ctx;
}
