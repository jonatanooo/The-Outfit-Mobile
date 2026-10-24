// Reutiliza el cliente único de Firebase para no inicializar la app dos veces
// ni depender de variables EXPO_PUBLIC_FIREBASE_* en el .env.
export { app, auth, db } from './lib/firebaseClient';
