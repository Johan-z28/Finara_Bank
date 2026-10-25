// Vanilla/prestamosService.js
import { obtenerCuentas, guardarCuentas } from './cuentasService.js';

const K = {
    prestamos: 'finara_prestamos',
    movimientos: 'finara_movimientos'
};

export const TASA_INTERES_MENSUAL = 0.018; // 1.8% T.M. (24% E.A.)

// Opciones predefinidas para el Comparador de Créditos (HU-27)
export const TIPOS_CREDITO_COMPARATIVA = [
    { id: 'libre', nombre: 'Crédito de Libre Inversión', tasaEA: '24% E.A.', tasaEM: '1.8%', desc: 'Ideal para cualquier proyecto personal o imprevisto.' },
    { id: 'vehiculo', nombre: 'Financiación de Vehículo', tasaEA: '18% E.A.', tasaEM: '1.38%', desc: 'Tasas preferenciales con prenda vehicular.' },
    { id: 'hipotecario', nombre: 'Crédito Hipotecario / Vivienda', tasaEA: '14% E.A.', tasaEM: '1.10%', desc: 'El plazo más amplio y la cuota más baja del mercado.' }
];

/**
 * Calcula la cuota mensual fija (sistema francés)
 */
export function calcularCuotaPrestamo(monto, meses, tasaMensual = TASA_INTERES_MENSUAL) {
    const P = Number(monto) || 0;
    const n = Number(meses) || 1;
    const i = tasaMensual;

    if (P <= 0 || n <= 0) return 0;

    const cuota = P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    return Math.round(cuota);
}

/**
 * Condicional de evaluación del monto solicitado (HU-14)
 */
export function evaluarViabilidadPrestamo(monto) {
    const solicitado = Number(monto) || 0;

    if (solicitado <= 0) {
        return { estado: 'RECHAZADO', mensaje: 'El monto debe ser mayor a cero.', color: '#f87171' };
    }
    if (solicitado <= 5000000) {
        return { estado: 'APROBADO', mensaje: 'Pre-aprobado automáticamente por perfil.', color: '#34d399' };
    } else if (solicitado <= 30000000) {
        return { estado: 'EN_REVISION', mensaje: 'Sujeto a verificación de ingresos (En Revisión).', color: '#e5a93c' };
    } else {
        return { estado: 'RECHAZADO', mensaje: 'El monto excede el cupo máximo autorizado.', color: '#f87171' };
    }
}

/**
 * Registra una nueva solicitud de préstamo generando un radicado único (HU-14)
 */
export function registrarSolicitudPrestamo({ monto, meses, cuotaMensual, estadoEvaluacion, concepto, tipoId }) {
    let prestamos = [];
    try {
        prestamos = JSON.parse(localStorage.getItem(K.prestamos)) || [];
    } catch {
        prestamos = [];
    }

    const radicado = `PRES-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Si es aprobado automáticamente, lo marcamos como ACTIVO para el dashboard de créditos
    const esActivo = estadoEvaluacion.estado === 'APROBADO';

    const nuevaSolicitud = {
        radicado,
        fecha: new Date().toISOString(),
        monto: Number(monto),
        meses: Number(meses),
        cuotaMensual: Number(cuotaMensual),
        totalPagar: Number(cuotaMensual) * Number(meses),
        tasaInteres: '1.8% E.M. (24% E.A.)',
        estado: estadoEvaluacion.estado,
        mensajeEstado: estadoEvaluacion.mensaje,
        concepto: concepto || 'Libre inversión',
        tipoId: tipoId || 'libre',
        activo: esActivo, // Para mostrar en el Dashboard de créditos activos
        cuotasPagadas: 0
    };

    prestamos.unshift(nuevaSolicitud);
    localStorage.setItem(K.prestamos, JSON.stringify(prestamos));

    return nuevaSolicitud;
}

/**
 * Busca un préstamo por radicado (HU-14 / HU-16)
 */
export function buscarPrestamoPorRadicado(radicadoBuscado) {
    if (!radicadoBuscado) return null;
    try {
        const prestamos = JSON.parse(localStorage.getItem(K.prestamos)) || [];
        const limpio = String(radicadoBuscado).trim().toUpperCase();
        return prestamos.find(p => String(p.radicado).toUpperCase() === limpio) || null;
    } catch {
        return null;
    }
}

/**
 * Procesa el pago de una cuota descontando saldo de una cuenta y registrando el movimiento (HU-16)
 */
export function pagarCuotaPrestamo(radicado, cuentaId) {
    let prestamos = JSON.parse(localStorage.getItem(K.prestamos)) || [];
    const prestamoIndex = prestamos.findIndex(p => p.radicado === radicado);

    if (prestamoIndex === -1) {
        return { success: false, message: 'Préstamo no encontrado.' };
    }

    const prestamo = prestamos[prestamoIndex];
    if (prestamo.cuotasPagadas >= prestamo.meses) {
        return { success: false, message: 'Este crédito ya se encuentra totalmente pagado.' };
    }

    // Obtener cuentas del usuario
    const cuentas = obtenerCuentas() || [];
    const cuentaIndex = cuentas.findIndex(c => String(c.id || c.numero) === String(cuentaId));

    if (cuentaIndex === -1) {
        return { success: false, message: 'La cuenta seleccionada no es válida.' };
    }

    const cuenta = cuentas[cuentaIndex];
    const valorCuota = prestamo.cuotaMensual;

    if (cuenta.saldo < valorCuota) {
        return { success: false, message: 'Fondos insuficientes en la cuenta seleccionada para pagar la cuota.' };
    }

    // Descontar saldo de la cuenta
    cuenta.saldo -= valorCuota;
    guardarCuentas(cuentas);

    // Actualizar préstamo
    prestamo.cuotasPagadas += 1;
    if (prestamo.cuotasPagadas >= prestamo.meses) {
        prestamo.estado = 'PAGADO';
        prestamo.activo = false;
    }
    prestamos[prestamoIndex] = prestamo;
    localStorage.setItem(K.prestamos, JSON.stringify(prestamos));

    // Registrar en movimientos globales (finara_movimientos)
    let movimientos = [];
    try {
        movimientos = JSON.parse(localStorage.getItem(K.movimientos)) || [];
    } catch {
        movimientos = [];
    }

    const nuevoMovimiento = {
        id: 'MOV-' + Date.now(),
        fecha: new Date().toISOString(),
        tipo: 'EGRESO',
        descripcion: `Pago cuota ${prestamo.cuotasPagadas}/${prestamo.meses} - Crédito ${prestamo.radicado}`,
        valor: valorCuota,
        cuentaId: cuenta.id || cuenta.numero
    };

    movimientos.unshift(nuevoMovimiento);
    localStorage.setItem(K.movimientos, JSON.stringify(movimientos));

    return { success: true, message: 'Pago de cuota procesado con éxito.', prestamo, cuenta };
}