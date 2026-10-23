
import {
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function ListadoPrendas({
  productos = [],
  onSeleccionarProducto,
}) {
  const renderPrenda = ({ item }) => (
    <Pressable
      style={styles.tarjeta}
      disabled={!onSeleccionarProducto}
      onPress={() => onSeleccionarProducto?.(item)}
    >
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

      <Text style={styles.nombre} numberOfLines={2}>
        {item.nombre}
      </Text>

      <Text style={styles.precio}>
        ${Number(item.precio || 0).toFixed(2)}
      </Text>
    </Pressable>
  );

  return (
    <FlatList
      data={productos}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderPrenda}
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
  nombre: {
    fontSize: 14,
    marginTop: 8,
    color: '#000000',
  },
  precio: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#000000',
  },
  mensaje: {
    textAlign: 'center',
    marginTop: 30,
    color: '#666666',
  },
});
