import React, { useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { FONT, NEGRO, ROJO, CampoPastilla } from './ui';
import {
  detectarMarca,
  formatearCodigoRegalo,
  formatearFechaCaducidad,
  formatearNumeroTarjeta,
  limpiarCodigoRegalo,
  soloDigitos,
  validarPayPal,
  validarRegalo,
  validarTarjeta,
} from '../../lib/pagoSimulado';

const PLACEHOLDER = '#7A7A7A';

function NotaSimulado() {
  return <Text style={styles.nota}>Pago de prueba: los datos no se envían a ningún banco ni se realiza ningún cobro.</Text>;
}

// Cada formulario recibe `registrar(fn)` para entregar su validador: el botón PAGAR del pie
// ejecuta `validarRef.current()`, que devuelve { metodo, datos } si todo es válido o null.

/* ---------- Tarjeta bancaria ---------- */
function FormTarjeta({ onSubmit, errores, setErrores, registrar }) {
  const [datos, setDatos] = useState({ numero: '', fecha: '', cvv: '', titular: '' });
  const fechaRef = useRef(null);
  const cvvRef = useRef(null);
  const titularRef = useRef(null);
  const marca = detectarMarca(datos.numero);
  const largoCvv = marca === 'AMEX' ? 4 : 3;

  const cambiar = (campo, valor) => {
    setDatos((p) => {
      const nuevo = { ...p, [campo]: valor };
      // Si cambia la marca (p. ej. de Amex a otra), el CVV se recorta a su nuevo largo
      if (campo === 'numero') nuevo.cvv = nuevo.cvv.slice(0, detectarMarca(valor) === 'AMEX' ? 4 : 3);
      return nuevo;
    });
    if (errores[campo]) setErrores((p) => ({ ...p, [campo]: undefined }));
  };

  registrar(() => {
    const e = validarTarjeta(datos);
    setErrores(e);
    return Object.keys(e).length === 0 ? { metodo: 'tarjeta', datos } : null;
  });

  return (
    <View>
      <Text style={styles.titulo}>TARJETA BANCARIA</Text>
      <CampoPastilla icono="card" error={errores.numero}>
        <View style={styles.numeroFila}>
          <TextInput
            style={[styles.input, styles.numeroInput]}
            placeholder="NÚMERO DE LA TARJETA"
            placeholderTextColor={PLACEHOLDER}
            value={datos.numero}
            onChangeText={(v) => cambiar('numero', formatearNumeroTarjeta(v))}
            keyboardType="number-pad"
            maxLength={19}
            autoComplete="cc-number"
            returnKeyType="next"
            onSubmitEditing={() => fechaRef.current?.focus()}
          />
          {!!marca && <Text style={styles.marca}>{marca}</Text>}
        </View>
      </CampoPastilla>
      <CampoPastilla icono="calculator" error={errores.fecha}>
        <TextInput
          ref={fechaRef}
          style={styles.input}
          placeholder="FECHA DE CADUCIDAD (DD/MM/YY)"
          placeholderTextColor={PLACEHOLDER}
          value={datos.fecha}
          onChangeText={(v) => cambiar('fecha', formatearFechaCaducidad(v))}
          keyboardType="number-pad"
          maxLength={8}
          returnKeyType="next"
          onSubmitEditing={() => cvvRef.current?.focus()}
        />
      </CampoPastilla>
      <CampoPastilla icono="lock-closed" error={errores.cvv} ancho="46%">
        <TextInput
          ref={cvvRef}
          style={styles.input}
          placeholder="CVV"
          placeholderTextColor={PLACEHOLDER}
          value={datos.cvv}
          onChangeText={(v) => cambiar('cvv', soloDigitos(v, largoCvv))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={largoCvv}
          returnKeyType="next"
          onSubmitEditing={() => titularRef.current?.focus()}
        />
      </CampoPastilla>
      <CampoPastilla icono="person" error={errores.titular}>
        <TextInput
          ref={titularRef}
          style={styles.input}
          placeholder="TITULAR DE LA TARJETA"
          placeholderTextColor={PLACEHOLDER}
          value={datos.titular}
          onChangeText={(v) => cambiar('titular', v)}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      </CampoPastilla>
      <NotaSimulado />
    </View>
  );
}

/* ---------- PayPal ---------- */
function FormPayPal({ onSubmit, errores, setErrores, registrar }) {
  const [datos, setDatos] = useState({ correo: '', password: '' });
  const passRef = useRef(null);

  const cambiar = (campo, valor) => {
    setDatos((p) => ({ ...p, [campo]: valor }));
    if (errores[campo]) setErrores((p) => ({ ...p, [campo]: undefined }));
  };

  registrar(() => {
    const e = validarPayPal(datos);
    setErrores(e);
    return Object.keys(e).length === 0 ? { metodo: 'paypal', datos } : null;
  });

  return (
    <View>
      <Text style={styles.titulo}>PAYPAL</Text>
      <CampoPastilla icono="mail" error={errores.correo}>
        <TextInput
          style={styles.input}
          placeholder="CORREO DE PAYPAL"
          placeholderTextColor={PLACEHOLDER}
          value={datos.correo}
          onChangeText={(v) => cambiar('correo', v)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => passRef.current?.focus()}
        />
      </CampoPastilla>
      <CampoPastilla icono="lock-closed" error={errores.password}>
        <TextInput
          ref={passRef}
          style={styles.input}
          placeholder="CONTRASEÑA"
          placeholderTextColor={PLACEHOLDER}
          value={datos.password}
          onChangeText={(v) => cambiar('password', v)}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      </CampoPastilla>
      <NotaSimulado />
    </View>
  );
}

/* ---------- Tarjeta de regalo ---------- */
function FormRegalo({ onSubmit, errores, setErrores, registrar }) {
  const [datos, setDatos] = useState({ codigo: '', pin: '' });
  const pinRef = useRef(null);

  const cambiar = (campo, valor) => {
    setDatos((p) => ({ ...p, [campo]: valor }));
    if (errores[campo]) setErrores((p) => ({ ...p, [campo]: undefined }));
  };

  registrar(() => {
    const e = validarRegalo(datos);
    setErrores(e);
    return Object.keys(e).length === 0 ? { metodo: 'regalo', datos } : null;
  });

  return (
    <View>
      <Text style={styles.titulo}>TARJETA DE REGALO</Text>
      <CampoPastilla icono="gift" error={errores.codigo}>
        <TextInput
          style={styles.input}
          placeholder="CÓDIGO DE LA TARJETA"
          placeholderTextColor={PLACEHOLDER}
          value={datos.codigo}
          onChangeText={(v) => cambiar('codigo', formatearCodigoRegalo(limpiarCodigoRegalo(v)))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={19}
          returnKeyType="next"
          onSubmitEditing={() => pinRef.current?.focus()}
        />
      </CampoPastilla>
      <CampoPastilla icono="lock-closed" error={errores.pin} ancho="46%">
        <TextInput
          ref={pinRef}
          style={styles.input}
          placeholder="PIN"
          placeholderTextColor={PLACEHOLDER}
          value={datos.pin}
          onChangeText={(v) => cambiar('pin', soloDigitos(v, 4))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      </CampoPastilla>
      <NotaSimulado />
    </View>
  );
}

const FORMULARIOS = { tarjeta: FormTarjeta, paypal: FormPayPal, regalo: FormRegalo };

export default function PasoPago({ metodo, errorPago, validarRef, onPagar }) {
  const [errores, setErrores] = useState({});
  const registrar = (fn) => {
    validarRef.current = fn;
  };
  const Formulario = FORMULARIOS[metodo];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Formulario onSubmit={onPagar} errores={errores} setErrores={setErrores} registrar={registrar} />
      {!!errorPago && <Text style={styles.errorPago}>{errorPago}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  titulo: { fontFamily: FONT, fontSize: 14, letterSpacing: 0.5, color: NEGRO, marginBottom: 16 },
  input: { fontFamily: FONT, fontSize: 12, letterSpacing: 0.4, color: NEGRO, padding: 0 },
  numeroFila: { flexDirection: 'row', alignItems: 'center' },
  numeroInput: { flex: 1 },
  marca: { fontFamily: FONT, fontSize: 11, letterSpacing: 0.6, color: '#1A1A1A', marginLeft: 8 },
  nota: { fontFamily: FONT, fontSize: 11, lineHeight: 16, color: '#6B6B6B', marginTop: 4 },
  errorPago: { color: ROJO, fontSize: 13, textAlign: 'center', marginTop: 18 },
});
