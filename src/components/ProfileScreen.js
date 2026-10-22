import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomBottomTabBar from './CustomBottomTabBar';
import { useKeyboardVisible } from '../hooks/use-keyboard-visible';
import {
  extraerTelefono,
  formatearTelefono,
  mensajeErrorAuth,
  normalizarUsername,
  soloDigitosTelefono,
  validarTelefono,
  validarUsername,
} from '../lib/authValidation';
import { AuthError, actualizarPerfil } from '../lib/authService';

const FONT = 'Instrument Sans SemiBold';
const BORDE = '#1A1A1A';
const ROJO = '#E02424';
const VERDE = '#16A34A';

const ROLES = { 1: 'Administrador', 2: 'Empleado', 3: 'Cliente' };

function formatearFecha(iso) {
  const fecha = iso ? new Date(iso) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return '—';
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getFullYear()}`;
}

function Dato({ icono, etiqueta, valor }) {
  return (
    <View style={styles.datoFila}>
      <Ionicons name={icono} size={22} color="#333333" style={styles.datoIcono} />
      <View style={styles.datoTextos}>
        <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
        <Text style={styles.datoValor} numberOfLines={1}>
          {valor || '—'}
        </Text>
      </View>
    </View>
  );
}

// Formulario con estado propio; se remonta (key) cada vez que se abre la pantalla.
function PerfilContenido({ usuario, perfil, onActualizado, onCerrarSesion }) {
  const usernameActual = perfil?.Usuario || usuario.displayName || '';
  const telefonoActual = extraerTelefono(perfil?.Telefono);
  const [username, setUsername] = useState(usernameActual);
  const [telefono, setTelefono] = useState(telefonoActual);
  const [errores, setErrores] = useState({});
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);
  const telefonoRef = useRef(null);

  const sinCambios = normalizarUsername(username) === usernameActual && telefono === telefonoActual;

  const guardar = async () => {
    setExito('');
    const nuevos = {};
    const errUsername = validarUsername(username);
    if (errUsername) nuevos.username = errUsername;
    const errTelefono = validarTelefono(telefono);
    if (errTelefono) nuevos.telefono = errTelefono;
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setGuardando(true);
    try {
      const nuevoPerfil = await actualizarPerfil(usuario, perfil, { username, telefono });
      onActualizado(nuevoPerfil);
      setUsername(nuevoPerfil.Usuario || '');
      setTelefono(extraerTelefono(nuevoPerfil.Telefono));
      setExito('Cambios guardados');
    } catch (e) {
      setErrores({ general: e instanceof AuthError ? e.message : mensajeErrorAuth(e) });
    } finally {
      setGuardando(false);
    }
  };

  const inicial = (usernameActual || usuario.email || '?').charAt(0).toUpperCase();

  return (
    <View>
      <View style={styles.avatarBloque}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetra}>{inicial}</Text>
        </View>
        <Text style={styles.avatarNombre} numberOfLines={1}>
          {usernameActual || 'Sin nombre de usuario'}
        </Text>
        {!!telefonoActual && <Text style={styles.avatarTelefono}>+503 {formatearTelefono(telefonoActual)}</Text>}
      </View>

      <Text style={styles.seccion}>DATOS PERSONALES</Text>

      <Text style={styles.etiquetaCampo}>NOMBRE DE USUARIO</Text>
      <TextInput
        style={[styles.input, !!errores.username && styles.inputError]}
        value={username}
        onChangeText={(v) => {
          setUsername(v.replace(/\s/g, ''));
          setErrores((prev) => ({ ...prev, username: undefined, general: undefined }));
          setExito('');
        }}
        placeholder="NOMBRE DE USUARIO"
        placeholderTextColor="#9A9A9A"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        returnKeyType="next"
        onSubmitEditing={() => telefonoRef.current?.focus()}
      />
      {!!errores.username && <Text style={styles.mensajeError}>{errores.username}</Text>}

      <Text style={[styles.etiquetaCampo, styles.etiquetaSiguiente]}>TELEFONO</Text>
      <View style={[styles.telefonoCaja, !!errores.telefono && styles.inputError]}>
        <Ionicons name="call-outline" size={20} color="#333333" />
        <Text style={styles.telefonoPrefijo}>+503</Text>
        <View style={styles.telefonoSeparador} />
        <TextInput
          ref={telefonoRef}
          style={styles.telefonoInput}
          value={formatearTelefono(telefono)}
          onChangeText={(v) => {
            setTelefono(soloDigitosTelefono(v));
            setErrores((prev) => ({ ...prev, telefono: undefined, general: undefined }));
            setExito('');
          }}
          placeholder="0000 0000"
          placeholderTextColor="#9A9A9A"
          keyboardType="number-pad"
          maxLength={9}
          returnKeyType="done"
          onSubmitEditing={guardar}
        />
      </View>
      {!!errores.telefono && <Text style={styles.mensajeError}>{errores.telefono}</Text>}

      {!!errores.general && <Text style={styles.mensajeError}>{errores.general}</Text>}
      {!!exito && <Text style={styles.mensajeExito}>{exito}</Text>}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={guardar}
        disabled={guardando || sinCambios}
        style={[styles.botonGuardar, (guardando || sinCambios) && styles.botonDeshabilitado]}
      >
        {guardando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.botonGuardarTexto}>GUARDAR CAMBIOS</Text>
        )}
      </TouchableOpacity>

      <Text style={[styles.seccion, styles.seccionDatos]}>DATOS DE LA CUENTA</Text>
      <Dato icono="mail-outline" etiqueta="CORREO ELECTRONICO" valor={usuario.email || perfil?.Correo} />
      <Dato icono="ribbon-outline" etiqueta="TIPO DE CUENTA" valor={ROLES[Number(perfil?.ID_Rol)] || 'Cliente'} />
      <Dato icono="calendar-outline" etiqueta="MIEMBRO DESDE" valor={formatearFecha(perfil?.Fecha_Creacion)} />

      <TouchableOpacity activeOpacity={0.8} onPress={onCerrarSesion} style={styles.botonCerrarSesion}>
        <Ionicons name="log-out-outline" size={20} color="#000000" />
        <Text style={styles.botonCerrarSesionTexto}>CERRAR SESIÓN</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProfileModal({ visible, usuario, perfil, onCerrar, onNavegar, onActualizado, onCerrarSesion }) {
  const tecladoVisible = useKeyboardVisible();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar}>
      <SafeAreaView edges={['top']} style={styles.pantalla}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.encabezado}>
          <Text style={styles.encabezadoTitulo}>MI PERFIL</Text>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.contenido}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cerrarFila}>
              <TouchableOpacity activeOpacity={0.7} onPress={onCerrar} style={styles.cerrarBoton} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={30} color="#000000" />
              </TouchableOpacity>
            </View>

            {visible && usuario ? (
              <PerfilContenido
                key={usuario.uid}
                usuario={usuario}
                perfil={perfil}
                onActualizado={onActualizado}
                onCerrarSesion={onCerrarSesion}
              />
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        {!tecladoVisible && <CustomBottomTabBar activeTab="perfil" onTabPress={onNavegar} />}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  encabezado: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#B9C3D3',
  },
  encabezadoTitulo: { fontFamily: FONT, fontSize: 20, letterSpacing: 3, color: '#000000' },
  contenido: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 140 },
  cerrarFila: { alignItems: 'flex-end', marginBottom: 4 },
  cerrarBoton: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderColor: BORDE,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Avatar */
  avatarBloque: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLetra: { fontFamily: FONT, fontSize: 36, color: '#FFFFFF' },
  avatarNombre: { fontFamily: FONT, fontSize: 22, letterSpacing: 1, color: '#000000', maxWidth: '90%' },
  avatarTelefono: { fontFamily: FONT, fontSize: 14, letterSpacing: 1, color: '#6B6B6B', marginTop: 4 },

  /* Edición */
  seccion: { fontFamily: FONT, fontSize: 13, letterSpacing: 1.5, color: '#555555', marginBottom: 10 },
  seccionDatos: { marginTop: 30 },
  etiquetaCampo: { fontFamily: FONT, fontSize: 11, letterSpacing: 1, color: '#8A8A8A', marginBottom: 6 },
  etiquetaSiguiente: { marginTop: 18 },
  telefonoCaja: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDE,
    borderRadius: 3,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  telefonoPrefijo: { fontFamily: FONT, fontSize: 14, color: '#000000', marginLeft: 10 },
  telefonoSeparador: { width: 1, height: 20, backgroundColor: '#C8C8C8', marginHorizontal: 12 },
  telefonoInput: { flex: 1, height: 44, fontFamily: FONT, fontSize: 14, letterSpacing: 1, color: '#000000', padding: 0 },
  input: {
    height: 44,
    borderWidth: 1.5,
    borderColor: BORDE,
    borderRadius: 3,
    paddingHorizontal: 12,
    fontFamily: FONT,
    fontSize: 14,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  inputError: { borderColor: ROJO },
  mensajeError: { color: ROJO, fontSize: 12, marginTop: 4 },
  mensajeExito: { color: VERDE, fontSize: 12, marginTop: 4 },
  botonGuardar: {
    height: 48,
    backgroundColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  botonGuardarTexto: { fontFamily: FONT, fontSize: 14, letterSpacing: 1.5, color: '#FFFFFF' },
  botonDeshabilitado: { opacity: 0.4 },

  /* Datos */
  datoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  datoIcono: { width: 34 },
  datoTextos: { flex: 1 },
  datoEtiqueta: { fontFamily: FONT, fontSize: 11, letterSpacing: 1, color: '#8A8A8A', marginBottom: 2 },
  datoValor: { fontFamily: FONT, fontSize: 15, color: '#000000' },

  /* Cerrar sesión */
  botonCerrarSesion: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: BORDE,
    borderRadius: 4,
    marginTop: 34,
  },
  botonCerrarSesionTexto: { fontFamily: FONT, fontSize: 14, letterSpacing: 1.5, color: '#000000' },
});
