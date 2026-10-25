const K = {
    prestamos: 'finara_prestamos'
};

export const TASA_INTERES_MENSUAL = 0.018; // 1.8% T.M.

/**
 * Calcula la cuota mensual fija (sistema francés)
 */

export function calcularCuotaPrestamo(monto, meses) {
    const P = Number(monto) || 0;
    const n = Number(meses) || 1;
    const i = TASA_INTERES_MENSUAL;

    if (P <= 0 || n <= 0) return 0;

    const cuota = P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    return Math.round(cuota);
}

/**
 * Condicional de evaluación del monto solicitado
 */

export function evaluarViabilidadPrestamo(monto, saldoUsuario) {
    const solicitado = Number(monto) || 0;
    const saldo = Number(saldoUsuario) || 0;

    // Regla de negocio condicional: 
    // - Si el monto es menor o igual a 10.000.000, aprobación automática pre-aprobada.
    // - Si el monto supera los 10.000.000 pero es menor al doble del saldo, pasa a revisión.
    // - Si excede los límites razonables de endeudamiento, se rechaza.
    if (solicitado <= 0) {
        return { estado: 'RECHAZADO', mensaje: 'El monto debe ser mayor a cero.' };
    }
    if (solicitado <= 10000000) {
        return { estado: 'APROBADO', mensaje: 'Préstamo pre-aprobado automáticamente por perfil.' };
    } else if (solicitado <= 30000000) {
        return { estado: 'EN_REVISION', mensaje: 'Solicitud sujeta a verificación de ingresos y capacidad.' };
    } else {
        return { estado: 'RECHAZADO', mensaje: 'El monto excede el cupo máximo de crédito autorizado para este periodo.' };
    }
}

/**
 * Registra una nueva solicitud de préstamo generando un radicado único
 */
export function registrarSolicitudPrestamo({ monto, meses, cuotaMensual, estadoEvaluacion, concepto }) {
    let prestamos = [];
    try {
        prestamos = JSON.parse(localStorage.getItem(K.prestamos)) || [];
    } catch {
        prestamos = [];
    }

    const radicado = `PRES-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    
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
        concepto: concepto || 'Libre inversión'
    };

    prestamos.unshift(nuevaSolicitud);
    localStorage.setItem(K.prestamos, JSON.stringify(prestamos));

    return nuevaSolicitud;
}