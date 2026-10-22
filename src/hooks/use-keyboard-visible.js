import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// true mientras el teclado está abierto (para ocultar barras ancladas al fondo).
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mostrar = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      setVisible(true)
    );
    const ocultar = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setVisible(false)
    );
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);

  return visible;
}
