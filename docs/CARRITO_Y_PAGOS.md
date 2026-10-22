# Carrito y proceso de compra

Flujo: **Cesta → Método de envío → Método de pago → Pago → Confirmación**. Los pagos (tarjeta bancaria, PayPal y tarjeta de regalo) son **simulados**: no hay ninguna pasarela real ni se envía información a terceros. Se puede escribir **cualquier dato**; solo se comprueba que tenga el formato correcto y el pago siempre se aprueba.

## Estructura

| Archivo | Qué hace |
|---|---|
| `src/lib/CarritoContext.js` | Estado de la cesta (persistente con AsyncStorage): agregar, cambiar cantidad, vaciar y totales. |
| `src/lib/pedidos.js` | Direcciones del usuario y `crearPedido` (valida stock/precios, cobra y registra todo en una sola transacción de Firestore). |
| `src/lib/pagoSimulado.js` | Validaciones de los tres métodos de pago y la pasarela simulada. |
| `src/lib/tienda.js` | Dirección de la tienda, costo de envío y utilidades de formato de precios. |
| `src/lib/productos.js` | Ahora también devuelve `variantes` (talla, color, precio y stock) de cada prenda. |
| `src/components/CarritoScreen.js` | Pantalla de la cesta (cuadrícula, cantidades, favoritos, filtro y total). |
| `src/components/CheckoutScreen.js` y `src/components/checkout/*` | Pasos del proceso de compra. |

## Datos que se guardan en Firestore

Misma estructura que usaba la versión web:

- `Pedido`: `ID_Pedido`, `ID_User`, `ID_Direccion` (o `null` si es recogida en tienda), `Fecha_Pedido`, `Subtotal` (precio original), `Descuento`, `Total` (incluye envío), `ID_EstadoPedidoo`, y además `Tipo_Entrega` y `Costo_Envio`.
- `Pedido_Detalle`: una fila por prenda (`ID_Variante`, `Cantidad`, `Precio_Unitario`, `Subtotal`).
- `Transacciones_Pago`: `Metodo_Pago`, `Estado_transaccion`, y además `Referencia_Pago` (referencia simulada) y `Simulado: true`. **Ningún dato de pago se guarda** (ni número de tarjeta, ni fecha, ni CVV, ni titular, ni correo de PayPal, ni código de regalo): solo se muestran en la pantalla de confirmación.
- `Inventario`: se descuenta `Cantidad_Disponible` en la misma transacción.
- `Direcciones`: se crea al usar "Agregar dirección".

## Reglas de negocio

- Pagar exige sesión iniciada; si no la hay, se pide y luego se continúa con la compra.
- Antes de cobrar se vuelven a leer precios y stock de la base de datos. Si algo cambió o se agotó, se avisa y no se cobra.
- Si el pago fallara (una pasarela real podría rechazarlo), no se escribe nada en la base de datos.
- Envío a domicilio: `$3.50`, gratis desde `$50.00`. Recoger en tienda: gratis. Se cambia en `src/lib/tienda.js`.

## Formatos que se validan

| Método | Campo | Formato |
|---|---|---|
| Tarjeta | Número | 16 dígitos (15 si empieza con 34 o 37), se agrupa al escribir; cualquier número vale |
| Tarjeta | Fecha de caducidad | `DD/MM/YY` con una fecha de calendario posible (no se exige que sea futura) |
| Tarjeta | CVV | 3 dígitos (4 en American Express) |
| Tarjeta | Titular | Solo letras y espacios (mín. 3 caracteres) |
| PayPal | Correo y contraseña | Correo con formato válido y contraseña de 6+ caracteres |
| Regalo | Código y PIN | Código de 16 letras/números (`XXXX-XXXX-XXXX-XXXX`) y PIN de 4 dígitos |

## Notas

- Si una prenda tiene variantes sin talla registrada, se muestran como talla "Única".
- Una talla sin stock no se puede añadir a la cesta.
- La cesta se guarda en el dispositivo (no en Firestore); las colecciones `Carrito` y `Carrito_Detalle` no se usan en la app móvil.
