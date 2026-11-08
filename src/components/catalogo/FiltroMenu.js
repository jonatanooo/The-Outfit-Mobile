
import { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function FiltroMenu({
  categoriasDisponibles = [],
  generosDisponibles = [], // solo en Ofertas y Winter Season (mezclan hombre y mujer)
  coloresDisponibles = [], // colores que existen en las prendas que se están viendo
  hexPorColor = {}, // { 'Rosa': '#f690a4' }: color real para dibujar el círculo
  tallasDisponibles = [], // tallas que existen en las prendas que se están viendo
  filtrosActivos = {},
  cantidadResultados = 0,
  onAplicarFiltros,
}) {
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [filtrosSeleccionados, setFiltrosSeleccionados] =
    useState({});

  // Las secciones sin opciones no se muestran.
  const secciones = [
    {
      titulo: 'Género',
      tipo: 'multiple',
      opciones: generosDisponibles,
    },
    {
      titulo: 'Categorias',
      tipo: 'multiple',
      opciones: categoriasDisponibles,
    },
    {
      titulo: 'Colores',
      tipo: 'multiple',
      opciones: coloresDisponibles,
    },
    {
      titulo: 'Tallas',
      tipo: 'multiple',
      opciones: tallasDisponibles,
    },
    {
      titulo: 'Ordenar Por',
      tipo: 'unica',
      opciones: [
        'Precio: menor a mayor',
        'Precio: mayor a menor',
        'Más nuevo',
      ],
    },
  ].filter((seccion) => seccion.opciones.length > 0);

  const abrirFiltros = () => {
    setFiltrosSeleccionados({ ...filtrosActivos });
    setFiltroAbierto(true);
  };

  const seleccionarFiltro = (titulo, opcion, tipo) => {
    setFiltrosSeleccionados((prev) => {
      if (tipo === 'unica') {
        return { ...prev, [titulo]: [opcion] };
      }

      const actuales = prev[titulo] || [];
      const existe = actuales.includes(opcion);

      return {
        ...prev,
        [titulo]: existe
          ? actuales.filter((item) => item !== opcion)
          : [...actuales, opcion],
      };
    });
  };

  const aplicarFiltros = () => {
    onAplicarFiltros?.(filtrosSeleccionados);
    setFiltroAbierto(false);
  };

  const quitarFiltro = (titulo, opcion) => {
    const nuevosFiltros = {
      ...filtrosActivos,
      [titulo]: (filtrosActivos[titulo] || []).filter(
        (item) => item !== opcion
      ),
    };

    onAplicarFiltros?.(nuevosFiltros);
  };

  const etiquetas = Object.entries(filtrosActivos).flatMap(
    ([titulo, opciones]) =>
      (opciones || []).map((opcion) => ({
        titulo,
        opcion,
      }))
  );

  return (
    <View style={styles.contenedor}>
      <Pressable
        style={styles.botonFiltro}
        onPress={abrirFiltros}
      >
        <Text style={styles.textoBoton}>FILTRAR</Text>
      </Pressable>

      <Text style={styles.cantidad}>
        {cantidadResultados} Items filtrados
      </Text>

      <View style={styles.etiquetas}>
        {etiquetas.length === 0 ? (
          <Text style={styles.sinFiltros}>
            No hay filtros activos
          </Text>
        ) : (
          etiquetas.map(({ titulo, opcion }) => (
            <Pressable
              key={`${titulo}-${opcion}`}
              style={styles.etiqueta}
              onPress={() => quitarFiltro(titulo, opcion)}
            >
              <Text style={styles.textoEtiqueta}>
                {opcion}  ×
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <Modal
        visible={filtroAbierto}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltroAbierto(false)}
      >
        <View style={styles.fondoModal}>
          <View style={styles.panel}>
            <Pressable
              style={styles.cerrar}
              onPress={() => setFiltroAbierto(false)}
            >
              <Text style={styles.textoCerrar}>✕</Text>
            </Pressable>

            <Text style={styles.titulo}>FILTRAR</Text>

            <ScrollView>
              {secciones.map((seccion) => (
                <View
                  key={seccion.titulo}
                  style={styles.seccion}
                >
                  <Text style={styles.tituloSeccion}>
                    {seccion.titulo}
                  </Text>

                  {seccion.opciones.map((opcion) => {
                    const seleccionado =
                      (
                        filtrosSeleccionados[
                          seccion.titulo
                        ] || []
                      ).includes(opcion);

                    const hex =
                      seccion.titulo === 'Colores' ? hexPorColor[opcion] : null;
                    const marca = seleccionado
                      ? seccion.tipo === 'unica'
                        ? '◉'
                        : '☑'
                      : seccion.tipo === 'unica'
                        ? '○'
                        : '☐';

                    return (
                      <Pressable
                        key={opcion}
                        style={[styles.opcion, hex && styles.opcionColor]}
                        onPress={() =>
                          seleccionarFiltro(
                            seccion.titulo,
                            opcion,
                            seccion.tipo
                          )
                        }
                      >
                        {hex ? (
                          <>
                            <Text style={styles.textoOpcion}>{marca}</Text>
                            <View
                              style={[styles.circuloColor, { backgroundColor: hex }]}
                            />
                            <Text style={styles.textoOpcion}>{opcion}</Text>
                          </>
                        ) : (
                          <Text style={styles.textoOpcion}>
                            {marca}
                            {'  '}
                            {opcion}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <Pressable
              style={styles.botonAplicar}
              onPress={aplicarFiltros}
            >
              <Text style={styles.textoAplicar}>
                FILTRAR
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    padding: 15,
    backgroundColor: '#FFFFFF',
  },
  botonFiltro: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 12,
    alignSelf: 'flex-start',
  },
  textoBoton: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  cantidad: {
    marginTop: 12,
    fontSize: 13,
    color: '#555555',
  },
  etiquetas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  sinFiltros: {
    color: '#777777',
    fontSize: 13,
  },
  etiqueta: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginRight: 7,
    marginBottom: 7,
  },
  textoEtiqueta: {
    fontSize: 12,
    color: '#000000',
  },
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    height: '75%',
  },
  cerrar: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  textoCerrar: {
    fontSize: 22,
    color: '#000000',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000000',
  },
  seccion: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
    paddingBottom: 12,
  },
  tituloSeccion: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000000',
  },
  opcion: {
    paddingVertical: 9,
  },
  opcionColor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circuloColor: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginHorizontal: 10,
  },
  textoOpcion: {
    fontSize: 15,
    color: '#000000',
  },
  botonAplicar: {
    backgroundColor: '#000000',
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  textoAplicar: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
