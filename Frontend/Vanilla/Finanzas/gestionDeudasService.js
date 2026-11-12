// Frontend/Vanilla/Finanzas/gestionDeudasService.js
// Capa de datos y cálculos para HU-20: Asesoría sobre Endeudamiento.

import { obtenerUsernameActivo } from '../cuentasService.js';
import { obtenerPeriodoActual, obtenerPresupuestosUsuario } from './presupuestoService.js';

export const CLAVE_GESTION_DEUDAS = 'finara_gestion_deudas';

export const TIPOS_OBLIGACION = [
    { id: 'TARJETA', nombre: 'Tarjeta de Crédito', icono: 'fa-credit-card' },
    { id: 'PRESTAMO', nombre: 'Crédito de Consumo / Libre Inversión', icono: 'fa-money-bill-wave' },
    { id: 'HIPOTECA', nombre: 'Crédito Hipotecario / Vivienda', icono: 'fa-house' },
    { id: 'VEHICULO', nombre: 'Financiación de Vehículo', icono: 'fa-car' },
    { id: 'LIBRANZA', nombre: 'Crédito de Libranza', icono: 'fa-file-invoice-dollar' },
    { id: 'OTRO', nombre: 'Otra Obligación', icono: 'fa-scale-balanced' }
];

/**
 * Formatea un valor en Pesos Colombianos (COP) sin decimales
 */
export function formatoCOP(valor) {
    const num = Number(valor) || 0;
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(num);
}

/**
 * Helper interno para leer el almacenamiento completo
 */
function leerStorageCompleto() {
    try {
        const raw = localStorage.getItem(CLAVE_GESTION_DEUDAS);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.warn('Error al leer finara_gestion_deudas:', e);
        return {};
    }
}

/**
 * Helper interno para persistir el almacenamiento completo
 */
function guardarStorageCompleto(store) {
    try {
        localStorage.setItem(CLAVE_GESTION_DEUDAS, JSON.stringify(store));
        return true;
    } catch (e) {
        console.error('Error al guardar finara_gestion_deudas:', e);
        return false;
    }
}

/**
 * Obtiene los datos del usuario activo: { ingresoMensual, obligaciones: [] }
 */
export function obtenerDatosUsuario(username = null) {
    const user = username || obtenerUsernameActivo();
    const store = leerStorageCompleto();
    if (!store[user]) {
        store[user] = {
            ingresoMensual: 0,
            obligaciones: []
        };
    }
    if (typeof store[user].ingresoMensual !== 'number') store[user].ingresoMensual = 0;
    if (!Array.isArray(store[user].obligaciones)) store[user].obligaciones = [];
    return store[user];
}

/**
 * Guarda los datos de deudas del usuario activo
 */
export function guardarDatosUsuario(datos, username = null) {
    const user = username || obtenerUsernameActivo();
    const store = leerStorageCompleto();
    store[user] = {
        ingresoMensual: Math.max(0, Number(datos.ingresoMensual) || 0),
        obligaciones: Array.isArray(datos.obligaciones) ? datos.obligaciones : []
    };
    return guardarStorageCompleto(store);
}

/**
 * Actualiza el ingreso mensual neto del usuario
 */
export function guardarIngresoMensual(monto, username = null) {
    const datos = obtenerDatosUsuario(username);
    datos.ingresoMensual = Math.max(0, Number(monto) || 0);
    guardarDatosUsuario(datos, username);
    return datos.ingresoMensual;
}

/**
 * Obtiene el total de ingresos registrados en el presupuesto mensual del usuario
 */
export function obtenerIngresoDesdePresupuesto(username = null) {
    try {
        const periodo = obtenerPeriodoActual();
        const items = obtenerPresupuestosUsuario(periodo);
        if (Array.isArray(items) && items.length > 0) {
            const ingresos = items
                .filter(i => (i.tipo || '').toUpperCase() === 'INGRESO')
                .reduce((acc, i) => acc + (Number(i.monto) || 0), 0);
            if (ingresos > 0) return ingresos;
        }
    } catch (e) {
        console.warn('No fue posible leer el presupuesto para ingresos:', e);
    }
    return 0;
}

/**
 * Registra una nueva obligación financiera
 */
export function crearObligacion({ tipo, entidad, saldoTotal, cuotaMensual, tasaEA, plazoRestanteMeses, origen = 'MANUAL', referencia = '' }, username = null) {
    const datos = obtenerDatosUsuario(username);
    const entidadLimpia = (entidad || '').trim();
    const saldoNum = Number(saldoTotal);
    const cuotaNum = Number(cuotaMensual);
    const tasaNum = Number(tasaEA);
    const plazoNum = parseInt(plazoRestanteMeses, 10);

    if (!entidadLimpia) throw new Error('El nombre de la entidad o acreedor es obligatorio.');
    if (isNaN(saldoNum) || saldoNum <= 0) throw new Error('El saldo total debe ser un valor positivo.');
    if (isNaN(cuotaNum) || cuotaNum <= 0) throw new Error('La cuota mensual debe ser mayor a cero.');
    if (isNaN(tasaNum) || tasaNum < 0 || tasaNum > 100) throw new Error('La tasa E.A. debe ser un porcentaje válido entre 0% y 100%.');
    if (isNaN(plazoNum) || plazoNum < 1) throw new Error('El plazo restante debe ser al menos de 1 mes.');

    const nueva = {
        id: `obl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tipo: (tipo || 'PRESTAMO').toUpperCase(),
        entidad: entidadLimpia,
        saldoTotal: saldoNum,
        cuotaMensual: cuotaNum,
        tasaEA: tasaNum,
        plazoRestanteMeses: plazoNum,
        origen: origen.toUpperCase(),
        referencia: referencia || ''
    };

    datos.obligaciones.push(nueva);
    guardarDatosUsuario(datos, username);
    return nueva;
}

/**
 * Actualiza una obligación existente (solo si no es de origen FINARA)
 */
export function actualizarObligacion(id, updates, username = null) {
    const datos = obtenerDatosUsuario(username);
    const idx = datos.obligaciones.findIndex(o => o.id === id);
    if (idx === -1) throw new Error('Obligación no encontrada.');
    if (datos.obligaciones[idx].origen === 'FINARA') {
        throw new Error('Las obligaciones originadas en Finara Bank se gestionan automáticamente.');
    }

    const anterior = datos.obligaciones[idx];
    const entidadLimpia = updates.entidad !== undefined ? updates.entidad.trim() : anterior.entidad;
    const saldoNum = updates.saldoTotal !== undefined ? Number(updates.saldoTotal) : anterior.saldoTotal;
    const cuotaNum = updates.cuotaMensual !== undefined ? Number(updates.cuotaMensual) : anterior.cuotaMensual;
    const tasaNum = updates.tasaEA !== undefined ? Number(updates.tasaEA) : anterior.tasaEA;
    const plazoNum = updates.plazoRestanteMeses !== undefined ? parseInt(updates.plazoRestanteMeses, 10) : anterior.plazoRestanteMeses;

    if (!entidadLimpia) throw new Error('La entidad es obligatoria.');
    if (saldoNum <= 0) throw new Error('El saldo debe ser mayor a cero.');
    if (cuotaNum <= 0) throw new Error('La cuota mensual debe ser mayor a cero.');
    if (tasaNum < 0 || tasaNum > 100) throw new Error('La tasa debe estar entre 0% y 100%.');
    if (plazoNum < 1) throw new Error('El plazo restante debe ser de al menos 1 mes.');

    datos.obligaciones[idx] = {
        ...anterior,
        tipo: (updates.tipo || anterior.tipo).toUpperCase(),
        entidad: entidadLimpia,
        saldoTotal: saldoNum,
        cuotaMensual: cuotaNum,
        tasaEA: tasaNum,
        plazoRestanteMeses: plazoNum
    };

    guardarDatosUsuario(datos, username);
    return datos.obligaciones[idx];
}

/**
 * Elimina una obligación (solo si no es de origen FINARA)
 */
export function eliminarObligacion(id, username = null) {
    const datos = obtenerDatosUsuario(username);
    const obligacion = datos.obligaciones.find(o => o.id === id);
    if (!obligacion) throw new Error('Obligación no encontrada.');
    if (obligacion.origen === 'FINARA') {
        throw new Error('Las obligaciones automáticas de Finara Bank no pueden eliminarse manualmente.');
    }

    datos.obligaciones = datos.obligaciones.filter(o => o.id !== id);
    guardarDatosUsuario(datos, username);
    return true;
}

/**
 * Sincroniza obligaciones reales del usuario desde Finara Bank (préstamos y tarjetas)
 */
export function sincronizarObligacionesFinara(username = null) {
    const user = username || obtenerUsernameActivo();
    const datos = obtenerDatosUsuario(user);
    let cambios = false;

    // 1. Sincronizar Préstamos Activos
    try {
        const prestamosRaw = localStorage.getItem('finara_prestamos');
        const prestamos = prestamosRaw ? JSON.parse(prestamosRaw) : [];
        const prestamosUsuario = prestamos.filter(p => {
            if (p.usuario) return p.usuario === user;
            return true;
        });

        prestamosUsuario.forEach(prestamo => {
            const activo = prestamo.activo !== false && (prestamo.estado === 'APROBADO' || prestamo.estado === 'ACTIVO');
            const cuotasPagadas = Number(prestamo.cuotasPagadas) || 0;
            const mesesTotal = Number(prestamo.meses) || 1;
            const cuota = Number(prestamo.cuotaMensual) || 0;
            const mesesRestantes = Math.max(0, mesesTotal - cuotasPagadas);
            const ref = prestamo.radicado || `PRES-${prestamo.monto}`;

            if (activo && mesesRestantes > 0 && cuota > 0) {
                const saldoPendiente = cuota * mesesRestantes;
                const tasa = parseFloat(prestamo.tasaEA) || 24.0;
                let tipo = 'PRESTAMO';
                if (prestamo.tipoId === 'hipotecario') tipo = 'HIPOTECA';
                else if (prestamo.tipoId === 'vehiculo') tipo = 'VEHICULO';

                const nombreEntidad = `Finara Bank (${prestamo.concepto || ref})`;
                const existe = datos.obligaciones.find(o => o.origen === 'FINARA' && o.referencia === ref);

                if (existe) {
                    if (existe.saldoTotal !== saldoPendiente || existe.cuotaMensual !== cuota || existe.plazoRestanteMeses !== mesesRestantes) {
                        existe.saldoTotal = saldoPendiente;
                        existe.cuotaMensual = cuota;
                        existe.plazoRestanteMeses = mesesRestantes;
                        existe.entidad = nombreEntidad;
                        cambios = true;
                    }
                } else {
                    datos.obligaciones.push({
                        id: `finara_pres_${ref}`,
                        tipo,
                        entidad: nombreEntidad,
                        saldoTotal: saldoPendiente,
                        cuotaMensual: cuota,
                        tasaEA: tasa,
                        plazoRestanteMeses: mesesRestantes,
                        origen: 'FINARA',
                        referencia: ref
                    });
                    cambios = true;
                }
            } else if (mesesRestantes === 0 || prestamo.estado === 'PAGADO') {
                const prevLen = datos.obligaciones.length;
                datos.obligaciones = datos.obligaciones.filter(o => !(o.origen === 'FINARA' && o.referencia === ref));
                if (datos.obligaciones.length !== prevLen) cambios = true;
            }
        });
    } catch (e) {
        console.warn('Error al sincronizar préstamos en gestionDeudasService:', e);
    }

    // 2. Sincronizar Tarjetas de Crédito con deuda pendiente
    try {
        const cuentasRaw = localStorage.getItem('finara_cuentas');
        const cuentas = cuentasRaw ? JSON.parse(cuentasRaw) : [];
        const tarjetas = cuentas.filter(c => {
            const esTC = c.tipo === 'TARJETA_CREDITO' || (c.tipo && c.tipo.includes('CREDITO'));
            const esUser = !c.usuario || c.usuario === user;
            return esTC && esUser;
        });

        tarjetas.forEach(tc => {
            const deuda = Math.max(0, parseFloat(tc.deudaActual || 0));
            const numCuenta = tc.numeroCuenta || tc.numero || 'TC-0000';
            const mascara = String(numCuenta).slice(-4);
            const ref = `TC-${numCuenta}`;
            const nombreEntidad = `Tarjeta Finara ${tc.nombre || 'Crédito'} (•• ${mascara})`;

            const existe = datos.obligaciones.find(o => o.origen === 'FINARA' && o.referencia === ref);

            if (deuda > 0) {
                const cuotaEstimada = Math.max(50000, Math.round(deuda * 0.10));
                const plazoEstimado = Math.max(1, Math.ceil(deuda / cuotaEstimada));
                const tasa = 28.5; // Tasa promedio TC E.A.

                if (existe) {
                    if (existe.saldoTotal !== deuda) {
                        existe.saldoTotal = deuda;
                        existe.cuotaMensual = cuotaEstimada;
                        existe.plazoRestanteMeses = plazoEstimado;
                        cambios = true;
                    }
                } else {
                    datos.obligaciones.push({
                        id: `finara_tc_${ref}`,
                        tipo: 'TARJETA',
                        entidad: nombreEntidad,
                        saldoTotal: deuda,
                        cuotaMensual: cuotaEstimada,
                        tasaEA: tasa,
                        plazoRestanteMeses: plazoEstimado,
                        origen: 'FINARA',
                        referencia: ref
                    });
                    cambios = true;
                }
            } else if (deuda === 0 && existe) {
                datos.obligaciones = datos.obligaciones.filter(o => !(o.origen === 'FINARA' && o.referencia === ref));
                cambios = true;
            }
        });
    } catch (e) {
        console.warn('Error al sincronizar tarjetas en gestionDeudasService:', e);
    }

    if (cambios) {
        guardarDatosUsuario(datos, user);
    }
    return datos;
}

/**
 * Clasifica el porcentaje de endeudamiento según el semáforo bancario
 */
export function clasificarNivel(pct) {
    if (pct <= 30) {
        return {
            estado: 'SALUDABLE',
            clase: 'saludable',
            color: '#10b981',
            badge: 'Saludable',
            titulo: 'Nivel Saludable (≤ 30%)',
            desc: 'Excelente control financiero. Tu carga de cuotas te permite ahorrar e invertir con tranquilidad.'
        };
    } else if (pct <= 40) {
        return {
            estado: 'PRECAUCION',
            clase: 'precaucion',
            color: '#f59e0b',
            badge: 'Precaución',
            titulo: 'Nivel de Precaución (30% - 40%)',
            desc: 'Te encuentras en la zona límite recomendada. Evita adquirir nuevas deudas y prioriza amortizaciones.'
        };
    } else if (pct <= 50) {
        return {
            estado: 'RIESGO_ALTO',
            clase: 'riesgo-alto',
            color: '#f97316',
            badge: 'Riesgo Alto',
            titulo: 'Riesgo Alto (40% - 50%)',
            desc: 'Casi la mitad de tu salario se destina a pagar compromisos. Cualquier imprevisto puede comprometer tu liquidez.'
        };
    } else {
        return {
            estado: 'CRITICO',
            clase: 'critico',
            color: '#ef4444',
            badge: 'Crítico',
            titulo: 'Nivel Crítico (> 50%)',
            desc: 'Situación de sobreendeudamiento severo. Requiere un plan de choque inmediato: congelar compras y buscar consolidación.'
        };
    }
}

/**
 * Calcula el resumen global de endeudamiento
 */
export function calcularResumenEndeudamiento(username = null) {
    const datos = obtenerDatosUsuario(username);
    const ingreso = Math.max(0, Number(datos.ingresoMensual) || 0);

    let deudaTotal = 0;
    let cuotaTotal = 0;
    let costoInteresesMensual = 0;

    datos.obligaciones.forEach(o => {
        const saldo = Number(o.saldoTotal) || 0;
        const cuota = Number(o.cuotaMensual) || 0;
        const tasaEA = Number(o.tasaEA) || 0;

        deudaTotal += saldo;
        cuotaTotal += cuota;

        // Tasa mensual efectiva = (1 + EA)^(1/12) - 1
        const tasaMensual = Math.pow(1 + (tasaEA / 100), 1 / 12) - 1;
        costoInteresesMensual += Math.round(saldo * tasaMensual);
    });

    const ingresoValido = ingreso > 0;
    const nivelEndeudamiento = ingresoValido ? Number(((cuotaTotal / ingreso) * 100).toFixed(1)) : 0;
    const clasificacion = ingresoValido ? clasificarNivel(nivelEndeudamiento) : null;
    const ingresoLibre = ingresoValido ? Math.max(0, ingreso - cuotaTotal) : 0;
    const relacionDeudaIngresoAnual = ingresoValido ? Number((deudaTotal / (ingreso * 12)).toFixed(2)) : 0;

    return {
        ingresoMensual: ingreso,
        deudaTotal,
        cuotaTotal,
        costoInteresesMensual,
        numeroObligaciones: datos.obligaciones.length,
        nivelEndeudamiento,
        ingresoValido,
        clasificacion,
        ingresoLibre,
        relacionDeudaIngresoAnual
    };
}

/**
 * Genera recomendaciones dinámicas según el estado y tipo de obligaciones
 */
export function generarConsejos(resumen, obligaciones = []) {
    const consejos = [];

    if (!resumen || !resumen.ingresoValido) {
        consejos.push({
            id: 'c_ingreso',
            tipo: 'info',
            icono: 'fa-triangle-exclamation',
            titulo: 'Ingresa tus ingresos mensuales',
            texto: 'Para calcular con precisión tu nivel de endeudamiento y capacidad de pago, digita tu ingreso mensual o impórtalo de tu presupuesto.'
        });
        return consejos;
    }

    const { nivelEndeudamiento } = resumen;

    // Regla de nivel crítico o riesgo
    if (nivelEndeudamiento > 40) {
        consejos.push({
            id: 'c_congelar',
            tipo: 'danger',
            icono: 'fa-snowflake',
            titulo: 'Congela nuevas obligaciones inmediatamente',
            texto: 'Tu nivel de endeudamiento supera el 40%. No solicites nuevos créditos ni utilices tarjetas de crédito para gastos corrientes hasta reducir cuotas.'
        });
    }

    // Buscar tarjetas de crédito con tasas altas
    const tarjetasConSaldo = obligaciones.filter(o => o.tipo === 'TARJETA' && o.saldoTotal > 0);
    if (tarjetasConSaldo.length > 0) {
        consejos.push({
            id: 'c_tarjetas',
            tipo: 'warning',
            icono: 'fa-credit-card',
            titulo: 'Prioriza liquidar tus tarjetas de crédito',
            texto: 'Las tarjetas de crédito suelen tener las tasas más altas del mercado (~25% - 30% E.A.). Pagar más del mínimo te ahorrará una suma considerable en intereses.'
        });
    }

    // Evaluar consolidación de pasivos
    const deudasTasaAlta = obligaciones.filter(o => o.tasaEA >= 22);
    if (deudasTasaAlta.length >= 2) {
        consejos.push({
            id: 'c_consolidacion',
            tipo: 'info',
            icono: 'fa-arrows-split-up-and-left',
            titulo: 'Evalúa una compra de cartera o consolidación',
            texto: 'Tienes 2 o más créditos con tasas altas. Unificar tus saldos en un solo crédito con Finara a menor tasa mensual puede reducir tu cuota global hasta un 35%.'
        });
    }

    // Nivel saludable
    if (nivelEndeudamiento <= 30 && obligaciones.length > 0) {
        consejos.push({
            id: 'c_excelente',
            tipo: 'success',
            icono: 'fa-circle-check',
            titulo: '¡Excelente disciplina financiera!',
            texto: 'Tu nivel de cuotas está por debajo del 30%. Aprovecha tu excedente para acelerar el pago del crédito restante o robustecer tu Fondo de Emergencia.'
        });
    }

    if (obligaciones.length === 0) {
        consejos.push({
            id: 'c_cero',
            tipo: 'success',
            icono: 'fa-champagne-glasses',
            titulo: '¡Felicitaciones! Libre de deudas',
            texto: 'No tienes obligaciones registradas. Mantén este hábito y destina tus excedentes mensuales a fondos de inversión y ahorro programado.'
        });
    }

    return consejos;
}

/**
 * Simula estrategias de amortización acelerada:
 * - AVALANCHA: Primero la deuda con mayor tasa EA
 * - BOLA_NIEVE: Primero la deuda con menor saldo pendiente
 */
export function simularEstrategia(obligaciones, abonoExtra = 0, estrategia = 'AVALANCHA') {
    if (!Array.isArray(obligaciones) || obligaciones.length === 0) {
        return { meses: 0, totalIntereses: 0, ahorroIntereses: 0, mesesAhorrados: 0, estrategia, esMejor: false };
    }

    // 1. Simular caso base (solo cuotas mínimas sin abono extra)
    const base = correrSimulacion(obligaciones, 0, 'BASE');

    // 2. Simular estrategia con abono extra
    const resultado = correrSimulacion(obligaciones, abonoExtra, estrategia);

    const ahorroIntereses = Math.max(0, base.totalIntereses - resultado.totalIntereses);
    const mesesAhorrados = Math.max(0, base.meses - resultado.meses);

    return {
        meses: resultado.meses,
        totalIntereses: resultado.totalIntereses,
        ahorroIntereses,
        mesesAhorrados,
        estrategia,
        esMejor: false
    };
}

/**
 * Motor interno de simulación mes a mes
 */
function correrSimulacion(obligaciones, abonoExtra, modo) {
    // Clonar lista para simulación
    let deudas = obligaciones.map(o => ({
        id: o.id,
        nombre: o.entidad,
        saldo: Number(o.saldoTotal) || 0,
        cuotaOriginal: Number(o.cuotaMensual) || 0,
        tasaEA: Number(o.tasaEA) || 0,
        // Tasa mensual equivalente
        tasaMensual: Math.pow(1 + ((Number(o.tasaEA) || 0) / 100), 1 / 12) - 1
    })).filter(d => d.saldo > 0);

    let meses = 0;
    let totalIntereses = 0;
    const MAX_MESES = 600; // Tope para evitar ciclos infinitos

    while (deudas.some(d => d.saldo > 0.01) && meses < MAX_MESES) {
        meses++;

        // 1. Ordenar deudas según la estrategia para asignar el abono libre
        if (modo === 'AVALANCHA') {
            deudas.sort((a, b) => b.tasaEA - a.tasaEA); // Mayor tasa primero
        } else if (modo === 'BOLA_NIEVE') {
            deudas.sort((a, b) => a.saldo - b.saldo);   // Menor saldo primero
        }

        // 2. Calcular intereses del mes para cada deuda
        deudas.forEach(d => {
            if (d.saldo > 0) {
                const interesMes = d.saldo * d.tasaMensual;
                totalIntereses += interesMes;
                d.saldo += interesMes;
            }
        });

        // 3. Aplicar cuotas regulares
        let cuotasSobrantesDeudasTerminadas = 0;

        deudas.forEach(d => {
            if (d.saldo > 0) {
                const pagoCuota = Math.min(d.saldo, d.cuotaOriginal);
                d.saldo -= pagoCuota;
                if (d.saldo <= 0.01) {
                    d.saldo = 0;
                    cuotasSobrantesDeudasTerminadas += d.cuotaOriginal;
                }
            }
        });

        // 4. Aplicar abono extra + efecto bola de nieve (cuotas liberadas de deudas extintas)
        let dineroDisponibleExtra = (Number(abonoExtra) || 0) + cuotasSobrantesDeudasTerminadas;

        for (let i = 0; i < deudas.length && dineroDisponibleExtra > 0; i++) {
            if (deudas[i].saldo > 0) {
                const abono = Math.min(deudas[i].saldo, dineroDisponibleExtra);
                deudas[i].saldo -= abono;
                dineroDisponibleExtra -= abono;
                if (deudas[i].saldo <= 0.01) {
                    deudas[i].saldo = 0;
                }
            }
        }
    }

    return {
        meses,
        totalIntereses: Math.round(totalIntereses)
    };
}
