import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
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
  evaluarPassword,
  mensajeErrorAuth,
  validarCorreo,
  validarLogin,
  validarRegistro,
} from '../lib/authValidation';
import {
  AuthError,
  continuarConGoogle,
  iniciarSesionConCorreo,
  recuperarPassword,
  registrarConCorreo,
} from '../lib/authService';

const FONT = 'Instrument Sans SemiBold';
const BORDE = '#1A1A1A';
const GRIS_PLACEHOLDER = '#9A9A9A';
const ROJO = '#E02424';

function mensajeDeError(error) {
  return error instanceof AuthError ? error.message : mensajeErrorAuth(error);
}

/* ---------- Piezas de UI ---------- */

function Campo({ icono, error, children }) {
  return (
    <View style={styles.campoWrapper}>
      <View style={styles.campoFila}>
        <Ionicons name={icono} size={22} color="#333333" style={styles.campoIcono} />
        <View style={styles.campoCaja}>{children}</View>
      </View>
      {!!error && <Text style={styles.errorTexto}>{error}</Text>}
    </View>
  );
}

function Casilla({ marcada, onPress, children, error }) {
  return (
    <View style={styles.casillaWrapper}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.casillaFila}>
        <View style={styles.casillaCuadro}>
          {marcada && <Ionicons name="checkmark" size={20} color="#000000" />}
        </View>
        <Text style={styles.casillaTexto}>{children}</Text>
      </TouchableOpacity>
      {!!error && <Text style={[styles.errorTexto, styles.errorCasilla]}>{error}</Text>}
    </View>
  );
}

function BotonGoogle({ onPress, disabled }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[styles.botonSocial, disabled && styles.botonDeshabilitado]}
    >
      <Ionicons name="logo-google" size={20} color="#4285F4" />
      <Text style={styles.botonSocialTexto}>CONTINUAR CON GOOGLE</Text>
    </TouchableOpacity>
  );
}

function BotonPrincipal({ texto, cargando, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={cargando}
      style={[styles.botonPrincipal, cargando && styles.botonDeshabilitado]}
    >
      {cargando ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.botonPrincipalTexto}>{texto}</Text>
      )}
    </TouchableOpacity>
  );
}

function BarraSeguridad({ password }) {
  const { nivel, etiqueta, color } = evaluarPassword(password);
  return (
    <View style={styles.seguridadWrapper}>
      <View style={styles.seguridadBarras}>
        {[1, 2, 3].map((n) => (
          <View
            key={n}
            style={[styles.seguridadSegmento, { backgroundColor: n <= nivel ? color : '#D9D9D9' }]}
          />
        ))}
      </View>
      <Text style={[styles.seguridadEtiqueta, { color: nivel ? color : 'transparent' }]}>
        {etiqueta || ' '}
      </Text>
    </View>
  );
}

/* ---------- Formulario: Inicio de sesión ---------- */

function LoginForm({ onCambiarModo, onAutenticado }) {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const passwordRef = useRef(null);

  const iniciarSesion = async () => {
    const nuevos = validarLogin({ correo, password });
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setCargando(true);
    try {
      const resultado = await iniciarSesionConCorreo({ correo, password });
      onAutenticado(resultado);
    } catch (e) {
      setErrores({ general: mensajeDeError(e) });
    } finally {
      setCargando(false);
    }
  };

  const olvideContrasena = async () => {
    const errCorreo = validarCorreo(correo);
    if (errCorreo) {
      setErrores({ correo: 'Escribe tu correo para enviarte el enlace de recuperación' });
      return;
    }
    setErrores({});
    try {
      await recuperarPassword(correo);
      Alert.alert(
        'Revisa tu correo',
        'Si ese correo tiene una cuenta, te enviamos un enlace para restablecer la contraseña.'
      );
    } catch (e) {
      setErrores({ general: mensajeDeError(e) });
    }
  };

  const conGoogle = async () => {
    setErrores({});
    setCargandoGoogle(true);
    try {
      const resultado = await continuarConGoogle();
      if (resultado) onAutenticado(resultado);
    } catch (e) {
      const mensaje = mensajeDeError(e);
      if (mensaje) setErrores({ general: mensaje });
    } finally {
      setCargandoGoogle(false);
    }
  };

  return (
    <View>
      <Campo icono="mail-outline" error={errores.correo}>
        <TextInput
          style={[styles.input, errores.correo && styles.inputError]}
          placeholder="CORREO ELECTRONICO"
          placeholderTextColor={GRIS_PLACEHOLDER}
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
      </Campo>

      <Campo icono="lock-closed-outline" error={errores.password}>
        <TextInput
          ref={passwordRef}
          style={[styles.input, errores.password && styles.inputError]}
          placeholder="CONTRASEÑA"
          placeholderTextColor={GRIS_PLACEHOLDER}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={iniciarSesion}
        />
      </Campo>

      <TouchableOpacity activeOpacity={0.7} onPress={olvideContrasena} style={styles.enlaceCentro}>
        <Text style={styles.enlaceOlvido}>HAZ OLVIDADO LA CONTRASEÑA?</Text>
      </TouchableOpacity>

      <Text style={styles.textoRegistro}>
        ¿NO TIENES CUENTA AÚN?{' '}
        <Text style={styles.enlaceAzul} onPress={() => onCambiarModo('register')}>
          REGISTRATE AHORA
        </Text>
      </Text>

      <View style={styles.bloqueSocial}>
        <BotonGoogle onPress={conGoogle} disabled={cargandoGoogle || cargando} />
        {cargandoGoogle && <ActivityIndicator style={styles.googleSpinner} color="#000000" />}
      </View>

      {!!errores.general && <Text style={styles.errorGeneral}>{errores.general}</Text>}

      <BotonPrincipal texto="Iniciar sesion" cargando={cargando} onPress={iniciarSesion} />
    </View>
  );
}

/* ---------- Formulario: Registro ---------- */

function RegisterForm({ onCambiarModo, onAutenticado }) {
  const [form, setForm] = useState({
    correo: '',
    username: '',
    password: '',
    confirmar: '',
    telefono: '',
    aceptaPromos: false,
    aceptaTerminos: false,
  });
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmarRef = useRef(null);
  const telefonoRef = useRef(null);

  const cambiar = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const crearCuenta = async () => {
    const nuevos = validarRegistro(form);
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setCargando(true);
    try {
      const resultado = await registrarConCorreo(form);
      onAutenticado(resultado, { registro: true });
    } catch (e) {
      setErrores({ general: mensajeDeError(e) });
    } finally {
      setCargando(false);
    }
  };

  const conGoogle = async () => {
    setErrores({});
    setCargandoGoogle(true);
    try {
      const resultado = await continuarConGoogle();
      if (resultado) onAutenticado(resultado);
    } catch (e) {
      const mensaje = mensajeDeError(e);
      if (mensaje) setErrores({ general: mensaje });
    } finally {
      setCargandoGoogle(false);
    }
  };

  const verTerminos = () =>
    Alert.alert('Términos y condiciones', 'El documento completo estará disponible próximamente.');

  return (
    <View>
      <Campo icono="mail-outline" error={errores.correo}>
        <TextInput
          style={[styles.input, errores.correo && styles.inputError]}
          placeholder="CORREO ELECTRONICO"
          placeholderTextColor={GRIS_PLACEHOLDER}
          value={form.correo}
          onChangeText={(v) => cambiar('correo', v)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => usernameRef.current?.focus()}
        />
      </Campo>

      <Campo icono="person-outline" error={errores.username}>
        <TextInput
          ref={usernameRef}
          style={[styles.input, errores.username && styles.inputError]}
          placeholder="NOMBRE DE USUARIO"
          placeholderTextColor={GRIS_PLACEHOLDER}
          value={form.username}
          onChangeText={(v) => cambiar('username', v.replace(/\s/g, ''))}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
      </Campo>

      <Campo icono="lock-closed-outline" error={errores.password}>
        <TextInput
          ref={passwordRef}
          style={[styles.input, errores.password && styles.inputError]}
          placeholder="CONTRASEÑA"
          placeholderTextColor={GRIS_PLACEHOLDER}
          value={form.password}
          onChangeText={(v) => cambiar('password', v)}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          returnKeyType="next"
          onSubmitEditing={() => confirmarRef.current?.focus()}
        />
        <BarraSeguridad password={form.password} />
      </Campo>

      <Campo icono="lock-closed-outline" error={errores.confirmar}>
        <TextInput
          ref={confirmarRef}
          style={[styles.input, errores.confirmar && styles.inputError]}
          placeholder="CONF. CONTRASEÑA"
          placeholderTextColor={GRIS_PLACEHOLDER}
          value={form.confirmar}
          onChangeText={(v) => cambiar('confirmar', v)}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => telefonoRef.current?.focus()}
        />
      </Campo>

      <Text style={styles.etiquetaTelefono}>TELEFONO</Text>
      <Campo icono="call-outline" error={errores.telefono}>
        <View style={[styles.telefonoCaja, errores.telefono && styles.inputError]}>
          <Text style={styles.telefonoPrefijo}>503+</Text>
          <TextInput
            ref={telefonoRef}
            style={styles.telefonoInput}
            value={form.telefono}
            onChangeText={(v) => cambiar('telefono', v.replace(/\D/g, '').slice(0, 8))}
            keyboardType="number-pad"
            maxLength={8}
            autoComplete="tel"
            returnKeyType="done"
          />
        </View>
      </Campo>

      <View style={styles.casillas}>
        <Casilla marcada={form.aceptaPromos} onPress={() => cambiar('aceptaPromos', !form.aceptaPromos)}>
          Acepto recibir noticias, notificaciones y promociones de The Outfit
        </Casilla>
        <Casilla
          marcada={form.aceptaTerminos}
          onPress={() => cambiar('aceptaTerminos', !form.aceptaTerminos)}
          error={errores.aceptaTerminos}
        >
          Al darle click a &apos;crear cuenta&apos; acepto los{' '}
          <Text style={styles.enlaceAzul} onPress={verTerminos}>
            terminos y condiciones
          </Text>{' '}
          de The outfit
        </Casilla>
      </View>

      <View style={styles.bloqueSocial}>
        <BotonGoogle onPress={conGoogle} disabled={cargandoGoogle || cargando} />
        {cargandoGoogle && <ActivityIndicator style={styles.googleSpinner} color="#000000" />}
      </View>

      {!!errores.general && <Text style={styles.errorGeneral}>{errores.general}</Text>}

      <BotonPrincipal texto="CREAR CUENTA" cargando={cargando} onPress={crearCuenta} />

      <Text style={[styles.textoRegistro, styles.textoYaTienes]}>
        ¿YA TIENES CUENTA?{' '}
        <Text style={styles.enlaceAzul} onPress={() => onCambiarModo('login')}>
          INICIA SESIÓN
        </Text>
      </Text>
    </View>
  );
}

/* ---------- Contenedor (Modal a pantalla completa) ---------- */

// mode: 'login' | 'register' | null (oculto)
export default function AuthModal({ mode, onCambiarModo, onCerrar, onNavegar, onAutenticado }) {
  const visible = !!mode;
  const esLogin = mode === 'login';
  // Con el teclado abierto se oculta la barra inferior para que no quede flotando sobre él
  const tecladoVisible = useKeyboardVisible();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar}>
      <SafeAreaView edges={['top']} style={styles.pantalla}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.encabezado}>
          <Text style={styles.encabezadoTitulo}>{esLogin ? 'INICIO DE SESIÓN' : 'REGISTRO DE CUENTA'}</Text>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.contenido}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cerrarFila}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onCerrar}
                style={styles.cerrarBoton}
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={30} color="#000000" />
              </TouchableOpacity>
            </View>

            {esLogin ? (
              <LoginForm key="login" onCambiarModo={onCambiarModo} onAutenticado={onAutenticado} />
            ) : visible ? (
              <RegisterForm key="register" onCambiarModo={onCambiarModo} onAutenticado={onAutenticado} />
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
  encabezadoTitulo: {
    fontFamily: FONT,
    fontSize: 20,
    letterSpacing: 3,
    color: '#000000',
  },
  contenido: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 140,
  },
  cerrarFila: { alignItems: 'flex-end', marginBottom: 12 },
  cerrarBoton: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderColor: BORDE,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Campos */
  campoWrapper: { marginBottom: 20 },
  campoFila: { flexDirection: 'row', alignItems: 'flex-start' },
  campoIcono: { width: 28, marginTop: 11 },
  campoCaja: { flex: 1 },
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
  errorTexto: { color: ROJO, fontSize: 12, marginTop: 4, marginLeft: 28 },
  errorCasilla: { marginLeft: 0 },
  errorGeneral: { color: ROJO, fontSize: 13, textAlign: 'center', marginBottom: 14 },

  /* Medidor de seguridad */
  seguridadWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  seguridadBarras: { flex: 1, flexDirection: 'row', gap: 4 },
  seguridadSegmento: { flex: 1, height: 3 },
  seguridadEtiqueta: { fontFamily: FONT, fontSize: 11, marginLeft: 10, minWidth: 54, textAlign: 'right' },

  /* Teléfono */
  etiquetaTelefono: {
    fontFamily: FONT,
    fontSize: 14,
    color: '#000000',
    marginLeft: 28,
    marginBottom: 6,
  },
  telefonoCaja: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDE,
    borderRadius: 3,
    paddingHorizontal: 12,
  },
  telefonoPrefijo: { fontFamily: FONT, fontSize: 14, color: '#000000', marginRight: 8 },
  telefonoInput: { flex: 1, height: 44, fontFamily: FONT, fontSize: 14, color: '#000000', padding: 0 },

  /* Casillas */
  casillas: { marginTop: 14, marginBottom: 18 },
  casillaWrapper: { marginBottom: 16 },
  casillaFila: { flexDirection: 'row', alignItems: 'center' },
  casillaCuadro: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: BORDE,
    borderRadius: 5,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaTexto: { flex: 1, fontFamily: FONT, fontSize: 14, lineHeight: 20, color: '#1A1A1A' },

  /* Enlaces */
  enlaceCentro: { alignSelf: 'center', paddingVertical: 6, marginBottom: 8 },
  enlaceOlvido: { fontFamily: FONT, fontSize: 11, color: '#13307A', letterSpacing: 0.4 },
  enlaceAzul: { color: '#1F6F9F' },
  textoRegistro: {
    fontFamily: FONT,
    fontSize: 11,
    color: '#1A1A1A',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  textoYaTienes: { marginTop: 18, marginBottom: 0 },

  /* Botones */
  bloqueSocial: { alignItems: 'center', marginBottom: 22 },
  botonSocial: {
    width: '84%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: BORDE,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  botonSocialTexto: { fontFamily: FONT, fontSize: 13, letterSpacing: 0.5, color: '#000000' },
  googleSpinner: { position: 'absolute', right: '10%', top: 12 },
  botonPrincipal: {
    height: 52,
    backgroundColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPrincipalTexto: { fontFamily: FONT, fontSize: 18, letterSpacing: 0.5, color: '#FFFFFF' },
  botonDeshabilitado: { opacity: 0.6 },
});
