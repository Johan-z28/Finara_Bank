// Frontend/Vanilla/retirosService.js
// Capa de servicio y lógica de negocio para retiros (HU-41)
// Criterios de Aceptación:
// 1. Regla Cuenta de Ahorros: calcular y aplicar interés del 1.5% mensual al momento del retiro.
// 2. Regla Cuenta Corriente: permitir sobregiro de hasta el 20% sobre el saldo actual.
// 3. Validar disponibilidad de fondos (saldo o saldo + sobregiro del 20%).
// 4. Actualizar saldo en base de datos (localStorage finara_cuentas y perfil de usuario),
//    generar comprobante de transacción, movimiento y notificación.

import { obtenerCuentas as obtenerCuentasUsuario, obtenerUsernameActivo, obtenerUsuarioAutenticado } from './cuentasService.js';

export const TASA_INTERES_AHORROS = 0.015; // 1.5% mensual al momento del retiro
export const TOPE_SOBREGIRO_CORRIENTE = 0.20; // 20% sobre el saldo en Cuenta Corriente
export const TOPE_AVANCE_CREDITO = 0.50; // Hasta 50% de avance para Tarjetas de Crédito

export const formatoCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
});

const K = {
    cuentas: 'finara_cuentas',
    movimientos: 'finara_movimientos',
    notificaciones: 'finara_notificaciones',
    perfil: 'userProfile',
    usuarios: 'finara_usuarios_local'
};

const soloDigitos = v => String(v ?? '').replace(/\D/g, '');

/**
 * Calcula el disponible exacto para retiro según el tipo de producto financiero
 */
export function calcularDisponibleRetiro(cuenta) {
    if (!cuenta) return 0;
    const saldo = Number(cuenta.saldo) || 0;
    const tipo = String(cuenta.tipo || '').toUpperCase();

    if (tipo.includes('CORRIENTE')) {
        const extraSobregiro = Math.max(saldo, 0) * TOPE_SOBREGIRO_CORRIENTE;
        return Math.max(0, saldo + extraSobregiro);
    }

    if (tipo.includes('CREDITO') || tipo.includes('CRÉDITO')) {
        return Math.max(0, Math.round(saldo * TOPE_AVANCE_CREDITO));
    }

    // Ahorros y otras cuentas de depósito
    return Math.max(0, saldo);
}

/**
 * Realiza la liquidación financiera previa del retiro
 */
export function liquidarRetiro(cuenta, montoSolicitado) {
    const monto = Number(montoSolicitado) || 0;
    if (!cuenta || monto <= 0) {
        return {
            valido: false,
            mensaje: 'Monto inválido para el retiro.',
            monto: 0,
            interesGenerado: 0,
            usaSobregiro: false,
            sobregiroUsado: 0,
            totalDebitado: 0,
            nuevoSaldo: 0
        };
    }

    const saldoActual = Number(cuenta.saldo) || 0;
    const tipo = String(cuenta.tipo || '').toUpperCase();
    const disponible = calcularDisponibleRetiro(cuenta);

    if (monto > disponible) {
        const detalle = tipo.includes('CORRIENTE')
            ? `El monto supera tu saldo más el sobregiro del 20% (Disponible: ${formatoCOP.format(disponible)}).`
            : `El monto solicitado supera tu saldo disponible (${formatoCOP.format(disponible)}).`;
        return {
            valido: false,
            mensaje: detalle,
            disponible
        };
    }

    let interesGenerado = 0;
    let usaSobregiro = false;
    let sobregiroUsado = 0;
    let nuevoSaldo = saldoActual - monto;

    if (tipo.includes('AHORRO')) {
        // Regla HU-41: Aplicar y calcular el interés del 1.5% mensual al momento del retiro
        // El interés generado sobre el saldo previo se liquida y abona al nuevo saldo
        interesGenerado = Math.round(saldoActual * TASA_INTERES_AHORROS);
        nuevoSaldo = (saldoActual + interesGenerado) - monto;
    } else if (tipo.includes('CORRIENTE')) {
        // Regla HU-41: Permitir sobregiro de hasta el 20% sobre el saldo actual
        if (monto > saldoActual) {
            usaSobregiro = true;
            sobregiroUsado = monto - saldoActual;
        }
    }

    return {
        valido: true,
        cuenta,
        tipo,
        monto,
        saldoActual,
        interesGenerado,
        usaSobregiro,
        sobregiroUsado,
        totalDebitado: monto,
        nuevoSaldo,
        disponible
    };
}

/**
 * Valida si un retiro es viable antes de someterlo
 */
export function validarRetiro({ cuenta, monto }) {
    if (!cuenta) {
        return { ok: false, campo: 'cuenta', mensaje: 'Selecciona una cuenta de origen.' };
    }

    const estaBloqueada = Boolean(cuenta.bloqueada || cuenta.estado === 'BLOQUEADA' || (cuenta.tarjetaAsociada && cuenta.tarjetaAsociada.bloqueada));
    if (estaBloqueada) {
        return {
            ok: false,
            campo: 'cuenta',
            mensaje: 'La cuenta o tarjeta seleccionada se encuentra bloqueada temporalmente. Desbloquéala desde Saldos para operar.'
        };
    }

    const valorMonto = Number(monto) || 0;
    if (!Number.isFinite(valorMonto) || valorMonto < 10000) {
        return { ok: false, campo: 'monto', mensaje: 'El monto mínimo a retirar es de $ 10.000 COP.' };
    }

    const liquidacion = liquidarRetiro(cuenta, valorMonto);
    if (!liquidacion.valido) {
        return { ok: false, campo: 'monto', mensaje: liquidacion.mensaje };
    }

    return { ok: true, liquidacion };
}

/**
 * Procesa el retiro financiero, debita el saldo en finara_cuentas, sincroniza perfil,
 * registra el movimiento contable y genera notificación.
 */
export async function ejecutarRetiro({ cuentaId, monto, concepto = '' }) {
    const usuarioActivo = obtenerUsuarioAutenticado();
    const username = obtenerUsernameActivo();

    let cuentas = await obtenerCuentasUsuario();
    let todasLasCuentas = [];
    try {
        todasLasCuentas = JSON.parse(localStorage.getItem(K.cuentas)) || [];
    } catch {
        todasLasCuentas = [];
    }

    const idStr = String(cuentaId);
    let cuenta = todasLasCuentas.find(c => String(c.id) === idStr || soloDigitos(c.numero) === soloDigitos(cuentaId));
    if (!cuenta) {
        cuenta = cuentas.find(c => String(c.id) === idStr || soloDigitos(c.numero) === soloDigitos(cuentaId));
    }

    if (!cuenta) {
        throw new Error('No se encontró la cuenta especificada para el retiro.');
    }

    const v = validarRetiro({ cuenta, monto });
    if (!v.ok) {
        throw new Error(v.mensaje);
    }

    const { liquidacion } = v;
    const nuevoSaldo = liquidacion.nuevoSaldo;

    // Actualizar cuenta en el listado global
    cuenta.saldo = nuevoSaldo;
    const idx = todasLasCuentas.findIndex(c => String(c.id) === String(cuenta.id) || soloDigitos(c.numero) === soloDigitos(cuenta.numero));
    if (idx !== -1) {
        todasLasCuentas[idx].saldo = nuevoSaldo;
    } else {
        todasLasCuentas.push(cuenta);
    }
    localStorage.setItem(K.cuentas, JSON.stringify(todasLasCuentas));

    // Sincronizar en userProfile y usuarios locales si corresponde
    let perfil = null;
    try {
        perfil = JSON.parse(localStorage.getItem(K.perfil));
        if (perfil) {
            const numLimpio = soloDigitos(cuenta.numero);
            if (Array.isArray(perfil.tarjetasAprobadas)) {
                perfil.tarjetasAprobadas.forEach(t => {
                    if (soloDigitos(t.numeroTarjeta || t.numero) === numLimpio) {
                        t.saldo = nuevoSaldo;
                        t.cupoDisponible = nuevoSaldo;
                    }
                });
            }
            if (Array.isArray(perfil.cuentas)) {
                perfil.cuentas.forEach(c => {
                    if (soloDigitos(c.numero) === numLimpio) {
                        c.saldo = nuevoSaldo;
                    }
                });
            }

            // Recalcular saldo total del perfil
            const total = todasLasCuentas
                .filter(c => c && (c.username === username || !c.username))
                .reduce((acc, c) => acc + Math.max(0, Number(c.saldo) || 0), 0);
            perfil.saldoDisponible = formatoCOP.format(total);
            perfil.ultimaActividad = 'Hace un momento (Retiro)';
            localStorage.setItem(K.perfil, JSON.stringify(perfil));

            // Sincronizar en finara_usuarios_local
            let listaUsuarios = JSON.parse(localStorage.getItem(K.usuarios)) || [];
            listaUsuarios = listaUsuarios.map(u => (u.username === perfil.username || u.correo === perfil.correo) ? { ...u, ...perfil } : u);
            localStorage.setItem(K.usuarios, JSON.stringify(listaUsuarios));
        }
    } catch (e) {
        console.error('Error sincronizando perfil en retiro:', e);
    }

    // Registrar Movimiento Contable
    const fecha = new Date().toISOString();
    const referencia = `RET-${Math.floor(100000 + Math.random() * 900000)}`;
    const notaConcepto = concepto ? ` · ${concepto}` : '';
    let detalleMovimiento = `Retiro de efectivo de ${cuenta.tipo || 'Cuenta'}${notaConcepto}`;
    if (liquidacion.interesGenerado > 0) {
        detalleMovimiento += ` [Interés 1.5% T.M. liquidado: ${formatoCOP.format(liquidacion.interesGenerado)}]`;
    }
    if (liquidacion.usaSobregiro) {
        detalleMovimiento += ` [Uso de sobregiro: ${formatoCOP.format(liquidacion.sobregiroUsado)}]`;
    }

    let movimientos = [];
    try {
        movimientos = JSON.parse(localStorage.getItem(K.movimientos)) || [];
    } catch {
        movimientos = [];
    }

    movimientos.push({
        id: `${referencia}-E`,
        cuentaId: String(cuenta.id),
        cuentaNumero: soloDigitos(cuenta.numero),
        cuentaOrigen: soloDigitos(cuenta.numero),
        cuentaDestino: 'RETIRO-EFECTIVO',
        username: cuenta.username || username,
        fecha,
        referencia,
        categoria: 'Retiro',
        tipo: 'EGRESO',
        valor: monto,
        descripcion: detalleMovimiento
    });
    localStorage.setItem(K.movimientos, JSON.stringify(movimientos));

    // Registrar Notificación en LocalStorage
    let notifs = [];
    try {
        notifs = JSON.parse(localStorage.getItem(K.notificaciones)) || [];
    } catch {
        notifs = [];
    }

    let textoNotif = `Retiraste ${formatoCOP.format(monto)} de tu cuenta terminada en ${String(cuenta.numero).slice(-4)}.`;
    if (liquidacion.interesGenerado > 0) {
        textoNotif += ` Rendimiento del 1.5% acreditado: ${formatoCOP.format(liquidacion.interesGenerado)}.`;
    }
    notifs.unshift({
        id: `NOTIF-${Date.now()}`,
        titulo: 'Retiro de dinero exitoso',
        mensaje: `${textoNotif} Ref: ${referencia}.`,
        tipo: 'exito',
        fecha,
        leida: false
    });
    localStorage.setItem(K.notificaciones, JSON.stringify(notifs.slice(0, 30)));

    return {
        referencia,
        fecha,
        cuenta,
        monto,
        interesGenerado: liquidacion.interesGenerado,
        usaSobregiro: liquidacion.usaSobregiro,
        sobregiroUsado: liquidacion.sobregiroUsado,
        saldoAnterior: liquidacion.saldoActual,
        nuevoSaldo,
        concepto
    };
}
