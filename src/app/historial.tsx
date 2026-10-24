import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebase'; // archivo de conexión

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
          const idUser = userSnap.docs[0].data().ID_User;

          // 2. Buscar los pedidos de ese usuario
          const qPedidos = query(collection(db, 'Pedido'), where('ID_User', '==', idUser));
          const pedidosSnap = await getDocs(qPedidos);
          
          const listaPedidos = await Promise.all(pedidosSnap.docs.map(async (doc) => {
            const data = doc.data();
            let urlImagen = 'https://via.placeholder.com/100';
            let nombreProducto = 'Pedido #' + data.ID_Pedido;

            try {
              // 3. Buscar el detalle para obtener la variante
              const qDetalle = query(collection(db, 'Pedido_Detalle'), where('ID_Pedido', '==', data.ID_Pedido));
              const detalleSnap = await getDocs(qDetalle);
              
              if (!detalleSnap.empty) {
                const idVariante = detalleSnap.docs[0].data().ID_Variante;

                // 4. Buscar la variante para obtener el producto
                const qVariante = query(collection(db, 'Variante_Producto'), where('ID_Variante', '==', idVariante));
                const varianteSnap = await getDocs(qVariante);

                if (!varianteSnap.empty) {
                  const idProducto = varianteSnap.docs[0].data().ID_Producto;

                  // 5. Buscar el producto y sus fotos reales
                  const qProducto = query(collection(db, 'Productos'), where('ID_Producto', '==', idProducto));
                  const productoSnap = await getDocs(qProducto);

                  if (!productoSnap.empty) {
                    nombreProducto = productoSnap.docs[0].data().Nombre_Producto || nombreProducto;
                  }

                  const qFotos = query(collection(db, 'Fotos_Productos'), where('ID_Producto', '==', Number(idProducto)));
                  const fotosSnap = await getDocs(qFotos);
                  
                  if (!fotosSnap.empty) {
                    const fotosArray = fotosSnap.docs.map(d => d.data()).sort((a, b) => (a.Orden || 0) - (b.Orden || 0));
                    if (fotosArray[0] && fotosArray[0].URL_Foto) {
                      urlImagen = fotosArray[0].URL_Foto;
                    }
                  }
                }
              }
            } catch (err) {
              console.log("Error buscando foto:", err);
            }

            return {
              id: data.ID_Pedido,
              fecha: new Date(data.Fecha_Pedido).toLocaleDateString('es-SV'),
              total: data.Total,
              estado: data.ID_EstadoPedidoo === 1 ? 'ENTREGADO' : (data.ID_EstadoPedidoo === 4 ? 'PENDIENTE' : 'EN CAMINO'),
              colorEstado: data.ID_EstadoPedidoo === 1 ? '#2e7d32' : (data.ID_EstadoPedidoo === 4 ? '#F9A825' : '#1976D2'),
              nombre: nombreProducto, 
              precio: data.Total,
              cantidad: 1,
              talla: 'Ver detalle',
              imagen: urlImagen,
              metodoPago: 'Tarjeta/Simulado',
            };
          }));

          setPedidos(listaPedidos);
        }
      } catch (error) {
        console.error("Error cargando pedidos:", error);
      } finally {
        setCargando(false);
      }
    });

    return () => cancelar();
  }, []);

  // --- VISTA DE DETALLE ---
  if (pedidoSeleccionado) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.titulo}>DETALLE DE COMPRA</Text>
        </View>
        <ScrollView style={{ padding: 20 }}>
          <View style={styles.detalleCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.detalleNombre}>{pedidoSeleccionado.nombre}</Text>
              <View style={[styles.estadoBadge, { backgroundColor: pedidoSeleccionado.colorEstado }]}>
                <Text style={styles.estadoTexto}>{pedidoSeleccionado.estado}</Text>
              </View>
            </View>
            
            <Text style={styles.detallePrecio}>${pedidoSeleccionado.total.toFixed(2)}</Text>

            <View style={styles.lineaDivisoria} />
            <View style={styles.filaTotal}><Text style={styles.textoTotal}>SUBTOTAL</Text><Text style={styles.textoTotal}>${pedidoSeleccionado.total.toFixed(2)}</Text></View>
            <View style={styles.lineaDivisoria} />
            <View style={styles.filaTotal}><Text style={[styles.textoTotal, { fontWeight: 'bold', fontSize: 16 }]}>TOTAL</Text><Text style={[styles.textoTotal, { fontWeight: 'bold', fontSize: 16 }]}>${pedidoSeleccionado.total.toFixed(2)}</Text></View>
            <View style={styles.lineaDivisoria} />

            <View style={styles.filaInfo}><Text style={styles.labelInfo}>ID TRANSACCIÓN</Text><Text style={styles.valorInfo}>#{pedidoSeleccionado.id}</Text></View>
            <View style={styles.filaInfo}><Text style={styles.labelInfo}>FECHA</Text><Text style={styles.valorInfo}>{pedidoSeleccionado.fecha}</Text></View>

            <View style={styles.qrContainer}>
              <Image 
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PEDIDO-${pedidoSeleccionado.id}` }} 
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
                <Text style={styles.nombreProducto}>{pedido.nombre}</Text>
                <Text style={styles.precio}>${pedido.precio.toFixed(2)}</Text>
                <Text style={styles.talla}>Ver detalles de envío</Text>
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
  detalleNombre: { fontSize: 14, fontWeight: 'bold', color: '#000', flex: 1, marginRight: 10 },
  detallePrecio: { fontSize: 16, marginTop: 10 },
  lineaDivisoria: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 15 },
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  textoTotal: { fontSize: 14, color: '#000' },
  filaInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  labelInfo: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  valorInfo: { fontSize: 12, color: '#555' },
  qrContainer: { alignItems: 'center', marginTop: 20 }
});