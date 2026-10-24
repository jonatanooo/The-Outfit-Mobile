import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatoPrecio } from '../../lib/tienda';

export const FONT = 'Instrument Sans SemiBold';
export const NEGRO = '#000000';
export const ROJO = '#E02424';
export const VERDE = '#16A34A';

export function Encabezado({ titulo = 'PROCESO DE COMPRA', subtitulo }) {
  return (
    <View>
      <View style={ui.encabezado}>
        <Text style={ui.encabezadoTitulo}>{titulo}</Text>
      </View>
      {!!subtitulo && (
        <View style={ui.subencabezado}>
          <Text style={ui.subencabezadoTexto}>{subtitulo}</Text>
        </View>
      )}
    </View>
  );
}

// Fila de prenda: miniatura, nombre, "$35.99 x 1" y "TALLA S MARRÓN".
export function ListaPrendas({ items }) {
  return (
    <View style={ui.prendas}>
      {items.map((item) => (
        <View key={String(item.idVariante)} style={ui.prendaFila}>
          <View style={ui.prendaMiniatura}>
            {item.imagen ? <Image source={{ uri: item.imagen }} style={ui.prendaImagen} resizeMode="cover" /> : null}
          </View>
          <View style={ui.prendaTextos}>
            <View style={ui.prendaNombreFila}>
              <Text style={[ui.prendaNombre, ui.prendaNombreFlex]} numberOfLines={2}>
                {item.nombre.toUpperCase()}
              </Text>
              {item.enOferta && item.porcentajeDescuento > 0 && (
                <View style={ui.etiquetaDescuento}>
                  <Text style={ui.etiquetaDescuentoTexto}>-{item.porcentajeDescuento}%</Text>
                </View>
              )}
            </View>
            <Text style={ui.prendaPrecio}>
              {item.enOferta && item.precioOriginal > item.precio ? (
                <Text style={ui.precioTachado}>{formatoPrecio(item.precioOriginal)} </Text>
              ) : null}
              {formatoPrecio(item.precio)} x {item.cantidad}
            </Text>
            <Text style={ui.prendaTalla}>
              TALLA {item.talla}
              {item.color ? ` ${item.color.toUpperCase()}` : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// subtotalOriginal y ahorro son opcionales: si hay ahorro se muestra el descuento por separado.
export function Totales({ subtotal, subtotalOriginal, ahorro = 0, envio, total }) {
  const hayDescuento = ahorro > 0 && subtotalOriginal > subtotal;
  return (
    <View style={ui.totales}>
      <View style={ui.totalLinea} />
      <View style={ui.totalFila}>
        <Text style={ui.totalEtiqueta}>SUBTOTAL</Text>
        <Text style={ui.totalValor}>{formatoPrecio(hayDescuento ? subtotalOriginal : subtotal)}</Text>
      </View>
      {hayDescuento && (
        <View style={ui.totalFila}>
          <Text style={ui.totalEtiqueta}>DESCUENTO</Text>
          <Text style={[ui.totalValor, ui.valorDescuento]}>-{formatoPrecio(ahorro)}</Text>
        </View>
      )}
      <View style={ui.totalFila}>
        <Text style={ui.totalEtiqueta}>GASTOS DE ENVÍO</Text>
        <Text style={ui.totalValor}>{envio > 0 ? formatoPrecio(envio) : 'GRATIS'}</Text>
      </View>
      <View style={ui.totalLinea} />
      <View style={ui.totalFila}>
        <Text style={ui.totalEtiqueta}>TOTAL (IVA INCLUIDO)</Text>
        <Text style={ui.totalValor}>{formatoPrecio(total)}</Text>
      </View>
    </View>
  );
}

// ATRÁS (contorno) y SIGUIENTE / PAGAR (negro; gris si está deshabilitado).
export function BotonesNavegacion({ onAtras, onSiguiente, textoSiguiente = 'SIGUIENTE', deshabilitado, cargando }) {
  return (
    <View style={ui.botones}>
      <TouchableOpacity activeOpacity={0.8} onPress={onAtras} disabled={cargando} style={[ui.botonAtras, cargando && ui.opaco]}>
        <Ionicons name="arrow-back" size={18} color={NEGRO} />
        <Text style={ui.botonAtrasTexto}>ATRÁS</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onSiguiente}
        disabled={deshabilitado || cargando}
        style={[ui.botonSiguiente, deshabilitado && ui.botonSiguienteOff]}
      >
        {cargando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={ui.botonSiguienteTexto}>{textoSiguiente}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Campo con forma de pastilla e ícono a la izquierda (formularios de pago y dirección).
export function CampoPastilla({ icono, error, ancho, children }) {
  return (
    <View style={[ui.campoWrapper, ancho ? { width: ancho } : null]}>
      <View style={[ui.campo, !!error && ui.campoError]}>
        <Ionicons name={icono} size={19} color="#1A1A1A" />
        <View style={ui.campoContenido}>{children}</View>
      </View>
      {!!error && <Text style={ui.campoErrorTexto}>{error}</Text>}
    </View>
  );
}

export const ui = StyleSheet.create({
  encabezado: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#B9C3D3',
  },
  encabezadoTitulo: { fontFamily: FONT, fontSize: 20, letterSpacing: 3, color: NEGRO },
  subencabezado: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  subencabezadoTexto: { fontFamily: FONT, fontSize: 13, letterSpacing: 1.5, color: NEGRO },

  prendas: { paddingHorizontal: 20, marginTop: 18 },
  prendaFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  prendaMiniatura: {
    width: 58,
    height: 58,
    borderRadius: 6,
    backgroundColor: '#F2F2F2',
    overflow: 'hidden',
    marginRight: 16,
  },
  prendaImagen: { width: '100%', height: '100%' },
  prendaTextos: { flex: 1 },
  prendaNombre: { fontFamily: FONT, fontSize: 13, letterSpacing: 0.3, color: NEGRO },
  prendaNombreFila: { flexDirection: 'row', alignItems: 'flex-start' },
  prendaNombreFlex: { flex: 1 },
  etiquetaDescuento: { backgroundColor: NEGRO, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, marginLeft: 8 },
  etiquetaDescuentoTexto: { fontFamily: FONT, fontSize: 10, letterSpacing: 0.5, color: '#FFFFFF' },
  prendaPrecio: { fontFamily: FONT, fontSize: 13, color: '#1A1A1A', marginTop: 3 },
  precioTachado: { color: '#8A8A8A', textDecorationLine: 'line-through' },
  valorDescuento: { color: VERDE },
  prendaTalla: { fontFamily: FONT, fontSize: 12, color: '#1A1A1A', marginTop: 2 },

  totales: { paddingHorizontal: 20, marginTop: 4 },
  totalLinea: { height: 1, backgroundColor: '#1A1A1A', marginVertical: 6 },
  totalFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  totalEtiqueta: { fontFamily: FONT, fontSize: 13, color: NEGRO },
  totalValor: { fontFamily: FONT, fontSize: 13, color: NEGRO },

  botones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6E6E6',
  },
  botonAtras: {
    width: '44%',
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: NEGRO,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  botonAtrasTexto: { fontFamily: FONT, fontSize: 14, letterSpacing: 0.5, color: NEGRO },
  botonSiguiente: {
    width: '50%',
    height: 44,
    borderRadius: 22,
    backgroundColor: NEGRO,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  botonSiguienteOff: { backgroundColor: '#9A9A9A' },
  botonSiguienteTexto: { fontFamily: FONT, fontSize: 14, letterSpacing: 0.5, color: '#FFFFFF' },
  opaco: { opacity: 0.5 },

  campoWrapper: { marginBottom: 18, maxWidth: '100%' },
  campo: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: NEGRO,
    borderRadius: 18,
    paddingHorizontal: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  campoError: { borderColor: ROJO },
  campoContenido: { flex: 1, justifyContent: 'center' },
  campoErrorTexto: { color: ROJO, fontSize: 12, marginTop: 4, marginLeft: 14 },
});
