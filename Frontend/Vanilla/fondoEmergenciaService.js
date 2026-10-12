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

    // Consultar cuentas activas del usuario (filtrando cuentas de ahorro y corriente, excluyendo tarjetas)
    const cuentas = await obtenerCuentas();
    const cuentasPermitidas = cuentas.filter(c => c.tipo === 'AHORROS' || c.tipo === 'CORRIENTE');

    let cuentaVinculada = null;
    if (meta && meta.cuentaVinculadaId) {
        cuentaVinculada = cuentasPermitidas.find(c => String(c.id) === String(meta.cuentaVinculadaId)) || null;
    }
    if (!cuentaVinculada) {
        cuentaVinculada = cuentasPermitidas.find(c => c.tipo === 'AHORROS') || cuentasPermitidas[0] || null;
    }

    const saldoVinculado = cuentaVinculada ? (Number(cuentaVinculada.saldo) || 0) : 0;

    if (!meta) {
        // Meta por defecto vinculada al saldo inicial de ahorro
        meta = {
            id: `FE-${Date.now()}`,
            username: usuarioActivo,
            metaMonto: 10800000,
            gastosFijos: 1800000,
            mesesCobertura: 6,
            cuentaVinculadaId: cuentaVinculada ? cuentaVinculada.id : null,
            cuentaVinculadaNumero: cuentaVinculada ? cuentaVinculada.numero : '',
            fechaCreacion: new Date().toISOString()
        };
        fondos.push(meta);
        guardarTodosFondos(fondos);
    }

    return {
        ...meta,
        saldoActualAhorro: saldoVinculado,
        cuentaVinculada: cuentaVinculada
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
    const cuentasPermitidas = cuentas.filter(c => c.tipo === 'AHORROS' || c.tipo === 'CORRIENTE');
    const cta = cuentasPermitidas.find(c => String(c.id) === String(cuentaId)) || cuentasPermitidas[0] || null;

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

/**
 * Calcula el indicador de avance hacia la meta del fondo de emergencia:
 * porcentaje de cumplimiento, monto faltante, estado de cobertura y recomendaciones.
 */
export async function calcularAvanceFondo() {
    const metaInfo = await obtenerMetaFondoUsuario();
    const meta = Number(metaInfo.metaMonto) || 10800000;
    const saldoActual = Number(metaInfo.saldoActualAhorro) || 0;

    const porcentajeAvance = meta > 0 ? Math.min(100, Math.round((saldoActual / meta) * 100)) : 0;
    const porcentajeReal = meta > 0 ? Math.round((saldoActual / meta) * 100) : 0;
    const montoFaltante = Math.max(0, meta - saldoActual);

    // Meses cubiertos según el saldo actual y sus gastos fijos
    const gastosFijos = Number(metaInfo.gastosFijos) || 1800000;
    const mesesCubiertos = gastosFijos > 0 ? (saldoActual / gastosFijos).toFixed(1) : 0;

    let nivelSeguridad = 'En construcción';
    let claseSeguridad = 'alerta';
    if (porcentajeReal >= 100) {
        nivelSeguridad = '¡Meta cumplida y protegida!';
        claseSeguridad = 'exito';
    } else if (porcentajeReal >= 50) {
        nivelSeguridad = 'Buen camino (Más del 50%)';
        claseSeguridad = 'progreso';
    }

    return {
        ...metaInfo,
        meta,
        saldoActual,
        porcentajeAvance,
        porcentajeReal,
        montoFaltante,
        mesesCubiertos,
        nivelSeguridad,
        claseSeguridad,
        metaCumplida: porcentajeReal >= 100
    };
}
