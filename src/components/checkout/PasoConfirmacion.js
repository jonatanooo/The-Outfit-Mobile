import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FONT, NEGRO, ListaPrendas, Totales } from './ui';
import { TIENDA_NOMBRE } from '../../lib/tienda';

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

export default function PasoConfirmacion({ resumen }) {
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
      <Text style={styles.gracias}>¡GRACIAS POR SU COMPRA!</Text>
      <ListaPrendas items={resumen.items} />
      <Totales subtotal={resumen.subtotal} envio={resumen.envio} total={resumen.total} />

      <View style={styles.datos}>
        <Dato etiqueta="ID TRANSACCIÓN" valor={`#${resumen.idTransaccion}`} />
        <Dato etiqueta="FECHA Y HORA" valor={formatoFechaHora(resumen.fecha)} />
        <Dato
          etiqueta="LUGAR DE ENVÍO"
          valor={resumen.entrega.tipo === 'tienda' ? TIENDA_NOMBRE : resumen.entrega.texto.toUpperCase()}
        />
        <Dato etiqueta="MÉTODO DE PAGO" valor={resumen.detallePago} />
        <Dato etiqueta="CORREO" valor={(resumen.correo || '').toUpperCase()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { paddingTop: 22, paddingBottom: 24 },
  gracias: { fontFamily: FONT, fontSize: 15, letterSpacing: 0.8, color: NEGRO, textAlign: 'center' },
  datos: { paddingHorizontal: 20, marginTop: 26 },
  datoFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  datoEtiqueta: { fontFamily: FONT, fontSize: 12, color: NEGRO },
  datoValor: { fontFamily: FONT, fontSize: 12, color: '#1A1A1A', textAlign: 'right', flex: 1, marginLeft: 16 },
});
