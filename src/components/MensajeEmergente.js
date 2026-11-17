import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { conectarAlertas } from '../lib/alertas';

// Mismo recuadro de la web (MensajeEmergente.css): fondo oscuro, caja blanca redondeada,
// círculo con icono según el tipo y botones en forma de pastilla.
const FONT = 'Instrument Sans SemiBold';
const NEGRO = '#0F0808';

const ICONOS = {
  info: { nombre: 'information-circle-outline', fondo: '#F3F4F6', color: NEGRO },
  confirmar: { nombre: 'help-circle-outline', fondo: '#F3F4F6', color: NEGRO },
  favoritos: { nombre: 'heart', fondo: '#FCE7F3', color: '#BE123C' },
  exito: { nombre: 'checkmark', fondo: '#E8F5E9', color: '#2E7D32' },
  aviso: { nombre: 'warning-outline', fondo: '#FEF3C7', color: '#B45309' },
  error: { nombre: 'close-circle-outline', fondo: '#FEE2E2', color: '#C62828' },
};

export default function AlertaProvider({ children }) {
  const [cola, setCola] = useState([]);

  useEffect(() => conectarAlertas((item) => setCola((prev) => [...prev, item])), []);

  const actual = cola[0] || null;

  const cerrar = useCallback((resultado) => {
    setCola((prev) => {
      const [primero, ...resto] = prev;
      primero?.resolve(resultado);
      return resto;
    });
  }, []);

  const icono = ICONOS[actual?.tipo] || ICONOS.info;

  return (
    <>
      {children}
      <Modal
        visible={!!actual}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => cerrar(!actual?.esConfirmacion)}
      >
        <Pressable style={styles.fondo} onPress={() => cerrar(!actual?.esConfirmacion)}>
          {actual && (
            <Pressable style={styles.caja} onPress={() => {}}>
              <View style={[styles.icono, { backgroundColor: icono.fondo }]}>
                <Ionicons name={icono.nombre} size={26} color={icono.color} />
              </View>
              <Text style={styles.titulo}>{actual.titulo}</Text>
              <Text style={styles.mensaje}>{actual.mensaje}</Text>

              <View style={styles.acciones}>
                {actual.textoCancelar ? (
                  <TouchableOpacity style={[styles.boton, styles.botonSecundario]} onPress={() => cerrar(false)}>
                    <Text style={[styles.botonTexto, { color: NEGRO }]}>{actual.textoCancelar}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={[styles.boton, styles.botonPrimario]} onPress={() => cerrar(true)}>
                  <Text style={[styles.botonTexto, { color: '#FFFFFF' }]}>{actual.textoConfirmar}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(15,10,10,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  caja: {
    width: '100%',
    maxWidth: 390,
    minHeight: 215,
    paddingTop: 28,
    paddingHorizontal: 26,
    paddingBottom: 24,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 12,
  },
  icono: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  titulo: { fontFamily: FONT, fontSize: 17, color: NEGRO, textAlign: 'center', marginBottom: 8 },
  mensaje: { fontSize: 14, lineHeight: 20, color: '#525252', textAlign: 'center', marginBottom: 20 },
  acciones: { flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch', gap: 10 },
  boton: { flex: 1, minHeight: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  botonPrimario: { backgroundColor: NEGRO, borderWidth: 1, borderColor: NEGRO },
  botonSecundario: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D4D4D4' },
  botonTexto: { fontFamily: FONT, fontSize: 13, textAlign: 'center' },
});
