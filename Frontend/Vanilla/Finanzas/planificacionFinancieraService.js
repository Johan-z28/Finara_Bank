/**
 * planificacionFinancieraService.js
 * Capa de servicio y persistencia para HU-30: Planificación financiera mensual.
 * Gestiona el plan presupuestal mensual (ingresos estimados, asignaciones por categoría y meta de ahorro)
 * y la comparación contra los movimientos reales de Finara Bank.
 */

import {
    CATEGORIAS_INGRESO,
    CATEGORIAS_GASTO,
    formatoCOP,
    obtenerPeriodoActual,
    obtenerPresupuestosUsuario
} from './presupuestoService.js';

import {
    obtenerUsernameActivo,
    obtenerCuentas
} from '../cuentasService.js';

export {
    CATEGORIAS_INGRESO,
    CATEGORIAS_GASTO,
    formatoCOP,
    obtenerPeriodoActual
};

const CLAVE_PLANIFICACION = 'finara_planificacion';
const CLAVE_MOVIMIENTOS = 'finara_movimientos';

/**
 * Lee todo el almacén de planificaciones de localStorage de forma segura.
 */
function leerTodasPlanificaciones() {
    try {
        const raw = localStorage.getItem(CLAVE_PLANIFICACION);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch (e) {
        console.warn('Error leyendo finara_planificacion, inicializando vacío', e);
        return {};
    }
}

/**
 * Guarda el diccionario completo de planificaciones en localStorage.
 */
function guardarTodasPlanificaciones(datos) {
    try {
        localStorage.setItem(CLAVE_PLANIFICACION, JSON.stringify(datos));
    } catch (e) {
        console.error('Error guardando en finara_planificacion', e);
    }
}

/**
 * Obtiene el plan presupuestal del usuario activo para un periodo (YYYY-MM).
 * Retorna null si no existe ningún plan guardado para ese periodo.
 */
export function obtenerPlanUsuario(periodo) {
    const periodoFinal = periodo || obtenerPeriodoActual();
    const username = obtenerUsernameActivo();
    const todas = leerTodasPlanificaciones();

    const planesUsuario = todas[username];
    if (!planesUsuario || !planesUsuario[periodoFinal]) {
        return null;
    }

    const plan = planesUsuario[periodoFinal];
    return {
        ingresosEstimados: Array.isArray(plan.ingresosEstimados) ? plan.ingresosEstimados : [],
        asignaciones: Array.isArray(plan.asignaciones) ? plan.asignaciones : [],
        metaAhorro: Number(plan.metaAhorro) || 0,
        fechaActualizacion: plan.fechaActualizacion || new Date().toISOString()
    };
}

/**
 * Guarda o actualiza el plan del usuario activo para un periodo determinado.
 */
export function guardarPlan(periodo, plan) {
    const periodoFinal = periodo || obtenerPeriodoActual();
    const username = obtenerUsernameActivo();
    const todas = leerTodasPlanificaciones();

    if (!todas[username]) {
        todas[username] = {};
    }

    const sanitizarIngresos = (plan?.ingresosEstimados || []).map(item => ({
        categoria: String(item.categoria || ''),
        monto: Math.max(0, Number(item.monto) || 0)
    }));

    const sanitizarAsignaciones = (plan?.asignaciones || []).map(item => ({
        categoria: String(item.categoria || ''),
        monto: Math.max(0, Number(item.monto) || 0)
    }));

    const nuevoPlan = {
        ingresosEstimados: sanitizarIngresos,
        asignaciones: sanitizarAsignaciones,
        metaAhorro: Math.max(0, Number(plan?.metaAhorro) || 0),
        fechaActualizacion: new Date().toISOString()
    };

    todas[username][periodoFinal] = nuevoPlan;
    guardarTodasPlanificaciones(todas);

    return nuevoPlan;
}

/**
 * Calcula el periodo anterior a uno dado (YYYY-MM).
 */
export function calcularPeriodoAnterior(periodo) {
    const p = periodo || obtenerPeriodoActual();
    const [yearStr, monthStr] = p.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);

    month -= 1;
    if (month < 1) {
        month = 12;
        year -= 1;
    }

    return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Copia el plan del mes anterior para el usuario activo al periodo actual o dado.
 * Retorna el plan clonado o null si el mes anterior no tenía plan.
 */
export function copiarPlanMesAnterior(periodo) {
    const periodoDestino = periodo || obtenerPeriodoActual();
    const periodoAnterior = calcularPeriodoAnterior(periodoDestino);
    const planAnterior = obtenerPlanUsuario(periodoAnterior);

    if (!planAnterior) {
        return null;
    }

    const planClonado = {
        ingresosEstimados: planAnterior.ingresosEstimados.map(i => ({ ...i })),
        asignaciones: planAnterior.asignaciones.map(a => ({ ...a })),
        metaAhorro: planAnterior.metaAhorro,
        fechaActualizacion: new Date().toISOString()
    };

    return guardarPlan(periodoDestino, planClonado);
}

/**
 * Importa los montos desde el módulo Presupuestos (finara_presupuestos) para el periodo seleccionado.
 * Consolida los montos de ingresos y gastos por categoría.
 */
export function importarDesdePresupuesto(periodo) {
    const periodoFinal = periodo || obtenerPeriodoActual();
    const presupuestosReales = obtenerPresupuestosUsuario(periodoFinal);

    // Inicializar mapas con montos en 0 para todas las categorías
    const mapIngresos = {};
    CATEGORIAS_INGRESO.forEach(c => { mapIngresos[c.id] = 0; });

    const mapGastos = {};
    CATEGORIAS_GASTO.forEach(c => { mapGastos[c.id] = 0; });

    let hayDatos = false;

    presupuestosReales.forEach(item => {
        const monto = Number(item.monto) || 0;
        if (item.tipo === 'INGRESO' && item.categoria && mapIngresos.hasOwnProperty(item.categoria)) {
            mapIngresos[item.categoria] += monto;
            hayDatos = true;
        } else if (item.tipo === 'GASTO' && item.categoria && mapGastos.hasOwnProperty(item.categoria)) {
            mapGastos[item.categoria] += monto;
            hayDatos = true;
        }
    });

    const ingresosEstimados = CATEGORIAS_INGRESO.map(c => ({
        categoria: c.id,
        monto: mapIngresos[c.id] || 0
    }));

    const asignaciones = CATEGORIAS_GASTO.map(c => ({
        categoria: c.id,
        monto: mapGastos[c.id] || 0
    }));

    return {
        hayDatos,
        plan: {
            ingresosEstimados,
            asignaciones,
            metaAhorro: 0,
            fechaActualizacion: new Date().toISOString()
        }
    };
}

/**
 * Limpia y elimina el plan presupuestal para el periodo indicado.
 */
export function limpiarPlan(periodo) {
    const periodoFinal = periodo || obtenerPeriodoActual();
    const username = obtenerUsernameActivo();
    const todas = leerTodasPlanificaciones();

    if (todas[username] && todas[username][periodoFinal]) {
        delete todas[username][periodoFinal];
        guardarTodasPlanificaciones(todas);
        return true;
    }
    return false;
}

/**
 * Calcula el resumen de balance y asignación del plan (en vivo).
 * totalIngresos, totalAsignado, metaAhorro, saldoPorAsignar, porcentajes y estado.
 */
export function calcularResumenPlan(plan) {
    const ingresos = Array.isArray(plan?.ingresosEstimados) ? plan.ingresosEstimados : [];
    const asignaciones = Array.isArray(plan?.asignaciones) ? plan.asignaciones : [];
    const metaAhorro = Math.max(0, Number(plan?.metaAhorro) || 0);

    const totalIngresos = ingresos.reduce((sum, item) => sum + (Math.max(0, Number(item.monto) || 0)), 0);
    const totalAsignado = asignaciones.reduce((sum, item) => sum + (Math.max(0, Number(item.monto) || 0)), 0);
    const totalComprometido = totalAsignado + metaAhorro;
    const saldoPorAsignar = totalIngresos - totalComprometido;

    let estadoSaldo = 'equilibrado'; // default
    if (totalIngresos === 0 && totalComprometido === 0) {
        estadoSaldo = 'sin_datos';
    } else if (saldoPorAsignar === 0) {
        estadoSaldo = 'equilibrado'; // Verde
    } else if (saldoPorAsignar > 0) {
        estadoSaldo = 'sobrante'; // Azul
    } else {
        estadoSaldo = 'deficit'; // Rojo
    }

    // Porcentajes de asignación por categoría
    const porcentajes = {};
    asignaciones.forEach(item => {
        const monto = Math.max(0, Number(item.monto) || 0);
        porcentajes[item.categoria] = totalIngresos > 0 ? (monto / totalIngresos) * 100 : 0;
    });

    const porcentajeAhorro = totalIngresos > 0 ? (metaAhorro / totalIngresos) * 100 : 0;
    const porcentajeAsignadoTotal = totalIngresos > 0 ? (totalAsignado / totalIngresos) * 100 : 0;
    const porcentajeSinAsignar = totalIngresos > 0 ? Math.max(0, (saldoPorAsignar / totalIngresos) * 100) : 0;

    return {
        totalIngresos,
        totalAsignado,
        metaAhorro,
        totalComprometido,
        saldoPorAsignar,
        estadoSaldo,
        porcentajes,
        porcentajeAhorro,
        porcentajeAsignadoTotal,
        porcentajeSinAsignar
    };
}

/**
 * Tabla de reglas y palabras clave para mapear movimientos bancarios
 * a las categorías de CATEGORIAS_GASTO.
 */
const REGLAS_CATEGORIAS = [
    {
        id: 'alimentacion',
        palabras: ['mercad', 'supermercad', 'exito', 'jumbo', 'olimpica', 'd1', 'ara', 'carulla',
                   'restauran', 'comida', 'aliment', 'almuerz', 'cena', 'caf', 'panad', 'rappi',
                   'ubereats', 'delivery', 'mcdonalds', 'kfc', 'frisby', 'crepes']
    },
    {
        id: 'vivienda',
        palabras: ['viviend', 'arriend', 'alquiler', 'servicio', 'luz', 'agua', 'gas', 'energia',
                   'epm', 'enel', 'acueducto', 'claro', 'tigo', 'movistar', 'internet', 'telefonia',
                   'administraci', 'hogar', 'condominio', 'predial']
    },
    {
        id: 'transporte',
        palabras: ['transpor', 'gasolin', 'combustib', 'terpel', 'primax', 'biomax', 'uber', 'didi',
                   'cabify', 'taxi', 'metro', 'transmilenio', 'mio', 'megabus', 'pasaje', 'peaje',
                   'parqueader', 'taller', 'mantenimiento veh', 'soat', 'tecnomecanica']
    },
    {
        id: 'educacion',
        palabras: ['educac', 'colegio', 'universidad', 'matricul', 'pension', 'curso', 'libro',
                   'estudio', 'platzi', 'udemy', 'coursera', 'idiomas', 'academ']
    },
    {
        id: 'salud',
        palabras: ['salud', 'medic', 'farmacia', 'drogueria', 'cruz verde', 'la rebaja', 'eps',
                   'odontolog', 'clinica', 'hospital', 'consulta', 'optica', 'laboratorio', 'sura']
    },
    {
        id: 'entretenimiento',
        palabras: ['entreten', 'cine', 'cinemark', 'cinecolombia', 'cinepolis', 'netflix', 'spotify',
                   'disney', 'hbo', 'prime video', 'youtube', 'ocio', 'viaje', 'hotel', 'turismo',
                   'concierto', 'juego', 'playstation', 'steam', 'salida', 'bar', 'licor', 'discoteca']
    }
];

/**
 * Normaliza y clasifica un movimiento bancario en una de las categorías de gasto.
 * Si no coincide con ninguna regla específica, se asigna a 'otros_gastos'.
 */
export function mapearCategoriaMovimiento(mov) {
    if (!mov) return 'otros_gastos';

    const textoAnalisis = `${mov.categoria || ''} ${mov.descripcion || ''} ${mov.concepto || ''}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remueve tildes

    for (const regla of REGLAS_CATEGORIAS) {
        for (const palabra of regla.palabras) {
            if (textoAnalisis.includes(palabra)) {
                return regla.id;
            }
        }
    }

    return 'otros_gastos';
}

/**
 * Obtiene los movimientos reales de finara_movimientos ejecutados en el periodo (YYYY-MM)
 * asociados a las cuentas del usuario activo.
 */
export async function obtenerEjecutadoReal(periodo) {
    const periodoFinal = periodo || obtenerPeriodoActual();

    // Obtener cuentas activas del usuario
    let cuentasUsuario = [];
    try {
        cuentasUsuario = await obtenerCuentas();
    } catch (e) {
        console.warn('Error consultando cuentas en obtenerEjecutadoReal', e);
        cuentasUsuario = [];
    }

    const idsCuentas = new Set(cuentasUsuario.map(c => String(c.id).trim()));
    const numsCuentas = new Set(
        cuentasUsuario
            .map(c => String(c.numero || '').replace(/\D/g, ''))
            .filter(n => n.length > 0)
    );

    // Leer movimientos de localStorage
    let todosMovimientos = [];
    try {
        const raw = localStorage.getItem(CLAVE_MOVIMIENTOS);
        todosMovimientos = JSON.parse(raw) || [];
        if (!Array.isArray(todosMovimientos)) todosMovimientos = [];
    } catch (e) {
        todosMovimientos = [];
    }

    // Filtrar por periodo (YYYY-MM) y pertenencia al usuario
    const movimientosFiltrados = todosMovimientos.filter(mov => {
        if (!mov || !mov.fecha) return false;
        if (!String(mov.fecha).startsWith(periodoFinal)) return false;

        // Si tenemos cuentas del usuario, verificar coincidencia
        if (idsCuentas.size > 0 || numsCuentas.size > 0) {
            const mId = String(mov.cuentaId || '').trim();
            const mNum = String(mov.cuentaNumero || mov.cuentaOrigen || '').replace(/\D/g, '');

            const matchId = mId && idsCuentas.has(mId);
            const matchNum = mNum && Array.from(numsCuentas).some(n => mNum.includes(n) || n.includes(mNum));

            // Si el movimiento no especifica cuenta, se asume del usuario activo si no hay otras
            if (!mId && !mNum) return true;

            return matchId || matchNum;
        }

        return true;
    });

    // Acumular ingresos y egresos
    let ingresosReales = 0;
    let totalGastosReales = 0;
    const gastosPorCategoria = {};

    CATEGORIAS_GASTO.forEach(c => {
        gastosPorCategoria[c.id] = 0;
    });

    movimientosFiltrados.forEach(mov => {
        const valor = Math.max(0, Number(mov.valor) || 0);
        const tipo = String(mov.tipo || '').toUpperCase();

        if (tipo === 'INGRESO') {
            ingresosReales += valor;
        } else if (tipo === 'EGRESO') {
            totalGastosReales += valor;
            const catId = mapearCategoriaMovimiento(mov);
            if (gastosPorCategoria.hasOwnProperty(catId)) {
                gastosPorCategoria[catId] += valor;
            } else {
                gastosPorCategoria['otros_gastos'] = (gastosPorCategoria['otros_gastos'] || 0) + valor;
            }
        }
    });

    const ahorroReal = ingresosReales - totalGastosReales;

    return {
        periodo: periodoFinal,
        ingresosReales,
        totalGastosReales,
        gastosPorCategoria,
        ahorroReal,
        totalMovimientos: movimientosFiltrados.length,
        movimientos: movimientosFiltrados
    };
}

/**
 * Clasifica el estado de ejecución de una categoría según los porcentajes definidos:
 * - 🟢 'dentro': ejecutado <= 85% de lo planificado (o sin gasto).
 * - 🟡 'limite': entre 85% y 100%.
 * - 🔴 'excedido': más de 100%.
 * - ⚪ 'sin_plan': hay gasto real pero monto planificado es 0.
 * - 'neutro': planificado 0 y ejecutado 0.
 */
export function clasificarEjecucion(planificado, ejecutado) {
    const plan = Math.max(0, Number(planificado) || 0);
    const ejec = Math.max(0, Number(ejecutado) || 0);

    if (plan === 0 && ejec === 0) {
        return 'neutro';
    }
    if (plan === 0 && ejec > 0) {
        return 'sin_plan';
    }
    const ratio = ejec / plan;
    if (ratio <= 0.85) {
        return 'dentro';
    }
    if (ratio <= 1.0) {
        return 'limite';
    }
    return 'excedido';
}

/**
 * Compara lo planificado contra lo ejecutado en el periodo dado.
 * Genera filas detalladas por categoría, métricas consolidadas, análisis de ritmo del mes
 * y mensajes automáticos de asesoría.
 */
export async function compararPlanVsReal(periodo) {
    const periodoFinal = periodo || obtenerPeriodoActual();
    const plan = obtenerPlanUsuario(periodoFinal);
    const ejecutadoData = await obtenerEjecutadoReal(periodoFinal);

    // Mapear asignaciones planificadas
    const planMap = {};
    CATEGORIAS_GASTO.forEach(c => { planMap[c.id] = 0; });

    if (plan && Array.isArray(plan.asignaciones)) {
        plan.asignaciones.forEach(item => {
            if (planMap.hasOwnProperty(item.categoria)) {
                planMap[item.categoria] = Math.max(0, Number(item.monto) || 0);
            }
        });
    }

    const resumenPlan = plan ? calcularResumenPlan(plan) : {
        totalIngresos: 0,
        totalAsignado: 0,
        metaAhorro: 0,
        totalComprometido: 0,
        saldoPorAsignar: 0
    };

    // Construir filas comparativas
    const filas = CATEGORIAS_GASTO.map(cat => {
        const planificado = planMap[cat.id] || 0;
        const ejecutado = ejecutadoData.gastosPorCategoria[cat.id] || 0;
        const diferencia = planificado - ejecutado; // Positivo = ahorro, Negativo = sobregasto
        const porcentaje = planificado > 0 ? (ejecutado / planificado) * 100 : (ejecutado > 0 ? 100 : 0);
        const estado = clasificarEjecucion(planificado, ejecutado);

        return {
            categoria: cat.id,
            nombre: cat.nombre,
            icono: cat.icono,
            color: cat.color,
            planificado,
            ejecutado,
            diferencia,
            porcentaje,
            estado
        };
    });

    // Totales consolidados
    const gastoPlanificado = resumenPlan.totalAsignado;
    const gastoReal = ejecutadoData.totalGastosReales;
    const difGasto = gastoPlanificado - gastoReal;

    const ingresosEstimados = resumenPlan.totalIngresos;
    const ingresosReales = ejecutadoData.ingresosReales;
    const difIngresos = ingresosReales - ingresosEstimados;

    const ahorroPlanificado = resumenPlan.metaAhorro;
    const ahorroReal = ejecutadoData.ahorroReal;
    const difAhorro = ahorroReal - ahorroPlanificado;

    // Cumplimiento general del plan presupuestal
    let porcentajeCumplimiento = 100;
    if (gastoPlanificado > 0) {
        if (gastoReal <= gastoPlanificado) {
            porcentajeCumplimiento = Math.round(100 - ((gastoPlanificado - gastoReal) / gastoPlanificado * 0)); // 100% de cumplimiento si no excede
            porcentajeCumplimiento = 100;
        } else {
            const sobrecosto = gastoReal - gastoPlanificado;
            porcentajeCumplimiento = Math.max(0, Math.round((1 - (sobrecosto / gastoPlanificado)) * 100));
        }
    } else if (gastoReal > 0) {
        porcentajeCumplimiento = 0;
    }

    // Análisis del ritmo de gasto para el mes en curso
    const periodoActual = obtenerPeriodoActual();
    const esMesEnCurso = (periodoFinal === periodoActual);
    let ritmo = null;

    if (esMesEnCurso && gastoPlanificado > 0) {
        const ahora = new Date();
        const diasEnMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();
        const diaActual = ahora.getDate();
        const porcentajeMesTranscurrido = (diaActual / diasEnMes) * 100;
        const gastoEsperadoFecha = gastoPlanificado * (diaActual / diasEnMes);
        const porcentajeGastoEjecutado = (gastoReal / gastoPlanificado) * 100;
        const ritmoAcelerado = gastoReal > gastoEsperadoFecha && diaActual > 2;

        ritmo = {
            diaActual,
            diasEnMes,
            porcentajeMesTranscurrido: Math.round(porcentajeMesTranscurrido),
            gastoEsperadoFecha,
            ritmoAcelerado,
            diferenciaRitmo: gastoReal - gastoEsperadoFecha
        };
    }

    // Generar mensajes automáticos de asesoría
    const mensajes = [];
    const excedidas = filas.filter(f => f.estado === 'excedido');
    const cercaLimite = filas.filter(f => f.estado === 'limite');
    const conAhorro = filas.filter(f => f.planificado > 0 && f.diferencia > 0);
    const sinPlanConGasto = filas.filter(f => f.estado === 'sin_plan');

    if (excedidas.length > 0) {
        const nombres = excedidas.map(f => f.nombre).join(', ');
        mensajes.push({
            tipo: 'alerta',
            icono: 'fa-triangle-exclamation',
            texto: `Has sobrepasado el presupuesto en: **${nombres}**. Te recomendamos reducir gastos discrecionales.`
        });
    }

    if (cercaLimite.length > 0) {
        const nombres = cercaLimite.map(f => f.nombre).join(', ');
        mensajes.push({
            tipo: 'advertencia',
            icono: 'fa-clock',
            texto: `Estás cerca del límite (más del 85%) en: **${nombres}**.`
        });
    }

    if (sinPlanConGasto.length > 0) {
        const nombres = sinPlanConGasto.map(f => f.nombre).join(', ');
        mensajes.push({
            tipo: 'info',
            icono: 'fa-circle-question',
            texto: `Se registraron gastos en categorías no planificadas: **${nombres}**.`
        });
    }

    if (ritmo && ritmo.ritmoAcelerado) {
        mensajes.push({
            tipo: 'ritmo',
            icono: 'fa-gauge-high',
            texto: `Al día ${ritmo.diaActual} del mes, tu gasto (${formatoCOP.format(gastoReal)}) supera el gasto proporcional esperado (${formatoCOP.format(ritmo.gastoEsperadoFecha)}).`
        });
    }

    if (conAhorro.length > 0 && excedidas.length === 0) {
        mensajes.push({
            tipo: 'exito',
            icono: 'fa-circle-check',
            texto: `¡Excelente control! Todas tus categorías están dentro de lo planificado.`
        });
    }

    return {
        periodo: periodoFinal,
        tienePlan: plan !== null,
        plan,
        filas,
        resumen: {
            ingresosEstimados,
            ingresosReales,
            difIngresos,
            gastoPlanificado,
            gastoReal,
            difGasto,
            ahorroPlanificado,
            ahorroReal,
            difAhorro,
            porcentajeCumplimiento
        },
        ritmo,
        mensajes
    };
}
