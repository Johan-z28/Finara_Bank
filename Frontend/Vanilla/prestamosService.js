// Vanilla/prestamosService.js
import { obtenerCuentas } from './cuentasService.js';

const K = {
    prestamos: 'finara_prestamos',
    movimientos: 'finara_movimientos',
    cuentas: 'finara_cuentas'
};

export const TASA_INTERES_MENSUAL = 0.018; // 1.8% T.M. (24% E.A.)

export const TIPOS_CREDITO_COMPARATIVA = [
    { id: 'libre', nombre: 'Crédito de Libre Inversión', tasaEA: '24% E.A.', tasaEM: '1.8%', desc: 'Ideal para cualquier proyecto personal o imprevisto.' },
    { id: 'vehiculo', nombre: 'Financiación de Vehículo', tasaEA: '18% E.A.', tasaEM: '1.38%', desc: 'Tasas preferenciales con prenda vehicular.' },
    { id: 'hipotecario', nombre: 'Crédito Hipotecario / Vivienda', tasaEA: '14% E.A.', tasaEM: '1.10%', desc: 'El plazo más amplio y la cuota más baja del mercado.' }
];

export function calcularCuotaPrestamo(monto, meses, tasaMensual = TASA_INTERES_MENSUAL) {
    const P = Number(monto) || 0;
    const n = Number(meses) || 1;
    const i = tasaMensual;

    if (P <= 0 || n <= 0) return 0;

    const cuota = P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    return Math.round(cuota);
}

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

export function registrarSolicitudPrestamo({ monto, meses, cuotaMensual, estadoEvaluacion, concepto, tipoId }) {
    let prestamos = [];
    try {
        prestamos = JSON.parse(localStorage.getItem(K.prestamos)) || [];
    } catch {
        prestamos = [];
    }

    const radicado = `PRES-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const esActivo = estadoEvaluacion.estado === 'APROBADO';

    let tasaTexto = '1.8% E.M. (24% E.A.)';
    if (tipoId === 'vehiculo') tasaTexto = '1.38% E.M. (18% E.A.)';
    if (tipoId === 'hipotecario') tasaTexto = '1.10% E.M. (14% E.A.)';

    const nuevaSolicitud = {
        radicado,
        fecha: new Date().toISOString(),
        monto: Number(monto),
        meses: Number(meses),
        cuotaMensual: Number(cuotaMensual),
        totalPagar: Number(cuotaMensual) * Number(meses),
        tasaInteres: tasaTexto,
        estado: estadoEvaluacion.estado,
        mensajeEstado: estadoEvaluacion.mensaje,
        concepto: concepto || 'Libre inversión',
        tipoId: tipoId || 'libre',
        activo: esActivo,
        cuotasPagadas: 0
    };

    prestamos.unshift(nuevaSolicitud);
    localStorage.setItem(K.prestamos, JSON.stringify(prestamos));

    return nuevaSolicitud;
}

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
 * Procesa el pago de la cuota cumpliendo con la afectación de saldos, movimientos y actualización del préstamo.
 */
export function pagarCuotaPrestamo(radicado, cuentaId) {
    let prestamos = JSON.parse(localStorage.getItem(K.prestamos)) || [];
    const prestamoIndex = prestamos.findIndex(p => String(p.radicado).trim().toUpperCase() === String(radicado).trim().toUpperCase());

    if (prestamoIndex === -1) {
        return { success: false, message: 'Préstamo no encontrado.' };
    }

    const prestamo = prestamos[prestamoIndex];
    if (prestamo.cuotasPagadas >= prestamo.meses || !prestamo.activo) {
        return { success: false, message: 'Este crédito ya se encuentra totalmente pagado o inactivo.' };
    }

    let todasLasCuentas = [];
    try {
        todasLasCuentas = JSON.parse(localStorage.getItem(K.cuentas)) || [];
    } catch {
        todasLasCuentas = [];
    }

    const cuentaIndex = todasLasCuentas.findIndex(c => c && (String(c.id) === String(cuentaId) || String(c.numero) === String(cuentaId)));

    if (cuentaIndex === -1) {
        return { success: false, message: 'La cuenta seleccionada no es válida o no existe en el sistema.' };
    }

    const cuenta = todasLasCuentas[cuentaIndex];
    const valorCuota = Number(prestamo.cuotaMensual) || 0;
    const saldoActualCuenta = Number(cuenta.saldo) || 0;

    if (saldoActualCuenta < valorCuota) {
        return { success: false, message: 'Fondos insuficientes en la cuenta seleccionada para pagar la cuota.' };
    }

    // 1. Descontar saldo de la cuenta
    cuenta.saldo = saldoActualCuenta - valorCuota;
    todasLasCuentas[cuentaIndex] = cuenta;
    localStorage.setItem(K.cuentas, JSON.stringify(todasLasCuentas));

    // 2. Actualizar cuotas pagadas y estado del préstamo
    prestamo.cuotasPagadas = Number(prestamo.cuotasPagadas || 0) + 1;
    if (prestamo.cuotasPagadas >= prestamo.meses) {
        prestamo.estado = 'PAGADO';
        prestamo.activo = false;
    }
    prestamos[prestamoIndex] = prestamo;
    localStorage.setItem(K.prestamos, JSON.stringify(prestamos));

    // 3. Registrar el egreso en los movimientos globales
    let movimientos = [];
    try {
        movimientos = JSON.parse(localStorage.getItem(K.movimientos)) || [];
    } catch {
        movimientos = [];
    }

    const numCuentaRef = String(cuenta.numero || cuenta.id || 'CUENTA');
    const nuevoMovimiento = {
        id: 'MOV-' + Date.now(),
        cuentaId: String(cuenta.id || numCuentaRef),
        cuentaNumero: numCuentaRef,
        fecha: new Date().toISOString(),
        tipo: 'EGRESO',
        categoria: 'Pago de Préstamo',
        descripcion: `Pago cuota ${prestamo.cuotasPagadas}/${prestamo.meses} - Crédito ${prestamo.radicado}`,
        valor: valorCuota
    };

    movimientos.unshift(nuevoMovimiento);
    localStorage.setItem(K.movimientos, JSON.stringify(movimientos));

    return { success: true, message: 'Pago de cuota procesado con éxito.', prestamo, cuenta };
}