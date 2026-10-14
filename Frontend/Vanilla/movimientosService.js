// Vanilla/movimientosService.js
// Capa de acceso a datos de movimientos para HU-05 (Consulta de movimientos).
// La UI nunca llama a fetch o toca localStorage directamente.
// Cuando el backend REST esté disponible, USAR_API_BACKEND se activa y consulta el servidor.

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
    return null; // 'todo'
}

/**
 * Movimientos base de cortesía para el usuario demo maria17
 * en caso de que aún no haya registrado transferencias en la sesión actual.
 */
function generarMovimientosBase(cuentaId, cuentaTipo) {
    const ahora = new Date();
    const d1 = new Date(ahora); d1.setHours(9, 30, 0, 0);
    const d2 = new Date(ahora); d2.setDate(d2.getDate() - 3); d2.setHours(14, 15, 0, 0);
    const d3 = new Date(ahora); d3.setDate(d3.getDate() - 7); d3.setHours(11, 0, 0, 0);
    const d4 = new Date(ahora); d4.setDate(d4.getDate() - 15); d4.setHours(16, 45, 0, 0);

    if (cuentaTipo === 'CORRIENTE') {
        return [
            { id: `MOV-CORR-1`, cuentaId, fecha: d1.toISOString(), descripcion: 'Pago de nómina empresarial', categoria: 'Nómina', tipo: 'INGRESO', valor: 2400000 },
            { id: `MOV-CORR-2`, cuentaId, fecha: d2.toISOString(), descripcion: 'Pago de arriendo oficina', categoria: 'Servicios', tipo: 'EGRESO', valor: 900000 },
            { id: `MOV-CORR-3`, cuentaId, fecha: d3.toISOString(), descripcion: 'Consignación en efectivo', categoria: 'Depósito', tipo: 'INGRESO', valor: 350000 },
            { id: `MOV-CORR-4`, cuentaId, fecha: d4.toISOString(), descripcion: 'Pago de servicios públicos', categoria: 'Servicios', tipo: 'EGRESO', valor: 240000 }
        ];
    } else if (cuentaTipo === 'TARJETA_CREDITO') {
        return [
            { id: `MOV-TC-1`, cuentaId, fecha: d1.toISOString(), descripcion: 'Compra en tienda por departamento', categoria: 'Compras', tipo: 'EGRESO', valor: 350000 },
            { id: `MOV-TC-2`, cuentaId, fecha: d3.toISOString(), descripcion: 'Suscripción servicios digitales', categoria: 'Ocio', tipo: 'EGRESO', valor: 45000 },
            { id: `MOV-TC-3`, cuentaId, fecha: d4.toISOString(), descripcion: 'Pago mensual de tarjeta', categoria: 'Abono', tipo: 'INGRESO', valor: 400000 }
        ];
    } else {
        // AHORROS
        return [
            { id: `MOV-AHO-1`, cuentaId, fecha: d1.toISOString(), descripcion: 'Transferencia recibida', categoria: 'Transferencia', tipo: 'INGRESO', valor: 500000 },
            { id: `MOV-AHO-2`, cuentaId, fecha: d2.toISOString(), descripcion: 'Compra en supermercado', categoria: 'Mercado', tipo: 'EGRESO', valor: 150000 },
            { id: `MOV-AHO-3`, cuentaId, fecha: d3.toISOString(), descripcion: 'Rendimiento mensual 1.5%', categoria: 'Intereses', tipo: 'INGRESO', valor: 18750 },
            { id: `MOV-AHO-4`, cuentaId, fecha: d4.toISOString(), descripcion: 'Retiro en cajero automático', categoria: 'Efectivo', tipo: 'EGRESO', valor: 100000 }
        ];
    }
}

/**
 * Obtiene las cuentas reales del usuario asociadas a la sesión activa
 * usando la fuente compartida de cuentas de HU-04 (cuentasService).
 */
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

/**
 * Obtiene los movimientos paginados y filtrados para la cuenta seleccionada,
 * unificando los movimientos de transferencias (finara_movimientos) con la cuenta.
 */
export async function obtenerMovimientos({ cuentaId, periodo = '30d', tipo = 'todos', orden = 'desc', pagina = 1, tamano = 8 }) {
    if (USAR_API_BACKEND) {
        const qs = new URLSearchParams({ periodo, tipo, orden, pagina, tamano });
        return pedir(`${API_BASE}/cuentas/${encodeURIComponent(cuentaId)}/movimientos?${qs}`);
    }

    await new Promise(r => setTimeout(r, 200)); // Latencia suave de UI

    // 1. Cuentas del usuario para validar pertenencia y tipo
    const cuentas = await obtenerCuentasFiltro();
    const cuentaActiva = cuentas.find(c => String(c.id) === String(cuentaId)) || cuentas[0];
    const idEfectivo = cuentaActiva ? String(cuentaActiva.id) : String(cuentaId);

    // 2. Leer movimientos guardados en localStorage por Transferencias y operaciones
    let movimientosLocales = [];
    try {
        movimientosLocales = JSON.parse(localStorage.getItem('finara_movimientos')) || [];
        if (!Array.isArray(movimientosLocales)) movimientosLocales = [];
    } catch {
        movimientosLocales = [];
    }

    // Filtrar los movimientos que pertenezcan estrictamente a esta cuenta seleccionada
    const numLimpio = cuentaActiva ? String(cuentaActiva.numero || '').replace(/\D/g, '') : '';
    let movimientosCuenta = movimientosLocales.filter(m => {
        const mId = String(m.cuentaId || '');
        const mNum = String(m.cuentaNumero || '').replace(/\D/g, '');

        if (mId && mId === idEfectivo) return true;
        if (numLimpio && mNum && mNum === numLimpio) return true;
        return false;
    });

    // Si aún no hay transacciones hechas por el usuario en esta cuenta particular, proveer movimientos base de cortesía
    if (movimientosCuenta.length === 0) {
        movimientosCuenta = generarMovimientosBase(idEfectivo, cuentaActiva ? cuentaActiva.tipo : 'AHORROS');
    }

    // 3. Filtrar por período
    const desde = limiteInferior(periodo);
    let filtrados = movimientosCuenta.filter(m => !desde || new Date(m.fecha) >= desde);

    // Calcular los totales del periodo antes del filtro de tipo (o según el filtro activo)
    const ingresosPeriodo = filtrados.filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + (Number(m.valor) || 0), 0);
    const egresosPeriodo = filtrados.filter(m => m.tipo === 'EGRESO').reduce((s, m) => s + (Number(m.valor) || 0), 0);

    // 4. Filtrar por tipo (INGRESO, EGRESO o todos)
    if (tipo && tipo !== 'todos') {
        filtrados = filtrados.filter(m => m.tipo === tipo);
    }

    // 5. Ordenamiento cronológico
    filtrados.sort((a, b) => {
        const fa = new Date(a.fecha).getTime();
        const fb = new Date(b.fecha).getTime();
        return orden === 'asc' ? fa - fb : fb - fa;
    });

    // 6. Paginación
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