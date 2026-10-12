// Vanilla/metasService.js
// Servicio de datos y cálculo para HU-28: Asesoría para alcanzar una meta (#39)
// Maneja la proyección de metas con plazo e importe,
// conexión con el saldo asignado de la cuenta de ahorro/corriente seleccionada,
// cálculo de brecha restante y ahorro periódico necesario (mensual, quincenal, semanal).

import { obtenerCuentas, obtenerUsernameActivo } from './cuentasService.js';
import { guardarNotificacion, actualizarCampana } from './notificaciones.js';

const CLAVE_METAS = 'finara_metas_ahorro';

export const formatoCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
});

export function leerTodasMetas() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_METAS));
        return Array.isArray(datos) ? datos : [];
    } catch {
        return [];
    }
}

export function guardarTodasMetas(lista) {
    try {
        localStorage.setItem(CLAVE_METAS, JSON.stringify(lista));
    } catch (e) {
        console.error('Error al guardar metas en localStorage', e);
    }
}

/**
 * Calcula la proyección de una meta con plazo e importe:
 * - Brecha restante (monto meta - saldo actual asignado)
 * - Ahorro periódico necesario: mensual, quincenal y semanal
 * - Fecha proyectada estimada
 * - Estado de avance
 */
export function proyectarMeta({ montoObjetivo, plazoMeses, saldoAsignado = 0, fechaInicio = new Date() }) {
    const meta = Math.max(0, Number(montoObjetivo) || 0);
    const saldo = Math.max(0, Number(saldoAsignado) || 0);
    const meses = Math.max(1, Math.min(120, Number(plazoMeses) || 1));

    const brechaRestante = Math.max(0, meta - saldo);
    const porcentajeAvance = meta > 0 ? Math.min(100, Math.round((saldo / meta) * 100)) : 0;
    const porcentajeReal = meta > 0 ? Number(((saldo / meta) * 100).toFixed(1)) : 0;

    // Cálculo de cuotas periódicas para cubrir la brecha en el plazo indicado
    const ahorroMensualNecesario = Math.ceil(brechaRestante / meses);
    const ahorroQuincenalNecesario = Math.ceil(brechaRestante / (meses * 2));
    const ahorroSemanalNecesario = Math.ceil(brechaRestante / (meses * 4.33));

    // Fecha estimada de cumplimiento
    const fechaMeta = new Date(fechaInicio);
    fechaMeta.setMonth(fechaMeta.getMonth() + meses);

    const completada = brechaRestante === 0 && meta > 0;

    // Evaluación o recomendación de viabilidad
    let evaluacion = 'En planificación';
    let claseEvaluacion = 'progreso';

    if (completada) {
        evaluacion = '¡Meta completada!';
        claseEvaluacion = 'exito';
    } else if (porcentajeReal >= 75) {
        evaluacion = 'Cerca de alcanzarla';
        claseEvaluacion = 'exito';
    } else if (porcentajeReal >= 30) {
        evaluacion = 'Ritmo constante';
        claseEvaluacion = 'progreso';
    } else {
        evaluacion = 'Etapa inicial';
        claseEvaluacion = 'alerta';
    }

    return {
        montoObjetivo: meta,
        plazoMeses: meses,
        saldoAsignado: saldo,
        brechaRestante,
        porcentajeAvance,
        porcentajeReal,
        ahorroMensualNecesario,
        ahorroQuincenalNecesario,
        ahorroSemanalNecesario,
        fechaEstimadaFin: fechaMeta.toISOString().split('T')[0],
        completada,
        evaluacion,
        claseEvaluacion
    };
}

/**
 * Obtiene las metas registradas para el usuario activo,
 * sincronizando el saldo asignado con las cuentas reales actuales.
 */
export async function obtenerMetasUsuario() {
    const usuarioActivo = obtenerUsernameActivo();
    const todas = leerTodasMetas();
    let metasUsuario = todas.filter(m => m.username === usuarioActivo || (!m.username && usuarioActivo === 'maria17'));

    const cuentas = await obtenerCuentas();
    const cuentasMonetarias = cuentas.filter(c => c.tipo === 'AHORROS' || c.tipo === 'CORRIENTE');

    // Si el usuario no tiene metas, inicializamos una meta de bienvenida demostrativa
    if (metasUsuario.length === 0) {
        const cuentaDefecto = cuentasMonetarias.find(c => c.tipo === 'AHORROS') || cuentasMonetarias[0] || null;
        const saldoInicial = cuentaDefecto ? Number(cuentaDefecto.saldo) : 5000000;

        const metaInicial = {
            id: `META-${Date.now()}`,
            username: usuarioActivo,
            nombreMeta: 'Comprar Vehículo / Viaje',
            categoria: 'Vehículo',
            montoObjetivo: 15000000,
            plazoMeses: 12,
            cuentaAsignadaId: cuentaDefecto ? cuentaDefecto.id : 'CTA-AHO-01',
            cuentaAsignadaNumero: cuentaDefecto ? cuentaDefecto.numero : '4782',
            fechaCreacion: new Date().toISOString()
        };

        todas.push(metaInicial);
        guardarTodasMetas(todas);
        metasUsuario = [metaInicial];
    }

    // Enriquecer cada meta con su saldo en tiempo real y su proyección
    return metasUsuario.map(m => {
        const cuenta = cuentasMonetarias.find(c => String(c.id) === String(m.cuentaAsignadaId)) || null;
        const saldoAsignado = cuenta ? Number(cuenta.saldo) : 0;
        const proyeccion = proyectarMeta({
            montoObjetivo: m.montoObjetivo,
            plazoMeses: m.plazoMeses,
            saldoAsignado
        });

        return {
            ...m,
            cuentaAsignada: cuenta,
            saldoAsignado,
            proyeccion
        };
    });
}

/**
 * Guarda o actualiza una meta con plazo e importe,
 * vinculándola a la cuenta de ahorro o corriente asignada.
 */
export async function guardarMeta({ id, nombreMeta, categoria, montoObjetivo, plazoMeses, cuentaAsignadaId }) {
    const usuarioActivo = obtenerUsernameActivo();
    const montoNum = Math.max(0, Number(montoObjetivo) || 0);
    const mesesNum = Math.max(1, Number(plazoMeses) || 1);

    if (montoNum <= 0) {
        throw new Error('El importe de la meta debe ser mayor a cero.');
    }

    const cuentas = await obtenerCuentas();
    const cuentasPermitidas = cuentas.filter(c => c.tipo === 'AHORROS' || c.tipo === 'CORRIENTE');
    const cuenta = cuentasPermitidas.find(c => String(c.id) === String(cuentaAsignadaId)) || cuentasPermitidas[0];

    let todas = leerTodasMetas();
    const idFinal = id || `META-${Date.now()}`;
    const indice = todas.findIndex(m => m.id === idFinal);

    const datosMeta = {
        id: idFinal,
        username: usuarioActivo,
        nombreMeta: nombreMeta ? nombreMeta.trim() : 'Nueva Meta de Ahorro',
        categoria: categoria || 'General',
        montoObjetivo: montoNum,
        plazoMeses: mesesNum,
        cuentaAsignadaId: cuenta ? cuenta.id : null,
        cuentaAsignadaNumero: cuenta ? cuenta.numero : '',
        fechaActualizacion: new Date().toISOString()
    };

    if (indice !== -1) {
        todas[indice] = { ...todas[indice], ...datosMeta };
    } else {
        datosMeta.fechaCreacion = new Date().toISOString();
        todas.push(datosMeta);
    }

    guardarTodasMetas(todas);

    const proyeccion = proyectarMeta({
        montoObjetivo: montoNum,
        plazoMeses: mesesNum,
        saldoAsignado: cuenta ? Number(cuenta.saldo) : 0
    });

    guardarNotificacion({
        titulo: 'Meta Financiera Actualizada',
        mensaje: `Meta "${datosMeta.nombreMeta}" configurada: ${formatoCOP.format(montoNum)} a ${mesesNum} meses. Ahorro sugerido: ${formatoCOP.format(proyeccion.ahorroMensualNecesario)}/mes.`,
        tipo: 'exito'
    });

    try {
        actualizarCampana();
    } catch { }

    return {
        ...datosMeta,
        cuentaAsignada: cuenta,
        saldoAsignado: cuenta ? Number(cuenta.saldo) : 0,
        proyeccion
    };
}

/**
 * Elimina una meta existente por su ID.
 */
export async function eliminarMeta(idMeta) {
    let todas = leerTodasMetas();
    todas = todas.filter(m => m.id !== idMeta);
    guardarTodasMetas(todas);

    guardarNotificacion({
        titulo: 'Meta Eliminada',
        mensaje: 'La meta de ahorro seleccionada ha sido eliminada del plan.',
        tipo: 'info'
    });

    try {
        actualizarCampana();
    } catch { }

    return true;
}
