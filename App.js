import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans';
import * as SplashScreen from 'expo-splash-screen';

// Conexión directa a Firebase Firestore
import { obtenerNuevosIngresosPorGenero } from './src/lib/productos';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/lib/firebaseClient';
import { buscarPerfil, cerrarSesion } from './src/lib/authService';
import AuthModal from './src/components/AuthScreens';
import CatalogoCategorias from './src/components/catalogo/CatalogoCategorias';
import ProfileModal from './src/components/ProfileScreen';
import CarritoModal from './src/components/CarritoScreen';
import CheckoutModal from './src/components/CheckoutScreen';
import { CarritoProvider, elegirVariante, useCarrito } from './src/lib/CarritoContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Diapositivas para el Carrusel Principal (Hero Banner)
const HERO_SLIDES = [
  {
    id: 'slide-1',
    image: require('./assets/chicafondoazul.jpg'),
    tag: 'SUMMER SEASON',
  },
  {
    id: 'slide-2',
    image: require('./assets/imagen.jpg'),
    tag: 'SUMMER SEASON',
  },
];

// Configuración de los 5 botones de la barra de navegación inferior
const NAV_TABS = [
  { id: 'home', label: 'HOME', icon: require('./assets/ICONOS/Home.png') },
  { id: 'buscar', label: 'BUSCAR', icon: require('./assets/ICONOS/Search.png') },
  { id: 'menu', label: 'MENÚ', icon: require('./assets/ICONOS/Menu.png') },
  { id: 'cesta', label: 'CESTA', icon: require('./assets/ICONOS/Basket.png') },
  { id: 'perfil', label: 'PERFIL', icon: require('./assets/ICONOS/Person.png') },
];

function MainHomeScreen() {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('home');
  const [activeSlide, setActiveSlide] = useState(0);
  const [productosMujer, setProductosMujer] = useState([]);
  const [productosHombre, setProductosHombre] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  // Sistema Global de Favoritos (preparado para vinculación futura a Firebase Auth / Firestore)
  const [favoritos, setFavoritos] = useState([]);
  const [favoritosVisible, setFavoritosVisible] = useState(false);
  const [filtroFavoritos, setFiltroFavoritos] = useState('TODOS'); // 'TODOS' | 'MUJER' | 'HOMBRE'
  const [mostrarFiltroOpciones, setMostrarFiltroOpciones] = useState(false);

  // Sesión de usuario (Firebase Auth) y pantalla de acceso: 'login' | 'register' | null
  const [usuario, setUsuario] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [perfilVisible, setPerfilVisible] = useState(false);

  // Carrito y proceso de compra
  const carrito = useCarrito();
  const [carritoVisible, setCarritoVisible] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const checkoutPendiente = useRef(false); // true si hay que abrir el checkout al terminar de iniciar sesión

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (u) => {
      setUsuario(u);
      if (u) {
        buscarPerfil(u).then(setPerfilUsuario).catch(() => {});
      } else {
        setPerfilUsuario(null);
      }
    });
    return cancelar;
  }, []);

  // Perfil: si no hay sesión abre el login; si la hay abre la pantalla de perfil
  const abrirPerfil = () => {
    setActiveTab('perfil');
    if (usuario) {
      setPerfilVisible(true);
    } else {
      setAuthMode('login');
    }
  };

  const cerrarPerfil = () => {
    setPerfilVisible(false);
    setActiveTab('home');
  };

  // Navegación desde la barra inferior de la pantalla de perfil
  const navegarDesdePerfil = (tabId) => {
    if (tabId === 'perfil') return;
    setPerfilVisible(false);
    handleTabPress(tabId);
  };

  const alCerrarSesion = () => {
    setPerfilVisible(false);
    setActiveTab('home');
    cerrarSesion().catch(() => {});
  };

  const cerrarAuth = () => {
    setAuthMode(null);
    if (checkoutPendiente.current) {
      // Canceló el inicio de sesión que venía del carrito: vuelve a la cesta
      checkoutPendiente.current = false;
      setTimeout(abrirCarrito, 350);
    } else {
      setActiveTab('home');
    }
  };

  // Navegación desde la barra inferior de la pantalla de acceso
  const navegarDesdeAuth = (tabId) => {
    if (tabId === 'perfil') return;
    setAuthMode(null);
    handleTabPress(tabId);
  };

  const alAutenticar = (resultado, opciones = {}) => {
    if (resultado?.perfil) setPerfilUsuario(resultado.perfil);
    setAuthMode(null);
    if (checkoutPendiente.current) {
      checkoutPendiente.current = false;
      setTimeout(() => setCheckoutVisible(true), 350);
    } else {
      setActiveTab('home');
    }
    if (opciones.registro) {
      Alert.alert('¡Cuenta creada!', 'Tu cuenta se creó con éxito. Bienvenido a The Outfit.');
    }
  };

  // ---------- Carrito y compra ----------
  const abrirCarrito = () => {
    setActiveTab('cesta');
    setCarritoVisible(true);
  };

  const cerrarCarrito = () => {
    setCarritoVisible(false);
    setActiveTab('home');
  };

  // Las pantallas se abren de una en una: se espera a que termine de cerrarse la anterior
  const navegarDesdeCarrito = (tabId) => {
    if (tabId === 'cesta') return;
    setCarritoVisible(false);
    setTimeout(() => handleTabPress(tabId), 350);
  };

  // Pasar a pagar exige sesión: si no la hay, se pide y luego se continúa con la compra
  const iniciarCompra = () => {
    setCarritoVisible(false);
    if (!usuario) {
      checkoutPendiente.current = true;
      setTimeout(() => setAuthMode('login'), 350);
      return;
    }
    setTimeout(() => setCheckoutVisible(true), 350);
  };

  const volverAlCarrito = () => {
    setCheckoutVisible(false);
    setTimeout(() => setCarritoVisible(true), 350);
  };

  const navegarDesdeCheckout = (tabId) => {
    if (tabId === 'cesta') return;
    setCheckoutVisible(false);
    setTimeout(() => handleTabPress(tabId), 350);
  };

  const terminarCompra = () => {
    setCheckoutVisible(false);
    setTimeout(irAInicio, 350);
  };

  const buscarProducto = (id) =>
    [...productosMujer, ...productosHombre].find((p) => String(p.id) === String(id));

  // Corazón de la cesta: usa el producto completo del catálogo cuando está disponible
  const toggleFavoritoDeCarrito = (item) => {
    toggleFavorito(
      buscarProducto(item.idProducto) || {
        id: item.idProducto,
        nombre: item.nombre,
        imagen: item.imagen,
        fotos: item.imagen ? [item.imagen] : [],
        tallas: [item.talla],
        variantes: [],
        precio: item.precio,
        precioOriginal: item.precioOriginal,
        enOferta: item.enOferta,
        porcentajeDescuento: item.porcentajeDescuento,
        idGenero: item.idGenero,
      }
    );
  };

  const abrirProductoDesdeCarrito = (id) => {
    const producto = buscarProducto(id);
    if (!producto) return;
    setCarritoVisible(false);
    setActiveTab('home');
    setTimeout(() => abrirDetalleProducto(producto), 350);
  };

  const agregarAlCarrito = (producto, talla) => {
    const resultado = carrito.agregar(producto, elegirVariante(producto, talla));
    if (!resultado.ok) {
      Alert.alert('No se pudo añadir', resultado.mensaje);
      return;
    }
    Alert.alert('Añadido a la cesta', `${producto.nombre} (${talla})`, [
      { text: 'Seguir comprando', style: 'cancel' },
      {
        text: 'Ver cesta',
        onPress: () => {
          if (pdpVisible) cerrarDetalleProducto();
          if (favoritosVisible) cerrarFavoritos();
          setTimeout(abrirCarrito, 350);
        },
      },
    ]);
  };

  // Desde favoritos: si hay una sola talla se añade directo; si no, se abre la ficha para elegirla
  const agregarRapido = (producto) => {
    const tallas = [...new Set((producto.variantes || []).map((v) => v.talla))];
    if (tallas.length === 1) agregarAlCarrito(producto, tallas[0]);
    else if (tallas.length === 0) Alert.alert('No disponible', 'Esta prenda no está disponible por ahora.');
    else abrirDetalleProducto(producto);
  };

  // Verifica si un producto específico se encuentra en favoritos
  const esFavorito = (id) => {
    return favoritos.some((p) => String(p.id) === String(id));
  };

  // Función toggle centralizada para agregar/eliminar prendas de favoritos
  const toggleFavorito = async (producto, userId = null) => {
    if (!producto || !producto.id) return;
    const existe = favoritos.some((p) => String(p.id) === String(producto.id));

    setFavoritos((prev) => {
      if (existe) {
        return prev.filter((p) => String(p.id) !== String(producto.id));
      } else {
        return [...prev, producto];
      }
    });

    // TODO: Preparación para vincular a Firestore con Firebase Auth:
    /*
    try {
      if (userId) {
        const favRef = doc(db, 'Favoritos', `${userId}_${producto.id}`);
        if (existe) {
          await deleteDoc(favRef);
        } else {
          await setDoc(favRef, {
            userId,
            productoId: producto.id,
            fechaAgregado: new Date(),
          });
        }
      }
    } catch (err) {
      console.warn('Error al sincronizar favorito con Firebase:', err);
    }
    */
  };

  const abrirFavoritos = () => {
    setFavoritosVisible(true);
  };

  const cerrarFavoritos = () => {
    setFavoritosVisible(false);
  };

  // Estados para la Vista de Detalles del Producto (PDP Modal)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [pdpVisible, setPdpVisible] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [tallaSeleccionada, setTallaSeleccionada] = useState(null);
  const [acordeonAbierto, setAcordeonAbierto] = useState(null);
  const pdpScrollRef = useRef(null);
  const mainScrollRef = useRef(null);

  // Estados para la Vista de Menú
  const [menuVisible, setMenuVisible] = useState(false);
  const [generoMenuTab, setGeneroMenuTab] = useState('mujer'); // 'mujer' | 'hombre'

  // Función para abrir la vista del Menú
  const abrirMenu = () => {
    setActiveTab('menu');
    setMenuVisible(true);
  };

  // Función para cerrar la vista del Menú
  const cerrarMenu = () => {
    setMenuVisible(false);
  };

  // Función para ir a la página principal y hacer scroll al inicio
  const irAInicio = () => {
    setActiveTab('home');
    if (pdpVisible) {
      cerrarDetalleProducto();
    }
    if (menuVisible) {
      cerrarMenu();
    }
    if (favoritosVisible) {
      cerrarFavoritos();
    }
    setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 60);
  };

  // Manejo de pulsación en pestañas de la barra inferior
  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'home') {
      irAInicio();
    } else if (tabId === 'menu') {
      if (favoritosVisible) cerrarFavoritos();
      abrirMenu();
    } else if (tabId === 'perfil') {
      if (menuVisible) cerrarMenu();
      if (favoritosVisible) cerrarFavoritos();
      abrirPerfil();
    } else if (tabId === 'cesta') {
      if (menuVisible) cerrarMenu();
      if (favoritosVisible) cerrarFavoritos();
      abrirCarrito();
    } else {
      if (menuVisible) cerrarMenu();
      if (favoritosVisible) cerrarFavoritos();
    }
  };

  // 1. Consulta a Firebase Firestore para la ropa (Nuevos Ingresos por género)
  useEffect(() => {
    let montado = true;

    async function cargarCatalogo() {
      try {
        setCargandoProductos(true);
        const { mujer, hombre } = await obtenerNuevosIngresosPorGenero();
        if (montado) {
          setProductosMujer(mujer);
          setProductosHombre(hombre);
        }
      } catch (err) {
        console.error('Error cargando nuevos ingresos desde Firebase:', err);
      } finally {
        if (montado) {
          setCargandoProductos(false);
        }
      }
    }

    cargarCatalogo();

    return () => {
      montado = false;
    };
  }, []);

  const handleScrollHero = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeSlide && index >= 0 && index < HERO_SLIDES.length) {
      setActiveSlide(index);
    }
  };

  // Abrir vista de detalles (PDP)
  const abrirDetalleProducto = (item) => {
    setProductoSeleccionado(item);
    setActivePhotoIndex(0);
    setTallaSeleccionada(item.tallas?.[0] || 'M');
    setAcordeonAbierto(null);
    setPdpVisible(true);
  };

  // Cerrar vista de detalles (PDP)
  const cerrarDetalleProducto = () => {
    setPdpVisible(false);
    setProductoSeleccionado(null);
  };

  // Renderizado de tarjeta de prenda individual (sin márgenes laterales para fotos pegadas)
  const renderProductCard = (item, esRecomendacion = false) => {
    const esFav = esFavorito(item.id);

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.9}
        onPress={() => {
          abrirDetalleProducto(item);
          if (esRecomendacion && pdpScrollRef.current) {
            pdpScrollRef.current.scrollTo({ y: 0, animated: true });
          }
        }}
        style={styles.horizontalProductCard}
      >
        {/* Imagen de la base de datos (100% ancho, pegadas entre sí) */}
        <View style={styles.horizontalProductImageContainer}>
          {item.imagen ? (
            <Image
              source={{ uri: item.imagen }}
              style={styles.horizontalProductImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.horizontalProductImage, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
            </View>
          )}

          {/* Badge de porcentaje de descuento sobre la foto si aplica */}
          {item.enOferta && item.porcentajeDescuento > 0 && (
            <View style={styles.cardDiscountBadge}>
              <Text style={styles.cardDiscountText}>-{item.porcentajeDescuento}%</Text>
            </View>
          )}
        </View>

        {/* Información del producto: Título, Precios con descuento y Corazón */}
        <View style={styles.horizontalProductDetailsRow}>
          <View style={styles.productTextCol}>
            <Text
              style={styles.productTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.nombre.toUpperCase()}
            </Text>

            {item.enOferta ? (
              <View style={styles.cardPriceRow}>
                <Text style={styles.cardOriginalPrice}>
                  ${Number(item.precioOriginal).toFixed(2)}
                </Text>
                <Text style={styles.cardOfferPrice}>
                  ${Number(item.precio).toFixed(2)}
                </Text>
              </View>
            ) : (
              <Text style={styles.productPrice}>
                ${Number(item.precio).toFixed(2)}
              </Text>
            )}
          </View>

          {/* Ícono de corazón a la derecha (Relleno rojo si es favorito, contorno negro si no) */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e?.stopPropagation?.();
              toggleFavorito(item);
            }}
            style={styles.heartButton}
          >
            <Ionicons
              name={esFav ? "heart" : "heart-outline"}
              size={20}
              color="#000000"
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Recomendaciones filtradas: solo mujer si la prenda es mujer, solo hombre si es hombre
  const recomendacionesAMostrar = (() => {
    if (!productoSeleccionado) return [];
    const esHombre = Number(productoSeleccionado.idGenero) === 57;
    const catalogo = esHombre ? productosHombre : productosMujer;
    const sinActual = catalogo.filter((p) => p.id !== productoSeleccionado.id);
    return sinActual.length > 0 ? sinActual : catalogo;
  })();

  // Filtrado de favoritos según la opción activa (TODOS, MUJER, HOMBRE)
  const favoritosFiltrados = favoritos.filter((item) => {
    if (filtroFavoritos === 'MUJER') return Number(item.idGenero) === 56;
    if (filtroFavoritos === 'HOMBRE') return Number(item.idGenero) === 57;
    return true;
  });

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ScrollView Principal */}
      <ScrollView
        ref={mainScrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 75 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView edges={['top']} style={styles.safeHeaderArea}>
          {/* Header clásico centrado 'THE OUTFIT' (tocar vuelve al inicio) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={irAInicio}
            style={styles.headerContainer}
          >
            <Text style={styles.headerTitle}>THE OUTFIT</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Hero Banner (Carrusel Principal Deslizable) */}
        <View style={styles.carouselWrapper}>
          <FlatList
            data={HERO_SLIDES}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScrollHero}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={styles.heroSlide}>
                <Image
                  source={item.image}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
                {/* Caja rectangular blanca sobrepuesta */}
                <View style={styles.heroOverlayBox}>
                  <Text style={styles.heroOverlayText}>{item.tag}</Text>
                </View>
              </View>
            )}
          />

          {/* Indicadores de paginación estilo líneas horizontales */}
          <View style={styles.paginationContainer}>
            {HERO_SLIDES.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.paginationLine,
                  activeSlide === idx
                    ? styles.paginationLineActive
                    : styles.paginationLineInactive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Sección Nuevos Ingresos (Conectado a Firebase en 2 filas horizontales) */}
        <View style={styles.sectionNuevosIngresos}>
          <Text style={styles.sectionTitle}>NUEVOS INGRESOS</Text>

          {cargandoProductos ? (
            <View style={styles.loaderArea}>
              <ActivityIndicator size="small" color="#000000" />
              <Text style={styles.loaderText}>Cargando colección...</Text>
            </View>
          ) : (
            <View style={styles.rowsWrapper}>
              {/* Fila 1 - Ropa de Mujer (Scroll Horizontal Independiente) */}
              <FlatList
                data={productosMujer}
                keyExtractor={(item) => `mujer-${item.id}`}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalListRow1}
                contentContainerStyle={styles.horizontalListContent}
                renderItem={({ item }) => renderProductCard(item)}
              />

              {/* Fila 2 - Ropa de Hombre (Scroll Horizontal Independiente) */}
              <FlatList
                data={productosHombre}
                keyExtractor={(item) => `hombre-${item.id}`}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalListRow2}
                contentContainerStyle={styles.horizontalListContent}
                renderItem={({ item }) => renderProductCard(item)}
              />
            </View>
          )}
        </View>

        {/* Banner Inferior de ancho completo */}
        <View style={styles.bottomBannerContainer}>
          <Image
            source={require('./assets/imagen.jpg')}
            style={styles.bottomBannerImage}
            resizeMode="cover"
          />
          {/* Caja rectangular blanca con 'SEASON SALE' */}
          <View style={styles.bottomBannerOverlayBox}>
            <Text style={styles.bottomBannerOverlayText}>SEASON SALE</Text>
          </View>
        </View>

        {/* Footer simple: 'EL SALVADOR | ESPAÑOL' */}
        <View style={styles.footerContainer}>
          <View style={styles.footerRow}>
            <Ionicons name="globe-outline" size={17} color="#000000" style={styles.globeIcon} />
            <Text style={styles.footerText}>EL SALVADOR | ESPAÑOL</Text>
          </View>
        </View>
      </ScrollView>

      {/* Barra de Navegación Inferior Anclada (Custom Bottom Tab Bar) */}
      <View
        style={[
          styles.bottomTabBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <View style={styles.tabButtonsContainer}>
          {NAV_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            // Opacidad: 0.90 cuando está seleccionada, 0.56 cuando no
            const currentOpacity = isSelected ? 0.90 : 0.56;

            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.7}
                onPress={() => handleTabPress(tab.id)}
                style={styles.tabButton}
              >
                <Image
                  source={tab.icon}
                  style={[styles.tabIcon, { opacity: currentOpacity }]}
                  resizeMode="contain"
                />
                <Text style={[styles.tabLabel, { opacity: currentOpacity }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Modal de Detalles del Producto (PDP) */}
      <Modal
        visible={pdpVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={cerrarDetalleProducto}
      >
        {productoSeleccionado && (
          <View style={styles.pdpContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            <ScrollView
              ref={pdpScrollRef}
              style={styles.pdpScrollView}
              contentContainerStyle={styles.pdpScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Carrusel de Fotos Superior con Paginación y Botón 'X' */}
              <View style={styles.pdpCarouselWrapper}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => {
                    const offsetX = e.nativeEvent.contentOffset.x;
                    const idx = Math.round(offsetX / SCREEN_WIDTH);
                    if (
                      idx !== activePhotoIndex &&
                      idx >= 0 &&
                      idx < (productoSeleccionado.fotos?.length || 1)
                    ) {
                      setActivePhotoIndex(idx);
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  {(productoSeleccionado.fotos?.length > 0
                    ? productoSeleccionado.fotos
                    : [productoSeleccionado.imagen]
                  ).map((fotoUrl, idx) => (
                    <Image
                      key={`${fotoUrl}-${idx}`}
                      source={{ uri: fotoUrl }}
                      style={styles.pdpSlideImage}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>

                {/* Botón flotante 'X' en la parte superior derecha */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={cerrarDetalleProducto}
                  style={[
                    styles.pdpCloseButton,
                    { top: Math.max(insets.top, 16) },
                  ]}
                >
                  <Ionicons name="close" size={26} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Indicadores de paginación (circulitos blancos) */}
                {(productoSeleccionado.fotos?.length || 0) > 1 && (
                  <View style={styles.pdpPaginationContainer}>
                    {productoSeleccionado.fotos.map((_, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.pdpDot,
                          activePhotoIndex === idx
                            ? styles.pdpDotActive
                            : styles.pdpDotInactive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>

              {/* 2. Información del Producto */}
              <View style={styles.pdpDetailsSection}>
                <View style={styles.pdpHeaderRow}>
                  <View style={styles.pdpTitleBlock}>
                    <Text style={styles.pdpTitle}>
                      {productoSeleccionado.nombre.toUpperCase()}
                    </Text>

                    {productoSeleccionado.enOferta ? (
                      <View style={styles.pdpPriceRow}>
                        <Text style={styles.pdpOriginalPrice}>
                          ${Number(productoSeleccionado.precioOriginal).toFixed(2)}
                        </Text>
                        <Text style={styles.pdpOfferPrice}>
                          ${Number(productoSeleccionado.precio).toFixed(2)}
                        </Text>
                        {productoSeleccionado.porcentajeDescuento > 0 && (
                          <View style={styles.pdpDiscountBadge}>
                            <Text style={styles.pdpDiscountText}>
                              -{productoSeleccionado.porcentajeDescuento}%
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.pdpSinglePrice}>
                        ${Number(productoSeleccionado.precio).toFixed(2)}
                      </Text>
                    )}

                    <Text style={styles.pdpReference}>
                      REF #{productoSeleccionado.referencia || productoSeleccionado.id}
                    </Text>
                  </View>

                  {/* Ícono de favorito (Relleno negro si es favorito, contorno si no) */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleFavorito(productoSeleccionado)}
                    style={styles.pdpHeartButton}
                  >
                    <Ionicons
                      name={esFavorito(productoSeleccionado.id) ? "heart" : "heart-outline"}
                      size={24}
                      color="#000000"
                    />
                  </TouchableOpacity>
                </View>

                {/* Selector de Tallas cargadas desde Firebase */}
                <View style={styles.tallasBlock}>
                  <Text style={styles.tallasLabel}>TALLAS</Text>
                  <View style={styles.tallasRow}>
                    {(productoSeleccionado.tallas?.length > 0
                      ? productoSeleccionado.tallas
                      : ['S', 'M', 'L', 'XL']
                    ).map((talla) => {
                      const isSelected = tallaSeleccionada === talla;
                      return (
                        <TouchableOpacity
                          key={talla}
                          activeOpacity={0.7}
                          onPress={() => setTallaSeleccionada(talla)}
                          style={[
                            styles.tallaPill,
                            isSelected && styles.tallaPillSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.tallaPillText,
                              isSelected && styles.tallaPillTextSelected,
                            ]}
                          >
                            {talla}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Botón negro grande: AÑADIR A LA CESTA */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.pdpAddToCartButton}
                  onPress={() => agregarAlCarrito(productoSeleccionado, tallaSeleccionada)}
                >
                  <Text style={styles.pdpAddToCartText}>AÑADIR A LA CESTA</Text>
                </TouchableOpacity>

                {/* Acordeones de Detalles (Colapsables) */}
                <View style={styles.accordionsWrapper}>
                  {/* 1. DETALLES DE PRODUCTO */}
                  <View style={styles.accordionContainer}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() =>
                        setAcordeonAbierto(
                          acordeonAbierto === 'detalles' ? null : 'detalles'
                        )
                      }
                      style={styles.accordionHeader}
                    >
                      <Text style={styles.accordionHeaderText}>
                        DETALLES DE PRODUCTO
                      </Text>
                      <Ionicons
                        name={
                          acordeonAbierto === 'detalles'
                            ? 'chevron-up'
                            : 'chevron-down'
                        }
                        size={18}
                        color="#000000"
                      />
                    </TouchableOpacity>
                    {acordeonAbierto === 'detalles' && (
                      <View style={styles.accordionBody}>
                        <Text style={styles.accordionBodyText}>
                          {productoSeleccionado.descripcion ||
                            'Esta prenda destaca por su estilo casual y relajado, confeccionada con materiales seleccionados de la más alta calidad para brindar durabilidad y máximo confort diario.'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 2. CUIDADO DE MATERIALES */}
                  <View style={styles.accordionContainer}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() =>
                        setAcordeonAbierto(
                          acordeonAbierto === 'cuidado' ? null : 'cuidado'
                        )
                      }
                      style={styles.accordionHeader}
                    >
                      <Text style={styles.accordionHeaderText}>
                        CUIDADO DE MATERIALES
                      </Text>
                      <Ionicons
                        name={
                          acordeonAbierto === 'cuidado'
                            ? 'chevron-up'
                            : 'chevron-down'
                        }
                        size={18}
                        color="#000000"
                      />
                    </TouchableOpacity>
                    {acordeonAbierto === 'cuidado' && (
                      <View style={styles.accordionBody}>
                        <Text style={styles.accordionBodyText}>
                          Para cuidar esta prenda, lávala a máquina con agua fría, siempre del revés y con colores similares. No utilices lejía ni blanqueador. Es preferible secarla al aire sobre una superficie plana para que no pierda su forma.
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 3. NUESTRO COMPROMISO */}
                  <View style={styles.accordionContainer}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() =>
                        setAcordeonAbierto(
                          acordeonAbierto === 'compromiso' ? null : 'compromiso'
                        )
                      }
                      style={styles.accordionHeader}
                    >
                      <Text style={styles.accordionHeaderText}>
                        NUESTRO COMPROMISO
                      </Text>
                      <Ionicons
                        name={
                          acordeonAbierto === 'compromiso'
                            ? 'chevron-up'
                            : 'chevron-down'
                        }
                        size={18}
                        color="#000000"
                      />
                    </TouchableOpacity>
                    {acordeonAbierto === 'compromiso' && (
                      <View style={styles.accordionBody}>
                        <Text style={styles.accordionBodyText}>
                          En The Outfit, nuestro principal compromiso es ayudarte a verte y sentirte bien ofreciéndote ropa, calzado y accesorios con estándares de calidad excepcionales y precios accesibles.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* 3. Sección RECOMENDACIONES (1 sola fila según el género: mujer con mujer, hombre con hombre) */}
              <View style={styles.pdpRecommendationsContainer}>
                <Text style={styles.sectionTitle}>RECOMENDACIONES</Text>

                <View style={styles.rowsWrapper}>
                  <FlatList
                    data={recomendacionesAMostrar}
                    keyExtractor={(item) => `pdp-rec-${item.id}`}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    style={styles.horizontalListRowSingle}
                    contentContainerStyle={styles.horizontalListContent}
                    renderItem={({ item }) => renderProductCard(item, true)}
                  />
                </View>
              </View>
            </ScrollView>

            {/* 4. Barra de Navegación Inferior Anclada en el Modal */}
            <View
              style={[
                styles.bottomTabBar,
                { paddingBottom: Math.max(insets.bottom, 12) },
              ]}
            >
              <View style={styles.tabButtonsContainer}>
                {NAV_TABS.map((tab) => {
                  const isSelected = activeTab === tab.id;
                  const currentOpacity = isSelected ? 0.90 : 0.56;

                  return (
                    <TouchableOpacity
                      key={tab.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (tab.id === 'home') {
                          irAInicio();
                        } else if (tab.id === 'menu') {
                          cerrarDetalleProducto();
                          abrirMenu();
                        } else if (tab.id === 'perfil') {
                          cerrarDetalleProducto();
                          setTimeout(abrirPerfil, 350);
                        } else if (tab.id === 'cesta') {
                          cerrarDetalleProducto();
                          setTimeout(abrirCarrito, 350);
                        } else {
                          setActiveTab(tab.id);
                        }
                      }}
                      style={styles.tabButton}
                    >
                      <Image
                        source={tab.icon}
                        style={[styles.tabIcon, { opacity: currentOpacity }]}
                        resizeMode="contain"
                      />
                      <Text style={[styles.tabLabel, { opacity: currentOpacity }]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Modal de la Vista de Menú */}
      <Modal
        visible={menuVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          cerrarMenu();
          setActiveTab('home');
        }}
      >
        <SafeAreaView edges={['top']} style={styles.menuScreenContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          {/* 1. Encabezado con título centrado MENÚ */}
          <View style={styles.menuHeaderContainer}>
            <Text style={styles.menuHeaderTitle}>MENÚ</Text>
          </View>

          {/* 2. Accesos Directos (PERFIL, FAVORITOS, HISTORIAL) */}
          <View style={styles.menuShortcutsRow}>
            {/* PERFIL */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                cerrarMenu();
                // Espera a que cierre el modal del menú antes de abrir el de acceso
                setTimeout(abrirPerfil, 350);
              }}
              style={styles.menuShortcutItem}
            >
              <Image
                source={require('./assets/ICONOS/Person.png')}
                style={[styles.menuShortcutIcon, { tintColor: '#000000' }]}
                resizeMode="contain"
              />
              <Text style={styles.menuShortcutLabel}>PERFIL</Text>
            </TouchableOpacity>

            {/* FAVORITOS */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                cerrarMenu();
                abrirFavoritos();
              }}
              style={styles.menuShortcutItem}
            >
              <Image
                source={require('./assets/ICONOS/Heart.png')}
                style={[styles.menuShortcutIcon, { tintColor: '#000000' }]}
                resizeMode="contain"
              />
              <Text style={styles.menuShortcutLabel}>FAVORITOS</Text>
            </TouchableOpacity>

            {/* HISTORIAL (con colores invertidos mediante tintColor) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                alert('Historial de compras');
              }}
              style={styles.menuShortcutItem}
            >
              <Image
                source={require('./assets/ICONOS/Shopping Cart.png')}
                style={[styles.menuShortcutIcon, { tintColor: '#000000' }]}
                resizeMode="contain"
              />
              <Text style={styles.menuShortcutLabel}>HISTORIAL</Text>
            </TouchableOpacity>
          </View>

          {/* 3. Pestañas de Género: MUJER y HOMBRE */}
          <View style={styles.menuGenderTabsContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setGeneroMenuTab('mujer')}
              style={[
                styles.menuGenderTabBtn,
                generoMenuTab === 'mujer' && styles.menuGenderTabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.menuGenderTabText,
                  generoMenuTab === 'mujer' && styles.menuGenderTabTextActive,
                ]}
              >
                MUJER
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setGeneroMenuTab('hombre')}
              style={[
                styles.menuGenderTabBtn,
                generoMenuTab === 'hombre' && styles.menuGenderTabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.menuGenderTabText,
                  generoMenuTab === 'hombre' && styles.menuGenderTabTextActive,
                ]}
              >
                HOMBRE
              </Text>
            </TouchableOpacity>
          </View>

         
        {/* 4. Catálogo y filtros - Persona 2 */}
       <View style={styles.menuEmptyContent}>
        {cargandoProductos ? (
       <ActivityIndicator size="large" color="#000000" />
        ) : (
       <CatalogoCategorias
      productosMujer={productosMujer}
      productosHombre={productosHombre}
      generoSeleccionado={generoMenuTab}
      mostrarSelectorGenero={false}
      onSeleccionarProducto={(producto) => {
        cerrarMenu();
        setTimeout(() => abrirDetalleProducto(producto), 350);
          }}
         />
         )}
         </View>


          {/* 5. Barra de Navegación Inferior (con MENÚ activo al 0.90 y resto a 0.56) */}
          <View
            style={[
              styles.bottomTabBar,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <View style={styles.tabButtonsContainer}>
              {NAV_TABS.map((tab) => {
                const isSelected = tab.id === 'menu';
                // En el Menú, el botón MENÚ tiene opacidad de 0.90 y los demás de 0.56
                const currentOpacity = isSelected ? 0.90 : 0.56;

                return (
                  <TouchableOpacity
                    key={tab.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (tab.id === 'home') {
                        irAInicio();
                      } else if (tab.id === 'menu') {
                        // Ya se encuentra en el menú
                      } else if (tab.id === 'perfil') {
                        cerrarMenu();
                        setTimeout(abrirPerfil, 350);
                      } else if (tab.id === 'cesta') {
                        cerrarMenu();
                        setTimeout(abrirCarrito, 350);
                      } else {
                        cerrarMenu();
                        setActiveTab(tab.id);
                      }
                    }}
                    style={styles.tabButton}
                  >
                    <Image
                      source={tab.icon}
                      style={[styles.tabIcon, { opacity: currentOpacity }]}
                      resizeMode="contain"
                    />
                    <Text style={[styles.tabLabel, { opacity: currentOpacity }]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de la Vista de Favoritos */}
      <Modal
        visible={favoritosVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          cerrarFavoritos();
          setActiveTab('home');
        }}
      >
        <SafeAreaView edges={['top']} style={styles.favoritosScreenContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          {/* 1. Encabezado con título centrado FAVORITOS */}
          <View style={styles.favoritosHeaderContainer}>
            <Text style={styles.favoritosHeaderTitle}>FAVORITOS</Text>
          </View>

          {/* 2. Filtro dinámico con opción FILTRAR a la izquierda */}
          <View style={styles.favoritosFilterBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setMostrarFiltroOpciones(!mostrarFiltroOpciones)}
              style={styles.favoritosFilterButton}
            >
              <Text style={styles.favoritosFilterButtonText}>
                FILTRAR {filtroFavoritos !== 'TODOS' ? `(${filtroFavoritos})` : ''}
              </Text>
              <Ionicons
                name={mostrarFiltroOpciones ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#000000"
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>

            {/* Opciones desplegables de filtro dinámicas (Todos, Mujer, Hombre) */}
            {mostrarFiltroOpciones && (
              <View style={styles.filtroChipsRow}>
                {['TODOS', 'MUJER', 'HOMBRE'].map((cat) => {
                  const activo = filtroFavoritos === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      activeOpacity={0.7}
                      onPress={() => {
                        setFiltroFavoritos(cat);
                        setMostrarFiltroOpciones(false);
                      }}
                      style={[styles.filtroChip, activo && styles.filtroChipActivo]}
                    >
                      <Text
                        style={[
                          styles.filtroChipText,
                          activo && styles.filtroChipTextActivo,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* 3. Cuadrícula dinámica de 2 columnas con FlatList */}
          <FlatList
            data={favoritosFiltrados}
            keyExtractor={(item) => `fav-${item.id}`}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.favoritosGridContent,
              { paddingBottom: Math.max(insets.bottom, 12) + 75 },
            ]}
            ListEmptyComponent={
              <View style={styles.favoritosEmptyContainer}>
                <Ionicons name="heart-outline" size={48} color="#A0A0A0" />
                <Text style={styles.favoritosEmptyTitle}>
                  Aún no tienes prendas en favoritos
                </Text>
                <Text style={styles.favoritosEmptySubtitle}>
                  {filtroFavoritos !== 'TODOS'
                    ? `No hay prendas favoritas en la categoría ${filtroFavoritos}.`
                    : 'Guarda las prendas que más te gusten tocando el ícono de corazón en cualquier sección.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => abrirDetalleProducto(item)}
                style={styles.favoritoCard}
              >
                {/* Imagen del producto */}
                <View style={styles.favoritoImageContainer}>
                  {item.imagen ? (
                    <Image
                      source={{ uri: item.imagen }}
                      style={styles.favoritoImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.favoritoImage, styles.imagePlaceholder]}>
                      <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
                    </View>
                  )}

                  {/* Badge de porcentaje de descuento sobre la foto si aplica */}
                  {item.enOferta && item.porcentajeDescuento > 0 && (
                    <View style={styles.cardDiscountBadge}>
                      <Text style={styles.cardDiscountText}>-{item.porcentajeDescuento}%</Text>
                    </View>
                  )}
                </View>

                {/* Detalles de la prenda: Título, Precios con descuento y Acciones (Carrito + Corazón) */}
                <View style={styles.favoritoDetailsRow}>
                  <View style={styles.favoritoTextCol}>
                    <Text
                      style={styles.favoritoTitle}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.nombre.toUpperCase()}
                    </Text>

                    {item.enOferta ? (
                      <View style={styles.cardPriceRow}>
                        <Text style={styles.cardOriginalPrice}>
                          ${Number(item.precioOriginal).toFixed(2)}
                        </Text>
                        <Text style={styles.cardOfferPrice}>
                          ${Number(item.precio).toFixed(2)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.favoritoPrice}>
                        ${Number(item.precio).toFixed(2)}
                      </Text>
                    )}
                  </View>

                  {/* Acciones a la derecha: Carrito con '+' y Corazón relleno */}
                  <View style={styles.favoritoActionsCol}>
                    {/* Botón Carrito con '+' */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        agregarRapido(item);
                      }}
                      style={styles.favCartButton}
                    >
                      <View style={styles.cartIconBadgeWrap}>
                        <Ionicons name="cart-outline" size={19} color="#000000" />
                        <View style={styles.cartPlusBadge}>
                          <Text style={styles.cartPlusBadgeText}>+</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Botón Corazón relleno (al tocarlo se elimina inmediatamente de favoritos) */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        toggleFavorito(item);
                      }}
                      style={styles.favHeartFilledButton}
                    >
                      <Ionicons name="heart" size={19} color="#000000" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />

          {/* 4. Barra de Navegación Inferior */}
          <View
            style={[
              styles.bottomTabBar,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <View style={styles.tabButtonsContainer}>
              {NAV_TABS.map((tab) => {
                const isSelected = activeTab === tab.id;
                const currentOpacity = isSelected ? 0.90 : 0.56;

                return (
                  <TouchableOpacity
                    key={tab.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (tab.id === 'home') {
                        irAInicio();
                      } else if (tab.id === 'menu') {
                        cerrarFavoritos();
                        abrirMenu();
                      } else if (tab.id === 'perfil') {
                        cerrarFavoritos();
                        setTimeout(abrirPerfil, 350);
                      } else if (tab.id === 'cesta') {
                        cerrarFavoritos();
                        setTimeout(abrirCarrito, 350);
                      } else {
                        cerrarFavoritos();
                        setActiveTab(tab.id);
                      }
                    }}
                    style={styles.tabButton}
                  >
                    <Image
                      source={tab.icon}
                      style={[styles.tabIcon, { opacity: currentOpacity }]}
                      resizeMode="contain"
                    />
                    <Text style={[styles.tabLabel, { opacity: currentOpacity }]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Cesta y proceso de compra */}
      <CarritoModal
        visible={carritoVisible}
        items={carrito.items}
        subtotal={carrito.subtotal}
        onCerrar={cerrarCarrito}
        onNavegar={navegarDesdeCarrito}
        onCambiarCantidad={carrito.cambiarCantidad}
        esFavorito={esFavorito}
        onToggleFavorito={toggleFavoritoDeCarrito}
        onAbrirProducto={abrirProductoDesdeCarrito}
        onContinuar={iniciarCompra}
      />
      <CheckoutModal
        visible={checkoutVisible}
        usuario={usuario}
        perfil={perfilUsuario}
        items={carrito.items}
        subtotal={carrito.subtotal}
        onVolverCarrito={volverAlCarrito}
        onNavegar={navegarDesdeCheckout}
        onCompraCompletada={carrito.vaciar}
        onFinalizar={terminarCompra}
      />

      {/* Pantalla de perfil del usuario */}
      <ProfileModal
        visible={perfilVisible && !!usuario}
        usuario={usuario}
        perfil={perfilUsuario}
        onCerrar={cerrarPerfil}
        onNavegar={navegarDesdePerfil}
        onActualizado={setPerfilUsuario}
        onCerrarSesion={alCerrarSesion}
      />

      {/* Pantallas de Inicio de sesión / Registro */}
      <AuthModal
        mode={authMode}
        onCambiarModo={setAuthMode}
        onCerrar={cerrarAuth}
        onNavegar={navegarDesdeAuth}
        onAutenticado={alAutenticar}
      />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Instrument Sans SemiBold': InstrumentSans_600SemiBold,
    InstrumentSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <CarritoProvider>
        <MainHomeScreen />
      </CarritoProvider>
    </SafeAreaProvider>
  );
}

const CARD_WIDTH = SCREEN_WIDTH / 2;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    backgroundColor: '#FFFFFF',
  },
  safeHeaderArea: {
    backgroundColor: '#FFFFFF',
  },
  // 1. Header 'THE OUTFIT'
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: '#000000',
    fontFamily: Platform.select({
      ios: 'Didot',
      android: 'serif',
      default: 'serif',
    }),
    textAlign: 'center',
  },

  // 2. Carrusel Principal (Hero Banner)
  carouselWrapper: {
    width: SCREEN_WIDTH,
    backgroundColor: '#FFFFFF',
  },
  heroSlide: {
    width: SCREEN_WIDTH,
    height: 520,
    position: 'relative',
    backgroundColor: '#F0F0F0',
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: 520,
  },
  heroOverlayBox: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '68%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  heroOverlayText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
    gap: 8,
  },
  paginationLine: {
    height: 3,
    borderRadius: 2,
  },
  paginationLineActive: {
    width: 38,
    backgroundColor: '#000000',
  },
  paginationLineInactive: {
    width: 38,
    backgroundColor: '#D1D1D1',
  },

  // 3. Sección Nuevos Ingresos (2 Filas Horizontales con Fotos Pegadas)
  sectionNuevosIngresos: {
    paddingHorizontal: 0,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 1.8,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  loaderArea: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 8,
    fontSize: 13,
    color: '#666666',
  },
  rowsWrapper: {
    width: '100%',
  },
  horizontalListRow1: {
    marginBottom: 24, // Separación notable entre Fila 1 (Mujer) y Fila 2 (Hombre)
  },
  horizontalListRow2: {
    marginBottom: 0,
  },
  horizontalListRowSingle: {
    marginBottom: 8, // Para la fila única en recomendaciones de producto
  },
  horizontalListContent: {
    paddingHorizontal: 0,
    marginHorizontal: 0,
    flexDirection: 'row',
  },
  horizontalProductCard: {
    width: CARD_WIDTH,
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  horizontalProductImageContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.36,
    backgroundColor: '#F4F4F4',
    overflow: 'hidden',
  },
  horizontalProductImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: '#888888',
  },
  horizontalProductDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  productTextCol: {
    flex: 1,
    paddingRight: 6,
  },
  productTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#000000',
  },
  productPrice: {
    fontSize: 12,
    color: '#222222',
    marginTop: 2,
    fontWeight: '500',
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  cardOriginalPrice: {
    fontSize: 11,
    color: '#888888',
    textDecorationLine: 'line-through',
  },
  cardOfferPrice: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
  },
  cardDiscountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  cardDiscountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heartButton: {
    paddingTop: 1,
    paddingLeft: 4,
  },
  heartIcon: {
    width: 17,
    height: 17,
  },

  // 4. Banner Inferior (SEASON SALE)
  bottomBannerContainer: {
    width: SCREEN_WIDTH,
    height: 520,
    position: 'relative',
    marginTop: 10,
    backgroundColor: '#F0F0F0',
  },
  bottomBannerImage: {
    width: SCREEN_WIDTH,
    height: 520,
  },
  bottomBannerOverlayBox: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '68%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  bottomBannerOverlayText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },

  // 5. Footer simple
  footerContainer: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeIcon: {
    marginRight: 6,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: '#000000',
  },

  // 6. Barra de Navegación Inferior (Custom Bottom Tab Bar)
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabIcon: {
    width: 22,
    height: 22,
  },
  tabLabel: {
    fontFamily: 'Instrument Sans SemiBold',
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: '#000000',
    marginTop: 4,
    textAlign: 'center',
  },

  // 7. Estilos de la Vista de Detalles del Producto (PDP Modal)
  pdpContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pdpScrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pdpScrollContent: {
    paddingBottom: 110,
    backgroundColor: '#FFFFFF',
  },
  pdpCarouselWrapper: {
    width: SCREEN_WIDTH,
    height: 500,
    position: 'relative',
    backgroundColor: '#F2F2F2',
  },
  pdpSlideImage: {
    width: SCREEN_WIDTH,
    height: 500,
  },
  pdpCloseButton: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  pdpPaginationContainer: {
    position: 'absolute',
    bottom: 18,
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pdpDot: {
    height: 6,
    borderRadius: 3,
  },
  pdpDotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  pdpDotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  pdpDetailsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pdpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pdpTitleBlock: {
    flex: 1,
    paddingRight: 10,
  },
  pdpTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#000000',
  },
  pdpPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  pdpOriginalPrice: {
    fontSize: 14,
    color: '#888888',
    textDecorationLine: 'line-through',
  },
  pdpOfferPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  pdpDiscountBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  pdpDiscountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pdpSinglePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginTop: 6,
  },
  pdpReference: {
    fontSize: 12,
    color: '#555555',
    letterSpacing: 0.8,
    marginTop: 6,
    fontWeight: '500',
  },
  pdpHeartButton: {
    paddingTop: 2,
    paddingLeft: 8,
  },
  pdpHeartIcon: {
    width: 24,
    height: 24,
  },
  tallasBlock: {
    marginTop: 22,
  },
  tallasLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#000000',
    marginBottom: 10,
  },
  tallasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tallaPill: {
    minWidth: 46,
    height: 42,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  tallaPillSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  tallaPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  tallaPillTextSelected: {
    color: '#FFFFFF',
  },
  pdpAddToCartButton: {
    backgroundColor: '#000000',
    borderRadius: 30,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    marginBottom: 14,
  },
  pdpAddToCartText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  accordionsWrapper: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#000000',
  },
  accordionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
  },
  accordionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#000000',
  },
  accordionBody: {
    paddingBottom: 18,
    paddingTop: 2,
  },
  accordionBodyText: {
    fontSize: 12.5,
    lineHeight: 20,
    color: '#444444',
  },
  pdpRecommendationsContainer: {
    marginTop: 30,
    paddingHorizontal: 0,
  },

  // 8. Estilos de la Vista de Menú
  menuScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  menuHeaderContainer: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D8D8D8',
    backgroundColor: '#FFFFFF',
  },
  menuHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: '#000000',
    fontFamily: Platform.select({
      ios: 'Didot',
      android: 'serif',
      default: 'serif',
    }),
  },
  menuShortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#D8D8D8',
    backgroundColor: '#FFFFFF',
  },
  menuShortcutItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  menuShortcutIcon: {
    width: 28,
    height: 28,
  },
  menuShortcutLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#000000',
    marginTop: 8,
    textAlign: 'center',
  },
  menuGenderTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#D8D8D8',
    backgroundColor: '#FFFFFF',
  },
  menuGenderTabBtn: {
    paddingVertical: 14,
    marginRight: 28,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  menuGenderTabBtnActive: {
    borderBottomColor: '#000000',
  },
  menuGenderTabText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#777777',
  },
  menuGenderTabTextActive: {
    color: '#000000',
  },
  menuEmptyContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // 9. Estilos de la Vista de Favoritos
  favoritosScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  favoritosHeaderContainer: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#B0B0B0',
    backgroundColor: '#FFFFFF',
  },
  favoritosHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: '#000000',
    fontFamily: Platform.select({
      ios: 'Didot',
      android: 'serif',
      default: 'serif',
    }),
  },
  favoritosFilterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
  favoritosFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoritosFilterButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#000000',
  },
  filtroChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  filtroChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  filtroChipActivo: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  filtroChipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: '#666666',
  },
  filtroChipTextActivo: {
    color: '#FFFFFF',
  },
  favoritosGridContent: {
    paddingHorizontal: 0,
    backgroundColor: '#FFFFFF',
  },
  favoritoCard: {
    width: CARD_WIDTH,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  favoritoImageContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.36,
    backgroundColor: '#F4F4F4',
    overflow: 'hidden',
  },
  favoritoImage: {
    width: '100%',
    height: '100%',
  },
  favoritoDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },
  favoritoTextCol: {
    flex: 1,
    paddingRight: 4,
  },
  favoritoTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#000000',
  },
  favoritoPrice: {
    fontSize: 12,
    color: '#222222',
    marginTop: 2,
    fontWeight: '500',
  },
  favoritoActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  favCartButton: {
    padding: 2,
  },
  cartIconBadgeWrap: {
    position: 'relative',
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartPlusBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#000000',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartPlusBadgeText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '800',
    lineHeight: 8.5,
  },
  favHeartFilledButton: {
    padding: 2,
  },
  favoritosEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  favoritosEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#000000',
    marginTop: 14,
    textAlign: 'center',
  },
  favoritosEmptySubtitle: {
    fontSize: 13,
    color: '#777777',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
});

