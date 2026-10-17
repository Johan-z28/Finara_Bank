// Vanilla/transferenciasService.js

import { obtenerCuentas as obtenerCuentasOficiales } from './cuentasService.js';

function guardarNotificacion(notif) {
    try {
        const notifs = JSON.parse(localStorage.getItem('finara_notificaciones')) || [];
        notifs.unshift({
            id: `NOTIF-${Date.now()}`,
            ...notif,
            fecha: new Date().toISOString(),
            leida: false
        });
        localStorage.setItem('finara_notificaciones', JSON.stringify(notifs.slice(0, 30)));
    } catch {}
}

const USAR_DATOS_DE_PRUEBA = true;
const API_BASE = 'http://localhost:8080/api';

export class SesionExpiradaError extends Error { }

export const TIPOS = {
    AHORROS: 'Cuenta de Ahorros',
    CORRIENTE: 'Cuenta Corriente',
    TARJETA_CREDITO: 'Tarjeta de Crédito (Avance)'
};

const SOBREGIRO = 0.20; 
const TOPE_AVANCE_CREDITO = 0.50; 
export const COMISION_INTERBANCARIA = 6500; 

export const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function calcularDisponible(cuenta) {
    if (!cuenta) return 0;
    const saldoNum = typeof cuenta.saldo === 'number'
        ? cuenta.saldo
        : Number(String(cuenta.saldo || 0).replace(/[^0-9.-]+/g, "")) || 0;

    if (cuenta.tipo === 'TARJETA_CREDITO') {
        return Math.max(0, Math.round(saldoNum * TOPE_AVANCE_CREDITO));
    }
    const extra = cuenta.tipo === 'CORRIENTE' ? Math.max(saldoNum, 0) * SOBREGIRO : 0;
    return Math.max(0, saldoNum + extra);
}

export function validarTransferencia({ origen, destino, monto, esInterbancaria = false }) {
    if (!origen) return { ok: false, campo: 'origen', mensaje: 'Selecciona la cuenta de origen.' };
    if (origen.bloqueada || origen.estado === 'BLOQUEADA' || (origen.tarjetaAsociada && origen.tarjetaAsociada.bloqueada)) {
        return {
            ok: false,
            campo: 'origen',
            mensaje: 'El producto o tarjeta seleccionada se encuentra bloqueada temporalmente.'
        };
    }
    if (!destino) return { ok: false, campo: 'destino', mensaje: 'Ingresa y valida la cuenta de destino antes de continuar.' };
    
    if (esInterbancaria) {
        if (!destino.banco) return { ok: false, campo: 'banco', mensaje: 'Selecciona la entidad bancaria de destino.' };
        if (!destino.titular || destino.titular.trim().length < 3) {
            return { ok: false, campo: 'beneficiario', mensaje: 'Ingresa el nombre completo del beneficiario.' };
        }
        if (!destino.documento || destino.documento.trim().length < 5) {
            return { ok: false, campo: 'documento', mensaje: 'Ingresa un documento de identidad válido.' };
        }
    } else {
        if (destino.bloqueada || destino.estado === 'BLOQUEADA') {
            return {
                ok: false,
                campo: 'destino',
                mensaje: 'La cuenta de destino se encuentra bloqueada temporalmente.'
            };
        }
        if (destino.id === origen.id && destino.esPropia) {
            return { ok: false, campo: 'destino', mensaje: 'No puedes transferir al mismo producto de origen.' };
        }
    }
    if (!Number.isFinite(monto) || monto <= 0) return { ok: false, campo: 'monto', mensaje: 'Ingresa un monto mayor a cero.' };
    const comision = esInterbancaria ? COMISION_INTERBANCARIA : 0;
    const totalADebitar = monto + comision;

    const disponible = calcularDisponible(origen);

    if (totalADebitar > disponible) {
        const detalleComision = comision > 0 ? ` (incluyendo comisión de ${formatoCOP.format(comision)})` : '';
        if (origen.tipo === 'TARJETA_CREDITO') {
            return { ok: false, campo: 'monto', mensaje: `Excede el cupo máximo para avances${detalleComision}. Disponible: ${formatoCOP.format(disponible)}.` };
        }
        return { ok: false, campo: 'monto', mensaje: `Saldo insuficiente para cubrir el monto${detalleComision}. Disponible: ${formatoCOP.format(disponible)}.` };
    }
    
    const saldoNum = typeof origen.saldo === 'number' ? origen.saldo : Number(String(origen.saldo || 0).replace(/[^0-9.-]+/g, "")) || 0;
    return {
        ok: true,
        comision,
        totalADebitar,
        usaSobregiro: origen.tipo === 'CORRIENTE' && totalADebitar > saldoNum,
        esAvanceTC: origen.tipo === 'TARJETA_CREDITO',
        esInterbancaria
    };
}

const soloDigitos = v => String(v ?? '').replace(/\D/g, '');

function enmascararNombre(nombreCompleto) {
    if (!nombreCompleto) return "Cliente Finara";
    return nombreCompleto.split(' ').map(palabra => {
        if (palabra.length <= 2) return palabra[0] + '*';
        const visibles = Math.ceil(palabra.length / 3);
        return palabra.substring(0, visibles) + '*'.repeat(palabra.length - visibles);
    }).join(' ');
}

function resolverDestinoMock(numero, tipo) {
    const n = soloDigitos(numero);
    if (!n) return null;

    try {
        const todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        const cuentaEncontrada = todasLasCuentas.find(c => c && soloDigitos(c.numero) === n);

        if (cuentaEncontrada) {
            return {
                id: cuentaEncontrada.id,
                titular: enmascararNombre(cuentaEncontrada.titular || cuentaEncontrada.username || 'Cliente Finara'),
                tipo: cuentaEncontrada.tipo,
                numero: cuentaEncontrada.numero,
                esPropia: false,
                bloqueada: Boolean(cuentaEncontrada.bloqueada || cuentaEncontrada.estado === 'BLOQUEADA'),
                estado: cuentaEncontrada.estado || 'ACTIVA'
            };
        }
    } catch (e) {
        console.error("Error buscando cuenta destino en localStorage:", e);
    }

    if (n.length >= 8) {
        return {
            id: 'ACC-' + n,
            titular: enmascararNombre("Usuario Destino"),
            tipo: tipo || 'AHORROS',
            numero: n,
            esPropia: false,
            bloqueada: false,
            estado: 'ACTIVA'
        };
    }

    return null;
}

export async function obtenerCuentasOrigen() {
    if (!USAR_DATOS_DE_PRUEBA) {
        return pedir(`${API_BASE}/cuentas`);
    }

    try {
        const cuentas = await obtenerCuentasOficiales();
        return (cuentas || []).filter(c => (c.tipo in TIPOS) && c.estado === 'ACTIVA' && !c.bloqueada);
    } catch (e) {
        console.error("Error al obtener cuentas:", e);
        return [];
    }
}

export async function buscarCuentaDestino(numero, tipo) {
    if (USAR_DATOS_DE_PRUEBA) {
        return resolverDestinoMock(numero, tipo);
    }
    try {
        return await pedir(`${API_BASE}/cuentas/validar-destino?${new URLSearchParams({ numero: soloDigitos(numero), tipo })}`);
    } catch (err) {
        if (err.status === 404) return null;
        throw err;
    }
}

export async function ejecutarTransferencia({ origenId, destinoNumero, destinoTipo, monto, concepto = '', esInterbancaria = false, destinoInterbancario = null }) {
    if (!USAR_DATOS_DE_PRUEBA) {
        const r = await pedir(`${API_BASE}/transferencias`, { method: 'POST', body: { origenId, destinoNumero, destinoTipo, monto, concepto, esInterbancaria, destinoInterbancario } });
        registrarNotificaciones(r.monto, r.destino.titular, r.referencia, r.usaSobregiro, r.esAvanceTC, r.esInterbancaria, r.comision);
        return r;
    }

    let cuentas = await obtenerCuentasOrigen();
    const origen = cuentas.find(c => String(c.id) === String(origenId));
    if (!origen) throw new Error('No se encontró la cuenta de origen seleccionada.');

    const destino = esInterbancaria ? destinoInterbancario : resolverDestinoMock(destinoNumero, destinoTipo);

    const v = validarTransferencia({ origen, destino, monto, esInterbancaria });
    if (!v.ok) throw new Error(v.mensaje);

    const comision = v.comision || 0;
    const totalADebitar = v.totalADebitar || (monto + comision);

    // Limpieza e incremento/decremento numérico
    const saldoOrigenAnterior = typeof origen.saldo === 'number'
        ? origen.saldo
        : Number(String(origen.saldo || 0).replace(/[^0-9.-]+/g, "")) || 0;

    origen.saldo = saldoOrigenAnterior - totalADebitar;

    // ACTUALIZACIÓN GLOBAL DE SALDOS EN LOCALSTORAGE (`finara_cuentas`)
    try {
        let todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        
        // 1. Restar a la cuenta de origen
        const idxOrigen = todasLasCuentas.findIndex(c => String(c.id) === String(origen.id) || String(c.numero) === String(origen.numero));
        if (idxOrigen !== -1) {
            todasLasCuentas[idxOrigen].saldo = origen.saldo;
        }

        // 2. Sumar a la cuenta de destino (si existe localmente en el ecosistema)
        const idxDestino = todasLasCuentas.findIndex(c => String(c.numero) === String(destino.numero) || soloDigitos(c.numero) === soloDigitos(destino.numero));
        if (idxDestino !== -1) {
            const saldoDestinoAnterior = typeof todasLasCuentas[idxDestino].saldo === 'number'
                ? todasLasCuentas[idxDestino].saldo
                : Number(String(todasLasCuentas[idxDestino].saldo || 0).replace(/[^0-9.-]+/g, "")) || 0;
            
            todasLasCuentas[idxDestino].saldo = saldoDestinoAnterior + monto;
        }

        localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));

        // 3. Sincronizar también dentro del perfil activo userProfile
        let perfil = JSON.parse(localStorage.getItem('userProfile')) || {};
        if (Array.isArray(perfil.cuentas)) {
            const pIdx = perfil.cuentas.findIndex(c => String(c.id) === String(origen.id) || String(c.numero) === String(origen.numero));
            if (pIdx !== -1) {
                perfil.cuentas[pIdx].saldo = origen.saldo;
            }
            const pDestIdx = perfil.cuentas.findIndex(c => String(c.numero) === String(destino.numero));
            if (pDestIdx !== -1) {
                const sDest = typeof perfil.cuentas[pDestIdx].saldo === 'number' ? perfil.cuentas[pDestIdx].saldo : Number(String(perfil.cuentas[pDestIdx].saldo || 0).replace(/\D/g, ''));
                perfil.cuentas[pDestIdx].saldo = sDest + monto;
            }
            localStorage.setItem('userProfile', JSON.stringify(perfil));
        }

    } catch (e) {
        console.error("Error actualizando saldos en localStorage:", e);
    }

    const fecha = new Date().toISOString();
    const prefijoRef = esInterbancaria ? 'ACH' : 'FIN';
    const referencia = `${prefijoRef}-${Math.floor(100000 + Math.random() * 900000)}`;

    registrarNotificaciones(monto, destino ? destino.titular : 'Destino', referencia, v.usaSobregiro, v.esAvanceTC, esInterbancaria, comision);

    return {
        referencia, fecha, monto, concepto,
        bancoDestino: esInterbancaria ? destino.banco : 'Finara Bank',
        destino, saldoOrigen: origen.saldo,
        usaSobregiro: v.usaSobregiro,
        esAvanceTC: v.esAvanceTC
    };
}

function registrarNotificaciones(monto, titular, referencia, usaSobregiro, esAvanceTC, esInterbancaria = false, comision = 0) {
    let titulo = 'Transferencia exitosa';
    let mensaje = `Enviaste ${formatoCOP.format(monto)} a ${titular}. Referencia ${referencia}.`;

    guardarNotificacion({
        titulo,
        mensaje,
        tipo: 'exito'
    });
}