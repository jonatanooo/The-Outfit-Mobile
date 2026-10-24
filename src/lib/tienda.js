// Datos de la tienda física y reglas de envío del proceso de compra.

export const TIENDA_DIRECCION = '#41-B LOCAL 1 CP1502, CALLE DEL MEDITERRÁNEO';
export const TIENDA_NOMBRE = 'SUCURSAL THE OUTFIT';

// Envío a domicilio: costo fijo, gratis al superar el mínimo. Recoger en tienda siempre es gratis.
export const COSTO_ENVIO_DOMICILIO = 3.5;
export const ENVIO_GRATIS_DESDE = 50;

export const DEPARTAMENTOS = [
  'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad', 'La Paz', 'La Unión',
  'Morazán', 'San Miguel', 'San Salvador', 'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután',
];

export const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const formatoPrecio = (n) => `$${redondear(n).toFixed(2)}`;

// tipo: 'tienda' | 'domicilio'
export function calcularEnvio(tipo, subtotal) {
  if (tipo !== 'domicilio') return 0;
  return subtotal >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO_DOMICILIO;
}
