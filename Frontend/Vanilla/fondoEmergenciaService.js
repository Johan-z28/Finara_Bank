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
    let fondos = leerTodosFondos();

    // Limpieza de metas ficticias legadas autogeneradas sin cuenta vinculada real
    fondos = fondos.filter(f => !(f.metaMonto === 10800000 && !f.fechaActualizacion && (!f.cuentaVinculadaId || f.cuentaVinculadaId === 1)));
    guardarTodosFondos(fondos);

    let meta = fondos.find(f => f.username === usuarioActivo);

    // Consultar cuentas activas del usuario (filtrando cuentas de ahorro y corriente, excluyendo tarjetas)
    const cuentas = await obtenerCuentas();
    const cuentasPermitidas = cuentas.filter(c => c.tipo === 'AHORROS' || c.tipo === 'CORRIENTE');

    let cuentaVinculada = null;
    if (meta && meta.cuentaVinculadaId) {
        cuentaVinculada = cuentasPermitidas.find(c => String(c.id) === String(meta.cuentaVinculadaId)) || null;
    }

    const saldoVinculado = cuentaVinculada ? (Number(cuentaVinculada.saldo) || 0) : 0;

    if (!meta) {
        return {
            id: null,
            username: usuarioActivo,
            metaMonto: 0,
            gastosFijos: 0,
            mesesCobertura: 6,
            cuentaVinculadaId: null,
            cuentaVinculadaNumero: '',
            fechaCreacion: null,
            saldoActualAhorro: 0,
            cuentaVinculada: null
        };
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
    const indice = fondos.findIndex(f => f.username === usuarioActivo);

    const montoNum = Number(metaMonto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
        throw new Error('El monto de la meta debe ser un valor válido mayor a cero.');
    }

    const cuentas = await obtenerCuentas();
    const cuentasPermitidas = cuentas.filter(c => c.tipo === 'AHORROS' || c.tipo === 'CORRIENTE');
    const cta = cuentasPermitidas.find(c => String(c.id) === String(cuentaId));
    if (!cta) {
        throw new Error('Debes seleccionar una cuenta de ahorros o corriente válida.');
    }

    const datosGuardar = {
        id: indice !== -1 ? fondos[indice].id : `FE-${Date.now()}`,
        username: usuarioActivo,
        metaMonto: montoNum,
        gastosFijos: Number(gastosFijos) || 0,
        mesesCobertura: Number(mesesCobertura) || 6,
        cuentaVinculadaId: cta.id,
        cuentaVinculadaNumero: cta.numero,
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
    const meta = Number(metaInfo.metaMonto) || 0;
    const saldoActual = Number(metaInfo.saldoActualAhorro) || 0;

    const porcentajeAvance = meta > 0 ? Math.min(100, Math.round((saldoActual / meta) * 100)) : 0;
    const porcentajeReal = meta > 0 ? Math.round((saldoActual / meta) * 100) : 0;
    const montoFaltante = meta > 0 ? Math.max(0, meta - saldoActual) : 0;

    // Meses cubiertos según el saldo actual y sus gastos fijos
    const gastosFijos = Number(metaInfo.gastosFijos) || 0;
    const mesesCubiertos = gastosFijos > 0 ? (saldoActual / gastosFijos).toFixed(1) : 0;

    let nivelSeguridad = meta > 0 ? 'En construcción' : 'Sin meta definida';
    let claseSeguridad = 'alerta';
    if (meta > 0 && porcentajeReal >= 100) {
        nivelSeguridad = '¡Meta cumplida y protegida!';
        claseSeguridad = 'exito';
    } else if (meta > 0 && porcentajeReal >= 50) {
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
        metaCumplida: meta > 0 && porcentajeReal >= 100
    };
}
