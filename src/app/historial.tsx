import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; // Tu archivo de conexión
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function HistorialScreen() {
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
          
          const listaPedidos = pedidosSnap.docs.map(doc => {
            const data = doc.data();
            return {
              id: data.ID_Pedido,
              fecha: new Date(data.Fecha_Pedido).toLocaleDateString('es-SV'),
              total: data.Total,
              // Mapeamos el ID del estado (1=Entregado, 4=Pendiente, etc. Como no tenemos los nombres exactos, ponemos colores por defecto)
              estado: data.ID_EstadoPedidoo === 1 ? 'ENTREGADO' : (data.ID_EstadoPedidoo === 4 ? 'PENDIENTE' : 'EN CAMINO'),
              colorEstado: data.ID_EstadoPedidoo === 1 ? '#2e7d32' : (data.ID_EstadoPedidoo === 4 ? '#F9A825' : '#1976D2'),
              nombre: 'Pedido #' + data.ID_Pedido, // Podríamos buscar los detalles, pero por ahora mostramos el ID
              precio: data.Total,
              cantidad: 1,
              talla: 'Ver detalle',
              imagen: 'https://via.placeholder.com/100',
              metodoPago: 'Tarjeta/Simulado',
            };
          });

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