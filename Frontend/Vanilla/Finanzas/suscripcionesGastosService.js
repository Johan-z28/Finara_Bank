// Frontend/Vanilla/Finanzas/suscripcionesGastosService.js
// Capa de datos y lógica de negocio para la HU-22: Gestión de Deudas, Suscripciones y Pagos Pendientes.

import { obtenerUsernameActivo } from '../cuentasService.js';

export const STORAGE_KEY = 'finara_suscripciones_gastos';

export const CATEGORIAS_SUSCRIPCION = [
    'Streaming',
    'Membresía',
    'Café y snacks',
    'Apps y software',
    'Transporte',
    'Otro'
];

export const FRECUENCIAS = ['SEMANAL', 'MENSUAL', 'ANUAL'];

export const TIPOS_PAGO = ['SERVICIO', 'TARJETA', 'CUOTA', 'OTRO'];

/**
 * Formatea un valor numérico a moneda colombiana (COP) sin decimales
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
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.warn('Error al leer finara_suscripciones_gastos del localStorage:', e);
        return {};
    }
}

/**
 * Helper interno para guardar el almacenamiento completo
 */
function guardarStorageCompleto(store) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        return true;
    } catch (e) {
        console.error('Error al guardar en finara_suscripciones_gastos:', e);
        return false;
    }
}

/**
 * Obtiene la estructura { suscripciones: [], pagosPendientes: [] } del usuario activo
 */
export function obtenerDatosUsuario(username = null) {
    const user = username || obtenerUsernameActivo();
    const store = leerStorageCompleto();
    if (!store[user]) {
        store[user] = {
            suscripciones: [],
            pagosPendientes: []
        };
    }
    if (!Array.isArray(store[user].suscripciones)) store[user].suscripciones = [];
    if (!Array.isArray(store[user].pagosPendientes)) store[user].pagosPendientes = [];
    return store[user];
}

/**
 * Guarda los datos de suscripciones y pagos para el usuario activo
 */
export function guardarDatosUsuario(datos, username = null) {
    const user = username || obtenerUsernameActivo();
    const store = leerStorageCompleto();
    store[user] = {
        suscripciones: Array.isArray(datos.suscripciones) ? datos.suscripciones : [],
        pagosPendientes: Array.isArray(datos.pagosPendientes) ? datos.pagosPendientes : []
    };
    return guardarStorageCompleto(store);
}

/* ==============================================================
   CÁLCULOS DE COSTO Y AHORRO
   ============================================================== */

/**
 * Normaliza y calcula el costo mensual de una suscripción
 * SEMANAL: * 4.33
 * ANUAL: / 12
 * MENSUAL: monto
 */
export function calcularCostoMensual(s) {
    if (!s || typeof s.monto !== 'number') return 0;
    const monto = Number(s.monto) || 0;
    const frec = (s.frecuencia || 'MENSUAL').toUpperCase();

    if (frec === 'SEMANAL') {
        return Math.round(monto * 4.333333);
    } else if (frec === 'ANUAL') {
        return Math.round(monto / 12);
    }
    return Math.round(monto);
}

/**
 * Normaliza y calcula el costo proyectado a 1 año de una suscripción
 * SEMANAL: * 52
 * MENSUAL: * 12
 * ANUAL: monto
 */
export function calcularCostoAnual(s) {
    if (!s || typeof s.monto !== 'number') return 0;
    const monto = Number(s.monto) || 0;
    const frec = (s.frecuencia || 'MENSUAL').toUpperCase();

    if (frec === 'SEMANAL') {
        return Math.round(monto * 52);
    } else if (frec === 'MENSUAL') {
        return Math.round(monto * 12);
    }
    return Math.round(monto);
}

/**
 * Calcula el ahorro potencial derivado de suscripciones pausadas o canceladas
 */
export function calcularAhorroPotencial(suscripcionesList = null) {
    const userSuscripciones = suscripcionesList || (obtenerDatosUsuario().suscripciones);
    let mensual = 0;
    let anual = 0;
    let acumulado = 0;

    userSuscripciones.forEach(s => {
        const estado = (s.estado || 'ACTIVA').toUpperCase();
        if (estado === 'PAUSADA' || estado === 'CANCELADA') {
            mensual += calcularCostoMensual(s);
            anual += calcularCostoAnual(s);
        }
        acumulado += Number(s.ahorroAcumulado) || 0;
    });

    return { mensual, anual, acumulado };
}

/**
 * Calcula el gasto fijo recurrente mensual:
 * Suscripciones activas (normalizadas a mes) + Pagos pendientes del mes no pagados
 */
export function calcularGastoFijoMensual(username = null) {
    const datos = obtenerDatosUsuario(username);

    // Suma de suscripciones activas
    const gastoSuscripciones = datos.suscripciones
        .filter(s => (s.estado || 'ACTIVA').toUpperCase() === 'ACTIVA')
        .reduce((acc, s) => acc + calcularCostoMensual(s), 0);

    // Suma de pagos pendientes no pagados
    const gastoPagosPendientes = datos.pagosPendientes
        .filter(p => !p.pagado)
        .reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

    return gastoSuscripciones + gastoPagosPendientes;
}

/* ==============================================================
   GESTIÓN DE SUSCRIPCIONES (CRUD)
   ============================================================== */

export function obtenerSuscripciones(username = null) {
    return obtenerDatosUsuario(username).suscripciones;
}

export function crearSuscripcion({ nombre, categoria, monto, frecuencia }, username = null) {
    const datos = obtenerDatosUsuario(username);
    const nombreLimpio = (nombre || '').trim();
    const montoNum = Number(monto);
    const frecLimpia = (frecuencia || 'MENSUAL').toUpperCase();

    if (!nombreLimpio) {
        throw new Error('El nombre de la suscripción o gasto es obligatorio.');
    }
    if (isNaN(montoNum) || montoNum <= 0) {
        throw new Error('El monto debe ser un valor mayor a cero.');
    }

    // Evitar duplicados exactos de nombre y frecuencia
    const existe = datos.suscripciones.some(
        s => s.nombre.toLowerCase() === nombreLimpio.toLowerCase() &&
             s.frecuencia.toUpperCase() === frecLimpia &&
             s.estado !== 'CANCELADA'
    );
    if (existe) {
        throw new Error(`Ya tienes una suscripción activa o pausada para "${nombreLimpio}" con frecuencia ${frecLimpia}.`);
    }

    const nueva = {
        id: `susc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        nombre: nombreLimpio,
        categoria: categoria || 'Otro',
        monto: montoNum,
        frecuencia: frecLimpia,
        estado: 'ACTIVA',
        fechaCreacion: new Date().toISOString(),
        fechaCambioEstado: null,
        ahorroAcumulado: 0
    };

    datos.suscripciones.unshift(nueva);
    guardarDatosUsuario(datos, username);
    return nueva;
}

export function actualizarSuscripcion(id, updates, username = null) {
    const datos = obtenerDatosUsuario(username);
    const idx = datos.suscripciones.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Suscripción no encontrada.');

    datos.suscripciones[idx] = {
        ...datos.suscripciones[idx],
        ...updates
    };
    guardarDatosUsuario(datos, username);
    return datos.suscripciones[idx];
}

export function cambiarEstadoSuscripcion(id, nuevoEstado, username = null) {
    const estadoValido = (nuevoEstado || '').toUpperCase();
    if (!['ACTIVA', 'PAUSADA', 'CANCELADA'].includes(estadoValido)) {
        throw new Error('Estado inválido.');
    }

    const datos = obtenerDatosUsuario(username);
    const item = datos.suscripciones.find(s => s.id === id);
    if (!item) throw new Error('Suscripción no encontrada.');

    const ahora = new Date();
    const estadoAnterior = item.estado || 'ACTIVA';

    // Si ya estaba pausada/cancelada y se reactiva, sumamos el ahorro que acumuló durante el periodo
    if ((estadoAnterior === 'PAUSADA' || estadoAnterior === 'CANCELADA') && estadoValido === 'ACTIVA') {
        if (item.fechaCambioEstado) {
            const diasInactivo = Math.max(1, Math.round((ahora - new Date(item.fechaCambioEstado)) / (1000 * 60 * 60 * 24)));
            const ahorroGenerado = Math.round((calcularCostoMensual(item) / 30) * diasInactivo);
            item.ahorroAcumulado = (Number(item.ahorroAcumulado) || 0) + ahorroGenerado;
        }
    }

    item.estado = estadoValido;
    item.fechaCambioEstado = ahora.toISOString();

    guardarDatosUsuario(datos, username);
    return item;
}

export function eliminarSuscripcion(id, username = null) {
    const datos = obtenerDatosUsuario(username);
    const inicial = datos.suscripciones.length;
    datos.suscripciones = datos.suscripciones.filter(s => s.id !== id);
    if (datos.suscripciones.length === inicial) {
        throw new Error('No se encontró la suscripción a eliminar.');
    }
    guardarDatosUsuario(datos, username);
    return true;
}

/* ==============================================================
   GESTIÓN DE PAGOS PENDIENTES (CRUD & SEMÁFORO)
   ============================================================== */

export function obtenerPagosPendientes(username = null) {
    return obtenerDatosUsuario(username).pagosPendientes;
}

/**
 * Determina el estado del semáforo para un pago pendiente
 * 🟢 AL_DIA: Faltan más de 7 días o ya está pagado
 * 🟡 PROXIMO: Faltan 7 días o menos y no está vencido
 * 🔴 VENCIDO: La fecha ya pasó y no está pagado
 */
export function obtenerEstadoVencimiento(fechaVencimiento, pagado = false) {
    if (pagado) {
        return {
            estado: 'AL_DIA',
            clase: 'al-dia',
            badgeTexto: 'Pagado',
            texto: 'Completado',
            dias: 0
        };
    }

    if (!fechaVencimiento) {
        return {
            estado: 'AL_DIA',
            clase: 'al-dia',
            badgeTexto: 'Sin fecha',
            texto: 'Sin fecha de vencimiento',
            dias: 999
        };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [anio, mes, dia] = fechaVencimiento.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    fecha.setHours(0, 0, 0, 0);

    const diferenciaMs = fecha.getTime() - hoy.getTime();
    const diasDiferencia = Math.round(diferenciaMs / (1000 * 60 * 60 * 24));

    if (diasDiferencia < 0) {
        const diasPasados = Math.abs(diasDiferencia);
        return {
            estado: 'VENCIDO',
            clase: 'vencido',
            badgeTexto: 'Vencido',
            texto: diasPasados === 0 ? 'Vence hoy' : `Venció hace ${diasPasados} ${diasPasados === 1 ? 'día' : 'días'}`,
            dias: diasDiferencia
        };
    } else if (diasDiferencia <= 7) {
        return {
            estado: 'PROXIMO',
            clase: 'proximo',
            badgeTexto: 'Próximo a vencer',
            texto: diasDiferencia === 0 ? 'Vence hoy' : `Vence en ${diasDiferencia} ${diasDiferencia === 1 ? 'día' : 'días'}`,
            dias: diasDiferencia
        };
    } else {
        return {
            estado: 'AL_DIA',
            clase: 'al-dia',
            badgeTexto: 'Al día',
            texto: `Vence en ${diasDiferencia} días`,
            dias: diasDiferencia
        };
    }
}

export function crearPagoPendiente({ nombre, tipo, monto, fechaVencimiento, origen = 'MANUAL', referencia = '' }, username = null) {
    const datos = obtenerDatosUsuario(username);
    const nombreLimpio = (nombre || '').trim();
    const montoNum = Number(monto);

    if (!nombreLimpio) throw new Error('El nombre o concepto del pago es obligatorio.');
    if (isNaN(montoNum) || montoNum <= 0) throw new Error('El monto a pagar debe ser mayor a cero.');
    if (!fechaVencimiento) throw new Error('La fecha de vencimiento es obligatoria.');

    const nuevo = {
        id: `pago_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        nombre: nombreLimpio,
        tipo: (tipo || 'SERVICIO').toUpperCase(),
        monto: montoNum,
        fechaVencimiento,
        pagado: false,
        origen: origen.toUpperCase(),
        referencia: referencia || ''
    };

    datos.pagosPendientes.push(nuevo);
    guardarDatosUsuario(datos, username);
    return nuevo;
}

export function actualizarPagoPendiente(id, updates, username = null) {
    const datos = obtenerDatosUsuario(username);
    const idx = datos.pagosPendientes.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Pago no encontrado.');

    datos.pagosPendientes[idx] = {
        ...datos.pagosPendientes[idx],
        ...updates
    };
    guardarDatosUsuario(datos, username);
    return datos.pagosPendientes[idx];
}

export function marcarPagoPagado(id, pagado = true, username = null) {
    const datos = obtenerDatosUsuario(username);
    const pago = datos.pagosPendientes.find(p => p.id === id);
    if (!pago) throw new Error('Pago no encontrado.');

    pago.pagado = Boolean(pagado);
    guardarDatosUsuario(datos, username);
    return pago;
}

export function eliminarPagoPendiente(id, username = null) {
    const datos = obtenerDatosUsuario(username);
    const inicial = datos.pagosPendientes.length;
    datos.pagosPendientes = datos.pagosPendientes.filter(p => p.id !== id);
    if (datos.pagosPendientes.length === inicial) {
        throw new Error('Pago no encontrado para eliminar.');
    }
    guardarDatosUsuario(datos, username);
    return true;
}

/* ==============================================================
   SINCRONIZACIÓN AUTOMÁTICA CON PRODUCTOS REALES (PRÉSTAMOS / TARJETAS)
   ============================================================== */

/**
 * Importa o sincroniza deudas reales de Finara Bank:
 * - Préstamos activos en 'finara_prestamos'
 * - Tarjetas de crédito con deuda en 'finara_cuentas'
 */
export function sincronizarPagosDesdeProductos(username = null) {
    const user = username || obtenerUsernameActivo();
    const datos = obtenerDatosUsuario(user);
    let cambios = false;

    // 1. Sincronizar Préstamos Activos
    try {
        const prestamosRaw = localStorage.getItem('finara_prestamos');
        const prestamos = prestamosRaw ? JSON.parse(prestamosRaw) : [];
        const prestamosUsuario = prestamos.filter(p => {
            if (p.usuario) return p.usuario === user;
            return true; // Préstamos heredados sin campo usuario
        });

        prestamosUsuario.forEach(prestamo => {
            const activo = prestamo.activo !== false && (prestamo.estado === 'APROBADO' || prestamo.estado === 'ACTIVO');
            const cuotasPagadas = Number(prestamo.cuotasPagadas) || 0;
            const mesesTotal = Number(prestamo.meses) || 1;
            const cuotaMensual = Number(prestamo.cuotaMensual) || 0;

            if (activo && cuotasPagadas < mesesTotal && cuotaMensual > 0) {
                // Calcular fecha estimada de próxima cuota: fecha origen + (cuotasPagadas + 1) meses
                let fechaBase = new Date(prestamo.fecha || prestamo.fechaDesembolso || new Date());
                if (isNaN(fechaBase.getTime())) fechaBase = new Date();
                
                const fechaVenc = new Date(fechaBase);
                fechaVenc.setMonth(fechaVenc.getMonth() + (cuotasPagadas + 1));
                const fechaStr = fechaVenc.toISOString().split('T')[0];

                const ref = prestamo.radicado || `PRES-${prestamo.monto}`;
                const existe = datos.pagosPendientes.find(p => p.origen === 'PRESTAMO' && p.referencia === ref);

                const nombreCuota = `Cuota #${cuotasPagadas + 1} Préstamo (${prestamo.concepto || ref})`;

                if (existe) {
                    if (!existe.pagado) {
                        if (existe.monto !== cuotaMensual || existe.fechaVencimiento !== fechaStr || existe.nombre !== nombreCuota) {
                            existe.monto = cuotaMensual;
                            existe.fechaVencimiento = fechaStr;
                            existe.nombre = nombreCuota;
                            cambios = true;
                        }
                    }
                } else {
                    datos.pagosPendientes.push({
                        id: `pago_pres_${ref}`,
                        nombre: nombreCuota,
                        tipo: 'CUOTA',
                        monto: cuotaMensual,
                        fechaVencimiento: fechaStr,
                        pagado: false,
                        origen: 'PRESTAMO',
                        referencia: ref
                    });
                    cambios = true;
                }
            } else if (cuotasPagadas >= mesesTotal || prestamo.estado === 'PAGADO') {
                // Si el préstamo ya está totalmente cancelado, marcar como pagado o retirar
                const ref = prestamo.radicado;
                const idx = datos.pagosPendientes.findIndex(p => p.origen === 'PRESTAMO' && p.referencia === ref && !p.pagado);
                if (idx !== -1) {
                    datos.pagosPendientes[idx].pagado = true;
                    cambios = true;
                }
            }
        });
    } catch (e) {
        console.warn('Error al sincronizar préstamos en suscripcionesGastosService:', e);
    }

    // 2. Sincronizar Tarjetas de Crédito con deuda pendiente
    try {
        const cuentasRaw = localStorage.getItem('finara_cuentas');
        const cuentas = cuentasRaw ? JSON.parse(cuentasRaw) : [];
        const tarjetas = cuentas.filter(c => {
            const esTC = (c.tipo === 'TARJETA_CREDITO' || (c.tipo && c.tipo.includes('CREDITO')));
            const esUser = !c.usuario || c.usuario === user;
            return esTC && esUser;
        });

        tarjetas.forEach(tc => {
            const deuda = Math.max(0, parseFloat(tc.deudaActual || 0));
            const numCuenta = tc.numeroCuenta || tc.numero || 'TC-0000';
            const mascara = String(numCuenta).slice(-4);
            const ref = String(numCuenta);
            const nombreTC = `Pago Tarjeta ${tc.nombre || 'Crédito'} (•• ${mascara})`;

            const existe = datos.pagosPendientes.find(p => p.origen === 'TARJETA' && p.referencia === ref);

            if (deuda > 0) {
                // Fecha de pago límite: día 28 del mes corriente o siguiente
                const hoy = new Date();
                let anio = hoy.getFullYear();
                let mes = hoy.getMonth() + 1;
                if (hoy.getDate() > 25) {
                    mes += 1;
                    if (mes > 12) { mes = 1; anio += 1; }
                }
                const fechaLimiteStr = `${anio}-${String(mes).padStart(2, '0')}-28`;

                if (existe) {
                    if (!existe.pagado) {
                        if (existe.monto !== deuda) {
                            existe.monto = deuda;
                            cambios = true;
                        }
                    }
                } else {
                    datos.pagosPendientes.push({
                        id: `pago_tc_${ref}`,
                        nombre: nombreTC,
                        tipo: 'TARJETA',
                        monto: deuda,
                        fechaVencimiento: fechaLimiteStr,
                        pagado: false,
                        origen: 'TARJETA',
                        referencia: ref
                    });
                    cambios = true;
                }
            } else if (deuda === 0 && existe && !existe.pagado) {
                // Si la deuda ya está en cero, marcar pagado
                existe.pagado = true;
                cambios = true;
            }
        });
    } catch (e) {
        console.warn('Error al sincronizar tarjetas en suscripcionesGastosService:', e);
    }

    if (cambios) {
        guardarDatosUsuario(datos, user);
    }
    return datos;
}

/**
 * Obtiene el resumen de métricas rápidas (KPIs)
 */
export function obtenerMetricasGenerales(username = null) {
    const user = username || obtenerUsernameActivo();
    const datos = obtenerDatosUsuario(user);

    const activas = datos.suscripciones.filter(s => (s.estado || 'ACTIVA').toUpperCase() === 'ACTIVA');
    const pausadas = datos.suscripciones.filter(s => (s.estado || '').toUpperCase() === 'PAUSADA');
    const canceladas = datos.suscripciones.filter(s => (s.estado || '').toUpperCase() === 'CANCELADA');

    const costoSuscripcionesMes = activas.reduce((acc, s) => acc + calcularCostoMensual(s), 0);
    const costoSuscripcionesAnio = activas.reduce((acc, s) => acc + calcularCostoAnual(s), 0);

    const ahorro = calcularAhorroPotencial(datos.suscripciones);

    let totalPorPagar = 0;
    let totalPagado = 0;
    let cantidadVencidos = 0;
    let cantidadProximos = 0;

    datos.pagosPendientes.forEach(p => {
        const monto = Number(p.monto) || 0;
        if (p.pagado) {
            totalPagado += monto;
        } else {
            totalPorPagar += monto;
            const semaforo = obtenerEstadoVencimiento(p.fechaVencimiento, false);
            if (semaforo.estado === 'VENCIDO') cantidadVencidos++;
            if (semaforo.estado === 'PROXIMO') cantidadProximos++;
        }
    });

    const gastoFijoTotalMes = costoSuscripcionesMes + totalPorPagar;

    return {
        gastoFijoMensual: gastoFijoTotalMes,
        costoSuscripcionesMes,
        costoSuscripcionesAnio,
        ahorroMensual: ahorro.mensual,
        ahorroAnual: ahorro.anual,
        ahorroAcumulado: ahorro.acumulado,
        totalSuscripcionesActivas: activas.length,
        totalSuscripcionesPausadas: pausadas.length,
        totalSuscripcionesCanceladas: canceladas.length,
        totalPagosPendientes: datos.pagosPendientes.filter(p => !p.pagado).length,
        cantidadVencidos,
        cantidadProximos,
        totalPorPagar,
        totalPagado
    };
}
