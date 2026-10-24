import { Ionicons } from '@expo/vector-icons';
import {
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ListadoPrendas({
  productos = [],
  onSeleccionarProducto,
  esFavorito,
  onToggleFavorito,
}) {
  const renderPrenda = ({ item }) => {
    const enOferta = item.enOferta && Number(item.porcentajeDescuento) > 0;
    const favorito = esFavorito ? esFavorito(item.id) : false;

    return (
      <Pressable
        style={styles.tarjeta}
        disabled={!onSeleccionarProducto}
        onPress={() => onSeleccionarProducto?.(item)}
      >
        <View>
          {item.imagen ? (
            <Image
              source={{ uri: item.imagen }}
              style={styles.imagen}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.imagen, styles.sinImagen]}>
              <Text>Sin imagen</Text>
            </View>
          )}

          {enOferta && (
            <View style={styles.etiquetaDescuento}>
              <Text style={styles.textoDescuento}>-{item.porcentajeDescuento}%</Text>
            </View>
          )}
        </View>

        <View style={styles.filaDetalle}>
          <View style={styles.columnaTexto}>
            <Text style={styles.nombre} numberOfLines={2}>
              {item.nombre}
            </Text>

            {item.enOferta ? (
              <View style={styles.filaPrecio}>
                <Text style={styles.precioOriginal}>
                  ${Number(item.precioOriginal || 0).toFixed(2)}
                </Text>
                <Text style={styles.precioOferta}>
                  ${Number(item.precio || 0).toFixed(2)}
                </Text>
              </View>
            ) : (
              <Text style={styles.precio}>
                ${Number(item.precio || 0).toFixed(2)}
              </Text>
            )}
          </View>

          {onToggleFavorito && (
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={8}
              style={styles.botonCorazon}
              onPress={() => onToggleFavorito(item)}
            >
              <Ionicons
                name={favorito ? 'heart' : 'heart-outline'}
                size={18}
                color="#000000"
              />
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <FlatList
      data={productos}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderPrenda}
      extraData={esFavorito}
      numColumns={2}
      columnWrapperStyle={styles.fila}
      contentContainerStyle={styles.contenedor}
      ListEmptyComponent={
        <Text style={styles.mensaje}>
          No hay prendas para mostrar.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  contenedor: {
    padding: 12,
  },
  fila: {
    justifyContent: 'space-between',
  },
  tarjeta: {
    width: '48%',
    marginBottom: 20,
  },
  imagen: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: '#eeeeee',
  },
  sinImagen: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  etiquetaDescuento: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  textoDescuento: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  filaDetalle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  columnaTexto: {
    flex: 1,
  },
  nombre: {
    fontSize: 14,
    color: '#000000',
  },
  precio: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#000000',
  },
  filaPrecio: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  precioOriginal: {
    fontSize: 12,
    color: '#777777',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  precioOferta: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  botonCorazon: {
    paddingLeft: 6,
    paddingTop: 1,
  },
  mensaje: {
    textAlign: 'center',
    marginTop: 30,
    color: '#666666',
  },
});
