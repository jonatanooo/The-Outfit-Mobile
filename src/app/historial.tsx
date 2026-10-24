import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebase'; // archivo de conexión
import { textoDireccion } from '../lib/pedidos';
import { TIENDA_DIRECCION } from '../lib/tienda';

const IMAGEN_VACIA = 'https://via.placeholder.com/100';
const dinero = (n: any) => `$${Number(n || 0).toFixed(2)}`;

// Los catálogos pequeños (tallas, colores) se leen una sola vez para todos los pedidos.
async function cargarCatalogos() {
  const [tallaSnap, tiposSnap, colorSnap] = await Promise.all([
    getDocs(collection(db, 'Talla')),
    getDocs(collection(db, 'Tipos_Talla')),
    getDocs(collection(db, 'Colores')),
  ]);
  const tipos: Record<string, string> = {};
  tiposSnap.docs.forEach((d) => {
    const t = d.data();
    tipos[String(t.ID_TipoTalla ?? d.id)] = t.Nombre_TipoTalla;
  });
  const tallas: Record<string, string> = {};
  tallaSnap.docs.forEach((d) => {
    const t = d.data();
    tallas[String(t.ID_Talla ?? d.id)] = tipos[String(t.ID_TipoTalla)] || '';
  });
  const colores: Record<string, string> = {};
  colorSnap.docs.forEach((d) => {
    const c = d.data();
    if (c.Nombre_Color) colores[String(c.ID_Color ?? d.id)] = c.Nombre_Color;
  });
  return { tallas, colores };
}

// Un artículo del pedido: nombre, foto, talla/color, cantidad y precios.
async function cargarArticulo(detalle: any, catalogos: any) {
  const articulo = {
    nombre: `Artículo #${detalle.ID_Variante}`,
    imagen: IMAGEN_VACIA,
    talla: '',
    color: '',
    cantidad: Number(detalle.Cantidad || 1),
    precioUnitario: Number(detalle.Precio_Unitario || 0),
    subtotal: Number(detalle.Subtotal ?? Number(detalle.Precio_Unitario || 0) * Number(detalle.Cantidad || 1)),
  };

  try {
    const varSnap = await getDocs(query(collection(db, 'Variante_Producto'), where('ID_Variante', '==', detalle.ID_Variante)));
    if (varSnap.empty) return articulo;
    const variante = varSnap.docs[0].data();
    articulo.talla = catalogos.tallas[String(variante.ID_Talla)] || '';
    articulo.color = variante.ID_Color != null ? catalogos.colores[String(variante.ID_Color)] || '' : '';

    const idProducto = variante.ID_Producto;
    const [prodSnap, fotosSnap] = await Promise.all([
      getDocs(query(collection(db, 'Productos'), where('ID_Producto', '==', idProducto))),
      getDocs(query(collection(db, 'Fotos_Productos'), where('ID_Producto', '==', Number(idProducto)))),
    ]);
    if (!prodSnap.empty) articulo.nombre = prodSnap.docs[0].data().Nombre_Producto || articulo.nombre;
    if (!fotosSnap.empty) {
      const fotos = fotosSnap.docs.map((d) => d.data()).sort((a: any, b: any) => (a.Orden || 0) - (b.Orden || 0));
      if (fotos[0]?.URL_Foto) articulo.imagen = fotos[0].URL_Foto;
    }
  } catch (err) {
    console.log('Error buscando datos del artículo:', err);
  }
  return articulo;
}

async function cargarPedido(data: any, catalogos: any, correo: string) {
  const [detalleSnap, pagoSnap] = await Promise.all([
    getDocs(query(collection(db, 'Pedido_Detalle'), where('ID_Pedido', '==', data.ID_Pedido))),
    getDocs(query(collection(db, 'Transacciones_Pago'), where('ID_Pedido', '==', data.ID_Pedido))),
  ]);

  const articulos = await Promise.all(detalleSnap.docs.map((d) => cargarArticulo(d.data(), catalogos)));
  const pago: any = pagoSnap.empty ? null : pagoSnap.docs[0].data();

  // Lugar de envío: la dirección del cliente o la sucursal si recoge en tienda.
  let lugarEnvio = TIENDA_DIRECCION;
  if (data.Tipo_Entrega === 'Domicilio') {
    lugarEnvio = 'No disponible';
    try {
      if (data.ID_Direccion != null) {
        const dirSnap = await getDoc(doc(db, 'Direcciones', String(data.ID_Direccion)));
        if (dirSnap.exists()) lugarEnvio = textoDireccion(dirSnap.data()) || lugarEnvio;
      }
    } catch (err) {
      console.log('Error buscando la dirección:', err);
    }
  }

  const fecha = new Date(data.Fecha_Pedido);
  const total = Number(data.Total || 0);
  const costoEnvio = Number(data.Costo_Envio || 0);
  const descuento = Number(data.Descuento || 0);
  const subtotalOriginal = Number(data.Subtotal ?? total - costoEnvio + descuento);

  const nombre =
    articulos.length === 0
      ? `Pedido #${data.ID_Pedido}`
      : articulos.length === 1
        ? articulos[0].nombre
        : `${articulos[0].nombre} y ${articulos.length - 1} más`;

  return {
    id: data.ID_Pedido,
    fecha: fecha.toLocaleDateString('es-SV'),
    hora: fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }),
    total,
    subtotalOriginal,
    descuento,
    costoEnvio,
    estado: data.ID_EstadoPedidoo === 1 ? 'ENTREGADO' : (data.ID_EstadoPedidoo === 4 ? 'PENDIENTE' : 'EN CAMINO'),
    colorEstado: data.ID_EstadoPedidoo === 1 ? '#2e7d32' : (data.ID_EstadoPedidoo === 4 ? '#F9A825' : '#1976D2'),
    nombre,
    imagen: articulos[0]?.imagen || IMAGEN_VACIA,
    articulos,
    tipoEntrega: data.Tipo_Entrega === 'Domicilio' ? 'Envío a domicilio' : 'Retiro en tienda',
    lugarEnvio,
    metodoPago: pago?.Metodo_Pago || 'No disponible',
    referenciaPago: pago?.Referencia_Pago || '',
    correo,
  };
}

export default function HistorialScreen({ onVolver }: { onVolver?: () => void }) {
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCargando(false);
        return;
      }

      try {
        // 1. Obtener el ID_User del usuario logueado (buscando en la colección User)
        const qUser = query(collection(db, 'User'), where('auth_id', '==', user.uid));
        const userSnap = await getDocs(qUser);

        if (!userSnap.empty) {
          const perfil = userSnap.docs[0].data();
          const correo = perfil.Correo || user.email || '';

          // 2. Buscar los pedidos de ese usuario
          const qPedidos = query(collection(db, 'Pedido'), where('ID_User', '==', perfil.ID_User));
          const [pedidosSnap, catalogos] = await Promise.all([getDocs(qPedidos), cargarCatalogos()]);

          const lista = await Promise.all(pedidosSnap.docs.map((d) => cargarPedido(d.data(), catalogos, correo)));
          lista.sort((a, b) => Number(b.id) - Number(a.id)); // más reciente primero
          setPedidos(lista);
        }
      } catch (error) {
        console.error('Error cargando pedidos:', error);
      } finally {
        setCargando(false);
      }
    });

    return () => cancelar();
  }, []);

  // --- VISTA DE DETALLE ---
  if (pedidoSeleccionado) {
    const p = pedidoSeleccionado;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.titulo}>DETALLE DE COMPRA</Text>
        </View>
        <ScrollView style={{ padding: 20 }}>
          <View style={styles.detalleCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.seccion}>PEDIDO #{p.id}</Text>
              <View style={[styles.estadoBadge, { backgroundColor: p.colorEstado }]}>
                <Text style={styles.estadoTexto}>{p.estado}</Text>
              </View>
            </View>

            <View style={styles.lineaDivisoria} />
            <Text style={styles.seccion}>ARTÍCULOS</Text>
            {p.articulos.map((a: any, i: number) => (
              <View key={i} style={styles.filaArticulo}>
                <Image source={{ uri: a.imagen }} style={styles.imagenArticulo} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.nombreArticulo}>{a.nombre}</Text>
                  {(a.talla || a.color) ? (
                    <Text style={styles.detalleArticulo}>{[a.talla && `Talla ${a.talla}`, a.color].filter(Boolean).join(' · ')}</Text>
                  ) : null}
                  <Text style={styles.detalleArticulo}>Cantidad: {a.cantidad} × {dinero(a.precioUnitario)}</Text>
                </View>
                <Text style={styles.subtotalArticulo}>{dinero(a.subtotal)}</Text>
              </View>
            ))}

            <View style={styles.lineaDivisoria} />
            <View style={styles.filaTotal}><Text style={styles.textoTotal}>SUBTOTAL</Text><Text style={styles.textoTotal}>{dinero(p.subtotalOriginal)}</Text></View>
            {p.descuento > 0 && (
              <View style={styles.filaTotal}><Text style={styles.textoTotal}>DESCUENTO</Text><Text style={styles.textoTotal}>-{dinero(p.descuento)}</Text></View>
            )}
            <View style={styles.filaTotal}><Text style={styles.textoTotal}>ENVÍO</Text><Text style={styles.textoTotal}>{p.costoEnvio > 0 ? dinero(p.costoEnvio) : 'Gratis'}</Text></View>
            <View style={styles.lineaDivisoria} />
            <View style={styles.filaTotal}><Text style={[styles.textoTotal, { fontWeight: 'bold', fontSize: 16 }]}>TOTAL</Text><Text style={[styles.textoTotal, { fontWeight: 'bold', fontSize: 16 }]}>{dinero(p.total)}</Text></View>
            <View style={styles.lineaDivisoria} />

            <View style={styles.filaInfo}><Text style={styles.labelInfo}>FECHA</Text><Text style={styles.valorInfo}>{p.fecha}</Text></View>
            <View style={styles.filaInfo}><Text style={styles.labelInfo}>HORA</Text><Text style={styles.valorInfo}>{p.hora}</Text></View>
            <View style={styles.filaInfo}><Text style={styles.labelInfo}>TIPO DE ENTREGA</Text><Text style={styles.valorInfo}>{p.tipoEntrega}</Text></View>
            <View style={styles.filaInfo}><Text style={styles.labelInfo}>LUGAR DE ENVÍO</Text><Text style={[styles.valorInfo, styles.valorLargo]}>{p.lugarEnvio}</Text></View>
            <View style={styles.filaInfo}><Text style={styles.labelInfo}>MÉTODO DE PAGO</Text><Text style={[styles.valorInfo, styles.valorLargo]}>{p.metodoPago}</Text></View>
            {p.referenciaPago ? (
              <View style={styles.filaInfo}><Text style={styles.labelInfo}>REFERENCIA DE PAGO</Text><Text style={[styles.valorInfo, styles.valorLargo]}>{p.referenciaPago}</Text></View>
            ) : null}
            <View style={styles.filaInfo}><Text style={styles.labelInfo}>CORREO</Text><Text style={[styles.valorInfo, styles.valorLargo]}>{p.correo}</Text></View>

            <View style={styles.qrContainer}>
              <Image
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PEDIDO-${p.id}` }}
                style={{ width: 100, height: 100 }}
              />
            </View>
          </View>

          <TouchableOpacity style={{ marginTop: 20, marginBottom: 40, alignItems: 'center' }} onPress={() => setPedidoSeleccionado(null)}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', textDecorationLine: 'underline' }}>Volver a mis pedidos</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // --- VISTA DE LISTA ---
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onVolver && (
          <TouchableOpacity style={styles.botonVolver} onPress={onVolver} hitSlop={12}>
            <Text style={styles.flechaVolver}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.titulo}>HISTORIAL DE COMPRAS</Text>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color="#000" style={{ marginTop: 50 }} />
      ) : pedidos.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 50, color: '#666' }}>No tienes compras aún.</Text>
      ) : (
        <ScrollView style={styles.listaContainer}>
          {pedidos.map((pedido) => (
            <TouchableOpacity
              key={pedido.id}
              style={styles.tarjetaPedido}
              onPress={() => setPedidoSeleccionado(pedido)}
            >
              <Image source={{ uri: pedido.imagen }} style={styles.imagenProducto} />

              <View style={styles.detallesContainer}>
                <Text style={styles.nombreProducto} numberOfLines={2}>{pedido.nombre}</Text>
                <Text style={styles.precio}>{dinero(pedido.total)}</Text>
                <Text style={styles.talla}>{pedido.fecha} · {pedido.hora}</Text>
                <Text style={styles.talla}>Ver detalles del pedido</Text>
              </View>

              <View style={[styles.estadoBadge, { backgroundColor: pedido.colorEstado }]}>
                <Text style={styles.estadoTexto}>{pedido.estado}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 20, paddingBottom: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  botonVolver: { position: 'absolute', left: 8, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' },
  flechaVolver: { fontSize: 26, color: '#000' },
  titulo: { fontSize: 20, fontWeight: 'bold', letterSpacing: 2, color: '#000' },
  listaContainer: { padding: 20 },
  tarjetaPedido: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, justifyContent: 'space-between' },
  imagenProducto: { width: 70, height: 90, backgroundColor: '#f5f5f5', borderRadius: 8 },
  detallesContainer: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  nombreProducto: { fontSize: 12, fontWeight: 'bold', color: '#000', marginBottom: 4 },
  precio: { fontSize: 14, color: '#333', marginBottom: 4 },
  talla: { fontSize: 11, color: '#666' },
  estadoBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, marginLeft: 10 },
  estadoTexto: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  detalleCard: { backgroundColor: '#fff' },
  seccion: { fontSize: 14, fontWeight: 'bold', color: '#000', letterSpacing: 1 },
  filaArticulo: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  imagenArticulo: { width: 56, height: 72, backgroundColor: '#f5f5f5', borderRadius: 6 },
  nombreArticulo: { fontSize: 13, fontWeight: 'bold', color: '#000', marginBottom: 2 },
  detalleArticulo: { fontSize: 12, color: '#555', marginTop: 2 },
  subtotalArticulo: { fontSize: 13, fontWeight: 'bold', color: '#000', marginLeft: 8 },
  lineaDivisoria: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 15 },
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  textoTotal: { fontSize: 14, color: '#000' },
  filaInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  labelInfo: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  valorInfo: { fontSize: 12, color: '#555' },
  valorLargo: { flex: 1, textAlign: 'right', marginLeft: 16 },
  qrContainer: { alignItems: 'center', marginTop: 20 }
});
