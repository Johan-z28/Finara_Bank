// Frontend/Vanilla/Beneficios.js
// Controlador para HU-08: Registrar y gestionar beneficiarios
// Maneja formulario, validaciones en tiempo real, guardado en localStorage,
// renderizado de cuadrícula, métricas, búsqueda, filtros y eliminación.

import { initGlobalComponents } from './Global/app.js';
import { initCampanaNotificaciones } from './notificaciones.js';
import {
    obtenerBeneficiariosUsuario,
    validarDatosBeneficiario,
    registrarBeneficiario,
    eliminarBeneficiario
} from './beneficiariosService.js';

document.addEventListener('DOMContentLoaded', () => {
    initGlobalComponents();
    initCampanaNotificaciones();

    // Elementos del DOM
    const $ = id => document.getElementById(id);
    const modal = $('modalBeneficiario');
    const btnAbrirModal = $('btnAbrirModalNuevo');
    const btnCerrarModal = $('btnCerrarModal');
    const btnCancelarModal = $('btnCancelarModal');
    const form = $('formBeneficiario');

    const inputNombre = $('benNombre');
    const selectTipoDoc = $('benTipoDocumento');
    const inputNumeroDoc = $('benNumeroDocumento');
    const selectBanco = $('benBanco');
    const selectTipoCta = $('benTipoCuenta');
    const inputNumeroCta = $('benNumeroCuenta');
    const inputAlias = $('benAlias');
    const inputEmail = $('benEmail');
    const inputTelefono = $('benTelefono');

    const inputBuscar = $('inputBuscarBeneficiario');
    const selectFiltroBanco = $('selectFiltroBanco');
    const contenedorBeneficiarios = $('contenedorBeneficiarios');

    const statTotal = $('statTotalBeneficiarios');
    const statFinara = $('statCuentasFinara');
    const statOtros = $('statOtrosBancos');

    // Elementos del Modal de Eliminación (HU-09)
    const modalEliminar = $('modalConfirmarEliminar');
    const btnCerrarModalEliminar = $('btnCerrarModalEliminar');
    const btnCancelarEliminacion = $('btnCancelarEliminacion');
    const btnConfirmarEliminacionFinal = $('btnConfirmarEliminacionFinal');
    const datosBeneficiarioAEliminar = $('datosBeneficiarioAEliminar');
    const selectTipoBorrado = $('selectTipoBorrado');
    const inputMotivoEliminacion = $('inputMotivoEliminacion');

    let beneficiarios = [];
    let beneficiarioSeleccionadoParaEliminar = null;

    // ---------- 1. Cargar y renderizar datos ----------
    function recargarBeneficiarios() {
        beneficiarios = obtenerBeneficiariosUsuario();
        actualizarEstadisticas();
        renderizarLista();
    }

    function actualizarEstadisticas() {
        if (statTotal) statTotal.textContent = beneficiarios.length;
        const cuentasFinara = beneficiarios.filter(b => b.banco === 'Finara Bank').length;
        if (statFinara) statFinara.textContent = cuentasFinara;
        if (statOtros) statOtros.textContent = beneficiarios.length - cuentasFinara;
    }

    function renderizarLista() {
        const textoBusqueda = (inputBuscar?.value || '').trim().toLowerCase();
        const filtroBanco = selectFiltroBanco?.value || 'TODOS';

        const filtrados = beneficiarios.filter(b => {
            const matchTexto = !textoBusqueda ||
                b.nombre.toLowerCase().includes(textoBusqueda) ||
                (b.alias && b.alias.toLowerCase().includes(textoBusqueda)) ||
                b.numeroDocumento.includes(textoBusqueda) ||
                b.numeroCuenta.includes(textoBusqueda) ||
                b.banco.toLowerCase().includes(textoBusqueda);

            let matchBanco = true;
            if (filtroBanco === 'OTROS') {
                const bancosTop = ['Finara Bank', 'Bancolombia', 'Davivienda', 'Banco de Bogotá', 'Nequi', 'Daviplata'];
                matchBanco = !bancosTop.includes(b.banco);
            } else if (filtroBanco !== 'TODOS') {
                matchBanco = b.banco === filtroBanco;
            }

            return matchTexto && matchBanco;
        });

        if (filtrados.length === 0) {
            contenedorBeneficiarios.innerHTML = `
                <div class="ben-vacio">
                    <div class="ben-vacio-icon">
                        <i class="fa-solid fa-user-group"></i>
                    </div>
                    <h3>${beneficiarios.length === 0 ? 'Aún no tienes beneficiarios inscritos' : 'No se encontraron coincidencias'}</h3>
                    <p>${beneficiarios.length === 0 ? 'Inscribe a tus amigos, familiares o proveedores para realizar transferencias de forma más rápida.' : 'Intenta cambiar el criterio de búsqueda o el filtro de banco.'}</p>
                    ${beneficiarios.length === 0 ? `
                        <button type="button" class="ben-btn ben-btn--primary" id="btnCrearPrimero">
                            <i class="fa-solid fa-plus"></i> Inscribir Mi Primer Beneficiario
                        </button>
                    ` : ''}
                </div>
            `;

            const btnPrimero = document.getElementById('btnCrearPrimero');
            if (btnPrimero) {
                btnPrimero.addEventListener('click', abrirModal);
            }
            return;
        }

        contenedorBeneficiarios.innerHTML = filtrados.map(b => {
            const ultimos4 = b.numeroCuenta.slice(-4);
            const iniciales = b.nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
            const esFinara = b.banco === 'Finara Bank';
            const badgeBanco = esFinara 
                ? `<span class="ben-item-badge" style="background: rgba(229,169,60,0.15); color: #e5a93c; border-color: rgba(229,169,60,0.3);"><i class="fa-solid fa-bolt"></i> Finara</span>`
                : `<span class="ben-item-badge">${b.banco}</span>`;

            return `
                <div class="ben-item-card" data-id="${b.id}">
                    <div class="ben-item-top">
                        <div class="ben-item-avatar">${iniciales}</div>
                        ${badgeBanco}
                    </div>

                    <div>
                        <strong class="ben-item-nombre" title="${b.nombre}">${b.nombre}</strong>
                        <span class="ben-item-alias">${b.alias ? `"${b.alias}"` : 'Beneficiario'}</span>
                    </div>

                    <div class="ben-item-detalles">
                        <div class="ben-detalle-fila">
                            <span>Banco:</span>
                            <strong>${b.banco}</strong>
                        </div>
                        <div class="ben-detalle-fila">
                            <span>Tipo y Cuenta:</span>
                            <strong>${b.tipoCuenta === 'AHORROS' ? 'Ahorros' : 'Corriente'} •••• ${ultimos4}</strong>
                        </div>
                        <div class="ben-detalle-fila">
                            <span>Documento:</span>
                            <strong>${b.tipoDocumento} ${b.numeroDocumento}</strong>
                        </div>
                        ${b.email ? `
                            <div class="ben-detalle-fila">
                                <span>Correo:</span>
                                <strong>${b.email}</strong>
                            </div>
                        ` : ''}
                    </div>

                    <div class="ben-item-acciones">
                        <a href="Transferencias.html" class="ben-btn ben-btn--transferir" title="Transferir a este beneficiario">
                            <i class="fa-solid fa-paper-plane"></i> Transferir
                        </a>
                        <button type="button" class="ben-btn ben-btn--danger btn-eliminar-ben" data-id="${b.id}" data-nombre="${b.nombre}" title="Eliminar beneficiario">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Eventos para botones de eliminar
        contenedorBeneficiarios.querySelectorAll('.btn-eliminar-ben').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                abrirModalEliminar(id);
            });
        });
    }

    // ---------- 2. Modal y Formulario ----------
    function abrirModal() {
        if (form) form.reset();
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
        if (inputNombre) inputNombre.focus();
    }

    function cerrarModal() {
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }

    if (btnAbrirModal) btnAbrirModal.addEventListener('click', abrirModal);
    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModal);
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModal);

    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target === modal) cerrarModal();
        });
    }

    // Validación numérica en inputs de documento y cuenta
    [inputNumeroDoc, inputNumeroCta, inputTelefono].forEach(inp => {
        if (inp) {
            inp.addEventListener('input', () => {
                inp.value = inp.value.replace(/\D/g, '');
            });
        }
    });

    // Envío del formulario
    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();

            const datos = {
                nombre: inputNombre.value.trim(),
                tipoDocumento: selectTipoDoc.value,
                numeroDocumento: inputNumeroDoc.value.trim(),
                banco: selectBanco.value,
                tipoCuenta: selectTipoCta.value,
                numeroCuenta: inputNumeroCta.value.trim(),
                alias: inputAlias.value.trim(),
                email: inputEmail.value.trim(),
                telefono: inputTelefono.value.trim()
            };

            const validacion = validarDatosBeneficiario(datos);
            if (!validacion.ok) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Dato inválido',
                    text: validacion.mensaje,
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

            const btnSubmit = $('btnGuardarBeneficiario');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
            }

            try {
                const nuevo = await registrarBeneficiario(datos);
                cerrarModal();
                recargarBeneficiarios();

                Swal.fire({
                    icon: 'success',
                    title: '¡Beneficiario Inscrito!',
                    html: `Has inscrito exitosamente a <strong>${nuevo.nombre}</strong> con cuenta en <strong>${nuevo.banco}</strong>. Ya puedes enviarle dinero fácilmente.`,
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al registrar',
                    text: err.message,
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Beneficiario';
                }
            }
        });
    }

    // ---------- 3. Modal de Confirmación de Eliminación (HU-09) ----------
    function abrirModalEliminar(id) {
        const b = beneficiarios.find(item => item.id === id);
        if (!b) return;

        beneficiarioSeleccionadoParaEliminar = b;
        if (datosBeneficiarioAEliminar) {
            datosBeneficiarioAEliminar.innerHTML = `
                <strong>${b.nombre} ${b.alias ? `("${b.alias}")` : ''}</strong>
                <span>${b.banco} · ${b.tipoCuenta === 'AHORROS' ? 'Cuenta de Ahorros' : 'Cuenta Corriente'} •••• ${b.numeroCuenta.slice(-4)}</span>
                <span>Documento: ${b.tipoDocumento} ${b.numeroDocumento}</span>
            `;
        }

        if (inputMotivoEliminacion) inputMotivoEliminacion.value = '';
        if (selectTipoBorrado) selectTipoBorrado.value = 'LOGICO';

        if (modalEliminar) {
            modalEliminar.classList.remove('hidden');
            modalEliminar.style.display = 'flex';
        }
    }

    function cerrarModalEliminar() {
        if (modalEliminar) {
            modalEliminar.classList.add('hidden');
            modalEliminar.style.display = 'none';
        }
        beneficiarioSeleccionadoParaEliminar = null;
    }

    if (btnCerrarModalEliminar) btnCerrarModalEliminar.addEventListener('click', cerrarModalEliminar);
    if (btnCancelarEliminacion) btnCancelarEliminacion.addEventListener('click', cerrarModalEliminar);

    if (modalEliminar) {
        modalEliminar.addEventListener('click', e => {
            if (e.target === modalEliminar) cerrarModalEliminar();
        });
    }

    if (btnConfirmarEliminacionFinal) {
        btnConfirmarEliminacionFinal.addEventListener('click', () => {
            if (!beneficiarioSeleccionadoParaEliminar) return;

            const id = beneficiarioSeleccionadoParaEliminar.id;
            const nombre = beneficiarioSeleccionadoParaEliminar.nombre;
            const tipoBorrado = selectTipoBorrado?.value || 'LOGICO';
            const motivo = inputMotivoEliminacion?.value?.trim() || 'Eliminado voluntariamente desde la interfaz';

            try {
                eliminarBeneficiario(id, { tipoBorrado, motivo });
                cerrarModalEliminar();
                recargarBeneficiarios();

                Swal.fire({
                    icon: 'success',
                    title: 'Beneficiario Eliminado',
                    html: `Se ha ${tipoBorrado === 'LOGICO' ? 'desactivado' : 'eliminado permanentemente'} a <strong>${nombre}</strong>.<br><small style="color: #94a3b8;">La acción quedó registrada en el log de auditoría del sistema.</small>`,
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: err.message,
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
            }
        });
    }

    // ---------- 4. Filtros y Búsqueda reactiva ----------
    if (inputBuscar) inputBuscar.addEventListener('input', renderizarLista);
    if (selectFiltroBanco) selectFiltroBanco.addEventListener('change', renderizarLista);

    // Inicialización
    recargarBeneficiarios();
});