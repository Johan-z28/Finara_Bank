// Vanilla/transferenciasService.js
// Capa de datos de transferencias. La UI nunca toca localStorage ni fetch directamente.
// Con USAR_DATOS_DE_PRUEBA = true, localStorage hace de "base de datos" (el proyecto
// opera en modo simulación local). Con false, se usa el API del Backend.

import { guardarNotificacion } from './notificaciones.js';

const USAR_DATOS_DE_PRUEBA = true;
const API_BASE = 'http://localhost:8080/api';

// Contrato esperado del API (todas con Authorization: Bearer <authToken>):
//   GET  /api/cuentas                                  -> [{ id, tipo, numero, saldo, estado }]
//   GET  /api/cuentas/validar-destino?numero=&tipo=    -> { id, titular, tipo, numero, esPropia } | 404
//   POST /api/transferencias { origenId, destinoNumero, destinoTipo, monto, concepto }
//        -> { referencia, fecha, monto, origen, destino, saldoOrigen, usaSobregiro }

export class SesionExpiradaError extends Error { }

export const TIPOS = {
    AHORROS: 'Cuenta de Ahorros',
    CORRIENTE: 'Cuenta Corriente',
    TARJETA_CREDITO: 'Tarjeta de Crédito (Avance)'
};
const SOBREGIRO = 0.20; // 20% adicional sobre el saldo, solo en Cuenta Corriente
const TOPE_AVANCE_CREDITO = 0.50; // Hasta 50% del cupo disponible para avances de TC

export const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// Lo que el usuario puede mover:
// - Ahorros: saldo
// - Corriente: saldo (+ 20% de sobregiro)
// - Tarjeta de Crédito: hasta 50% del cupo disponible para avance
export function calcularDisponible(cuenta) {
    if (cuenta.tipo === 'TARJETA_CREDITO') {
        const cupoTotal = Number(cuenta.saldo) || 0;
        return Math.max(0, Math.round(cupoTotal * TOPE_AVANCE_CREDITO));
    }
    const extra = cuenta.tipo === 'CORRIENTE' ? Math.max(cuenta.saldo, 0) * SOBREGIRO : 0;
    return Math.max(0, cuenta.saldo + extra);
}

// ----- Validación (función pura: se usa antes de confirmar y otra vez al ejecutar) -----
export function validarTransferencia({ origen, destino, monto }) {
    if (!origen) return { ok: false, campo: 'origen', mensaje: 'Selecciona la cuenta de origen.' };
    if (!destino) return { ok: false, campo: 'destino', mensaje: 'Ingresa y valida la cuenta de destino antes de continuar.' };
    if (!Number.isFinite(monto) || monto <= 0) return { ok: false, campo: 'monto', mensaje: 'Ingresa un monto mayor a cero.' };
    if (destino.id === origen.id && destino.esPropia) {
        return { ok: false, campo: 'destino', mensaje: 'No puedes transferir al mismo producto de origen.' };
    }
    const disponible = calcularDisponible(origen);
    if (monto > disponible) {
        if (origen.tipo === 'TARJETA_CREDITO') {
            return { ok: false, campo: 'monto', mensaje: `Excede el cupo máximo para avances (50% del cupo: ${formatoCOP.format(disponible)}).` };
        }
        return { ok: false, campo: 'monto', mensaje: `Saldo insuficiente. Disponible: ${formatoCOP.format(disponible)}.` };
    }
    return {
        ok: true,
        usaSobregiro: origen.tipo === 'CORRIENTE' && monto > origen.saldo,
        esAvanceTC: origen.tipo === 'TARJETA_CREDITO'
    };
}

// ================= MODO PRUEBA (localStorage) =================
const K = { cuentas: 'finara_cuentas', terceros: 'finara_terceros', movimientos: 'finara_movimientos' };

const CUENTAS_INICIALES = [
    { id: 1, tipo: 'AHORROS', numero: '4021587701234', saldo: 1250000, estado: 'ACTIVA' },
    { id: 2, tipo: 'CORRIENTE', numero: '4021587705678', saldo: 820450, estado: 'ACTIVA' }
];
const TERCEROS_INICIALES = [
    { id: 'T1', tipo: 'AHORROS', numero: '4021599900111', titular: 'María Fernanda López', saldo: 540000 },
    { id: 'T2', tipo: 'CORRIENTE', numero: '4021599900222', titular: 'Carlos Andrés Ruiz', saldo: 2100000 },
    { id: 'T3', tipo: 'AHORROS', numero: '4021599900333', titular: 'Laura Sofía Gómez', saldo: 95000 }
];

const pausa = ms => new Promise(r => setTimeout(r, ms));
const copia = lista => lista.map(x => ({ ...x }));
const soloDigitos = v => String(v ?? '').replace(/\D/g, '');

function leer(clave, porDefecto) {
    try {
        const v = JSON.parse(localStorage.getItem(clave));
        if (Array.isArray(v) && (v.length || !porDefecto.length)) return v;
    } catch { /* datos corruptos: se reinician */ }
    return copia(porDefecto);
}

function guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); }
    catch { throw new Error('No se pudo guardar la operación en este navegador.'); }
}

function nombreUsuario() { return localStorage.getItem('userName') || 'Johan'; }

function resolverDestinoMock(numero, tipo, cuentas, terceros) {
    const n = soloDigitos(numero);
    const propia = cuentas.find(c => c.numero === n && c.tipo === tipo);
    if (propia) return { id: propia.id, titular: nombreUsuario(), tipo, numero: n, esPropia: true };
    const t = terceros.find(c => c.numero === n && c.tipo === tipo);
    if (t) return { id: t.id, titular: t.titular, tipo, numero: n, esPropia: false };
    return null;
}

import { obtenerCuentas as obtenerCuentasUsuario } from './cuentasService.js';

// ================= API PÚBLICA =================
export async function obtenerCuentasOrigen() {
    if (!USAR_DATOS_DE_PRUEBA) {
        return pedir(`${API_BASE}/cuentas`);
    }

    // Obtener estrictamente las cuentas y tarjetas activas del usuario autenticado
    const cuentasUsuario = await obtenerCuentasUsuario();
    // Permitir Ahorros, Corriente y Tarjetas de Crédito activas para avances
    return cuentasUsuario.filter(c => c && (c.tipo in TIPOS) && c.estado === 'ACTIVA');
}

export async function buscarCuentaDestino(numero, tipo) {
    if (USAR_DATOS_DE_PRUEBA) {
        await pausa(350);
        const cuentasUsuario = await obtenerCuentasUsuario();
        const terceros = leer(K.terceros, TERCEROS_INICIALES);
        return resolverDestinoMock(numero, tipo, cuentasUsuario, terceros);
    }
    try {
        return await pedir(`${API_BASE}/cuentas/validar-destino?${new URLSearchParams({ numero: soloDigitos(numero), tipo })}`);
    } catch (err) {
        if (err.status === 404) return null;
        throw err;
    }
}

export async function ejecutarTransferencia({ origenId, destinoNumero, destinoTipo, monto, concepto = '' }) {
    if (!USAR_DATOS_DE_PRUEBA) {
        const r = await pedir(`${API_BASE}/transferencias`, { method: 'POST', body: { origenId, destinoNumero, destinoTipo, monto, concepto } });
        registrarNotificaciones(r.monto, r.destino.titular, r.referencia, r.usaSobregiro, r.esAvanceTC);
        return r;
    }

    await pausa(500);
    // Se relee todo para trabajar con el estado real al momento de confirmar
    let cuentas = leer(K.cuentas, CUENTAS_INICIALES);
    const terceros = leer(K.terceros, TERCEROS_INICIALES);
    const movimientos = leer(K.movimientos, []);

    const origen = cuentas.find(c => String(c.id) === String(origenId));
    if (!origen) throw new Error('No se encontró el producto de origen.');

    const destino = resolverDestinoMock(destinoNumero, destinoTipo, cuentas, terceros);

    const v = validarTransferencia({ origen, destino, monto });
    if (!v.ok) throw new Error(v.mensaje);

    // Descontar del producto origen (si es crédito, reduce el cupo disponible)
    origen.saldo -= monto;
    
    // Si el origen era Tarjeta de Crédito, sincronizar también en el perfil del usuario
    if (origen.tipo === 'TARJETA_CREDITO') {
        let perfilUsuario = JSON.parse(localStorage.getItem('userProfile'));
        if (perfilUsuario && Array.isArray(perfilUsuario.tarjetasAprobadas)) {
            perfilUsuario.tarjetasAprobadas.forEach(t => {
                if (t.tipo === 'credito' && (t.numeroTarjeta === origen.numero || !t.numeroTarjeta)) {
                    t.cupoDisponible = Math.max(0, (Number(t.cupoDisponible || origen.saldo + monto)) - monto);
                }
            });
            localStorage.setItem('userProfile', JSON.stringify(perfilUsuario));
        }
    }

    const receptor = destino.esPropia ? cuentas.find(c => c.id === destino.id) : terceros.find(c => c.id === destino.id);
    if (receptor) {
        receptor.saldo = (Number(receptor.saldo) || 0) + monto;
    }

    // Registrar movimientos (mismo formato que usa el historial)
    const fecha = new Date().toISOString();
    const referencia = `FIN-${Math.floor(100000 + Math.random() * 900000)}`;
    const nota = concepto ? ` · ${concepto}` : '';
    const descEgreso = origen.tipo === 'TARJETA_CREDITO'
        ? `Avance de Tarjeta de Crédito transferido a ${destino.titular}${nota}`
        : `Transferencia enviada a ${destino.titular}${nota}`;

    movimientos.push({
        id: `${referencia}-E`, cuentaId: origen.id, fecha, referencia, categoria: null, tipo: 'EGRESO', valor: monto,
        descripcion: descEgreso
    });

    if (destino.esPropia) {
        const descIngreso = origen.tipo === 'TARJETA_CREDITO'
            ? `Avance recibido de Tarjeta de Crédito Finara${nota}`
            : `Transferencia recibida de ${TIPOS[origen.tipo]}${nota}`;

        movimientos.push({
            id: `${referencia}-I`, cuentaId: destino.id, fecha, referencia, categoria: null, tipo: 'INGRESO', valor: monto,
            descripcion: descIngreso
        });
    }

    guardar(K.cuentas, cuentas);
    guardar(K.terceros, terceros);
    guardar(K.movimientos, movimientos);
    registrarNotificaciones(monto, destino.titular, referencia, v.usaSobregiro, v.esAvanceTC);

    return {
        referencia, fecha, monto, concepto,
        origen: { ...origen, saldo: origen.saldo + monto },
        destino, saldoOrigen: origen.saldo,
        usaSobregiro: v.usaSobregiro,
        esAvanceTC: v.esAvanceTC
    };
}

// Registro de notificaciones de transferencias y avances
function registrarNotificaciones(monto, titular, referencia, usaSobregiro, esAvanceTC) {
    const titulo = esAvanceTC ? 'Avance de tarjeta de crédito exitoso' : 'Transferencia exitosa';
    const mensaje = esAvanceTC
        ? `Realizaste un avance por ${formatoCOP.format(monto)} transferido a ${titular}. Referencia ${referencia}.`
        : `Enviaste ${formatoCOP.format(monto)} a ${titular}. Referencia ${referencia}.`;

    guardarNotificacion({
        titulo,
        mensaje,
        tipo: 'exito'
    });
    if (usaSobregiro) {
        guardarNotificacion({
            titulo: 'Usaste sobregiro',
            mensaje: 'Tu Cuenta Corriente quedó en sobregiro. Revisa tu saldo para evitar problemas de liquidez.',
            tipo: 'alerta'
        });
    }
}

// Solo para pruebas: deja los saldos y movimientos como al inicio
export function reiniciarDatosDemo() {
    [K.cuentas, K.terceros, K.movimientos, 'finara_notificaciones'].forEach(k => localStorage.removeItem(k));
}

// ----- Acceso al Backend real -----
async function pedir(url, { method = 'GET', body } = {}) {
    const token = localStorage.getItem('authToken');
    if (!token) throw new SesionExpiradaError();

    const respuesta = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined
    });
    if (respuesta.status === 401 || respuesta.status === 403) throw new SesionExpiradaError();
    if (!respuesta.ok) {
        const err = new Error(`Error ${respuesta.status} en la operación`);
        err.status = respuesta.status;
        throw err;
    }
    return respuesta.json();
}