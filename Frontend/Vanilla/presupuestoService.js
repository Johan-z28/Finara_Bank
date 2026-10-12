// Vanilla/presupuestoService.js
// Servicio de datos y cálculo de presupuestos (HU-23: Elaboración de presupuesto)
// Gestiona el registro de ingresos y gastos por categoría, el cálculo automático de saldos y la persistencia mensual.

import { obtenerUsernameActivo } from './cuentasService.js';

const CLAVE_PRESUPUESTOS = 'finara_presupuestos';

export const CATEGORIAS_INGRESO = [
    { id: 'salario', nombre: 'Salario / Nómina', icono: 'fa-briefcase', color: '#34d399' },
    { id: 'honorarios', nombre: 'Honorarios / Freelance', icono: 'fa-laptop-code', color: '#10b981' },
    { id: 'inversiones', nombre: 'Rendimientos / Inversiones', icono: 'fa-chart-line', color: '#6ee7b7' },
    { id: 'otros_ingresos', nombre: 'Otros Ingresos', icono: 'fa-money-bill-wave', color: '#a7f3d0' }
];

export const CATEGORIAS_GASTO = [
    { id: 'vivienda', nombre: 'Vivienda y Servicios', icono: 'fa-house', color: '#f87171' },
    { id: 'alimentacion', nombre: 'Alimentación y Mercado', icono: 'fa-utensils', color: '#fb923c' },
    { id: 'transporte', nombre: 'Transporte y Movilidad', icono: 'fa-car', color: '#facc15' },
    { id: 'educacion', nombre: 'Educación y Estudio', icono: 'fa-graduation-cap', color: '#60a5fa' },
    { id: 'salud', nombre: 'Salud y Bienestar', icono: 'fa-heart-pulse', color: '#ec4899' },
    { id: 'entretenimiento', nombre: 'Entretenimiento y Ocio', icono: 'fa-film', color: '#a855f7' },
    { id: 'otros_gastos', nombre: 'Otros Gastos', icono: 'fa-tags', color: '#94a3b8' }
];

export const formatoCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
});

function leerTodos() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_PRESUPUESTOS));
        return Array.isArray(datos) ? datos : [];
    } catch {
        return [];
    }
}

function guardarTodos(lista) {
    try {
        localStorage.setItem(CLAVE_PRESUPUESTOS, JSON.stringify(lista));
    } catch {
        console.error('Error al guardar presupuestos en localStorage');
    }
}

export function obtenerPeriodoActual() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mes}`;
}

function generarRubrosInicialesDemo(username, periodo) {
    return [
        {
            id: `PRE-DEMO-1`,
            username,
            tipo: 'INGRESO',
            categoria: 'salario',
            descripcion: 'Salario / Nómina principal',
            monto: 3800000,
            periodo,
            fechaCreacion: new Date().toISOString()
        },
        {
            id: `PRE-DEMO-2`,
            username,
            tipo: 'INGRESO',
            categoria: 'honorarios',
            descripcion: 'Ingresos freelance / Asesorías',
            monto: 850000,
            periodo,
            fechaCreacion: new Date().toISOString()
        },
        {
            id: `PRE-DEMO-3`,
            username,
            tipo: 'GASTO',
            categoria: 'vivienda',
            descripcion: 'Arriendo y servicios públicos',
            monto: 1250000,
            periodo,
            fechaCreacion: new Date().toISOString()
        },
        {
            id: `PRE-DEMO-4`,
            username,
            tipo: 'GASTO',
            categoria: 'alimentacion',
            descripcion: 'Supermercado y mercado del mes',
            monto: 780000,
            periodo,
            fechaCreacion: new Date().toISOString()
        },
        {
            id: `PRE-DEMO-5`,
            username,
            tipo: 'GASTO',
            categoria: 'transporte',
            descripcion: 'Transporte, gasolina y movilidad',
            monto: 320000,
            periodo,
            fechaCreacion: new Date().toISOString()
        },
        {
            id: `PRE-DEMO-6`,
            username,
            tipo: 'GASTO',
            categoria: 'entretenimiento',
            descripcion: 'Salidas y plataformas streaming',
            monto: 190000,
            periodo,
            fechaCreacion: new Date().toISOString()
        }
    ];
}

export function obtenerPresupuestosUsuario(periodo = null) {
    const usuarioActivo = obtenerUsernameActivo();
    let todos = leerTodos();
    const periodoActual = periodo || obtenerPeriodoActual();

    // Si el usuario no tiene ningún rubro registrado para este periodo, generar presupuesto base
    const tieneItems = todos.some(p => (p.username === usuarioActivo || (!p.username && usuarioActivo === 'maria17')) && p.periodo === periodoActual);
    if (!tieneItems) {
        const demo = generarRubrosInicialesDemo(usuarioActivo, periodoActual);
        todos = [...demo, ...todos];
        guardarTodos(todos);
    }

    return todos.filter(p => {
        const matchUsuario = (p.username === usuarioActivo || (!p.username && usuarioActivo === 'maria17'));
        if (!periodo) return matchUsuario;
        return matchUsuario && p.periodo === periodo;
    });
}

export function crearItemPresupuesto({ tipo, categoria, descripcion, monto, periodo }) {
    if (!['INGRESO', 'GASTO'].includes(tipo)) {
        throw new Error('Tipo inválido. Debe ser INGRESO o GASTO.');
    }
    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
        throw new Error('El monto debe ser un valor numérico mayor a cero.');
    }
    if (!categoria) {
        throw new Error('Debes seleccionar una categoría.');
    }

    const usuarioActivo = obtenerUsernameActivo();
    const periodoFinal = periodo || obtenerPeriodoActual();

    const nuevo = {
        id: `PRE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: usuarioActivo,
        tipo,
        categoria,
        descripcion: (descripcion || '').trim(),
        monto: montoNum,
        periodo: periodoFinal,
        fechaCreacion: new Date().toISOString()
    };

    const todos = leerTodos();
    todos.unshift(nuevo);
    guardarTodos(todos);
    return nuevo;
}

export function calcularResumenPresupuesto(periodo = null) {
    const items = obtenerPresupuestosUsuario(periodo);
    const ingresos = items.filter(i => i.tipo === 'INGRESO');
    const gastos = items.filter(i => i.tipo === 'GASTO');

    const totalIngresos = ingresos.reduce((acc, curr) => acc + curr.monto, 0);
    const totalGastos = gastos.reduce((acc, curr) => acc + curr.monto, 0);
    const saldoNeto = totalIngresos - totalGastos;
    const porcentajeGastado = totalIngresos > 0 ? Math.round((totalGastos / totalIngresos) * 100) : (totalGastos > 0 ? 100 : 0);

    return {
        totalIngresos,
        totalGastos,
        saldoNeto,
        porcentajeGastado,
        esDeficit: saldoNeto < 0,
        esSuperavit: saldoNeto > 0,
        items
    };
}
