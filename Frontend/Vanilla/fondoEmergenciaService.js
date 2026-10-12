// Vanilla/fondoEmergenciaService.js
// Servicio de datos y cálculo para HU-25: Fondo de Emergencia (#36)
// Gestiona el cálculo de fondo sugerido según gastos fijos (3 a 6 meses),
// la definición de meta vinculada a la cuenta de ahorros y el indicador de avance.

import { obtenerCuentas, obtenerUsernameActivo } from './cuentasService.js';
import { guardarNotificacion, actualizarCampana } from './notificaciones.js';

const CLAVE_FONDO = 'finara_fondo_emergencia';

export const formatoCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
});

function leerTodosFondos() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_FONDO));
        return Array.isArray(datos) ? datos : [];
    } catch {
        return [];
    }
}

function guardarTodosFondos(lista) {
    try {
        localStorage.setItem(CLAVE_FONDO, JSON.stringify(lista));
    } catch {
        console.error('Error al guardar fondo de emergencia en localStorage');
    }
}

/**
 * Calcula el monto sugerido de fondo de emergencia según gastos fijos mensuales y número de meses de cobertura.
 */
export function calcularFondoSugerido(gastosFijosMensuales, mesesCobertura = 3) {
    const gastos = Number(gastosFijosMensuales) || 0;
    const meses = Math.max(1, Math.min(12, Number(mesesCobertura) || 3));
    const totalSugerido = gastos * meses;

    return {
        gastosFijosMensuales: gastos,
        mesesCobertura: meses,
        totalSugerido,
        coberturaMinima: gastos * 3, // Regla financiera base: 3 meses
        coberturaRecomendada: gastos * 6 // Cobertura óptima: 6 meses
    };
}
