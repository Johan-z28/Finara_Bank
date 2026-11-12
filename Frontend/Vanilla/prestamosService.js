// Vanilla/prestamosService.js
import { obtenerCuentas, obtenerUsernameActivo } from './cuentasService.js';

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

/**
 * Calcula el saldo de capital restante según tabla de amortización cuota fija (sistema francés)
 */
export function calcularSaldoCapital(monto, meses, tasaMensual, cuotasPagadas) {
    const P = Number(monto) || 0;
    const n = Number(meses) || 1;
    const k = Number(cuotasPagadas) || 0;
    const i = Number(tasaMensual) || TASA_INTERES_MENSUAL;

    if (P <= 0 || n <= 0) return 0;
    if (k >= n) return 0;
    if (k <= 0) return Math.round(P);

    const cuota = P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    let saldo = P;

    for (let c = 1; c <= k; c++) {
        const interes = saldo * i;
        const abonoCapital = cuota - interes;
        saldo -= abonoCapital;
    }

    return Math.max(0, Math.round(saldo));
}

/**
 * Obtiene la tasa de interés mensual numérica según el tipo de crédito
 */
export function obtenerTasaNumericaPorTipo(tipoId) {
    if (tipoId === 'vehiculo') return 0.0138;
    if (tipoId === 'hipotecario') return 0.0110;
    return TASA_INTERES_MENSUAL;
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

/**
 * Retorna todos los préstamos asociados al usuario activo actual.
 * Los préstamos antiguos que no tengan el campo 'usuario' se asignan al usuario activo para preservar datos.
 */
export function obtenerPrestamosUsuario() {
    let prestamos = [];
    try {
        prestamos = JSON.parse(localStorage.getItem(K.prestamos)) || [];
        if (!Array.isArray(prestamos)) prestamos = [];
    } catch {
        prestamos = [];
    }

    const usernameActual = String(obtenerUsernameActivo() || '').trim().toLowerCase();

    return prestamos.filter(p => {
        if (!p) return false;
        if (!p.usuario) return true; // Préstamos legados heredados
        const userP = String(p.usuario).trim().toLowerCase();
        return userP === usernameActual;
    });
}

function notificarCambioPrestamos() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('finara:prestamos-actualizados'));
    }
}

/**
 * Registra una nueva solicitud de préstamo, valida la cuenta de ahorros y desembolsa el dinero automáticamente si es APROBADO
 * Si es RECHAZADO, queda registrado en el historial sin desembolso ni movimientos
 */
export function registrarSolicitudPrestamo({ monto, meses, cuotaMensual, estadoEvaluacion, concepto, tipoId }) {
    let todasLasCuentas = [];
    try {
        todasLasCuentas = JSON.parse(localStorage.getItem(K.cuentas)) || obtenerCuentas() || [];
    } catch {
        todasLasCuentas = [];
    }

    const listaCuentas = Array.isArray(todasLasCuentas) ? todasLasCuentas : Object.values(todasLasCuentas);
    const esAprobado = estadoEvaluacion.estado === 'APROBADO';
    const esRechazado = estadoEvaluacion.estado === 'RECHAZADO';
    
    let cuentaAhorrosIndex = -1;
    if (esAprobado) {
        cuentaAhorrosIndex = listaCuentas.findIndex(c => {
            if (!c) return false;
            const tipoStr = String(c.tipo || '').toUpperCase();
            const estadoStr = String(c.estado || 'ACTIVA').toUpperCase();
            return (tipoStr.includes('AHORRO') || tipoStr.includes('DEBITO')) && estadoStr === 'ACTIVA';
        });

        if (cuentaAhorrosIndex === -1) {
            throw new Error('Debes tener una Cuenta de Ahorros o Débito activa en tu perfil para recibir el desembolso del crédito.');
        }
    }

    let prestamos = [];
    try {
        prestamos = JSON.parse(localStorage.getItem(K.prestamos)) || [];
    } catch {
        prestamos = [];
    }

    const radicado = `PRES-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    let tasaTexto = '1.8% E.M. (24% E.A.)';
    if (tipoId === 'vehiculo') tasaTexto = '1.38% E.M. (18% E.A.)';
    if (tipoId === 'hipotecario') tasaTexto = '1.10% E.M. (14% E.A.)';

    const fechaAhora = new Date().toISOString();
    const usuarioActual = obtenerUsernameActivo();

    const nuevaSolicitud = {
        radicado,
        usuario: usuarioActual,
        fecha: fechaAhora,
        fechaDesembolso: esAprobado ? fechaAhora : null,
        monto: Number(monto),
        meses: Number(meses),
        cuotaMensual: Number(cuotaMensual),
        totalPagar: Number(cuotaMensual) * Number(meses),
        tasaInteres: tasaTexto,
        estado: estadoEvaluacion.estado,
        mensajeEstado: estadoEvaluacion.mensaje,
        concepto: concepto || 'Libre inversión',
        tipoId: tipoId || 'libre',
        activo: esAprobado,
        cuotasPagadas: 0,
        pagos: []
    };

    prestamos.unshift(nuevaSolicitud);
    localStorage.setItem(K.prestamos, JSON.stringify(prestamos));

    if (esAprobado && cuentaAhorrosIndex !== -1) {
        const cuentaAhorros = listaCuentas[cuentaAhorrosIndex];
        const montoPrestamo = Number(monto);
        
        cuentaAhorros.saldo = (Number(cuentaAhorros.saldo) || 0) + montoPrestamo;
        listaCuentas[cuentaAhorrosIndex] = cuentaAhorros;
        localStorage.setItem(K.cuentas, JSON.stringify(listaCuentas));

        let movimientos = [];
        try {
            movimientos = JSON.parse(localStorage.getItem(K.movimientos)) || [];
        } catch {
            movimientos = [];
        }

        const nuevoMovimiento = {
            id: 'MOV-' + Date.now(),
            fecha: new Date().toISOString(),
            tipo: 'INGRESO',
            categoria: 'Crédito',
            descripcion: `Desembolso de Crédito - Radicado ${radicado}`,
            valor: montoPrestamo,
            cuentaId: cuentaAhorros.id || cuentaAhorros.numero,
            cuentaNumero: cuentaAhorros.numero
        };

        movimientos.unshift(nuevoMovimiento);
        localStorage.setItem(K.movimientos, JSON.stringify(movimientos));
    }

    notificarCambioPrestamos();
    return nuevaSolicitud;
}

export function buscarPrestamoPorRadicado(radicadoBuscado) {
    if (!radicadoBuscado) return null;
    try {
        const prestamos = obtenerPrestamosUsuario();
        const limpio = String(radicadoBuscado).trim().toUpperCase();
        return prestamos.find(p => String(p.radicado).toUpperCase() === limpio) || null;
    } catch {
        return null;
    }
}

/**
 * Procesa el pago de una cuota o la totalidad del préstamo
 */
export function pagarCuotaPrestamo(radicado, cuentaId, pagarTotal = false) {
    let prestamos = JSON.parse(localStorage.getItem(K.prestamos)) || [];
    const prestamoIndex = prestamos.findIndex(p => p.radicado === radicado);

    if (prestamoIndex === -1) {
        return { success: false, message: 'Préstamo no encontrado.' };
    }

    const prestamo = prestamos[prestamoIndex];
    if (prestamo.cuotasPagadas >= prestamo.meses) {
        return { success: false, message: 'Este crédito ya se encuentra totalmente pagado.' };
    }

    let todasLasCuentas = [];
    try {
        todasLasCuentas = JSON.parse(localStorage.getItem(K.cuentas)) || [];
    } catch {
        todasLasCuentas = [];
    }

    const cuentaIndex = todasLasCuentas.findIndex(c => {
        if (!c) return false;
        const cId = String(c.id || '').trim();
        const cNum = String(c.numero || '').replace(/\D/g, '');
        const target = String(cuentaId).trim();
        return cId === target || cNum === target || cNum.slice(-4) === target.slice(-4);
    });

    if (cuentaIndex === -1) {
        return { success: false, message: 'La cuenta seleccionada no es válida en el sistema.' };
    }

    const cuenta = todasLasCuentas[cuentaIndex];
    
    const cuotasRestantes = prestamo.meses - prestamo.cuotasPagadas;
    const valorPago = pagarTotal ? (cuotasRestantes * prestamo.cuotaMensual) : Number(prestamo.cuotaMensual);
    const saldoActual = Number(cuenta.saldo) || 0;

    if (saldoActual < valorPago) {
        return { success: false, message: 'Fondos insuficientes en la cuenta seleccionada para cubrir el valor del pago.' };
    }

    // 1. Actualizar Saldo de la Cuenta
    cuenta.saldo = saldoActual - valorPago;
    todasLasCuentas[cuentaIndex] = cuenta;
    localStorage.setItem(K.cuentas, JSON.stringify(todasLasCuentas));

    // Asegurar estructura de pagos
    if (!Array.isArray(prestamo.pagos)) {
        prestamo.pagos = [];
    }

    const fechaPago = new Date().toISOString();
    const numeroCuotaPagada = pagarTotal ? prestamo.meses : (prestamo.cuotasPagadas + 1);

    const registroPago = {
        id: 'PAG-' + Date.now(),
        fecha: fechaPago,
        valor: valorPago,
        tipo: pagarTotal ? 'TOTAL' : 'CUOTA',
        numeroCuota: numeroCuotaPagada,
        cuentaNumero: cuenta.numero || cuenta.id || '••••'
    };

    prestamo.pagos.unshift(registroPago);

    // 2. Actualizar Préstamo
    if (pagarTotal) {
        prestamo.cuotasPagadas = prestamo.meses;
        prestamo.estado = 'PAGADO';
        prestamo.activo = false;
    } else {
        prestamo.cuotasPagadas += 1;
        if (prestamo.cuotasPagadas >= prestamo.meses) {
            prestamo.estado = 'PAGADO';
            prestamo.activo = false;
        }
    }
    prestamos[prestamoIndex] = prestamo;
    localStorage.setItem(K.prestamos, JSON.stringify(prestamos));

    // Remover de finara_cuentas si ya no está activo
    if (!prestamo.activo || prestamo.estado === 'PAGADO') {
        try {
            let cuentasActualizadas = JSON.parse(localStorage.getItem(K.cuentas)) || [];
            cuentasActualizadas = cuentasActualizadas.filter(c => !(c.tipo === 'PRESTAMO' && (c.radicado === prestamo.radicado || c.numero === prestamo.numero)));
            localStorage.setItem(K.cuentas, JSON.stringify(cuentasActualizadas));
        } catch {}
    }

    // 3. Registrar Egreso en Movimientos
    let movimientos = [];
    try {
        movimientos = JSON.parse(localStorage.getItem(K.movimientos)) || [];
    } catch {
        movimientos = [];
    }

    const descMovimiento = pagarTotal 
        ? `Pago total anticipado - Crédito ${prestamo.radicado}`
        : `Pago cuota ${prestamo.cuotasPagadas}/${prestamo.meses} - Crédito ${prestamo.radicado}`;

    const nuevoMovimiento = {
        id: 'MOV-' + Date.now(),
        fecha: fechaPago,
        tipo: 'EGRESO',
        categoria: 'Préstamos',
        descripcion: descMovimiento,
        valor: valorPago,
        cuentaId: cuenta.id || cuenta.numero,
        cuentaNumero: cuenta.numero
    };

    movimientos.unshift(nuevoMovimiento);
    localStorage.setItem(K.movimientos, JSON.stringify(movimientos));

    notificarCambioPrestamos();
    return { success: true, message: 'Pago procesado con éxito.', prestamo, cuenta };
}
