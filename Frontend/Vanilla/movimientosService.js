// Vanilla/movimientosService.js
import { obtenerCuentas as obtenerCuentasSaldos, SesionExpiradaError as SesionExpiradaCuentas } from './cuentasService.js';

const USAR_API_BACKEND = false;
const API_BASE = 'http://localhost:8080/api';

export class SesionExpiradaError extends Error {
    constructor(mensaje = 'Tu sesión ha expirado o no estás autenticado.') {
        super(mensaje);
        this.name = 'SesionExpiradaError';
    }
}

export const PERIODOS = [
    { valor: '7d', etiqueta: 'Últimos 7 días' },
    { valor: '30d', etiqueta: 'Últimos 30 días' },
    { valor: '90d', etiqueta: 'Últimos 90 días' },
    { valor: 'mes', etiqueta: 'Este mes' },
    { valor: 'todo', etiqueta: 'Todo el historial' }
];

const TIPOS_CUENTA = {
    AHORROS: 'Cuenta de Ahorros',
    CORRIENTE: 'Cuenta Corriente',
    TARJETA_CREDITO: 'Tarjeta de Crédito'
};

function limiteInferior(periodo) {
    const ahora = new Date();
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    if (periodo === 'mes') return new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const m = /^(\d+)d$/.exec(periodo);
    if (m) {
        inicioDia.setDate(inicioDia.getDate() - Number(m[1]));
        return inicioDia;
    }
    return null;
}

export async function obtenerCuentasFiltro() {
    if (USAR_API_BACKEND) {
        return pedir(`${API_BASE}/cuentas`);
    }

    try {
        const cuentasReales = await obtenerCuentasSaldos();
        return cuentasReales.map(c => ({
            id: String(c.id),
            nombre: TIPOS_CUENTA[c.tipo] || c.tipo,
            numero: String(c.numero || ''),
            tipo: c.tipo,
            saldo: c.saldo
        }));
    } catch (e) {
        if (e instanceof SesionExpiradaCuentas) throw new SesionExpiradaError();
        throw e;
    }
}

export async function obtenerMovimientos({ cuentaId, periodo = '30d', tipo = 'todos', orden = 'desc', pagina = 1, tamano = 8 }) {
    if (USAR_API_BACKEND) {
        const qs = new URLSearchParams({ periodo, tipo, orden, pagina, tamano });
        return pedir(`${API_BASE}/cuentas/${encodeURIComponent(cuentaId)}/movimientos?${qs}`);
    }

    await new Promise(r => setTimeout(r, 200));

    const cuentas = await obtenerCuentasFiltro();
    const cuentaActiva = cuentas.find(c => String(c.id) === String(cuentaId)) || cuentas[0];
    const numLimpio = cuentaActiva ? String(cuentaActiva.numero || '').replace(/\D/g, '') : '';

    let movimientosLocales = [];
    try {
        movimientosLocales = JSON.parse(localStorage.getItem('finara_movimientos')) || [];
        if (!Array.isArray(movimientosLocales)) movimientosLocales = [];
    } catch {
        movimientosLocales = [];
    }

    let movimientosCuenta = movimientosLocales.filter(m => {
        if (!m) return false;
        const mId = String(m.cuentaId || '').trim();
        const mNum = String(m.cuentaNumero || m.cuentaOrigen || '').replace(/\D/g, '');

        if (cuentaId && mId === String(cuentaId)) return true;
        if (numLimpio && mNum && (mNum.includes(numLimpio) || numLimpio.includes(mNum))) return true;
        if (!mId && !mNum) return true;
        return false;
    });

    const desde = limiteInferior(periodo);
    let filtrados = movimientosCuenta.filter(m => !desde || new Date(m.fecha) >= desde);

    const ingresosPeriodo = filtrados.filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + (Number(m.valor) || 0), 0);
    const egresosPeriodo = filtrados.filter(m => m.tipo === 'EGRESO').reduce((s, m) => s + (Number(m.valor) || 0), 0);

    if (tipo && tipo !== 'todos') {
        filtrados = filtrados.filter(m => m.tipo === tipo);
    }

    filtrados.sort((a, b) => {
        const fa = new Date(a.fecha).getTime();
        const fb = new Date(b.fecha).getTime();
        return orden === 'asc' ? fa - fb : fb - fa;
    });

    const total = filtrados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / tamano));
    const paginaOk = Math.min(Math.max(1, pagina), totalPaginas);
    const inicio = (paginaOk - 1) * tamano;

    return {
        items: filtrados.slice(inicio, inicio + tamano),
        total,
        pagina: paginaOk,
        totalPaginas,
        resumen: {
            ingresos: ingresosPeriodo,
            egresos: egresosPeriodo
        }
    };
}

async function pedir(url) {
    const token = localStorage.getItem('authToken');
    if (!token) throw new SesionExpiradaError();

    const respuesta = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
    if (respuesta.status === 401 || respuesta.status === 403) throw new SesionExpiradaError();
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status} al consultar los movimientos`);
    return respuesta.json();
}