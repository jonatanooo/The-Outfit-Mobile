import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FONT, NEGRO, ListaPrendas, Totales } from './ui';
import { TIENDA_NOMBRE } from '../../lib/tienda';
import { generarMatrizQR } from '../../lib/qr';

// 05/08/2026 01:29 AM
export function formatoFechaHora(iso) {
  const f = new Date(iso);
  const dd = String(f.getDate()).padStart(2, '0');
  const mm = String(f.getMonth() + 1).padStart(2, '0');
  const horas = f.getHours();
  const h12 = String(horas % 12 === 0 ? 12 : horas % 12).padStart(2, '0');
  const min = String(f.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${f.getFullYear()} ${h12}:${min} ${horas >= 12 ? 'PM' : 'AM'}`;
}

function Dato({ etiqueta, valor }) {
  return (
    <View style={styles.datoFila}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

function CodigoQR({ valor, tamanoMax = 168 }) {
  const qr = useMemo(() => generarMatrizQR(valor), [valor]);
  const modulo = Math.max(4, Math.floor(tamanoMax / qr.tamano));
  const lado = modulo * qr.tamano;

  return (
    <View style={styles.qrMarco} accessibilityLabel={`Código QR ${valor}`}>
      <View style={{ width: lado, height: lado }}>
        {qr.filas.map((fila, idxFila) => (
          <View key={idxFila} style={[styles.qrFila, { height: modulo }]}>
            {fila.map((seg, idxSeg) => (
              <View
                key={idxSeg}
                style={{
                  width: seg.largo * modulo,
                  height: modulo,
                  backgroundColor: seg.oscuro ? NEGRO : '#FFFFFF',
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PasoConfirmacion({ resumen }) {
  const valorQR = resumen.idPedido
    ? `PEDIDO:${resumen.idPedido}|TX:${resumen.idTransaccion}`
    : `#${resumen.idTransaccion}`;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
      <Text style={styles.gracias}>¡GRACIAS POR SU COMPRA!</Text>
      <ListaPrendas items={resumen.items} />
      <Totales subtotal={resumen.subtotal} envio={resumen.envio} total={resumen.total} />

      <View style={styles.datos}>
        {!!resumen.idPedido && <Dato etiqueta="ID PEDIDO" valor={`#${resumen.idPedido}`} />}
        <Dato etiqueta="ID TRANSACCIÓN" valor={`#${resumen.idTransaccion}`} />
        <Dato etiqueta="FECHA Y HORA" valor={formatoFechaHora(resumen.fecha)} />
        <Dato
          etiqueta="LUGAR DE ENVÍO"
          valor={resumen.entrega.tipo === 'tienda' ? TIENDA_NOMBRE : resumen.entrega.texto.toUpperCase()}
        />
        <Dato etiqueta="MÉTODO DE PAGO" valor={resumen.detallePago} />
        <Dato etiqueta="CORREO" valor={(resumen.correo || '').toUpperCase()} />
      </View>

      <View style={styles.qrSeccion}>
        <Text style={styles.qrTitulo}>CÓDIGO QR DE LA COMPRA</Text>
        <CodigoQR valor={valorQR} />
        <Text style={styles.qrSubtitulo}>#{resumen.idTransaccion}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { paddingTop: 22, paddingBottom: 28 },
  gracias: { fontFamily: FONT, fontSize: 15, letterSpacing: 0.8, color: NEGRO, textAlign: 'center' },
  datos: { paddingHorizontal: 20, marginTop: 26 },
  datoFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  datoEtiqueta: { fontFamily: FONT, fontSize: 12, color: NEGRO },
  datoValor: { fontFamily: FONT, fontSize: 12, color: '#1A1A1A', textAlign: 'right', flex: 1, marginLeft: 16 },
  qrSeccion: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  qrTitulo: {
    fontFamily: FONT,
    fontSize: 12,
    letterSpacing: 1.2,
    color: NEGRO,
    marginBottom: 12,
  },
  qrMarco: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: NEGRO,
    borderRadius: 12,
  },
  qrFila: {
    flexDirection: 'row',
  },
  qrSubtitulo: {
    fontFamily: FONT,
    fontSize: 11,
    letterSpacing: 1,
    color: '#555555',
    marginTop: 8,
  },
});
