// Reutiliza el cliente único de Firebase para no inicializar la app dos veces
// ni depender de variables EXPO_PUBLIC_FIREBASE_* en el .env.
export { app, auth, db, storage } from './lib/firebaseClient';
export { app as default } from './lib/firebaseClient';
