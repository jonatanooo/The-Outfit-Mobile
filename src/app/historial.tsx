import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';

export default function HistorialScreen() {
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);

  const pedidosPrueba = [
    {
      id: 'PED-001',
      fecha: '05/08/2026',
      total: 35.99,
      estado: 'ENTREGADO',
      colorEstado: '#2e7d32', // Verde
      nombre: 'VESTIDO MINI TIRANTES PRINT',
      precio: 35.99,
      cantidad: 1,
      talla: 'S MARRÓN',
      imagen: 'https://via.placeholder.com/100',
      metodoPago: 'VISA TERMINADA EN 1234',
    },
    {
      id: 'PED-002',
      fecha: '05/08/2026',
      total: 49.99,
      estado: 'EN CAMINO',
      colorEstado: '#1976D2', // Azul
      nombre: 'CAZADORA EFECTO PIEL',
      precio: 49.99,
      cantidad: 1,
      talla: 'L NEGRA',
      imagen: 'https://via.placeholder.com/100',
      metodoPago: 'PAYPAL',
    },
    {
      id: 'PED-003',
      fecha: '05/08/2026',
      total: 35.99,
      estado: 'PENDIENTE',
      colorEstado: '#F9A825', // Amarillo
      nombre: 'VESTIDO MINI CORSÉ RÚSTICO',
      precio: 35.99,
      cantidad: 1,
      talla: 'M BLANCO',
      imagen: 'https://via.placeholder.com/100',
      metodoPago: 'TARJETA DE REGALO',
    }
  ];

  // --- VISTA DE DETALLE (La que pediste con el QR) ---
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
            
            <Text style={styles.detallePrecio}>${pedidoSeleccionado.precio.toFixed(2)} x {pedidoSeleccionado.cantidad}</Text>
            <Text style={styles.detalleTalla}>TALLA {pedidoSeleccionado.talla}</Text>

            <Image source={{ uri: pedidoSeleccionado.imagen }} style={styles.detalleImagen} />

            <View style={styles.lineaDivisoria} />
            <View style={styles.filaTotal}><Text style={styles.textoTotal}>SUBTOTAL</Text><Text style={styles.textoTotal}>${pedidoSeleccionado.total.toFixed(2)}</Text></View>
            <View style={styles.filaTotal}><Text style={styles.textoTotal}>GASTOS DE ENVÍO</Text><Text style={styles.textoTotal}>GRATIS</Text></View>
            <View style={styles.lineaDivisoria} />
            <View style={styles.filaTotal}><Text style={[styles.textoTotal, { fontWeight: 'bold', fontSize: 16 }]}>TOTAL</Text><Text style={[styles.textoTotal, { fontWeight: 'bold', fontSize: 16 }]}>${pedidoSeleccionado.total.toFixed(2)}</Text></View>
            <View style={styles.lineaDivisoria} />

            <View style={styles.filaInfo}><Text style={styles.labelInfo}>ID TRANSACCIÓN</Text><Text style={styles.valorInfo}>#{pedidoSeleccionado.id}43546456757</Text></View>
            <View style={styles.filaInfo}><Text style={styles.labelInfo}>FECHA Y HORA</Text><Text style={styles.valorInfo}>{pedidoSeleccionado.fecha} 01:29 AM</Text></View>
            <View style={styles.filaInfo}><Text style={styles.labelInfo}>LUGAR DE ENVÍO</Text><Text style={styles.valorInfo}>SUCURSAL THE OUTFIT</Text></View>
            <View style={styles.filaInfo}><Text style={styles.labelInfo}>MÉTODO DE PAGO</Text><Text style={styles.valorInfo}>{pedidoSeleccionado.metodoPago}</Text></View>

            <View style={styles.qrContainer}>
              <Image 
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${pedidoSeleccionado.id}` }} 
                style={{ width: 100, height: 100 }} 
              />
            </View>
          </View>
          
          {/* Botón para volver a la lista */}
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

      <ScrollView style={styles.listaContainer}>
        {pedidosPrueba.map((pedido) => (
          <TouchableOpacity 
            key={pedido.id} 
            style={styles.tarjetaPedido}
            onPress={() => setPedidoSeleccionado(pedido)}
          >
            <Image source={{ uri: pedido.imagen }} style={styles.imagenProducto} />

            <View style={styles.detallesContainer}>
              <Text style={styles.nombreProducto}>{pedido.nombre}</Text>
              <Text style={styles.precio}>${pedido.precio.toFixed(2)} x {pedido.cantidad}</Text>
              <Text style={styles.talla}>TALLA {pedido.talla}</Text>
            </View>

            <View style={[styles.estadoBadge, { backgroundColor: pedido.colorEstado }]}>
              <Text style={styles.estadoTexto}>{pedido.estado}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  detalleTalla: { fontSize: 14, color: '#666', marginBottom: 15 },
  detalleImagen: { width: '60%', height: 200, alignSelf: 'center', resizeMode: 'contain', marginBottom: 20, backgroundColor: '#f9f9f9', borderRadius: 8 },
  lineaDivisoria: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 15 },
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  textoTotal: { fontSize: 14, color: '#000' },
  filaInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  labelInfo: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  valorInfo: { fontSize: 12, color: '#555' },
  qrContainer: { alignItems: 'center', marginTop: 20 }
});