// Vanilla/Finanzas/FondoEmergenciaService.js

import { obtenerCuentas, obtenerUsernameActivo } from '../cuentasService.js';

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

export function calcularFondoSugerido(gastosFijosMensuales, mesesCobertura = 3) {
    const gastos = Number(gastosFijosMensuales) || 0;
    const meses = Math.max(1, Math.min(12, Number(mesesCobertura) || 3));
    const totalSugerido = gastos * meses;

    return {
        gastosFijosMensuales: gastos,
        mesesCobertura: meses,
        totalSugerido,
        coberturaMinima: gastos * 3,
        coberturaRecomendada: gastos * 6
    };
}

export async function obtenerMetaFondoUsuario() {
    const usuarioActivo = obtenerUsernameActivo();
    let fondos = leerTodosFondos();

    fondos = fondos.filter(f => !(f.metaMonto === 10800000 && !f.fechaActualizacion && (!f.cuentaVinculadaId || f.cuentaVinculadaId === 1)));
    guardarTodosFondos(fondos);

    let meta = fondos.find(f => f.username === usuarioActivo);

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
    return datosGuardar;
}

export async function calcularAvanceFondo() {
    const metaInfo = await obtenerMetaFondoUsuario();
    const meta = Number(metaInfo.metaMonto) || 0;
    const saldoActual = Number(metaInfo.saldoActualAhorro) || 0;

    const porcentajeAvance = meta > 0 ? Math.min(100, Math.round((saldoActual / meta) * 100)) : 0;
    const porcentajeReal = meta > 0 ? Math.round((saldoActual / meta) * 100) : 0;
    const montoFaltante = meta > 0 ? Math.max(0, meta - saldoActual) : 0;

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