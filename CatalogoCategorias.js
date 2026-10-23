

import { useEffect, useMemo, useState } from 'react';




import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';


import FiltroMenu from './FiltroMenu';
import ListadoPrendas from './ListadoPrendas';

import { cargarCategoriasCatalogo } from './cargarCategoriasCatalogo';




export default function CatalogoCategorias({
  productosMujer = [],
  productosHombre = [],
  onSeleccionarProducto,
  generoSeleccionado,
  mostrarSelectorGenero = true,
}) {
  const [generoLocal, setGeneroLocal] = useState('mujer');

  const generoActivo = generoSeleccionado ?? generoLocal;

  const [filtrosActivos, setFiltrosActivos] = useState({});
  
const [categoriaSeleccionada, setCategoriaSeleccionada] =
  useState(null);


const [categoriaPorProducto, setCategoriaPorProducto] =
  useState({});

const [fechaPorProducto, setFechaPorProducto] =
  useState({});

const [categoriasPorGenero, setCategoriasPorGenero] =
  useState({ mujer: [], hombre: [] });

useEffect(() => {
  let activo = true;

  cargarCategoriasCatalogo()
    .then((datos) => {
      if (!activo) return;

      
   setCategoriaPorProducto(datos.categoriaPorProducto);
    setCategoriasPorGenero(datos.categoriasPorGenero);
   setFechaPorProducto(datos.fechaPorProducto ?? {});

    })
    .catch((error) => {
      console.error('Error cargando categorías:', error);
    });

  return () => {
    activo = false;
  };
}, []);

  // Seleccionar los productos según Mujer / Hombre
  const productos = generoActivo === 'mujer'
    ? productosMujer
    : productosHombre;

 
const categoriasDisponibles =
  categoriasPorGenero[generoActivo] || [];


  // Aplicar filtros a las prendas existentes
  const productosFiltrados = useMemo(() => {
    const categorias = filtrosActivos.Categorias || [];
    const colores = filtrosActivos.Colores || [];
    const tallas = filtrosActivos.Tallas || [];
    const orden = filtrosActivos['Ordenar Por']?.[0];

    const coincide = (a, b) =>
      String(a ?? '').trim().toLowerCase() ===
      String(b ?? '').trim().toLowerCase();

    let resultado = productos.filter((producto) => {

      // Filtrar por categoría
      if (categorias.length > 0) {
        if (
          !categorias.some((c) =>
            coincide(c, categoriaPorProducto[String(producto.id)])
          )
        ) {
          return false;
        }
      }

      // Filtrar por color y talla
      if (colores.length > 0 || tallas.length > 0) {
        const variantes = producto.variantes || [];

        if (variantes.length > 0) {
          const tieneVariante = variantes.some((variante) => {
            const colorValido =
              colores.length === 0 ||
              colores.some((c) =>
                coincide(c, variante.color)
              );

            const tallaValida =
              tallas.length === 0 ||
              tallas.some((t) =>
                coincide(t, variante.talla)
              );

            return colorValido && tallaValida;
          });

          if (!tieneVariante) return false;
        } else {
          // Si no hay variantes, solo se puede
          // comprobar la talla disponible
          if (colores.length > 0) return false;

          if (
            tallas.length > 0 &&
            !tallas.some((t) =>
              (producto.tallas || []).some((pt) =>
                coincide(t, pt)
              )
            )
          ) {
            return false;
          }
        }
      }

      return true;
    });

    // Ordenar por precio
    if (orden === 'Precio: menor a mayor') {
      resultado.sort(
        (a, b) => Number(a.precio) - Number(b.precio)
      );
    }

    if (orden === 'Precio: mayor a menor') {
      resultado.sort(
        (a, b) => Number(b.precio) - Number(a.precio)
      );
    }

   
// Ordenar por fecha de creación (más nuevo primero)
if (orden === 'Más nuevo') {
  resultado.sort((a, b) => {
    const fechaA = fechaPorProducto[String(a.id)];
    const fechaB = fechaPorProducto[String(b.id)];

    const aTieneFecha = Number.isFinite(fechaA);
    const bTieneFecha = Number.isFinite(fechaB);

    // Ambos productos tienen fecha válida
    if (aTieneFecha && bTieneFecha) {
      return fechaB - fechaA;
    }

    // Los productos con fecha van primero
    if (aTieneFecha) return -1;
    if (bTieneFecha) return 1;

    // Si ninguno tiene fecha, conservar su orden
    return 0;
  });
}


    return resultado;
  }, [productos,filtrosActivos, categoriaPorProducto, fechaPorProducto,]);

  // Cambiar categoría Mujer / Hombre
 
const cambiarGenero = (genero) => {
  setGeneroLocal(genero);
  setFiltrosActivos({});
};

useEffect(() => {
     setCategoriaSeleccionada(null);
  setFiltrosActivos({});
}, [generoActivo]);


  return (
    <View style={styles.contenedor}>

     {/* Navegación Mujer / Hombre */}
{mostrarSelectorGenero && (
  <View style={styles.categorias}>
        {['mujer', 'hombre'].map((genero) => (
          <Pressable
            key={genero}
            style={[
              styles.boton,
              generoActivo === genero && styles.activo,
            ]}
            onPress={() => cambiarGenero(genero)}
          >
            <Text
              style={[
                styles.texto,
                generoActivo === genero && styles.textoActivo,
              ]}
            >
              {genero.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
)}
     
{/* Mostrar categorías o productos */}
{categoriaSeleccionada === null ? (

  // Lista vertical de categorías como en Figma
  <ScrollView
    style={styles.listaCategorias}
    showsVerticalScrollIndicator={false}
  >
    {categoriasDisponibles.map((categoria) => (
      <Pressable
        key={categoria}
        style={styles.opcionCategoria}
        onPress={() => {
          setCategoriaSeleccionada(categoria);
          setFiltrosActivos({
            Categorias: [categoria],
          });
        }}
      >
        <Text style={styles.textoCategoria}>
          {categoria.toUpperCase()}
        </Text>
      </Pressable>
    ))}
  </ScrollView>

) : (

  // Mostrar las prendas de la categoría seleccionada
  <View style={styles.vistaCategoria}>

    <Pressable
      style={styles.botonRegresar}
      onPress={() => {
        setCategoriaSeleccionada(null);
        setFiltrosActivos({});
      }}
    >
      <Text style={styles.textoRegresar}>
        ← CATEGORÍAS
      </Text>
    </Pressable>

    <Text style={styles.tituloCategoria}>
      {filtrosActivos.Categorias?.length === 1
        ? filtrosActivos.Categorias[0].toUpperCase()
        : 'PRODUCTOS'}
    </Text>

    <FiltroMenu
      categoriasDisponibles={categoriasDisponibles}
      filtrosActivos={filtrosActivos}
      cantidadResultados={productosFiltrados.length}
      onAplicarFiltros={setFiltrosActivos}
    />

    <ListadoPrendas
      productos={productosFiltrados}
      onSeleccionarProducto={onSeleccionarProducto}
    />

  </View>
)}


    


    </View>
  );
}


const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  categorias: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
  },
  boton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activo: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  texto: {
    fontSize: 15,
    fontWeight: '500',
    color: '#777777',
  },
  textoActivo: {
    color: '#000000',
    fontWeight: 'bold',
  },
  
listaCategorias: {
  flex: 1,
  paddingHorizontal: 28,
  paddingTop: 25,
},

opcionCategoria: {
  paddingVertical: 10,
},

textoCategoria: {
  fontSize: 20,
  fontWeight: '600',
  color: '#000000',
},

vistaCategoria: {
  flex: 1,
  backgroundColor: '#FFFFFF',
},

botonRegresar: {
  paddingHorizontal: 15,
  paddingTop: 18,
  paddingBottom: 10,
},

textoRegresar: {
  fontSize: 14,
  fontWeight: '600',
  color: '#000000',
},

tituloCategoria: {
  fontSize: 22,
  fontWeight: 'bold',
  marginHorizontal: 15,
  marginTop: 10,
  marginBottom: 10,
  color: '#000000',
},

});
