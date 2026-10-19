import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans';
import * as SplashScreen from 'expo-splash-screen';

// Conexión directa a Firebase Firestore
import { obtenerNuevosIngresos } from './src/lib/productos';

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
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [favoritos, setFavoritos] = useState({});

  // 1. Consulta a Firebase Firestore para la ropa (Nuevos Ingresos)
  useEffect(() => {
    let montado = true;

    async function cargarCatalogo() {
      try {
        setCargandoProductos(true);
        const data = await obtenerNuevosIngresos();
        if (montado) {
          setProductos(data);
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

  const alternarFavorito = (id) => {
    setFavoritos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleScrollHero = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeSlide && index >= 0 && index < HERO_SLIDES.length) {
      setActiveSlide(index);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ScrollView Principal */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 75 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView edges={['top']} style={styles.safeHeaderArea}>
          {/* Header clásico centrado 'THE OUTFIT' */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>THE OUTFIT</Text>
          </View>
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

        {/* Sección Nuevos Ingresos (Conectado a Firebase) */}
        <View style={styles.sectionNuevosIngresos}>
          <Text style={styles.sectionTitle}>NUEVOS INGRESOS</Text>

          {cargandoProductos ? (
            <View style={styles.loaderArea}>
              <ActivityIndicator size="small" color="#000000" />
              <Text style={styles.loaderText}>Cargando colección...</Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {productos.map((item) => {
                const esFav = Boolean(favoritos[item.id]);

                return (
                  <View key={item.id} style={styles.productCard}>
                    {/* Imagen de la base de datos */}
                    <View style={styles.productImageContainer}>
                      {item.imagen ? (
                        <Image
                          source={{ uri: item.imagen }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.productImage, styles.imagePlaceholder]}>
                          <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
                        </View>
                      )}
                    </View>

                    {/* Información del producto: Título, Precio y Corazón */}
                    <View style={styles.productDetailsRow}>
                      <View style={styles.productTextCol}>
                        <Text
                          style={styles.productTitle}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.nombre.toUpperCase()}
                        </Text>
                        <Text style={styles.productPrice}>
                          ${Number(item.precio).toFixed(2)}
                        </Text>
                      </View>

                      {/* Ícono de corazón a la derecha */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => alternarFavorito(item.id)}
                        style={styles.heartButton}
                      >
                        <Image
                          source={
                            esFav
                              ? require('./assets/ICONOS/Heart2.png')
                              : require('./assets/ICONOS/Heart.png')
                          }
                          style={styles.heartIcon}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
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
                onPress={() => setActiveTab(tab.id)}
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
      <MainHomeScreen />
    </SafeAreaProvider>
  );
}

const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - 28) / 2;

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

  // 3. Sección Nuevos Ingresos
  sectionNuevosIngresos: {
    paddingHorizontal: 10,
    paddingTop: 24,
    paddingBottom: 20,
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 24,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
  },
  productImageContainer: {
    width: '100%',
    height: PRODUCT_CARD_WIDTH * 1.38,
    backgroundColor: '#F4F4F4',
    overflow: 'hidden',
  },
  productImage: {
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
  productDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
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
});

