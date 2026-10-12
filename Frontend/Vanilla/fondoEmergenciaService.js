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

/**
 * Obtiene la meta configurada del fondo de emergencia del usuario actual y sincroniza con el saldo real de su cuenta de ahorro.
 */
export async function obtenerMetaFondoUsuario() {
    const usuarioActivo = obtenerUsernameActivo();
    const fondos = leerTodosFondos();
    let meta = fondos.find(f => f.username === usuarioActivo || (!f.username && usuarioActivo === 'maria17'));

    // Consultar cuentas activas del usuario para vincular su cuenta de Ahorros
    const cuentas = await obtenerCuentas();
    const cuentaAhorros = cuentas.find(c => c.tipo === 'AHORROS') || cuentas[0] || null;
    const saldoAhorros = cuentaAhorros ? (Number(cuentaAhorros.saldo) || 0) : 0;

    if (!meta) {
        // Meta por defecto vinculada al saldo inicial de ahorro
        meta = {
            id: `FE-${Date.now()}`,
            username: usuarioActivo,
            metaMonto: 10800000,
            gastosFijos: 1800000,
            mesesCobertura: 6,
            cuentaVinculadaId: cuentaAhorros ? cuentaAhorros.id : null,
            cuentaVinculadaNumero: cuentaAhorros ? cuentaAhorros.numero : '',
            fechaCreacion: new Date().toISOString()
        };
        fondos.push(meta);
        guardarTodosFondos(fondos);
    }

    return {
        ...meta,
        saldoActualAhorro: saldoAhorros,
        cuentaVinculada: cuentaAhorros
    };
}

/**
 * Permite al usuario definir y actualizar su meta de fondo de emergencia vinculada a su ahorro.
 */
export async function guardarMetaFondoUsuario({ metaMonto, gastosFijos, mesesCobertura, cuentaId }) {
    const usuarioActivo = obtenerUsernameActivo();
    let fondos = leerTodosFondos();
    const indice = fondos.findIndex(f => f.username === usuarioActivo || (!f.username && usuarioActivo === 'maria17'));

    const montoNum = Number(metaMonto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
        throw new Error('El monto de la meta debe ser un valor válido mayor a cero.');
    }

    const cuentas = await obtenerCuentas();
    const cta = cuentas.find(c => String(c.id) === String(cuentaId)) || cuentas.find(c => c.tipo === 'AHORROS') || null;

    const datosGuardar = {
        id: indice !== -1 ? fondos[indice].id : `FE-${Date.now()}`,
        username: usuarioActivo,
        metaMonto: montoNum,
        gastosFijos: Number(gastosFijos) || 1800000,
        mesesCobertura: Number(mesesCobertura) || 6,
        cuentaVinculadaId: cta ? cta.id : null,
        cuentaVinculadaNumero: cta ? cta.numero : '',
        fechaActualizacion: new Date().toISOString()
    };

    if (indice !== -1) {
        fondos[indice] = { ...fondos[indice], ...datosGuardar };
    } else {
        fondos.push(datosGuardar);
    }

    guardarTodosFondos(fondos);

    // Notificación en el sistema
    guardarNotificacion({
        titulo: 'Meta de Fondo de Emergencia Actualizada',
        mensaje: `Has fijado tu meta de fondo en ${formatoCOP.format(montoNum)} vinculada a tu cuenta terminada en ${String(cta?.numero || '').slice(-4)}.`,
        tipo: 'exito'
    });

    try {
        actualizarCampana();
    } catch { }

    return datosGuardar;
}
