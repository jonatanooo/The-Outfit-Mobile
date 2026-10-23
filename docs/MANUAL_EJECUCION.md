# Manual de ejecución

Pasos para correr **The Outfit Mobile** en un emulador Android (Pixel 8) en Windows.

## Antes de empezar

Instala estos programas:

- [Node.js 20 LTS o superior](https://nodejs.org)
- [Git](https://git-scm.com)
- [Android Studio](https://developer.android.com/studio)

Y activa la virtualización en la BIOS y **Windows Hypervisor Platform** en Windows.

## Paso 1: Clonar el repositorio

Clónalo en una **carpeta con ruta corta** (por ejemplo `C:\dev`). Windows falla al compilar si la ruta es muy larga.

```powershell
mkdir C:\dev
cd C:\dev
git clone <url-del-repositorio>
cd The-Outfit-Mobile
```

## Paso 2: Instalar dependencias

```powershell
npm install
```

## Paso 3: Crear el archivo `.env`

En la raíz del proyecto crea un archivo llamado `.env` con esta línea (es para el inicio de sesión con Google):

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=317665000506-7nh1dr5smdo6lpevda7gao8ki859gopf.apps.googleusercontent.com
```

## Paso 4: Crear el emulador

1. Abre Android Studio y entra a **Device Manager**.
2. Pulsa **Create Device**, elige **Pixel 8** y descarga una imagen del sistema.
3. Pulsa ▶ y espera a que el emulador muestre la pantalla de inicio.

## Paso 5: Configurar Android en la terminal

Ejecuta esto en PowerShell (hay que repetirlo cada vez que abras una terminal nueva):

```powershell
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:Path += ";$env:ANDROID_HOME\platform-tools"
```

Comprueba que el emulador aparece en la lista:

```powershell
adb devices
```

## Paso 6: Compilar e instalar la app

```powershell
npx expo run:android
```

La primera vez tarda entre 10 y 20 minutos. Después tarda 1 o 2. Al terminar, la app se abre sola en el emulador.

> Se usa `run:android` y no Expo Go porque el inicio de sesión con Google necesita código nativo.

## Paso 7: Abrir la app otra vez

Ya no hace falta compilar. Solo inicia el servidor:

```powershell
npx expo start --dev-client
```

Con el emulador abierto, pulsa `a` en la terminal. Los cambios en el código se ven al guardar.

Solo vuelve a ejecutar el paso 6 si instalas una librería nativa nueva o cambias `app.json`.

## Problemas frecuentes

| Problema | Solución |
|---|---|
| `adb` no se reconoce | Repite el paso 5 |
| Error `ninja: mkdir ... No such file or directory` al compilar | La ruta del proyecto es muy larga. Clónalo en `C:\dev` (paso 1) |
| La app muestra "Unable to load script" | Inicia el servidor (paso 7) y ejecuta `adb reverse tcp:8081 tcp:8081` |
| Google dice `DEVELOPER_ERROR` | Tu SHA-1 no está registrado en Firebase. Pídelo al encargado del proyecto |
| Puerto 8081 ocupado | Cierra la otra terminal con Metro |
| Cosas raras tras cambiar de rama | Borra `node_modules` y ejecuta `npm install` |

## Subir cambios a Git

1. `git checkout main && git pull`
2. `git checkout -b feat/nombre-descriptivo`
3. Haz tus cambios y commitea.
4. `git push -u origin feat/nombre-descriptivo`
5. Abre un Pull Request hacia `main`. No hagas push directo a `main`.
