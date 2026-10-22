import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, NEGRO } from './ui';
import { METODOS_PAGO } from '../../lib/pagoSimulado';

const OPCIONES = [
  { id: 'tarjeta', icono: 'card' },
  { id: 'paypal', icono: 'logo-paypal' },
  { id: 'regalo', icono: 'gift' },
];

export default function PasoMetodoPago({ metodo, onElegir }) {
  return (
    <View style={styles.contenido}>
      {OPCIONES.map((op) => {
        const activo = metodo === op.id;
        return (
          <TouchableOpacity
            key={op.id}
            activeOpacity={0.8}
            onPress={() => onElegir(op.id)}
            style={[styles.opcion, activo && styles.opcionActiva]}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
          >
            <Ionicons name={op.icono} size={24} color={NEGRO} />
            <Text style={styles.opcionTexto}>{METODOS_PAGO[op.id].toUpperCase()}</Text>
            <View style={[styles.radio, activo && styles.radioActivo]}>
              {activo && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.nota}>Los pagos son simulados: no se realiza ningún cobro real.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { flex: 1, paddingHorizontal: 24, paddingTop: 28 },
  opcion: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: NEGRO,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 22,
    backgroundColor: '#FFFFFF',
  },
  opcionActiva: { borderWidth: 3, backgroundColor: '#F6F6F6' },
  opcionTexto: { flex: 1, textAlign: 'right', fontFamily: FONT, fontSize: 14, letterSpacing: 0.5, color: NEGRO, marginRight: 14 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#9A9A9A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActivo: { backgroundColor: NEGRO, borderColor: NEGRO },
  nota: { fontFamily: FONT, fontSize: 12, color: '#6B6B6B', textAlign: 'center', marginTop: 6 },
});
