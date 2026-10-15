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

export function obtenerPresupuestosUsuario(periodo = null) {
    const usuarioActivo = obtenerUsernameActivo();
    let todos = leerTodos();

    // Purgar rubros residuales de demo que se hayan guardado en el navegador del usuario
    const hayDemosResiduales = todos.some(p => p.id && String(p.id).startsWith('PRE-DEMO-'));
    if (hayDemosResiduales) {
        todos = todos.filter(p => !p.id || !String(p.id).startsWith('PRE-DEMO-'));
        guardarTodos(todos);
    }

    return todos.filter(p => {
        const matchUsuario = (p.username === usuarioActivo);
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

export function actualizarItemPresupuesto(id, { tipo, categoria, descripcion, monto, periodo }) {
    const todos = leerTodos();
    const indice = todos.findIndex(p => p.id === id);
    if (indice === -1) {
        throw new Error('El rubro de presupuesto no existe.');
    }

    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
        throw new Error('El monto debe ser mayor a cero.');
    }

    todos[indice] = {
        ...todos[indice],
        tipo: tipo || todos[indice].tipo,
        categoria: categoria || todos[indice].categoria,
        descripcion: descripcion !== undefined ? descripcion.trim() : todos[indice].descripcion,
        monto: montoNum,
        periodo: periodo || todos[indice].periodo,
        fechaModificacion: new Date().toISOString()
    };

    guardarTodos(todos);
    return todos[indice];
}

export function eliminarItemPresupuesto(id) {
    let todos = leerTodos();
    const existe = todos.some(p => p.id === id);
    if (!existe) {
        throw new Error('El rubro de presupuesto no fue encontrado.');
    }

    todos = todos.filter(p => p.id !== id);
    guardarTodos(todos);
    return true;
}
