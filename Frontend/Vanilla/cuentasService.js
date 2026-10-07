// Vanilla/cuentasService.js
// Capa de acceso a datos de cuentas. La UI nunca llama a fetch directamente.

// Cambia a false cuando el endpoint del Backend esté disponible.
const USAR_DATOS_DE_PRUEBA = true;
const API_URL = 'http://localhost:8080/api/cuentas';

// Contrato esperado del API (GET /api/cuentas), solo cuentas del usuario autenticado:
// [{ id, tipo: 'AHORROS' | 'CORRIENTE' | 'TARJETA_CREDITO', numero, saldo, estado }]
// "saldo" en tarjeta de crédito = cupo disponible.
const CUENTAS_MOCK = [
    { id: 1, tipo: 'AHORROS', numero: '4021587701234', saldo: 1250000, estado: 'ACTIVA' },
    { id: 2, tipo: 'CORRIENTE', numero: '4021587705678', saldo: 820450, estado: 'ACTIVA' },
    { id: 3, tipo: 'TARJETA_CREDITO', numero: '5412750000009012', saldo: 1800000, estado: 'ACTIVA' }
];

export class SesionExpiradaError extends Error { }

export async function obtenerCuentas() {
    if (USAR_DATOS_DE_PRUEBA) {
        await new Promise(r => setTimeout(r, 400)); // simula latencia
        return CUENTAS_MOCK;
    }

    const token = localStorage.getItem('authToken');
    if (!token) throw new SesionExpiradaError();

    const respuesta = await fetch(API_URL, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

    if (respuesta.status === 401 || respuesta.status === 403) throw new SesionExpiradaError();
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status} al consultar las cuentas`);

    return respuesta.json();
}