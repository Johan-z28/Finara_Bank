// Vanilla/movimientosService.js
// Capa de acceso a datos de movimientos. La UI nunca llama a fetch directamente.

// Cambia a false cuando el endpoint del Backend esté disponible.
const USAR_DATOS_DE_PRUEBA = true;
const API_BASE = 'http://localhost:8080/api';

// Contrato esperado del API:
//   GET /api/cuentas/{cuentaId}/movimientos?periodo=30d&orden=desc&pagina=1&tamano=8
//   -> {
//        items: [{ id, fecha (ISO), descripcion, categoria|null, tipo: 'INGRESO'|'EGRESO', valor (>0) }],
//        total, pagina, totalPaginas,
//        resumen: { ingresos, egresos }   // sobre TODO el periodo filtrado, no solo la página
//      }
// periodo: 7d | 30d | 90d | mes | todo      orden: desc (recientes primero) | asc

export class SesionExpiradaError extends Error { }

export const PERIODOS = [
    { valor: '7d', etiqueta: 'Últimos 7 días' },
    { valor: '30d', etiqueta: 'Últimos 30 días' },
    { valor: '90d', etiqueta: 'Últimos 90 días' },
    { valor: 'mes', etiqueta: 'Este mes' },
    { valor: 'todo', etiqueta: 'Todo el historial' }
];

// ----- Datos de prueba (simulan lo que haría el servidor) -----
const CUENTAS_MOCK = [
    { id: 1, nombre: 'Cuenta de Ahorros', numero: '4021587701234' },
    { id: 2, nombre: 'Cuenta Corriente', numero: '4021587705678' },
    { id: 3, nombre: 'Tarjeta de Crédito', numero: '5412750000009012' }
];

// [díasAtrás, hora, descripción, categoría, tipo, valor]
const MOCK_POR_CUENTA = {
    1: [
        [0, 9, 'Consignación en cajero', null, 'INGRESO', 500000],
        [2, 14, 'Retiro en cajero', 'Mercado', 'EGRESO', 150000],
        [4, 11, 'Transferencia recibida', null, 'INGRESO', 200000],
        [6, 18, 'Pago de servicios', 'Servicios', 'EGRESO', 120000],
        [9, 10, 'Compra en tienda', 'Ocio', 'EGRESO', 80000],
        [12, 16, 'Rendimiento mensual 1.5%', null, 'INGRESO', 18750],
        [15, 13, 'Retiro en cajero', 'Mercado', 'EGRESO', 100000],
        [21, 9, 'Consignación nómina', null, 'INGRESO', 1200000],
        [28, 19, 'Transferencia enviada', 'Servicios', 'EGRESO', 300000],
        [40, 12, 'Retiro en cajero', 'Ocio', 'EGRESO', 90000],
        [55, 15, 'Consignación en cajero', null, 'INGRESO', 400000],
        [75, 10, 'Pago de servicios', 'Servicios', 'EGRESO', 210000],
        [110, 17, 'Consignación nómina', null, 'INGRESO', 1200000]
    ],
    2: [
        [1, 8, 'Pago de nómina', null, 'INGRESO', 2400000],
        [3, 12, 'Pago de tarjeta', 'Servicios', 'EGRESO', 200000],
        [5, 15, 'Compra en supermercado', 'Mercado', 'EGRESO', 185000],
        [8, 20, 'Transferencia enviada', 'Ocio', 'EGRESO', 120000],
        [11, 11, 'Pago de arriendo', 'Servicios', 'EGRESO', 900000],
        [14, 9, 'Consignación en cajero', null, 'INGRESO', 350000],
        [19, 18, 'Compra en restaurante', 'Ocio', 'EGRESO', 95000],
        [26, 14, 'Pago de servicios públicos', 'Servicios', 'EGRESO', 240000],
        [31, 8, 'Pago de nómina', null, 'INGRESO', 2400000],
        [48, 13, 'Compra en supermercado', 'Mercado', 'EGRESO', 210000],
        [70, 16, 'Transferencia recibida', null, 'INGRESO', 150000],
        [95, 10, 'Pago de arriendo', 'Servicios', 'EGRESO', 900000]
    ],
    3: [
        [0, 19, 'Compra en tienda (3 cuotas)', 'Ocio', 'EGRESO', 450000],
        [3, 13, 'Compra en supermercado', 'Mercado', 'EGRESO', 230000],
        [7, 17, 'Suscripción streaming', 'Ocio', 'EGRESO', 38000],
        [13, 10, 'Pago a la tarjeta', null, 'INGRESO', 500000],
        [20, 12, 'Compra online (6 cuotas)', 'Ocio', 'EGRESO', 780000],
        [33, 15, 'Gasolina', 'Servicios', 'EGRESO', 120000],
        [52, 11, 'Pago a la tarjeta', null, 'INGRESO', 600000],
        [80, 18, 'Compra en supermercado', 'Mercado', 'EGRESO', 260000]
    ]
};

function fechaHaceDias(dias, hora) {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    d.setHours(hora, 0, 0, 0);
    return d;
}

function limiteInferior(periodo) {
    const ahora = new Date();
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    if (periodo === 'mes') return new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const m = /^(\d+)d$/.exec(periodo);
    if (m) { inicioDia.setDate(inicioDia.getDate() - Number(m[1])); return inicioDia; }
    return null; // 'todo'
}

function consultarMock({ cuentaId, periodo, orden, pagina, tamano }) {
    const base = (MOCK_POR_CUENTA[cuentaId] ?? []).map(([dias, hora, descripcion, categoria, tipo, valor], i) => ({
        id: `${cuentaId}-${i}`, fecha: fechaHaceDias(dias, hora).toISOString(), descripcion, categoria, tipo, valor
    }));

    const desde = limiteInferior(periodo);
    const filtrados = base
        .filter(m => !desde || new Date(m.fecha) >= desde)
        .sort((a, b) => orden === 'asc'
            ? new Date(a.fecha) - new Date(b.fecha)
            : new Date(b.fecha) - new Date(a.fecha));

    const total = filtrados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / tamano));
    const paginaOk = Math.min(Math.max(1, pagina), totalPaginas);
    const inicio = (paginaOk - 1) * tamano;

    return {
        items: filtrados.slice(inicio, inicio + tamano),
        total, pagina: paginaOk, totalPaginas,
        resumen: {
            ingresos: filtrados.filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + m.valor, 0),
            egresos: filtrados.filter(m => m.tipo === 'EGRESO').reduce((s, m) => s + m.valor, 0)
        }
    };
}

// ----- API pública del servicio -----
export async function obtenerCuentasFiltro() {
    if (USAR_DATOS_DE_PRUEBA) return CUENTAS_MOCK;
    return pedir(`${API_BASE}/cuentas`);
}

export async function obtenerMovimientos({ cuentaId, periodo = '30d', orden = 'desc', pagina = 1, tamano = 8 }) {
    if (USAR_DATOS_DE_PRUEBA) {
        await new Promise(r => setTimeout(r, 350)); // simula latencia
        return consultarMock({ cuentaId, periodo, orden, pagina, tamano });
    }
    const qs = new URLSearchParams({ periodo, orden, pagina, tamano });
    return pedir(`${API_BASE}/cuentas/${encodeURIComponent(cuentaId)}/movimientos?${qs}`);
}

async function pedir(url) {
    const token = localStorage.getItem('authToken');
    if (!token) throw new SesionExpiradaError();

    const respuesta = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
    if (respuesta.status === 401 || respuesta.status === 403) throw new SesionExpiradaError();
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status} al consultar los movimientos`);
    return respuesta.json();
}