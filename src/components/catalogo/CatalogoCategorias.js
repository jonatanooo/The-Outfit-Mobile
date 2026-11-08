

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';




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
import { ID_TEMPORADA_INVIERNO } from '../../lib/productos';




// Valor especial: muestra todas las prendas del género sin filtrar por categoría.
const VER_TODO = '__VER_TODO__';
// Vistas especiales que mezclan hombre y mujer y se filtran por género.
const OFERTAS = '__OFERTAS__';
const WINTER = '__WINTER__';

const ORDEN_TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const unicos = (lista) => [...new Set(lista.filter(Boolean))];

export default function CatalogoCategorias({
  productosMujer = [],
  productosHombre = [],
  onSeleccionarProducto,
  generoSeleccionado,
  mostrarSelectorGenero = true,
  onCategoriaAbierta,
  iniciarEnVerTodo = false,
  iniciarEnColeccion = null, // { coleccion: 'ofertas' | 'invierno', genero: 'mujer' | 'hombre' | null }
  esFavorito,
  onToggleFavorito,
}) {
  const [generoLocal, setGeneroLocal] = useState('mujer');

  const generoActivo = generoSeleccionado ?? generoLocal;

  const insets = useSafeAreaInsets();
  // La barra inferior de la app está sobre el contenido: se deja espacio para no taparlo.
  const paddingInferior = Math.max(insets.bottom, 12) + 75;

  const [filtrosActivos, setFiltrosActivos] = useState(
    iniciarEnColeccion?.genero
      ? { 'Género': [iniciarEnColeccion.genero === 'hombre' ? 'Hombre' : 'Mujer'] }
      : {}
  );

const [categoriaSeleccionada, setCategoriaSeleccionada] =
  useState(
    iniciarEnColeccion
      ? (iniciarEnColeccion.coleccion === 'invierno' ? WINTER : OFERTAS)
      : iniciarEnVerTodo ? VER_TODO : null
  );


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

  const esColeccion =
    categoriaSeleccionada === OFERTAS || categoriaSeleccionada === WINTER;

  // Ofertas y Winter Season mezclan hombre y mujer; el resto usa el género activo.
  const productos = useMemo(() => {
    if (categoriaSeleccionada === OFERTAS) {
      return [...productosMujer, ...productosHombre].filter((p) => p.enOferta);
    }
    if (categoriaSeleccionada === WINTER) {
      return [...productosMujer, ...productosHombre].filter(
        (p) => Number(p.idTemporada) === ID_TEMPORADA_INVIERNO
      );
    }
    return generoActivo === 'mujer' ? productosMujer : productosHombre;
  }, [categoriaSeleccionada, generoActivo, productosMujer, productosHombre]);

  const idsMujer = useMemo(
    () => new Set(productosMujer.map((p) => String(p.id))),
    [productosMujer]
  );

  const categoriasDisponibles = esColeccion
    ? unicos([
        ...(categoriasPorGenero.mujer || []),
        ...(categoriasPorGenero.hombre || []),
      ]).sort()
    : categoriasPorGenero[generoActivo] || [];

  // Colores y tallas que realmente existen en las prendas que se están viendo.
  const coloresDisponibles = useMemo(
    () =>
      unicos(
        productos.flatMap((p) => (p.variantes || []).map((v) => v.color))
      ).sort((a, b) => a.localeCompare(b, 'es')),
    [productos]
  );

  // Color real (hex) de cada color disponible, para dibujar el círculo en el filtro.
  const hexPorColor = useMemo(() => {
    const mapa = {};
    productos.forEach((p) =>
      (p.variantes || []).forEach((v) => {
        if (v.color && v.colorHex && !mapa[v.color]) mapa[v.color] = v.colorHex;
      })
    );
    return mapa;
  }, [productos]);

  const tallasDisponibles = useMemo(
    () =>
      unicos(
        productos.flatMap((p) => [
          ...(p.tallas || []),
          ...(p.variantes || []).map((v) => v.talla),
        ])
      ).sort((a, b) => {
        const ia = ORDEN_TALLAS.indexOf(a);
        const ib = ORDEN_TALLAS.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b, 'es');
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }),
    [productos]
  );

  const generosDisponibles = esColeccion ? ['Mujer', 'Hombre'] : [];


  // Aplicar filtros a las prendas existentes
  const productosFiltrados = useMemo(() => {
    const categorias = filtrosActivos.Categorias || [];
    const generos = filtrosActivos['Género'] || [];
    const colores = filtrosActivos.Colores || [];
    const tallas = filtrosActivos.Tallas || [];
    const orden = filtrosActivos['Ordenar Por']?.[0];

    const coincide = (a, b) =>
      String(a ?? '').trim().toLowerCase() ===
      String(b ?? '').trim().toLowerCase();

    let resultado = productos.filter((producto) => {

      // Filtrar por género (solo en Ofertas y Winter Season)
      if (generos.length > 0) {
        const genero = idsMujer.has(String(producto.id)) ? 'Mujer' : 'Hombre';
        if (!generos.includes(genero)) return false;
      }

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
  }, [productos, filtrosActivos, categoriaPorProducto, fechaPorProducto, idsMujer]);

  // Avisa al padre cuando se entra o se sale de una categoría (para ocultar su encabezado)
  useEffect(() => {
    onCategoriaAbierta?.(categoriaSeleccionada !== null);
    return () => onCategoriaAbierta?.(false);
  }, [categoriaSeleccionada]);

  // Cambiar categoría Mujer / Hombre

const cambiarGenero = (genero) => {
  setGeneroLocal(genero);
  setFiltrosActivos({});
};

// Al cambiar de género se vuelve a la lista de categorías (no en el primer render,
// para respetar "Ver todo" cuando el menú se abre desde el carrusel).
const primerRender = useRef(true);
useEffect(() => {
  if (primerRender.current) {
    primerRender.current = false;
    return;
  }
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
    contentContainerStyle={{ paddingBottom: paddingInferior }}
    showsVerticalScrollIndicator={false}
  >
    <Pressable
      style={styles.opcionCategoria}
      onPress={() => {
        setCategoriaSeleccionada(VER_TODO);
        setFiltrosActivos({});
      }}
    >
      <Text style={styles.textoCategoria}>VER TODO</Text>
    </Pressable>

    <Pressable
      style={styles.opcionCategoria}
      onPress={() => {
        setCategoriaSeleccionada(OFERTAS);
        setFiltrosActivos({});
      }}
    >
      <Text style={styles.textoCategoria}>OFERTAS</Text>
    </Pressable>

    <Pressable
      style={styles.opcionCategoria}
      onPress={() => {
        setCategoriaSeleccionada(WINTER);
        setFiltrosActivos({});
      }}
    >
      <Text style={styles.textoCategoria}>WINTER SEASON</Text>
    </Pressable>

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

    <View style={styles.barraCategoria}>
      <Pressable
        style={styles.botonRegresar}
        hitSlop={12}
        onPress={() => {
          setCategoriaSeleccionada(null);
          setFiltrosActivos({});
        }}
      >
        <Text style={styles.flechaRegresar}>←</Text>
      </Pressable>

      <Text style={styles.tituloCategoria} numberOfLines={1}>
        {categoriaSeleccionada === OFERTAS
          ? 'OFERTAS'
          : categoriaSeleccionada === WINTER
            ? 'WINTER SEASON'
            : filtrosActivos.Categorias?.length === 1
              ? filtrosActivos.Categorias[0].toUpperCase()
              : categoriaSeleccionada === VER_TODO
                ? generoActivo.toUpperCase()
                : 'PRODUCTOS'}
      </Text>

      <View style={styles.botonRegresar} />
    </View>

    <FiltroMenu
      categoriasDisponibles={categoriasDisponibles}
      generosDisponibles={generosDisponibles}
      coloresDisponibles={coloresDisponibles}
      hexPorColor={hexPorColor}
      tallasDisponibles={tallasDisponibles}
      filtrosActivos={filtrosActivos}
      cantidadResultados={productosFiltrados.length}
      onAplicarFiltros={setFiltrosActivos}
    />

    <ListadoPrendas
      productos={productosFiltrados}
      paddingInferior={paddingInferior}
      mensajeVacio={
        esColeccion
          ? 'No hay prendas con estos filtros. Prueba quitando el filtro de género para ver las demás.'
          : 'No hay prendas para mostrar.'
      }
      onSeleccionarProducto={onSeleccionarProducto}
      esFavorito={esFavorito}
      onToggleFavorito={onToggleFavorito}
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

barraCategoria: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 8,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#DDDDDD',
},

botonRegresar: {
  width: 44,
  alignItems: 'center',
  justifyContent: 'center',
},

flechaRegresar: {
  fontSize: 26,
  color: '#000000',
},

tituloCategoria: {
  flex: 1,
  textAlign: 'center',
  fontSize: 18,
  fontWeight: 'bold',
  letterSpacing: 1,
  color: '#000000',
},

});
