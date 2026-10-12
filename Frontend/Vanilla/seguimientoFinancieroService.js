// Vanilla/seguimientoFinancieroService.js
// Servicio para HU-31: Seguimiento financiero (#42)
// Provee el dashboard histórico con gráficos de evolución de ingresos, gastos y ahorro,
// y soporta filtrado dinámico por periodos pasados para análisis comparativo (3m, 6m, 12m, año actual).

import { obtenerUsernameActivo, obtenerCuentas } from './cuentasService.js';
import { obtenerMovimientos } from './movimientosService.js';
import { obtenerTodosRubrosPresupuesto } from './presupuestoService.js';

const CLAVE_HISTORICO = 'finara_seguimiento_historico';

export const formatoCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
});

export const PERIODOS_HISTORICOS = [
    { id: '3m', nombre: 'Últimos 3 meses', meses: 3 },
    { id: '6m', nombre: 'Últimos 6 meses', meses: 6 },
    { id: '12m', nombre: 'Último año (12 meses)', meses: 12 },
    { id: 'ytd', nombre: 'Año actual (YTD)', meses: 0 }
];

const NOMBRES_MESES = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

/**
 * Genera la lista de periodos (año-mes) de los últimos N meses hasta el mes actual.
 */
function generarRangoMeses(cantidadMeses) {
    const ahora = new Date();
    const meses = [];

    let limite = cantidadMeses;
    if (cantidadMeses === 0) {
        // YTD: desde enero del año en curso
        limite = ahora.getMonth() + 1;
    }

    for (let i = limite - 1; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const año = d.getFullYear();
        const mesNum = String(d.getMonth() + 1).padStart(2, '0');
        const clave = `${año}-${mesNum}`;
        const etiqueta = `${NOMBRES_MESES[d.getMonth()]} ${año}`;
        const mesCorto = NOMBRES_MESES[d.getMonth()];
        meses.push({ clave, etiqueta, mesCorto, año, mesIndex: d.getMonth() });
    }
    return meses;
}

/**
 * Datos base históricos simulados coherentes con el perfil de usuario (ej. maria17)
 * para garantizar un análisis comparativo rico y visualizable.
 */
function generarDatosBaseHistoricos(username) {
    const base = {
        '2025-11': { ingresos: 4800000, gastos: 3100000 },
        '2025-12': { ingresos: 6200000, gastos: 4500000 }, // Mes con prima/bono
        '2026-01': { ingresos: 4900000, gastos: 3400000 },
        '2026-02': { ingresos: 5000000, gastos: 3200000 },
        '2026-03': { ingresos: 5100000, gastos: 3150000 },
        '2026-04': { ingresos: 5100000, gastos: 3300000 },
        '2026-05': { ingresos: 5200000, gastos: 3050000 },
        '2026-06': { ingresos: 5800000, gastos: 3600000 }, // Prima mitad de año
        '2026-07': { ingresos: 5200000, gastos: 3250000 },
        '2026-08': { ingresos: 5300000, gastos: 3100000 },
        '2026-09': { ingresos: 5300000, gastos: 3000000 },
        '2026-10': { ingresos: 5400000, gastos: 2950000 }
    };
    return base;
}

/**
 * Obtiene o inicializa los registros históricos de ingresos y gastos mensuales del usuario.
 */
export function obtenerHistoricoBase() {
    try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE_HISTORICO));
        if (guardado && typeof guardado === 'object') return guardado;
    } catch { }

    const inicial = generarDatosBaseHistoricos('maria17');
    localStorage.setItem(CLAVE_HISTORICO, JSON.stringify(inicial));
    return inicial;
}

/**
 * Agrega o ajusta un registro manual de ingresos/gastos para un mes pasado.
 */
export function guardarRegistroHistoricoMes(periodoClave, { ingresos, gastos }) {
    const data = obtenerHistoricoBase();
    data[periodoClave] = {
        ingresos: Math.max(0, Number(ingresos) || 0),
        gastos: Math.max(0, Number(gastos) || 0)
    };
    localStorage.setItem(CLAVE_HISTORICO, JSON.stringify(data));
    return data[periodoClave];
}

/**
 * Realiza el análisis financiero y la evolución de ingresos, gastos y ahorro
 * para un periodo seleccionado (3m, 6m, 12m, ytd).
 */
export async function obtenerEvolucionFinanciera(periodoFiltro = '6m') {
    const config = PERIODOS_HISTORICOS.find(p => p.id === periodoFiltro) || PERIODOS_HISTORICOS[1];
    const mesesRango = generarRangoMeses(config.meses);
    const datosGuardados = obtenerHistoricoBase();

    // Consultar rubros actuales de presupuesto si existen para el mes en curso
    const rubrosActuales = obtenerTodosRubrosPresupuesto();
    const hoyPeriodo = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    let ingresoActualPresupuesto = 0;
    let gastoActualPresupuesto = 0;

    rubrosActuales.forEach(r => {
        if (r.periodo === hoyPeriodo) {
            if (r.tipo === 'INGRESO') ingresoActualPresupuesto += Number(r.monto) || 0;
            if (r.tipo === 'GASTO') gastoActualPresupuesto += Number(r.monto) || 0;
        }
    });

    const series = [];
    let sumaIngresos = 0;
    let sumaGastos = 0;
    let sumaAhorro = 0;

    mesesRango.forEach(m => {
        let ing = 0;
        let gas = 0;

        if (m.clave === hoyPeriodo && (ingresoActualPresupuesto > 0 || gastoActualPresupuesto > 0)) {
            ing = ingresoActualPresupuesto;
            gas = gastoActualPresupuesto;
        } else if (datosGuardados[m.clave]) {
            ing = datosGuardados[m.clave].ingresos;
            gas = datosGuardados[m.clave].gastos;
        } else {
            // Estimado proporcional por defecto
            ing = 5200000;
            gas = 3100000;
        }

        const ahorro = Math.max(0, ing - gas);
        const tasaAhorro = ing > 0 ? Number(((ahorro / ing) * 100).toFixed(1)) : 0;

        sumaIngresos += ing;
        sumaGastos += gas;
        sumaAhorro += ahorro;

        series.push({
            clave: m.clave,
            etiqueta: m.etiqueta,
            mesCorto: m.mesCorto,
            ingresos: ing,
            gastos: gas,
            ahorro,
            tasaAhorro
        });
    });

    const totalMeses = series.length || 1;
    const promedioIngresos = Math.round(sumaIngresos / totalMeses);
    const promedioGastos = Math.round(sumaGastos / totalMeses);
    const promedioAhorro = Math.round(sumaAhorro / totalMeses);
    const tasaAhorroGlobal = sumaIngresos > 0 ? Number(((sumaAhorro / sumaIngresos) * 100).toFixed(1)) : 0;

    // Análisis comparativo: comparar el último mes contra el mes anterior
    let comparativaUltimoMes = null;
    if (series.length >= 2) {
        const actual = series[series.length - 1];
        const previo = series[series.length - 2];

        const varIngresos = previo.ingresos > 0 ? Number((((actual.ingresos - previo.ingresos) / previo.ingresos) * 100).toFixed(1)) : 0;
        const varGastos = previo.gastos > 0 ? Number((((actual.gastos - previo.gastos) / previo.gastos) * 100).toFixed(1)) : 0;
        const varAhorro = previo.ahorro > 0 ? Number((((actual.ahorro - previo.ahorro) / previo.ahorro) * 100).toFixed(1)) : 0;

        comparativaUltimoMes = {
            mesActual: actual.etiqueta,
            mesPrevio: previo.etiqueta,
            varIngresos,
            varGastos,
            varAhorro,
            ahorroMejora: actual.ahorro >= previo.ahorro
        };
    }

    // Diagnóstico o recomendación del asesor financiero
    let diagnostico = 'Salud financiera estable con capacidad de ahorro constante.';
    let estadoSalud = 'saludable';

    if (tasaAhorroGlobal >= 30) {
        diagnostico = 'Excelente desempeño: estás ahorrando más del 30% de tus ingresos globales.';
        estadoSalud = 'excelente';
    } else if (tasaAhorroGlobal < 15) {
        diagnostico = 'Atención: tu tasa de ahorro promedio está por debajo del 15% recomendado. Revisa tus gastos fijos.';
        estadoSalud = 'alerta';
    }

    return {
        periodoSeleccionado: config,
        series,
        totales: {
            ingresos: sumaIngresos,
            gastos: sumaGastos,
            ahorro: sumaAhorro,
            tasaAhorroGlobal
        },
        promedios: {
            ingresos: promedioIngresos,
            gastos: promedioGastos,
            ahorro: promedioAhorro
        },
        comparativaUltimoMes,
        diagnostico,
        estadoSalud
    };
}
