import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebase';
import { buscarPerfil } from '../lib/authService';
export default function PerfilScreen({ onAbrirHistorial }: any) {
  const [usuario, setUsuario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [errorDb, setErrorDb] = useState('');

    useEffect(() => {
    const cancelar = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Buscamos los datos reales en Firestore
          const perfilData:any = await buscarPerfil(user);
          setUsuario({
            nombre: perfilData?.nombre || user.displayName || 'Usuario',
            correo: user.email,
            telefono: perfilData?.telefono || 'No registrado',
            dui: perfilData?.dui || 'No registrado',
            foto: user.photoURL || 'https://via.placeholder.com/100',
          });
          setErrorDb(''); // Quitamos el error rojo
        } catch (error) {
          console.error("Error al obtener perfil:", error);
          setErrorDb('Error al cargar perfil');
        }
      } else {
        setUsuario(null);
        setErrorDb('Inicia sesión para ver tu perfil');
      }
      setCargando(false);
    });

    return () => cancelar();
  }, []);
  
  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ marginTop: 10 }}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      
      {/* Encabezado  */}
      <View style={styles.header}>
        <Image source={{ uri: usuario?.foto || 'https://via.placeholder.com/100' }} style={styles.avatar} />
        <Text style={styles.nombre}>{usuario?.nombre || 'Sin nombre'}</Text>
        <Text style={styles.correo}>{usuario?.correo || 'Sin correo'}</Text>
      </View>

      {/* Datos del usuario  */}
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Teléfono:</Text>
          <Text style={styles.valor}>{usuario?.telefono || 'No registrado'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>DUI:</Text>
          <Text style={styles.valor}>{usuario?.dui || 'No registrado'}</Text>
        </View>
      </View>

      {/* Los 3 Botones */}
      <TouchableOpacity style={styles.boton} onPress={() => alert('Próximamente')}>
        <Text style={styles.botonTexto}>Editar información</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.boton} onPress={() => alert('Próximamente')}>
        <Text style={styles.botonTexto}>Datos</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.boton, styles.botonCerrar]} onPress={() => alert('Cerrar sesión pendiente de Firebase Auth')}>
        <Text style={[styles.botonTexto, styles.botonTextoBlanco]}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  // Header más compacto
  header: { alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10, backgroundColor: '#ddd' },
  nombre: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  correo: { fontSize: 14, color: '#666', marginTop: 2 },
  
  infoContainer: { paddingHorizontal: 20, paddingVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 15, color: '#666' },
  valor: { fontSize: 15, fontWeight: '500', color: '#000' },
  
  // Botones más pegaditos para que entren en pantalla
  boton: { marginHorizontal: 20, marginTop: 10, padding: 12, borderWidth: 1, borderColor: '#000', borderRadius: 8, alignItems: 'center' },
  botonCerrar: { backgroundColor: '#000', marginBottom: 20 },
  botonTexto: { fontSize: 15, fontWeight: '600', color: '#000' },
  botonTextoBlanco: { color: '#fff' },
});