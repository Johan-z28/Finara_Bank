// Vanilla/Prestamos.js
import { calcularCuotaPrestamo, evaluarViabilidadPrestamo, registrarSolicitudPrestamo, buscarPrestamoPorRadicado, pagarCuotaPrestamo, TASA_INTERES_MENSUAL } from './prestamosService.js';
import { obtenerUsuarioAutenticado, obtenerCuentas } from './cuentasService.js';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const formatearConPuntos = (val) => {
    const soloNumeros = String(val).replace(/\D/g, '');
    if (!soloNumeros) return '';
    return new Intl.NumberFormat('es-CO').format(Number(soloNumeros));
};

export async function initPrestamosView() {
    if (!document.getElementById('prestamos-css-theme')) {
        const link = document.createElement('link');
        link.id = 'prestamos-css-theme';
        link.rel = 'stylesheet';
        link.href = '../../Style/Prestamos.css';
        document.head.appendChild(link);
    }

    const usuarioActivo = obtenerUsuarioAutenticado();
    if (!usuarioActivo) {
        window.location.href = '../index.html';
        return;
    }

    // 1. GESTIÓN DE PESTAÑAS (TABS)
    const tabBtns = document.querySelectorAll('.prestamo-tab-btn');
    const tabContents = document.querySelectorAll('.prestamo-tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.style.display = 'none');

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).style.display = 'block';

            if (targetId === 'tab-dashboard') {
                renderizarDashboardCreditos();
            }
        });
    });

    // Cargar dashboard inicial
    renderizarDashboardCreditos();

    // 2. CONECTAR COMPARADOR CON SIMULADOR
    const btnsElegirComparativa = document.querySelectorAll('.btn-elegir-comparativa');
    btnsElegirComparativa.forEach(btn => {
        btn.addEventListener('click', () => {
            const tipo = btn.getAttribute('data-tipo');
            const selectTipo = document.getElementById('selectTipoCredito');
            if (selectTipo) {
                selectTipo.value = tipo;
                // Activar tab de solicitud
                document.querySelector('[data-tab="tab-solicitud"]').click();
                actualizarSimulacion();
            }
        });
    });

    // 3. SIMULADOR Y FORMULARIO
    const formPrestamo = document.getElementById('formPrestamo');
    const inputMonto = document.getElementById('prestamoMonto');
    const selectPlazo = document.getElementById('prestamoPlazo');
    const selectTipoCredito = document.getElementById('selectTipoCredito');
    const inputConcepto = document.getElementById('prestamoConcepto');

    const lblCuotaEstimada = document.getElementById('lblCuotaEstimada');
    const lblTotalPagar = document.getElementById('lblTotalPagar');
    const lblEstadoEval = document.getElementById('lblEstadoEval');
    const lblTasaAplicada = document.getElementById('lblTasaAplicada');

    const obtenerTasaActual = () => {
        const tipo = selectTipoCredito ? selectTipoCredito.value : 'libre';
        if (tipo === 'vehiculo') return { em: 0.0138, texto: '1.38% Mensual (18% E.A.)' };
        if (tipo === 'hipotecario') return { em: 0.0110, texto: '1.10% Mensual (14% E.A.)' };
        return { em: TASA_INTERES_MENSUAL, texto: '1.8% Mensual (24% E.A.)' };
    };

    const leerMonto = () => Number(String(inputMonto.value).replace(/\D/g, '')) || 0;

    const actualizarSimulacion = () => {
        const monto = leerMonto();
        const meses = Number(selectPlazo ? selectPlazo.value : 12);
        const tasaInfo = obtenerTasaActual();

        if (lblTasaAplicada) lblTasaAplicada.textContent = tasaInfo.texto;

        if (monto <= 0) {
            if (lblCuotaEstimada) lblCuotaEstimada.textContent = '$ 0';
            if (lblTotalPagar) lblTotalPagar.textContent = '$ 0';
            if (lblEstadoEval) {
                lblEstadoEval.textContent = 'Ingrese un monto válido';
                lblEstadoEval.style.color = '#94a3b8';
            }
            return;
        }

        const cuota = calcularCuotaPrestamo(monto, meses, tasaInfo.em);
        const totalPagar = cuota * meses;
        const evaluacion = evaluarViabilidadPrestamo(monto);

        if (lblCuotaEstimada) lblCuotaEstimada.textContent = formatoCOP.format(cuota);
        if (lblTotalPagar) lblTotalPagar.textContent = formatoCOP.format(totalPagar);
        if (lblEstadoEval) {
            lblEstadoEval.textContent = `${evaluacion.estado}: ${evaluacion.mensaje}`;
            lblEstadoEval.style.color = evaluacion.color;
        }
    };

    if (inputMonto) {
        inputMonto.addEventListener('input', () => {
            const val = leerMonto();
            inputMonto.value = val > 0 ? formatearConPuntos(val) : '';
            actualizarSimulacion();
        });
    }

    if (selectPlazo) selectPlazo.addEventListener('change', actualizarSimulacion);
    if (selectTipoCredito) selectTipoCredito.addEventListener('change', actualizarSimulacion);

    // Enviar solicitud de préstamo
    if (formPrestamo) {
        formPrestamo.addEventListener('submit', (e) => {
            e.preventDefault();
            const monto = leerMonto();
            const meses = Number(selectPlazo.value);
            const tipoId = selectTipoCredito.value;
            const concepto = inputConcepto ? inputConcepto.value.trim() : '';

            if (monto < 500000) {
                Swal.fire({ icon: 'warning', title: 'Monto mínimo', text: 'El valor mínimo es $ 500.000 COP.', background: '#12151c', color: '#fff', confirmButtonColor: '#e5a93c' });
                return;
            }

            const tasaInfo = obtenerTasaActual();
            const cuotaMensual = calcularCuotaPrestamo(monto, meses, tasaInfo.em);
            const evaluacion = evaluarViabilidadPrestamo(monto);

            if (evaluacion.estado === 'RECHAZADO') {
                Swal.fire({ icon: 'error', title: 'Solicitud No Viable', text: evaluacion.mensaje, background: '#12151c', color: '#fff', confirmButtonColor: '#e5a93c' });
                return;
            }

            const solicitudCreada = registrarSolicitudPrestamo({ monto, meses, cuotaMensual, estadoEvaluacion: evaluacion, concepto, tipoId });

            Swal.fire({
                icon: 'success',
                title: '¡Solicitud Registrada!',
                html: `
                    <div style="text-align: left; font-size: 0.9rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 14px; border-radius: 12px;">
                        <p><strong>Radicado:</strong> <span style="color: #e5a93c; font-family: monospace;">${solicitudCreada.radicado}</span></p>
                        <p><strong>Estado:</strong> <span style="color: ${evaluacion.color};">${solicitudCreada.estado}</span></p>
                        <p><strong>Cuota Mensual:</strong> ${formatoCOP.format(solicitudCreada.cuotaMensual)}</p>
                    </div>
                `,
                background: '#12151c',
                color: '#fff',
                confirmButtonColor: '#e5a93c'
            }).then(() => {
                formPrestamo.reset();
                actualizarSimulacion();
                document.querySelector('[data-tab="tab-dashboard"]').click();
            });
        });
    }

    // 4. CONSULTA POR RADICADO
    const btnConsultar = document.getElementById('btnConsultarRadicado');
    const inputRadicado = document.getElementById('inputBuscarRadicado');
    const boxResultadoRadicado = document.getElementById('resultadoRadicadoBox');

    if (btnConsultar && inputRadicado && boxResultadoRadicado) {
        btnConsultar.addEventListener('click', () => {
            const radVal = inputRadicado.value.trim();
            const encontrado = buscarPrestamoPorRadicado(radVal);

            if (!encontrado) {
                boxResultadoRadicado.innerHTML = `<p style="color: #f87171; text-align: center; margin: 1.5rem 0;">No se encontró ningún préstamo con el radicado: ${radVal}</p>`;
                return;
            }

            boxResultadoRadicado.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
                    <p style="margin:0;"><strong>Radicado:</strong> <span style="color: #e5a93c; font-family: monospace;">${encontrado.radicado}</span></p>
                    <p style="margin:0;"><strong>Concepto:</strong> ${encontrado.concepto}</p>
                    <p style="margin:0;"><strong>Monto Solicitado:</strong> ${formatoCOP.format(encontrado.monto)}</p>
                    <p style="margin:0;"><strong>Plazo:</strong> ${encontrado.meses} meses</p>
                    <p style="margin:0;"><strong>Cuota Mensual:</strong> ${formatoCOP.format(encontrado.cuotaMensual)}</p>
                    <p style="margin:0;"><strong>Estado Actual:</strong> <span style="color: #34d399; font-weight: bold;">${encontrado.estado}</span></p>
                    <p style="margin:0; font-size: 0.8rem; color: #94a3b8;">${encontrado.mensajeEstado}</p>
                </div>
            `;
        });
    }
}

// 5. RENDERIZAR DASHBOARD DE CRÉDITOS ACTIVOS Y PASARELA DE PAGO (HU-16)
function renderizarDashboardCreditos() {
    const contenedor = document.getElementById('dashboardCreditosList');
    if (!contenedor) return;

    let prestamos = [];
    try {
        prestamos = JSON.parse(localStorage.getItem('finara_prestamos')) || [];
    } catch {
        prestamos = [];
    }

    const activos = prestamos.filter(p => p.activo);

    if (activos.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align: center; padding: 2rem; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 10px;">No tienes créditos o préstamos activos en este momento.</p>
                <button type="button" class="btn-solicitar-prestamo" onclick="document.querySelector('[data-tab=\\'tab-solicitud\\']').click()" style="max-width: 220px; margin: 0 auto;">Simular un Préstamo</button>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = activos.map(p => {
        const cuotasRestantes = p.meses - p.cuotasPagadas;
        const saldoPendiente = cuotasRestantes * p.cuotaMensual;

        return `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.2rem; display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--text-white); font-size: 1.05rem;">${p.concepto}</strong>
                    <span style="font-family: monospace; color: var(--gold-main); font-size: 0.85rem;">${p.radicado}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; font-size: 0.85rem; color: var(--text-muted);">
                    <div>Monto Inicial: <strong style="color: #fff;">${formatoCOP.format(p.monto)}</strong></div>
                    <div>Cuota Mensual: <strong style="color: #e5a93c;">${formatoCOP.format(p.cuotaMensual)}</strong></div>
                    <div>Progreso: <strong style="color: #34d399;">${p.cuotasPagadas} / ${p.meses} cuotas</strong></div>
                    <div>Saldo Pendiente: <strong style="color: #fff;">${formatoCOP.format(saldoPendiente)}</strong></div>
                </div>
                <div style="display: flex; justify-content: flex-end; margin-top: 5px;">
                    <button type="button" class="btn-pagar-cuota-modal" data-radicado="${p.radicado}" style="background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.4); color: #34d399; padding: 8px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.85rem;">Pagar Cuota Mensual</button>
                </div>
            </div>
        `;
    }).join('');

    // Activar eventos de pago de cuota
    document.querySelectorAll('.btn-pagar-cuota-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const radicado = btn.getAttribute('data-radicado');
            abrirModalPagoCuota(radicado);
        });
    });
}

// MODAL DE SELECCIÓN DE CUENTA PARA PAGAR CUOTA (HU-16)
function abrirModalPagoCuota(radicado) {
    let prestamos = JSON.parse(localStorage.getItem('finara_prestamos')) || [];
    const prestamo = prestamos.find(p => p.radicado === radicado);
    if (!prestamo) return;

    const cuentas = obtenerCuentas() || [];

    Swal.fire({
        title: 'Pagar Cuota de Crédito',
        html: `
            <div style="text-align: left; font-size: 0.9rem; color: #cbd5e1; display: flex; flex-direction: column; gap: 12px;">
                <p style="margin:0;"><strong>Radicado:</strong> <span style="color: #e5a93c;">${prestamo.radicado}</span></p>
                <p style="margin:0;"><strong>Valor Cuota:</strong> <span style="color: #34d399; font-size: 1.1rem; font-weight: bold;">${formatoCOP.format(prestamo.cuotaMensual)}</span></p>
                <div class="prestamo-campo" style="margin-top: 8px;">
                    <label style="color: #94a3b8; font-size: 0.8rem;">Selecciona la cuenta de pago:</label>
                    <select id="selectCuentaPago" style="background: rgba(0,0,0,0.4); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; width: 100%;">
                        ${cuentas.map(c => `<option value="${c.id || c.numero}">${c.tipo || 'Cuenta'} - ${c.numero || c.id} (Saldo: ${formatoCOP.format(c.saldo)})</option>`).join('')}
                    </select>
                </div>
            </div>
        `,
        background: '#12151c',
        color: '#fff',
        showCancelButton: true,
        confirmButtonText: 'Confirmar y Pagar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e5a93c',
        cancelButtonColor: '#334155'
    }).then((result) => {
        if (result.isConfirmed) {
            const cuentaId = document.getElementById('selectCuentaPago').value;
            const resultadoPago = pagarCuotaPrestamo(radicado, cuentaId);

            if (!resultadoPago.success) {
                Swal.fire({ icon: 'error', title: 'Error en el Pago', text: resultadoPago.message, background: '#12151c', color: '#fff', confirmButtonColor: '#e5a93c' });
                return;
            }

            Swal.fire({
                icon: 'success',
                title: '¡Pago Exitoso!',
                text: 'La cuota ha sido debitada de tu cuenta y registrada en tus movimientos.',
                background: '#12151c',
                color: '#fff',
                confirmButtonColor: '#e5a93c'
            }).then(() => {
                renderizarDashboardCreditos();
            });
        }
    });
}