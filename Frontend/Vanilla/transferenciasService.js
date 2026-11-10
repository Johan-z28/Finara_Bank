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

const soloDigitos = v => String(v ?? '').replace(/\D/g, '');

function obtenerUsuarioLocalFlex() {
    try {
        const perfil = JSON.parse(localStorage.getItem('userProfile'));
        if (perfil) return perfil;

        const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
        if (usuarioActivo) return usuarioActivo;

        const emailLogueado = localStorage.getItem('usuarioLogueado') || localStorage.getItem('emailSesion');
        if (emailLogueado) {
            const usuarios = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
            const encontrado = usuarios.find(u => u.correo === emailLogueado || u.username === emailLogueado);
            if (encontrado) return encontrado;
            return { username: emailLogueado, correo: emailLogueado };
        }
    } catch (e) {}
    return { username: 'maria17' };
}

// 🚀 ENCRIPTACIÓN: Conserva las 3 primeras letras de cada palabra y oculta el resto con asteriscos
function enmascarar3Iniciales(nombreCompleto) {
    if (!nombreCompleto) return "Cli*** Fin***";
    return nombreCompleto.trim().split(/\s+/).map(palabra => {
        if (palabra.length <= 3) return palabra;
        return palabra.substring(0, 3) + '***';
    }).join(' ');
}

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

    if (!esInterbancaria) {
        if (destino.bloqueada || destino.estado === 'BLOQUEADA') {
            return {
                ok: false,
                campo: 'destino',
                mensaje: 'La cuenta de destino se encuentra bloqueada temporalmente. No es posible recibir transferencias.'
            };
        }

        const numOrigenLimpio = soloDigitos(origen.numero);
        const numDestinoLimpio = soloDigitos(destino.numero);

        if (numOrigenLimpio === numDestinoLimpio || origen.id === destino.id) {
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

function resolverDestinoMock(numero, tipo) {
    const n = soloDigitos(numero);
    if (!n) return null;

    const tipoBuscado = String(tipo || 'AHORROS').toUpperCase();

    try {
        const todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        const perfilActivo = JSON.parse(localStorage.getItem('userProfile')) || {};
        
        const cuentaEncontrada = todasLasCuentas.find(c => {
            if (!c) return false;
            const numCoincide = soloDigitos(c.numero) === n;
            const tipoCta = String(c.tipo || '').toUpperCase();
            
            const esMismoTipo = (tipoBuscado === 'AHORROS' && (tipoCta.includes('AHORRO') || tipoCta.includes('DEBITO'))) ||
                                (tipoBuscado === 'CORRIENTE' && tipoCta.includes('CORRIENTE')) ||
                                (tipoBuscado === 'TARJETA_CREDITO' && tipoCta.includes('CREDITO'));

            return numCoincide && esMismoTipo;
        });

        if (cuentaEncontrada) {
            const estaBloqueada = Boolean(
                cuentaEncontrada.bloqueada || 
                cuentaEncontrada.estado === 'BLOQUEADA' || 
                (cuentaEncontrada.tarjetaAsociada && cuentaEncontrada.tarjetaAsociada.bloqueada)
            );

            const nombreReal = perfilActivo.nombre || cuentaEncontrada.titular || cuentaEncontrada.username || 'Cliente Finara';

            return {
                id: cuentaEncontrada.id,
                titular: enmascarar3Iniciales(nombreReal),
                tipo: cuentaEncontrada.tipo,
                numero: cuentaEncontrada.numero,
                esPropia: true,
                bloqueada: estaBloqueada,
                estado: estaBloqueada ? 'BLOQUEADA' : (cuentaEncontrada.estado || 'ACTIVA')
            };
        }
    } catch (e) {
        console.error("Error buscando cuenta destino en localStorage:", e);
    }

    return null;
}

export async function obtenerCuentasOrigen() {
    try {
        let cuentas = [];
        try {
            cuentas = await obtenerCuentasOficiales();
        } catch (e) {
            cuentas = [];
        }

        if (!cuentas || cuentas.length === 0) {
            const usuario = obtenerUsuarioLocalFlex();
            const cuentasGlobales = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
            
            const userNorm = String(usuario.username || '').trim().toLowerCase();
            const mailNorm = String(usuario.correo || usuario.email || '').trim().toLowerCase();

            cuentas = cuentasGlobales.filter(c => {
                if (!c) return false;
                const cUser = String(c.username || '').trim().toLowerCase();
                const cMail = String(c.correo || '').trim().toLowerCase();
                
                if (userNorm && cUser === userNorm) return true;
                if (mailNorm && (cUser === mailNorm || cMail === mailNorm)) return true;
                if (!c.username && !c.correo) return true;
                return false;
            });

            if (cuentas.length === 0 && Array.isArray(usuario.tarjetasAprobadas)) {
                cuentas = usuario.tarjetasAprobadas.map((t, idx) => ({
                    id: `TC-APROB-${idx}`,
                    tipo: String(t.tipo || 'CREDITO').toLowerCase().includes('credito') ? 'TARJETA_CREDITO' : 'AHORROS',
                    numero: t.numeroTarjeta || t.numero || '4021000011112222',
                    saldo: Number(t.saldo !== undefined ? t.saldo : (t.cupoDisponible || 3000000)),
                    estado: 'ACTIVA'
                }));
            }
        }

        return (cuentas || []).filter(c => c && c.estado !== 'INACTIVA' && c.estado !== 'CANCELADA');
    } catch (e) {
        console.error("Error al obtener cuentas de origen en Transferencias:", e);
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
    let cuentas = await obtenerCuentasOrigen();
    const origen = cuentas.find(c => String(c.id) === String(origenId) || String(c.numero) === String(origenId) || soloDigitos(c.numero) === soloDigitos(origenId));
    if (!origen) throw new Error('No se encontró la cuenta de origen seleccionada.');

    const destino = esInterbancaria ? destinoInterbancario : resolverDestinoMock(destinoNumero, destinoTipo);

    const v = validarTransferencia({ origen, destino, monto, esInterbancaria });
    if (!v.ok) throw new Error(v.mensaje);

    const comision = v.comision || 0;
    const totalADebitar = v.totalADebitar || (monto + comision);

    const saldoOrigenAnterior = typeof origen.saldo === 'number'
        ? origen.saldo
        : Number(String(origen.saldo || 0).replace(/[^0-9.-]+/g, "")) || 0;

    origen.saldo = saldoOrigenAnterior - totalADebitar;

    try {
        let todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        
        const idxOrigen = todasLasCuentas.findIndex(c => String(c.id) === String(origen.id) || soloDigitos(c.numero) === soloDigitos(origen.numero));
        if (idxOrigen !== -1) {
            todasLasCuentas[idxOrigen].saldo = origen.saldo;
        }

        const idxDestino = todasLasCuentas.findIndex(c => soloDigitos(c.numero) === soloDigitos(destino.numero));
        if (idxDestino !== -1) {
            const saldoDestinoAnterior = typeof todasLasCuentas[idxDestino].saldo === 'number'
                ? todasLasCuentas[idxDestino].saldo
                : Number(String(todasLasCuentas[idxDestino].saldo || 0).replace(/[^0-9.-]+/g, "")) || 0;
            
            todasLasCuentas[idxDestino].saldo = saldoDestinoAnterior + monto;
        }

        localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));

        let perfil = JSON.parse(localStorage.getItem('userProfile')) || {};
        if (Array.isArray(perfil.cuentas)) {
            const pIdx = perfil.cuentas.findIndex(c => String(c.id) === String(origen.id) || soloDigitos(c.numero) === soloDigitos(origen.numero));
            if (pIdx !== -1) perfil.cuentas[pIdx].saldo = origen.saldo;
            localStorage.setItem('userProfile', JSON.stringify(perfil));
        }

    } catch (e) {
        console.error("Error actualizando saldos en localStorage:", e);
    }

    const fecha = new Date().toISOString();
    const referencia = esInterbancaria
        ? `ACH-${Math.floor(10000000 + Math.random() * 90000000)}`
        : `FIN-${Math.floor(100000 + Math.random() * 900000)}`;

    registrarNotificaciones(monto, destino ? destino.titular : 'Destino', referencia, v.usaSobregiro, v.esAvanceTC, esInterbancaria, comision);

    return {
        referencia, fecha, monto, concepto,
        bancoDestino: esInterbancaria ? (destino.banco || 'Red ACH') : 'Finara Bank',
        destino, saldoOrigen: origen.saldo,
        usaSobregiro: v.usaSobregiro,
        esAvanceTC: v.esAvanceTC,
        esInterbancaria,
        comision,
        totalDebitado: totalADebitar
    };
}

function registrarNotificaciones(monto, titular, referencia, usaSobregiro, esAvanceTC, esInterbancaria = false, comision = 0) {
    let titulo = esInterbancaria ? 'Transferencia interbancaria ACH exitosa' : 'Transferencia exitosa';
    let detalleComision = comision > 0 ? ` (Tarifa ACH: ${formatoCOP.format(comision)})` : '';
    let mensaje = `Enviaste ${formatoCOP.format(monto)} a ${titular}${detalleComision}. Referencia ${referencia}.`;

    guardarNotificacion({
        titulo,
        mensaje,
        tipo: 'exito'
    });
}