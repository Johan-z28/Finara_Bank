// Frontend/Vanilla/retirosService.js
// Capa de servicio y lógica de negocio para retiros (HU-41)

import { obtenerCuentas as obtenerCuentasUsuario, obtenerUsernameActivo, obtenerUsuarioAutenticado } from './cuentasService.js';

export const TASA_INTERES_AHORROS = 0.015; // 1.5% mensual abonado al monto retirado
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

    if (tipo.includes('AHORRO') || tipo.includes('DEBITO') || tipo.includes('DÉBITO')) {
        // CORRECCIÓN: Cálculo del 1.5% de interés aplicado estrictamente sobre el monto del retiro
        interesGenerado = Math.round(monto * TASA_INTERES_AHORROS);
    } else if (tipo.includes('CORRIENTE')) {
        if (monto > saldoActual) {
            usaSobregiro = true;
            sobregiroUsado = monto - saldoActual;
        }
    }

    const nuevoSaldo = (saldoActual + interesGenerado) - monto;

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
 * Procesa el retiro registrando dos movimientos separados (Ingreso por Rendimiento y Egreso por Retiro)
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

    // Actualizar saldo de la cuenta
    cuenta.saldo = nuevoSaldo;
    const idx = todasLasCuentas.findIndex(c => String(c.id) === String(cuenta.id) || soloDigitos(c.numero) === soloDigitos(cuenta.numero));
    if (idx !== -1) {
        todasLasCuentas[idx].saldo = nuevoSaldo;
    } else {
        todasLasCuentas.push(cuenta);
    }
    localStorage.setItem(K.cuentas, JSON.stringify(todasLasCuentas));

    // Sincronizar en userProfile
    try {
        let perfil = JSON.parse(localStorage.getItem(K.perfil));
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

            const total = todasLasCuentas
                .filter(c => c && (c.username === username || !c.username))
                .reduce((acc, c) => acc + Math.max(0, Number(c.saldo) || 0), 0);
            perfil.saldoDisponible = formatoCOP.format(total);
            perfil.ultimaActividad = 'Hace un momento (Retiro)';
            localStorage.setItem(K.perfil, JSON.stringify(perfil));

            let listaUsuarios = JSON.parse(localStorage.getItem(K.usuarios)) || [];
            listaUsuarios = listaUsuarios.map(u => (u.username === perfil.username || u.correo === perfil.correo) ? { ...u, ...perfil } : u);
            localStorage.setItem(K.usuarios, JSON.stringify(listaUsuarios));
        }
    } catch (e) {
        console.error('Error sincronizando perfil en retiro:', e);
    }

    const fecha = new Date().toISOString();
    const referenciaBase = Math.floor(100000 + Math.random() * 900000);
    const refIngreso = `INT-${referenciaBase}`;
    const refEgreso = `RET-${referenciaBase}`;
    const notaConcepto = concepto ? ` · ${concepto}` : '';

    let movimientos = [];
    try {
        movimientos = JSON.parse(localStorage.getItem(K.movimientos)) || [];
    } catch {
        movimientos = [];
    }

    // 1. REGISTRO DE INGRESO: Abono del interés del 1.5%
    if (liquidacion.interesGenerado > 0) {
        movimientos.push({
            id: `${refIngreso}-I`,
            cuentaId: String(cuenta.id),
            cuentaNumero: soloDigitos(cuenta.numero),
            cuentaOrigen: 'ABONO-INTERESES',
            cuentaDestino: soloDigitos(cuenta.numero),
            username: cuenta.username || username,
            fecha,
            referencia: refIngreso,
            categoria: 'Intereses / Rendimientos',
            tipo: 'INGRESO',
            valor: liquidacion.interesGenerado,
            descripcion: `Abono de interés del 1.5% T.M. al realizar retiro (${cuenta.tipo || 'Cuenta'})`
        });
    }

    // 2. REGISTRO DE EGRESO: Salida del dinero por retiro
    let detalleEgreso = `Retiro de efectivo de ${cuenta.tipo || 'Cuenta'}${notaConcepto}`;
    if (liquidacion.usaSobregiro) {
        detalleEgreso += ` [Uso de sobregiro: ${formatoCOP.format(liquidacion.sobregiroUsado)}]`;
    }

    movimientos.push({
        id: `${refEgreso}-E`,
        cuentaId: String(cuenta.id),
        cuentaNumero: soloDigitos(cuenta.numero),
        cuentaOrigen: soloDigitos(cuenta.numero),
        cuentaDestino: 'RETIRO-EFECTIVO',
        username: cuenta.username || username,
        fecha,
        referencia: refEgreso,
        categoria: 'Retiro',
        tipo: 'EGRESO',
        valor: monto,
        descripcion: detalleEgreso
    });

    localStorage.setItem(K.movimientos, JSON.stringify(movimientos));

    // Registrar Notificación
    let notifs = [];
    try {
        notifs = JSON.parse(localStorage.getItem(K.notificaciones)) || [];
    } catch {
        notifs = [];
    }

    let textoNotif = `Retiraste ${formatoCOP.format(monto)} de tu cuenta terminada en ${String(cuenta.numero).slice(-4)}.`;
    if (liquidacion.interesGenerado > 0) {
        textoNotif += ` Se acreditó un ingreso por rendimiento del 1.5%: ${formatoCOP.format(liquidacion.interesGenerado)}.`;
    }
    notifs.unshift({
        id: `NOTIF-${Date.now()}`,
        titulo: 'Retiro de dinero exitoso',
        mensaje: `${textoNotif} Ref: ${refEgreso}.`,
        tipo: 'exito',
        fecha,
        leida: false
    });
    localStorage.setItem(K.notificaciones, JSON.stringify(notifs.slice(0, 30)));

    return {
        referencia: refEgreso,
        referenciaInteres: liquidacion.interesGenerado > 0 ? refIngreso : null,
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