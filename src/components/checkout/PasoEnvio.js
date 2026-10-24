import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { FONT, NEGRO, ROJO, VERDE, ListaPrendas, Totales, CampoPastilla } from './ui';
import { DEPARTAMENTOS, TIENDA_DIRECCION, COSTO_ENVIO_DOMICILIO, ENVIO_GRATIS_DESDE, formatoPrecio, redondear } from '../../lib/tienda';
import { textoDireccion, validarDireccion } from '../../lib/pedidos';

function Radio({ activo }) {
  return <View style={[styles.radio, activo && styles.radioActivo]} />;
}

function FormularioDireccion({ onGuardar, onCancelar }) {
  const [calle, setCalle] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    const nuevos = validarDireccion({ calle, ciudad, departamento });
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    setGuardando(true);
    try {
      await onGuardar({ calle, ciudad, departamento });
    } catch {
      setErrores({ general: 'No se pudo guardar la dirección. Inténtalo de nuevo.' });
      setGuardando(false);
    }
  };

  return (
    <View style={styles.formulario}>
      <CampoPastilla icono="home-outline" error={errores.calle}>
        <TextInput
          style={styles.input}
          placeholder="CALLE Y NÚMERO DE CASA"
          placeholderTextColor="#8A8A8A"
          value={calle}
          onChangeText={(v) => {
            setCalle(v);
            setErrores((p) => ({ ...p, calle: undefined }));
          }}
          maxLength={90}
        />
      </CampoPastilla>
      <CampoPastilla icono="business-outline" error={errores.ciudad}>
        <TextInput
          style={styles.input}
          placeholder="CIUDAD O MUNICIPIO"
          placeholderTextColor="#8A8A8A"
          value={ciudad}
          onChangeText={(v) => {
            setCiudad(v);
            setErrores((p) => ({ ...p, ciudad: undefined }));
          }}
          maxLength={50}
        />
      </CampoPastilla>

      <Text style={styles.etiquetaDepto}>DEPARTAMENTO</Text>
      <View style={styles.deptos}>
        {DEPARTAMENTOS.map((d) => {
          const activo = departamento === d;
          return (
            <TouchableOpacity
              key={d}
              activeOpacity={0.7}
              onPress={() => {
                setDepartamento(d);
                setErrores((p) => ({ ...p, departamento: undefined }));
              }}
              style={[styles.depto, activo && styles.deptoActivo]}
            >
              <Text style={[styles.deptoTexto, activo && styles.deptoTextoActivo]}>{d}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!!errores.departamento && <Text style={styles.error}>{errores.departamento}</Text>}
      {!!errores.general && <Text style={styles.error}>{errores.general}</Text>}

      <View style={styles.formBotones}>
        <TouchableOpacity activeOpacity={0.8} onPress={onCancelar} disabled={guardando} style={styles.formCancelar}>
          <Text style={styles.formCancelarTexto}>CANCELAR</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} onPress={guardar} disabled={guardando} style={styles.formGuardar}>
          {guardando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.formGuardarTexto}>GUARDAR</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PasoEnvio({
  items,
  subtotal,
  envio,
  total,
  tipo,
  onTipo,
  direcciones,
  cargandoDirecciones,
  errorDirecciones,
  direccionId,
  onDireccion,
  onCrearDireccion,
}) {
  const [agregando, setAgregando] = useState(false);

  // Descuento total de la cesta: diferencia entre el precio original y el vigente.
  const subtotalOriginal = redondear(items.reduce((acc, i) => acc + (i.precioOriginal || i.precio) * i.cantidad, 0));
  const ahorro = redondear(subtotalOriginal - subtotal);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>DOMICILIO</Text>

        {cargandoDirecciones ? (
          <ActivityIndicator color={NEGRO} style={styles.cargando} />
        ) : (
          <>
            {direcciones.map((dir) => {
              const activo = tipo === 'domicilio' && String(direccionId) === String(dir.ID_Direccion);
              return (
                <TouchableOpacity key={String(dir.ID_Direccion)} activeOpacity={0.7} onPress={() => onDireccion(dir)} style={styles.opcion}>
                  <Radio activo={activo} />
                  <Text style={styles.opcionTexto}>{textoDireccion(dir).toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
            {direcciones.length === 0 && !agregando && (
              <Text style={styles.nota}>
                {errorDirecciones || 'Aún no tienes direcciones guardadas.'}
              </Text>
            )}
            <Text style={styles.notaEnvio}>
              Envío {formatoPrecio(COSTO_ENVIO_DOMICILIO)} (gratis desde {formatoPrecio(ENVIO_GRATIS_DESDE)})
            </Text>
          </>
        )}

        {agregando ? (
          <FormularioDireccion
            onCancelar={() => setAgregando(false)}
            onGuardar={async (datos) => {
              await onCrearDireccion(datos);
              setAgregando(false);
            }}
          />
        ) : (
          <TouchableOpacity activeOpacity={0.7} onPress={() => setAgregando(true)} style={styles.agregar}>
            <Text style={styles.agregarTexto}>AGREGAR DIRECCIÓN +</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.titulo, styles.tituloTienda]}>TIENDA</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onTipo('tienda')} style={styles.opcion}>
          <Radio activo={tipo === 'tienda'} />
          <View style={styles.opcionBloque}>
            <Text style={styles.opcionTexto}>{TIENDA_DIRECCION}</Text>
            <Text style={styles.gratis}>GRATIS</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ListaPrendas items={items} />
      <Totales subtotal={subtotal} subtotalOriginal={subtotalOriginal} ahorro={ahorro} envio={envio} total={total} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { paddingTop: 16, paddingBottom: 24 },
  tarjeta: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  titulo: { fontFamily: FONT, fontSize: 15, letterSpacing: 0.5, color: NEGRO, marginBottom: 12 },
  tituloTienda: { marginTop: 20 },
  cargando: { marginVertical: 14 },
  opcion: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  opcionBloque: { flex: 1 },
  opcionTexto: { flex: 1, fontFamily: FONT, fontSize: 12, lineHeight: 17, color: NEGRO },
  radio: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#D9D9D9', marginRight: 12, marginTop: 1 },
  radioActivo: { backgroundColor: NEGRO },
  gratis: { fontFamily: FONT, fontSize: 12, color: VERDE, marginTop: 2 },
  nota: { fontFamily: FONT, fontSize: 12, color: '#6B6B6B', marginBottom: 8 },
  notaEnvio: { fontFamily: FONT, fontSize: 11, color: '#6B6B6B', marginBottom: 4 },
  agregar: { alignSelf: 'flex-end', marginTop: 4 },
  agregarTexto: { fontFamily: FONT, fontSize: 12, color: NEGRO, textDecorationLine: 'underline' },

  formulario: { marginTop: 14 },
  input: { fontFamily: FONT, fontSize: 12, letterSpacing: 0.3, color: NEGRO, padding: 0 },
  etiquetaDepto: { fontFamily: FONT, fontSize: 11, letterSpacing: 1, color: '#6B6B6B', marginBottom: 8 },
  deptos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  depto: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: NEGRO },
  deptoActivo: { backgroundColor: NEGRO },
  deptoTexto: { fontFamily: FONT, fontSize: 11, color: NEGRO },
  deptoTextoActivo: { color: '#FFFFFF' },
  error: { color: ROJO, fontSize: 12, marginTop: 8 },
  formBotones: { flexDirection: 'row', gap: 12, marginTop: 16 },
  formCancelar: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: NEGRO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCancelarTexto: { fontFamily: FONT, fontSize: 12, letterSpacing: 0.8, color: NEGRO },
  formGuardar: { flex: 1, height: 40, borderRadius: 20, backgroundColor: NEGRO, alignItems: 'center', justifyContent: 'center' },
  formGuardarTexto: { fontFamily: FONT, fontSize: 12, letterSpacing: 0.8, color: '#FFFFFF' },
});
