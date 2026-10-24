import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Modal,
  Alert,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomBottomTabBar from './CustomBottomTabBar';
import { ID_CATEGORIA_HOMBRE, ID_CATEGORIA_MUJER } from '../lib/productos';
import { formatoPrecio } from '../lib/tienda';

const FONT = 'Instrument Sans SemiBold';
const FILTROS = { TODOS: null, MUJER: ID_CATEGORIA_MUJER, HOMBRE: ID_CATEGORIA_HOMBRE };

function TarjetaPrenda({ item, ancho, esFavorito, onToggleFavorito, onAbrirProducto, onCambiarCantidad }) {
  const restar = () => {
    if (item.cantidad > 1) {
      onCambiarCantidad(item.idVariante, item.cantidad - 1);
      return;
    }
    Alert.alert('Quitar de la cesta', `¿Quitar "${item.nombre}" de tu cesta?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => onCambiarCantidad(item.idVariante, 0) },
    ]);
  };

  const sumar = () => {
    const resultado = onCambiarCantidad(item.idVariante, item.cantidad + 1);
    if (resultado && !resultado.ok && resultado.mensaje) Alert.alert('Stock limitado', resultado.mensaje);
  };

  return (
    <View style={[styles.tarjeta, { width: ancho }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => onAbrirProducto(item.idProducto)}>
        {item.imagen ? (
          <Image source={{ uri: item.imagen }} style={[styles.imagen, { width: ancho, height: ancho * 1.3 }]} resizeMode="cover" />
        ) : (
          <View style={[styles.imagen, styles.sinImagen, { width: ancho, height: ancho * 1.3 }]}>
            <Text style={styles.sinImagenTexto}>Sin imagen</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.tarjetaInfo}>
        <View style={styles.tarjetaTextos}>
          <Text style={styles.nombre} numberOfLines={1}>
            {item.nombre.toUpperCase()}
          </Text>
          <View style={styles.precioFila}>
            {item.enOferta && <Text style={styles.precioOriginal}>{formatoPrecio(item.precioOriginal)}</Text>}
            <Text style={styles.precio}>
              {formatoPrecio(item.precio)} x {item.cantidad}
            </Text>
          </View>
          <Text style={styles.variante} numberOfLines={1}>
            TALLA {item.talla}
            {item.color ? ` ${item.color.toUpperCase()}` : ''}
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onToggleFavorito(item)} style={styles.corazon} hitSlop={8}>
          <Ionicons name={esFavorito ? 'heart' : 'heart-outline'} size={22} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.cantidadPastilla}>
        <TouchableOpacity activeOpacity={0.7} onPress={restar} style={styles.cantidadBoton} hitSlop={6}>
          <Ionicons name="remove" size={16} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.cantidadTexto}>{item.cantidad}</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={sumar} style={styles.cantidadBoton} hitSlop={6}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CarritoModal({
  visible,
  items,
  subtotal,
  onCerrar,
  onNavegar,
  onCambiarCantidad,
  esFavorito,
  onToggleFavorito,
  onAbrirProducto,
  onContinuar,
}) {
  const { width } = useWindowDimensions();
  const ancho = width / 2;
  const [filtro, setFiltro] = useState('TODOS');
  const [mostrarFiltro, setMostrarFiltro] = useState(false);

  const visibles = useMemo(() => {
    const genero = FILTROS[filtro];
    return genero == null ? items : items.filter((i) => Number(i.idGenero) === genero);
  }, [items, filtro]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar}>
      <SafeAreaView edges={['top']} style={styles.pantalla}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.encabezado}>
          <Text style={styles.encabezadoTitulo}>CARRITO</Text>
        </View>

        <View style={styles.filtroBarra}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setMostrarFiltro(!mostrarFiltro)} style={styles.filtroBoton}>
            <Text style={styles.filtroTexto}>FILTRAR {filtro !== 'TODOS' ? `(${filtro})` : ''}</Text>
            <Ionicons name={mostrarFiltro ? 'chevron-up' : 'chevron-down'} size={14} color="#000000" style={styles.filtroFlecha} />
          </TouchableOpacity>
          {mostrarFiltro && (
            <View style={styles.chipsFila}>
              {Object.keys(FILTROS).map((opcion) => {
                const activo = filtro === opcion;
                return (
                  <TouchableOpacity
                    key={opcion}
                    activeOpacity={0.7}
                    onPress={() => {
                      setFiltro(opcion);
                      setMostrarFiltro(false);
                    }}
                    style={[styles.chip, activo && styles.chipActivo]}
                  >
                    <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{opcion}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <FlatList
          style={styles.lista}
          data={visibles}
          keyExtractor={(item) => `cesta-${item.idVariante}`}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={visibles.length === 0 ? styles.listaVaciaContenido : styles.listaContenido}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Ionicons name="basket-outline" size={52} color="#A0A0A0" />
              <Text style={styles.vacioTitulo}>
                {items.length === 0 ? 'Tu cesta está vacía' : `No hay prendas de ${filtro} en tu cesta`}
              </Text>
              <Text style={styles.vacioTexto}>
                {items.length === 0
                  ? 'Añade las prendas que te gusten desde su ficha de producto.'
                  : 'Cambia el filtro para ver el resto de tu cesta.'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={items.length === 0 ? onCerrar : () => setFiltro('TODOS')}
                style={styles.vacioBoton}
              >
                <Text style={styles.vacioBotonTexto}>{items.length === 0 ? 'SEGUIR COMPRANDO' : 'VER TODO'}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TarjetaPrenda
              item={item}
              ancho={ancho}
              esFavorito={esFavorito(item.idProducto)}
              onToggleFavorito={onToggleFavorito}
              onAbrirProducto={onAbrirProducto}
              onCambiarCantidad={onCambiarCantidad}
            />
          )}
        />

        {items.length > 0 && (
          <View style={styles.totalBloque}>
            <TouchableOpacity activeOpacity={0.85} onPress={onContinuar} style={styles.totalBoton}>
              <Text style={styles.totalTexto}>TOTAL {formatoPrecio(subtotal)}</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        <CustomBottomTabBar activeTab="cesta" onTabPress={onNavegar} enFlujo />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  encabezado: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#B9C3D3',
  },
  encabezadoTitulo: { fontFamily: FONT, fontSize: 22, letterSpacing: 4, color: '#000000' },

  filtroBarra: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D9D9D9',
  },
  filtroBoton: { flexDirection: 'row', alignItems: 'center' },
  filtroTexto: { fontFamily: FONT, fontSize: 13, letterSpacing: 1.2, color: '#000000' },
  filtroFlecha: { marginLeft: 6 },
  chipsFila: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  chipActivo: { backgroundColor: '#000000' },
  chipTexto: { fontFamily: FONT, fontSize: 12, letterSpacing: 1, color: '#000000' },
  chipTextoActivo: { color: '#FFFFFF' },

  lista: { flex: 1 },
  listaContenido: { paddingBottom: 16 },
  listaVaciaContenido: { flexGrow: 1, justifyContent: 'center' },

  tarjeta: { backgroundColor: '#FFFFFF', paddingBottom: 18 },
  imagen: { backgroundColor: '#F2F2F2' },
  sinImagen: { alignItems: 'center', justifyContent: 'center' },
  sinImagenTexto: { fontFamily: FONT, fontSize: 12, color: '#8A8A8A' },
  tarjetaInfo: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 10, paddingTop: 10 },
  tarjetaTextos: { flex: 1 },
  nombre: { fontFamily: FONT, fontSize: 12, letterSpacing: 0.4, color: '#000000' },
  precioFila: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 },
  precioOriginal: { fontFamily: FONT, fontSize: 11, color: '#8A8A8A', textDecorationLine: 'line-through' },
  precio: { fontFamily: FONT, fontSize: 12, color: '#1A1A1A' },
  variante: { fontFamily: FONT, fontSize: 10, letterSpacing: 0.6, color: '#6B6B6B', marginTop: 2 },
  corazon: { paddingLeft: 6, paddingTop: 2 },

  cantidadPastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'center',
    backgroundColor: '#000000',
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 32,
    width: '80%', // 80 % del ancho de la tarjeta de la prenda, centrada
  },
  cantidadBoton: { width: 26, height: 28, alignItems: 'center', justifyContent: 'center' },
  cantidadTexto: { fontFamily: FONT, fontSize: 13, color: '#FFFFFF' },

  vacio: { alignItems: 'center', paddingHorizontal: 32 },
  vacioTitulo: { fontFamily: FONT, fontSize: 16, color: '#000000', marginTop: 14, textAlign: 'center' },
  vacioTexto: { fontFamily: FONT, fontSize: 13, color: '#6B6B6B', marginTop: 6, textAlign: 'center', lineHeight: 19 },
  vacioBoton: {
    marginTop: 22,
    height: 46,
    paddingHorizontal: 28,
    borderRadius: 23,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacioBotonTexto: { fontFamily: FONT, fontSize: 13, letterSpacing: 1.5, color: '#FFFFFF' },

  totalBloque: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6E6E6',
  },
  totalBoton: {
    height: 48,
    minWidth: 220,
    paddingHorizontal: 28,
    borderRadius: 24,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  totalTexto: { fontFamily: FONT, fontSize: 16, letterSpacing: 0.8, color: '#FFFFFF' },
});
