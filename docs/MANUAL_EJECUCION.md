# Manual de ejecución para contribuyentes

Guía para levantar **The Outfit Mobile** (Expo SDK 58 / React Native) en un emulador Android o en un celular físico.

## 1. Requisitos previos

| Herramienta | Versión | Notas |
|---|---|---|
| Node.js | 20 LTS o superior | https://nodejs.org |
| npm | el que trae Node | No usar yarn/pnpm/bun: el repo usa `package-lock.json` |
| Git | cualquiera reciente | |
| Android Studio | última | Solo si usarás emulador |
| Expo Go | última versión | Solo si usarás celular físico |

## 2. Clonar e instalar

```bash
git clone <url-del-repositorio>
cd The-Outfit-Mobile
npm install
```

Para agregar una librería nueva usa siempre:

```bash
npx expo install <paquete>
```

Si algo queda desalineado con el SDK: `npx expo install --fix`.

> Los avisos de "vulnerabilities" y de scripts `postinstall` (firebase, protobufjs) que muestra `npm install` son normales.

## 3. Firebase

No requiere configuración: `src/lib/firebaseClient.js` trae valores por defecto. Si quieres apuntar a otro proyecto, define las variables `NEXT_PUBLIC_FIREBASE_*` en un archivo `.env` local (no se sube al repositorio).

## 4. Ejecutar

### Opción A: emulador Android (Windows)

1. En Android Studio abre **Device Manager** → **Create Device** (ej. *Pixel 8*) → descarga una imagen del sistema → **Finish**.
2. Pulsa ▶ y espera a que el emulador muestre la pantalla de inicio.
3. Define las variables del SDK en la terminal (PowerShell):
   ```powershell
   $env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
   $env:Path += ";$env:ANDROID_HOME\platform-tools"
   ```
   Para hacerlo permanente, agrega `ANDROID_HOME` y `platform-tools` a las variables de entorno de Windows.
4. Verifica que el emulador sea visible:
   ```powershell
   adb devices
   ```
5. Arranca la app:
   ```bash
   npx expo start --android
   ```
   Expo instala Expo Go en el emulador y abre el proyecto. La primera vez tarda.

Requisito: virtualización activada en la BIOS y **Hyper-V / Windows Hypervisor Platform** habilitado.

### Opción B: celular físico con Expo Go

1. Instala **Expo Go** (Play Store / App Store) y actualízalo a la última versión.
2. Conecta celular y PC a la **misma red Wi-Fi**.
3. Ejecuta:
   ```bash
   npx expo start
   ```
4. Escanea el QR (Android: desde Expo Go; iPhone: desde la cámara).
5. Si la red no lo permite (redes institucionales): `npx expo start --tunnel`.

### Opción C: navegador

```bash
npx expo start --web
```

> iOS Simulator solo está disponible en Mac con Xcode.

## 5. Atajos en la terminal de Expo

| Tecla | Acción |
|---|---|
| `a` | Abrir en Android |
| `w` | Abrir en web |
| `r` | Recargar la app |
| `Ctrl + C` | Detener el servidor |

Al guardar un archivo, la app se actualiza sola.

## 6. Validar antes de subir cambios

```bash
npx tsc --noEmit    # tipos
npx expo lint       # lint
```

Ambos deben terminar sin errores.

## 7. Flujo de trabajo con Git

1. Actualiza `main`: `git checkout main && git pull`.
2. Crea tu rama: `git checkout -b feat/nombre-descriptivo`.
3. Haz commits pequeños con mensajes claros (`feat:`, `fix:`, `docs:`).
4. Sube la rama: `git push -u origin feat/nombre-descriptivo`.
5. Abre un Pull Request hacia `main`. No hagas push directo a `main`.

## 8. Problemas frecuentes

| Problema | Solución |
|---|---|
| `adb` no se reconoce | Define `ANDROID_HOME` y agrega `platform-tools` al `Path` (paso 3 de la opción A) |
| Expo Go dice "versión incompatible" | Actualiza Expo Go; el proyecto usa SDK 58 |
| El celular no conecta al QR | Misma Wi-Fi, o usa `--tunnel` |
| Puerto 8081 ocupado | Cierra el otro Metro o acepta usar otro puerto |
| Error por módulo nativo no incluido en Expo Go | Usa un development build: `npx expo run:android` |
| Dependencias raras tras cambiar de rama | Borra `node_modules` y ejecuta `npm install` |
| Caché corrupta de Metro | `npx expo start -c` |
