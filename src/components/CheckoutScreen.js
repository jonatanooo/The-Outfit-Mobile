import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomBottomTabBar from './CustomBottomTabBar';
import { useKeyboardVisible } from '../hooks/use-keyboard-visible';
import { FONT, NEGRO, Encabezado, BotonesNavegacion } from './checkout/ui';
import PasoEnvio from './checkout/PasoEnvio';
import PasoMetodoPago from './checkout/PasoMetodoPago';
import PasoPago from './checkout/PasoPago';
import PasoConfirmacion from './checkout/PasoConfirmacion';
import { calcularEnvio, redondear } from '../lib/tienda';
import { METODOS_PAGO, PagoRechazadoError, procesarPagoSimulado } from '../lib/pagoSimulado';
import { PedidoError, crearDireccion, crearPedido, listarDirecciones } from '../lib/pedidos';

const SUBTITULOS = {
  envio: 'MÉTODO DE ENVIO',
  metodo: 'MÉTODO DE PAGO',
  pago: 'MÉTODO DE PAGO',
  confirmacion: 'COMPRA REALIZADA',
};

// Pasos: envio -> metodo -> pago (formulario simulado) -> confirmacion.
// Solo se monta mientras el checkout está abierto, así cada compra empieza desde cero.
function CheckoutContenido({
  usuario,
  perfil,
  items,
  subtotal,
  onVolverCarrito,
  onNavegar,
  onCompraCompletada,
  onFinalizar,
}) {
  const tecladoVisible = useKeyboardVisible();
  const validarRef = useRef(null);

  const [paso, setPaso] = useState('envio');
  const [tipo, setTipo] = useState('tienda'); // 'tienda' | 'domicilio'
  const [direcciones, setDirecciones] = useState([]);
  const [cargandoDirecciones, setCargandoDirecciones] = useState(Boolean(perfil));
  const [errorDirecciones, setErrorDirecciones] = useState('');
  const [direccionId, setDireccionId] = useState(null);
  const [metodo, setMetodo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [errorPago, setErrorPago] = useState('');
  const [resumen, setResumen] = useState(null);

  const idUser = perfil?.ID_User;

  // Carga las direcciones guardadas del usuario al abrir
  useEffect(() => {
    if (!perfil) return;
    let activo = true;
    listarDirecciones(perfil)
      .then((lista) => activo && setDirecciones(lista))
      .catch(() => {
        if (!activo) return;
        setDirecciones([]);
        setErrorDirecciones('No se pudieron cargar tus direcciones.');
      })
      .finally(() => activo && setCargandoDirecciones(false));
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUser]);

  const envio = calcularEnvio(tipo, subtotal);
  const total = redondear(subtotal + envio);

  const atras = useCallback(() => {
    if (procesando) return;
    setErrorPago('');
    if (paso === 'envio') onVolverCarrito();
    else if (paso === 'metodo') setPaso('envio');
    else if (paso === 'pago') setPaso('metodo');
    else onFinalizar();
  }, [paso, procesando, onVolverCarrito, onFinalizar]);

  const crearNuevaDireccion = async (datos) => {
    const nueva = await crearDireccion(perfil, datos);
    setDirecciones((prev) => [...prev, nueva]);
    setTipo('domicilio');
    setDireccionId(nueva.ID_Direccion);
  };

  const pagar = async () => {
    if (procesando) return;
    const entrada = validarRef.current?.();
    if (!entrada) return;

    setProcesando(true);
    setErrorPago('');
    try {
      const direccion = direcciones.find((d) => String(d.ID_Direccion) === String(direccionId));
      const resultado = await crearPedido({
        perfil,
        correo: usuario?.email || perfil?.Correo || '',
        items,
        entrega: { tipo, direccion },
        metodoPago: METODOS_PAGO[metodo],
        procesarPago: () => procesarPagoSimulado(entrada),
      });
      setResumen(resultado);
      setPaso('confirmacion');
      onCompraCompletada();
    } catch (e) {
      if (e instanceof PagoRechazadoError || e instanceof PedidoError) {
        setErrorPago(e.message);
      } else {
        console.warn('Error al registrar la compra:', e?.code || e);
        setErrorPago('No se pudo completar la compra. No se realizó ningún cobro. Inténtalo de nuevo.');
      }
    } finally {
      setProcesando(false);
    }
  };

  const siguienteDeshabilitado =
    (paso === 'envio' && tipo === 'domicilio' && !direccionId) || (paso === 'metodo' && !metodo);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={atras}>
      <SafeAreaView edges={['top']} style={styles.pantalla}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Encabezado subtitulo={SUBTITULOS[paso]} />

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {paso === 'envio' && (
            <PasoEnvio
              items={items}
              subtotal={subtotal}
              envio={envio}
              total={total}
              tipo={tipo}
              onTipo={setTipo}
              direcciones={direcciones}
              cargandoDirecciones={cargandoDirecciones}
              errorDirecciones={errorDirecciones}
              direccionId={direccionId}
              onDireccion={(dir) => {
                setTipo('domicilio');
                setDireccionId(dir.ID_Direccion);
              }}
              onCrearDireccion={crearNuevaDireccion}
            />
          )}
          {paso === 'metodo' && <PasoMetodoPago metodo={metodo} onElegir={setMetodo} />}
          {paso === 'pago' && <PasoPago metodo={metodo} errorPago={errorPago} validarRef={validarRef} onPagar={pagar} />}
          {paso === 'confirmacion' && resumen && <PasoConfirmacion resumen={resumen} />}

          {paso === 'confirmacion' ? (
            <View style={styles.pieInicio}>
              <TouchableOpacity activeOpacity={0.85} onPress={onFinalizar} style={styles.botonInicio}>
                <Ionicons name="home" size={18} color="#FFFFFF" />
                <Text style={styles.botonInicioTexto}>INICIO</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <BotonesNavegacion
              onAtras={atras}
              onSiguiente={paso === 'pago' ? pagar : () => setPaso(paso === 'envio' ? 'metodo' : 'pago')}
              textoSiguiente={paso === 'pago' ? 'PAGAR' : 'SIGUIENTE'}
              deshabilitado={siguienteDeshabilitado}
              cargando={procesando}
            />
          )}
        </KeyboardAvoidingView>

        {!tecladoVisible && <CustomBottomTabBar activeTab="cesta" onTabPress={onNavegar} enFlujo />}

        {procesando && (
          <View style={styles.overlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={NEGRO} />
            <Text style={styles.overlayTexto}>PROCESANDO PAGO...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

export default function CheckoutModal({ visible, ...props }) {
  return visible ? <CheckoutContenido {...props} /> : null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  pieInicio: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6E6E6',
  },
  botonInicio: {
    height: 46,
    minWidth: 200,
    borderRadius: 23,
    backgroundColor: NEGRO,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  botonInicioTexto: { fontFamily: FONT, fontSize: 15, letterSpacing: 1, color: '#FFFFFF' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTexto: { fontFamily: FONT, fontSize: 13, letterSpacing: 1.5, color: NEGRO, marginTop: 14 },
});
