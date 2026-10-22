import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TABS = [
  { id: 'home', label: 'HOME', icon: require('../../assets/ICONOS/Home.png') },
  { id: 'buscar', label: 'BUSCAR', icon: require('../../assets/ICONOS/Search.png') },
  { id: 'menu', label: 'MENÚ', icon: require('../../assets/ICONOS/Menu.png') },
  { id: 'cesta', label: 'CESTA', icon: require('../../assets/ICONOS/Basket.png') },
  { id: 'perfil', label: 'PERFIL', icon: require('../../assets/ICONOS/Person.png') },
];

// enFlujo: la barra ocupa su lugar en el layout en vez de flotar sobre el contenido.
export default function CustomBottomTabBar({ activeTab = 'home', onTabPress, enFlujo = false }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        enFlujo && styles.containerEnFlujo,
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
    >
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          // Opacidad: 0.90 cuando está seleccionada/activa, 0.56 cuando no
          const currentOpacity = isActive ? 0.90 : 0.56;

          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.7}
              onPress={() => onTabPress?.(tab.id)}
              style={styles.tabButton}
            >
              <Image
                source={tab.icon}
                style={[
                  styles.tabIcon,
                  { opacity: currentOpacity }
                ]}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.tabLabel,
                  { opacity: currentOpacity }
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingTop: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  containerEnFlujo: {
    position: 'relative',
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
  tabLabel: {
    fontFamily: 'Instrument Sans SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: '#000000',
    marginTop: 4,
    textAlign: 'center',
  },
});

