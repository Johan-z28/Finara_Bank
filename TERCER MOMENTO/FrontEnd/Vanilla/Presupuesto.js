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
    calcularResumenPresupuesto,
    actualizarItemPresupuesto,
    eliminarItemPresupuesto
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

    // Nombres de los meses en español
    const MESES_NOMBRES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Inicializar periodo por defecto (mes actual)
    let [anioActual, mesActualNum] = (obtenerPeriodoActual()).split('-').map(Number);
    let anioSeleccionado = anioActual;
    let mesSeleccionado = mesActualNum; // 1-12
    let anioNavegandoDropdown = anioSeleccionado;

    const selectorPeriodoContainer = document.getElementById('selectorPeriodoContainer');
    const periodoDisplayBtn = document.getElementById('periodoDisplayBtn');
    const periodoTextoLabel = document.getElementById('periodoTextoLabel');
    const dropdownMesesMenu = document.getElementById('dropdownMesesMenu');
    const btnMesAnterior = document.getElementById('btnMesAnterior');
    const btnMesSiguiente = document.getElementById('btnMesSiguiente');
    const btnYearPrev = document.getElementById('btnYearPrev');
    const btnYearNext = document.getElementById('btnYearNext');
    const labelYearSeleccionado = document.getElementById('labelYearSeleccionado');
    const gridMesesDropdown = document.getElementById('gridMesesDropdown');

    function actualizarPeriodoActivo(anio, mes) {
        anioSeleccionado = anio;
        mesSeleccionado = mes;
        const clave = `${anio}-${String(mes).padStart(2, '0')}`;
        selectPeriodo.value = clave;
        periodoTextoLabel.textContent = `${MESES_NOMBRES[mes - 1]} ${anio}`;
        renderizarPresupuestos();
        renderizarGridDropdown();
    }

    function renderizarGridDropdown() {
        labelYearSeleccionado.textContent = anioNavegandoDropdown;
        gridMesesDropdown.innerHTML = MESES_CORTOS.map((m, idx) => {
            const mesNum = idx + 1;
            const esActivo = (anioNavegandoDropdown === anioSeleccionado && mesNum === mesSeleccionado);
            return `<button type="button" class="btn-mes-item ${esActivo ? 'activo' : ''}" data-mes="${mesNum}">${m}</button>`;
        }).join('');
    }

    // Toggle Dropdown
    periodoDisplayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMesesMenu.classList.toggle('hidden');
        selectorPeriodoContainer.classList.toggle('abierto');
        anioNavegandoDropdown = anioSeleccionado;
        renderizarGridDropdown();
    });

    // Cerrar al hacer click afuera
    document.addEventListener('click', (e) => {
        if (!selectorPeriodoContainer.contains(e.target)) {
            dropdownMesesMenu.classList.add('hidden');
            selectorPeriodoContainer.classList.remove('abierto');
        }
    });

    // Navegar mes anterior
    btnMesAnterior.addEventListener('click', () => {
        let m = mesSeleccionado - 1;
        let y = anioSeleccionado;
        if (m < 1) { m = 12; y--; }
        actualizarPeriodoActivo(y, m);
    });

    // Navegar mes siguiente
    btnMesSiguiente.addEventListener('click', () => {
        let m = mesSeleccionado + 1;
        let y = anioSeleccionado;
        if (m > 12) { m = 1; y++; }
        actualizarPeriodoActivo(y, m);
    });

    // Navegar años en el dropdown
    btnYearPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        anioNavegandoDropdown--;
        renderizarGridDropdown();
    });

    btnYearNext.addEventListener('click', (e) => {
        e.stopPropagation();
        anioNavegandoDropdown++;
        renderizarGridDropdown();
    });

    // Seleccionar mes del grid
    gridMesesDropdown.addEventListener('click', (e) => {
        const btnMes = e.target.closest('.btn-mes-item');
        if (btnMes) {
            e.stopPropagation();
            const mesElegido = Number(btnMes.getAttribute('data-mes'));
            actualizarPeriodoActivo(anioNavegandoDropdown, mesElegido);
            dropdownMesesMenu.classList.add('hidden');
            selectorPeriodoContainer.classList.remove('abierto');
        }
    });

    actualizarPeriodoActivo(anioActual, mesActualNum);

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

        if (resumen.totalIngresos === 0 && resumen.totalGastos === 0) {
            metricaSaldoNeto.style.color = 'var(--text-muted)';
            metricaEstadoBalance.textContent = 'Sin rubros registrados para este mes';
            metricaEstadoBalance.style.color = 'var(--text-muted)';
            iconoBalanceBox.className = 'pre-metrica-icono bg-balance';
        } else if (resumen.esDeficit) {
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
                        <div class="pre-item-lateral">
                            <div class="pre-item-monto ${colorClase}">
                                ${formatoCOP.format(item.monto)}
                            </div>
                            <div class="pre-item-acciones">
                                <button type="button" class="btn-accion-pre btn-editar-pre" title="Editar este rubro" data-id="${item.id}">
                                    <i class="fa-solid fa-pen-to-square" style="pointer-events: none;"></i>
                                </button>
                                <button type="button" class="btn-accion-pre btn-eliminar-pre" title="Eliminar este rubro" data-id="${item.id}">
                                    <i class="fa-solid fa-trash-can" style="pointer-events: none;"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        renderLista(listaIngresos, ingresos, 'color-ingreso', 'No hay ingresos registrados en este mes.');
        renderLista(listaGastos, gastos, 'color-gasto', 'No hay gastos registrados en este mes.');
    }

    // Delegación de eventos global para clicks en Editar o Eliminar rubros
    document.addEventListener('click', (e) => {
        const btnEditar = e.target.closest('.btn-editar-pre');
        if (btnEditar) {
            e.preventDefault();
            e.stopPropagation();
            const id = btnEditar.getAttribute('data-id');
            const periodo = selectPeriodo.value || periodoActual;
            const items = obtenerPresupuestosUsuario(periodo);
            const item = items.find(i => i.id === id);
            if (item) abrirModalEditar(item);
            return;
        }

        const btnEliminar = e.target.closest('.btn-eliminar-pre');
        if (btnEliminar) {
            e.preventDefault();
            e.stopPropagation();
            const id = btnEliminar.getAttribute('data-id');
            const periodo = selectPeriodo.value || periodoActual;
            const items = obtenerPresupuestosUsuario(periodo);
            const item = items.find(i => i.id === id);
            if (item) confirmarEliminar(item);
            return;
        }
    });

    // Modal para editar / ajustar rubro
    async function abrirModalEditar(item) {
        const categorias = item.tipo === 'INGRESO' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO;
        const opcionesCat = categorias.map(c => `
            <option value="${c.id}" ${c.id === item.categoria ? 'selected' : ''}>${c.nombre}</option>
        `).join('');

        if (window.Swal) {
            const { value: formValues } = await Swal.fire({
                title: 'Editar rubro del presupuesto',
                background: '#12151c',
                color: '#fff',
                showCancelButton: true,
                confirmButtonColor: '#e5a93c',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Guardar cambios',
                cancelButtonText: 'Cancelar',
                html: `
                    <div style="display: flex; flex-direction: column; gap: 12px; text-align: left; font-size: 0.85rem; margin-top: 10px;">
                        <div>
                            <label style="color: #94a3b8; display: block; margin-bottom: 4px;">Categoría:</label>
                            <select id="swalEditCat" style="width: 100%; background: #090c12; color: #fff; border: 1px solid rgba(229,169,60,0.3); border-radius: 8px; padding: 8px;">
                                ${opcionesCat}
                            </select>
                        </div>
                        <div>
                            <label style="color: #94a3b8; display: block; margin-bottom: 4px;">Descripción / Concepto:</label>
                            <input id="swalEditDesc" type="text" value="${item.descripcion || ''}" style="width: 100%; background: #090c12; color: #fff; border: 1px solid rgba(229,169,60,0.3); border-radius: 8px; padding: 8px;" placeholder="Descripción">
                        </div>
                        <div>
                            <label style="color: #94a3b8; display: block; margin-bottom: 4px;">Monto presupuestado (COP):</label>
                            <input id="swalEditMonto" type="number" value="${item.monto}" min="1" style="width: 100%; background: #090c12; color: #fff; border: 1px solid rgba(229,169,60,0.3); border-radius: 8px; padding: 8px;">
                        </div>
                    </div>
                `,
                preConfirm: () => {
                    const cat = document.getElementById('swalEditCat').value;
                    const desc = document.getElementById('swalEditDesc').value;
                    const monto = Number(document.getElementById('swalEditMonto').value);

                    if (!monto || monto <= 0) {
                        Swal.showValidationMessage('El monto debe ser un valor válido mayor a 0');
                        return false;
                    }
                    return { categoria: cat, descripcion: desc, monto };
                }
            });

            if (formValues) {
                try {
                    actualizarItemPresupuesto(item.id, formValues);
                    renderizarPresupuestos();
                    Swal.fire({
                        icon: 'success',
                        title: 'Rubro Actualizado',
                        text: 'El ajuste se guardó correctamente.',
                        timer: 1400,
                        showConfirmButton: false,
                        background: '#12151c',
                        color: '#fff'
                    });
                } catch (e) {
                    Swal.fire({ icon: 'error', title: 'Error', text: e.message, background: '#12151c', color: '#fff' });
                }
            }
        } else {
            const nuevaDesc = prompt('Descripción / Concepto:', item.descripcion || '');
            if (nuevaDesc === null) return;
            const nuevoMonto = prompt('Monto presupuestado (COP):', item.monto);
            if (!nuevoMonto || isNaN(Number(nuevoMonto)) || Number(nuevoMonto) <= 0) return;
            actualizarItemPresupuesto(item.id, { descripcion: nuevaDesc, monto: Number(nuevoMonto) });
            renderizarPresupuestos();
        }
    }

    // Modal para confirmar eliminación
    async function confirmarEliminar(item) {
        if (window.Swal) {
            const res = await Swal.fire({
                title: '¿Eliminar este rubro?',
                text: `Se eliminará "${item.descripcion || item.categoria}" del presupuesto de este mes.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f87171',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                background: '#12151c',
                color: '#fff'
            });

            if (res.isConfirmed) {
                eliminarItemPresupuesto(item.id);
                renderizarPresupuestos();
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'El rubro fue removido de tu presupuesto.',
                    timer: 1400,
                    showConfirmButton: false,
                    background: '#12151c',
                    color: '#fff'
                });
            }
        } else {
            if (confirm(`¿Eliminar ${item.descripcion || item.categoria}?`)) {
                eliminarItemPresupuesto(item.id);
                renderizarPresupuestos();
            }
        }
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
