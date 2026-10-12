// Vanilla/Presupuesto.js
// Controlador de interfaz para HU-23: Elaboración de presupuesto

import { initGlobalComponents } from './Global/app.js';
import {
    CATEGORIAS_INGRESO,
    CATEGORIAS_GASTO,
    formatoCOP,
    obtenerPeriodoActual,
    obtenerPresupuestosUsuario,
    crearItemPresupuesto,
    calcularResumenPresupuesto
} from './presupuestoService.js';

document.addEventListener('DOMContentLoaded', () => {
    initGlobalComponents();

    const selectPeriodo = document.getElementById('selectPeriodo');
    const formRegistro = document.getElementById('formRegistroRubro');
    const rubroTipo = document.getElementById('rubroTipo');
    const rubroCategoria = document.getElementById('rubroCategoria');
    const rubroDescripcion = document.getElementById('rubroDescripcion');
    const rubroMonto = document.getElementById('rubroMonto');
    const listaIngresos = document.getElementById('listaIngresos');
    const listaGastos = document.getElementById('listaGastos');
    const totalColIngresos = document.getElementById('totalColIngresos');
    const totalColGastos = document.getElementById('totalColGastos');

    // Elementos de métricas automáticas
    const metricaIngresos = document.getElementById('metricaIngresos');
    const metricaGastos = document.getElementById('metricaGastos');
    const metricaSaldoNeto = document.getElementById('metricaSaldoNeto');
    const metricaPorcentajeGastado = document.getElementById('metricaPorcentajeGastado');
    const metricaEstadoBalance = document.getElementById('metricaEstadoBalance');
    const iconoBalanceBox = document.getElementById('iconoBalanceBox');
    const progresoTexto = document.getElementById('progresoTexto');
    const progresoFill = document.getElementById('progresoFill');

    // Inicializar periodo por defecto (mes actual)
    const periodoActual = obtenerPeriodoActual();
    selectPeriodo.value = periodoActual;

    // Actualizar select de categorías según el tipo seleccionado
    function cargarCategorias() {
        const tipo = rubroTipo.value;
        const categorias = tipo === 'INGRESO' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO;

        rubroCategoria.innerHTML = categorias.map(c => `
            <option value="${c.id}">${c.nombre}</option>
        `).join('');
    }

    rubroTipo.addEventListener('change', cargarCategorias);
    cargarCategorias();

    // Formatear input de monto al escribir
    rubroMonto.addEventListener('input', () => {
        const digitos = rubroMonto.value.replace(/\D/g, '').slice(0, 11);
        rubroMonto.value = digitos ? new Intl.NumberFormat('es-CO').format(Number(digitos)) : '';
    });

    // Renderizar listado de ingresos y gastos con cálculo automático de balance
    function renderizarPresupuestos() {
        const periodo = selectPeriodo.value || periodoActual;
        const resumen = calcularResumenPresupuesto(periodo);

        // Actualizar métricas automáticas (Ingresos vs Gastos)
        metricaIngresos.textContent = formatoCOP.format(resumen.totalIngresos);
        metricaGastos.textContent = formatoCOP.format(resumen.totalGastos);
        metricaSaldoNeto.textContent = formatoCOP.format(resumen.saldoNeto);

        totalColIngresos.textContent = formatoCOP.format(resumen.totalIngresos);
        totalColGastos.textContent = formatoCOP.format(resumen.totalGastos);

        // Indicador de uso y balance
        metricaPorcentajeGastado.textContent = `${resumen.porcentajeGastado}% de los ingresos`;
        progresoTexto.textContent = `${Math.min(resumen.porcentajeGastado, 100)}% consumido`;
        progresoFill.style.width = `${Math.min(resumen.porcentajeGastado, 100)}%`;

        if (resumen.esDeficit) {
            metricaSaldoNeto.style.color = 'var(--color-gasto)';
            metricaEstadoBalance.textContent = 'Déficit presupuestario (Gastos superan ingresos)';
            metricaEstadoBalance.style.color = 'var(--color-gasto)';
            iconoBalanceBox.className = 'pre-metrica-icono bg-balance--deficit';
        } else if (resumen.esSuperavit) {
            metricaSaldoNeto.style.color = 'var(--color-ingreso)';
            metricaEstadoBalance.textContent = 'Superávit saludable (Ahorro potencial)';
            metricaEstadoBalance.style.color = 'var(--color-ingreso)';
            iconoBalanceBox.className = 'pre-metrica-icono bg-balance--superavit';
        } else {
            metricaSaldoNeto.style.color = 'var(--color-balance-positivo)';
            metricaEstadoBalance.textContent = 'Presupuesto en equilibrio exacto';
            metricaEstadoBalance.style.color = 'var(--text-muted)';
            iconoBalanceBox.className = 'pre-metrica-icono bg-balance';
        }

        const items = resumen.items;
        const ingresos = items.filter(i => i.tipo === 'INGRESO');
        const gastos = items.filter(i => i.tipo === 'GASTO');

        const categoriasMap = [...CATEGORIAS_INGRESO, ...CATEGORIAS_GASTO].reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
        }, {});

        function renderLista(contenedor, lista, colorClase, esVacioTexto) {
            if (!lista.length) {
                contenedor.innerHTML = `<p class="pre-lista-vacia">${esVacioTexto}</p>`;
                return;
            }

            contenedor.innerHTML = lista.map(item => {
                const cat = categoriasMap[item.categoria] || { nombre: 'General', icono: 'fa-tag', color: '#94a3b8' };
                return `
                    <div class="pre-item" data-id="${item.id}">
                        <div class="pre-item-info">
                            <div class="pre-item-icono" style="background: ${cat.color}20; color: ${cat.color};">
                                <i class="fa-solid ${cat.icono}"></i>
                            </div>
                            <div class="pre-item-detalles">
                                <strong>${item.descripcion || cat.nombre}</strong>
                                <span>${cat.nombre}</span>
                            </div>
                        </div>
                        <div class="pre-item-monto ${colorClase}">
                            ${formatoCOP.format(item.monto)}
                        </div>
                    </div>
                `;
            }).join('');
        }

        renderLista(listaIngresos, ingresos, 'color-ingreso', 'No hay ingresos registrados en este mes.');
        renderLista(listaGastos, gastos, 'color-gasto', 'No hay gastos registrados en este mes.');
    }

    // Evento de registrar rubro
    formRegistro.addEventListener('submit', (e) => {
        e.preventDefault();
        const montoNum = Number(rubroMonto.value.replace(/\D/g, ''));
        if (!montoNum || montoNum <= 0) {
            if (window.Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Monto inválido',
                    text: 'Ingresa un valor numérico mayor a cero.',
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
            } else {
                alert('Ingresa un valor mayor a cero.');
            }
            return;
        }

        try {
            crearItemPresupuesto({
                tipo: rubroTipo.value,
                categoria: rubroCategoria.value,
                descripcion: rubroDescripcion.value,
                monto: montoNum,
                periodo: selectPeriodo.value || periodoActual
            });

            rubroDescripcion.value = '';
            rubroMonto.value = '';
            renderizarPresupuestos();

            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: 'Rubro Registrado',
                    text: 'Se ha agregado exitosamente a tu presupuesto.',
                    timer: 1600,
                    showConfirmButton: false,
                    background: '#12151c',
                    color: '#fff'
                });
            }
        } catch (err) {
            alert(err.message);
        }
    });

    selectPeriodo.addEventListener('change', renderizarPresupuestos);

    renderizarPresupuestos();
});
