import { Platform } from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from './firebaseClient';
import { normalizarCorreo, normalizarUsername } from './authValidation';

const ROL_CLIENTE = 3;
const ESTADO_ACTIVO = 1;
const ESTADO_BANEADO = 2;

// Error propio para mostrar mensajes ya redactados (sin pasar por mensajeErrorAuth).
export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

async function siguienteIdUser() {
  try {
    const snap = await getDocs(query(collection(db, 'User'), orderBy('ID_User', 'desc'), limit(1)));
    if (!snap.empty) {
      const max = Number(snap.docs[0].data().ID_User);
      if (!Number.isNaN(max)) return max + 1;
    }
  } catch {
    // Sin permiso de lectura o colección vacía: se usa un id basado en tiempo.
  }
  return Date.now();
}

export async function buscarPerfil(user) {
  try {
    const porUid = await getDoc(doc(db, 'User', user.uid));
    if (porUid.exists()) return { ...porUid.data(), _docId: porUid.id };
    const porCorreo = await getDocs(
      query(collection(db, 'User'), where('Correo', '==', normalizarCorreo(user.email)))
    );
    // _docId guarda el id real del documento (puede no coincidir con el uid en cuentas antiguas).
    if (!porCorreo.empty) return { ...porCorreo.docs[0].data(), _docId: porCorreo.docs[0].id };
  } catch (e) {
    console.warn('No se pudo consultar el perfil en Firestore:', e?.code || e);
  }
  return null;
}

// El nombre de usuario se compara en minúsculas (campo Usuario_Lower).
async function usernameDisponible(username, uidActual) {
  const snap = await getDocs(
    query(collection(db, 'User'), where('Usuario_Lower', '==', username.toLowerCase()))
  );
  return snap.docs.every((d) => d.id === uidActual);
}

async function crearPerfil(user, { nombres = '', telefono = '', username = '' } = {}) {
  const correo = normalizarCorreo(user.email);
  const usuario = username || correo.split('@')[0];
  const perfil = {
    ID_User: await siguienteIdUser(),
    auth_id: user.uid,
    Nombres: nombres,
    Apellidos: '',
    Usuario: usuario,
    Usuario_Lower: usuario.toLowerCase(),
    Correo: correo,
    Telefono: telefono,
    ID_Rol: ROL_CLIENTE,
    ID_EstadoUsuario: ESTADO_ACTIVO,
    Es_Empleado: false,
    Fecha_Creacion: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'User', user.uid), perfil);
  } catch (e) {
    // La cuenta de Auth ya existe; el perfil se puede completar después.
    console.warn('No se pudo guardar el perfil en Firestore:', e?.code || e);
  }
  return { ...perfil, _docId: user.uid };
}

// Cierra la sesión y avisa si la cuenta está baneada.
async function rechazarSiBaneado(perfil) {
  if (perfil && Number(perfil.ID_EstadoUsuario) === ESTADO_BANEADO) {
    await signOut(auth);
    throw new AuthError('Tu cuenta fue baneada. No tienes acceso a la aplicación.');
  }
}

export async function registrarConCorreo({ correo, username, password, telefono }) {
  const email = normalizarCorreo(correo);
  const usuario = normalizarUsername(username);
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  // Las reglas de Firestore exigen sesión para consultar User, así que la unicidad
  // se verifica ya autenticado; si el nombre está tomado se revierte la cuenta recién creada.
  let disponible = true;
  try {
    disponible = await usernameDisponible(usuario, user.uid);
  } catch (e) {
    console.warn('No se pudo verificar el nombre de usuario:', e?.code || e);
  }
  if (!disponible) {
    try {
      await user.delete();
    } catch (e) {
      console.warn('No se pudo revertir la cuenta:', e?.code || e);
    }
    throw new AuthError('Ese nombre de usuario ya está en uso. Elige otro.');
  }

  try {
    await updateProfile(user, { displayName: usuario });
  } catch {
    // No es crítico.
  }
  const perfil = await crearPerfil(user, { nombres: usuario, username: usuario, telefono: `+503${telefono}` });
  return { user, perfil };
}

export async function iniciarSesionConCorreo({ correo, password }) {
  const { user } = await signInWithEmailAndPassword(auth, normalizarCorreo(correo), password);
  const perfil = await buscarPerfil(user);
  await rechazarSiBaneado(perfil);
  return { user, perfil };
}

export async function recuperarPassword(correo) {
  await sendPasswordResetEmail(auth, normalizarCorreo(correo));
}

// ---------- Google ----------
// En web se usa el popup de Firebase. En Android/iOS se usa Google Sign-In nativo,
// que requiere un development build (no funciona en Expo Go) y el Web Client ID de
// Firebase Console > Authentication > Método de acceso > Google.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
let googleConfigurado = false;

function cargarGoogleNativo() {
  try {
    return require('@react-native-google-signin/google-signin');
  } catch {
    return null;
  }
}

async function obtenerCredencialGoogle() {
  if (Platform.OS === 'web') {
    const resultado = await signInWithPopup(auth, new GoogleAuthProvider());
    return { user: resultado.user };
  }

  const modulo = cargarGoogleNativo();
  if (!modulo || !modulo.GoogleSignin) {
    throw new AuthError(
      'Google Sign-In necesita un development build. No está disponible en Expo Go.'
    );
  }
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new AuthError(
      'Falta configurar EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID para iniciar sesión con Google.'
    );
  }

  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = modulo;
  if (!googleConfigurado) {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    googleConfigurado = true;
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const respuesta = await GoogleSignin.signIn();
    if (!isSuccessResponse(respuesta)) return null; // El usuario canceló.
    const idToken = respuesta.data.idToken;
    if (!idToken) throw new AuthError('Google no devolvió un token de acceso.');
    const resultado = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    return { user: resultado.user };
  } catch (e) {
    if (isErrorWithCode?.(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return null;
    if (isErrorWithCode?.(e) && e.code === statusCodes.IN_PROGRESS) return null;
    throw e;
  }
}

// Devuelve null si el usuario cancela el flujo.
export async function continuarConGoogle() {
  const credencial = await obtenerCredencialGoogle();
  if (!credencial) return null;

  const { user } = credencial;
  let perfil = await buscarPerfil(user);
  if (!perfil) perfil = await crearPerfil(user, { nombres: user.displayName || '' });
  await rechazarSiBaneado(perfil);
  return { user, perfil };
}

// Actualiza el mismo documento del usuario (no crea otro). Solo escribe lo que cambió:
// el nombre de usuario (verificando que nadie más lo tenga) y/o el teléfono (8 dígitos).
export async function actualizarPerfil(user, perfil, { username, telefono }) {
  const nuevoUsername = normalizarUsername(username);
  const nuevoTelefono = `+503${telefono}`;
  if (!perfil) {
    return crearPerfil(user, { nombres: nuevoUsername, username: nuevoUsername, telefono: nuevoTelefono });
  }

  const docId = perfil._docId || user.uid;
  const cambios = {};

  if (nuevoUsername !== (perfil.Usuario || '')) {
    if (!(await usernameDisponible(nuevoUsername, docId))) {
      throw new AuthError('Ese nombre de usuario ya está en uso. Elige otro.');
    }
    cambios.Usuario = nuevoUsername;
    cambios.Usuario_Lower = nuevoUsername.toLowerCase();
  }
  if (nuevoTelefono !== (perfil.Telefono || '')) {
    cambios.Telefono = nuevoTelefono;
  }
  if (Object.keys(cambios).length === 0) return perfil;

  await updateDoc(doc(db, 'User', docId), cambios);
  if (cambios.Usuario) {
    try {
      await updateProfile(user, { displayName: cambios.Usuario });
    } catch {
      // No es crítico.
    }
  }
  return { ...perfil, ...cambios, _docId: docId };
}

export function cerrarSesion() {
  return signOut(auth);
}
