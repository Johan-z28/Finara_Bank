// Vanilla/Prestamos.js
import { calcularCuotaPrestamo, evaluarViabilidadPrestamo, registrarSolicitudPrestamo } from './prestamosService.js';
import { obtenerUsuarioAutenticado } from './cuentasService.js';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const formatearConPuntos = (val) => {
    const soloNumeros = String(val).replace(/\D/g, '');
    if (!soloNumeros) return '';
    return new Intl.NumberFormat('es-CO').format(Number(soloNumeros));
};

export async function initPrestamosView() {
    // Inyectar CSS específico si no está presente en el head
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

    const formPrestamo = document.getElementById('formPrestamo');
    const inputMonto = document.getElementById('prestamoMonto');
    const selectPlazo = document.getElementById('prestamoPlazo');
    const inputConcepto = document.getElementById('prestamoConcepto');

    const lblCuotaEstimada = document.getElementById('lblCuotaEstimada');
    const lblTotalPagar = document.getElementById('lblTotalPagar');
    const lblEstadoEval = document.getElementById('lblEstadoEval');

    if (!formPrestamo || !inputMonto) return;

    const leerMonto = () => Number(String(inputMonto.value).replace(/\D/g, '')) || 0;

    const actualizarSimulacion = () => {
        const monto = leerMonto();
        const meses = Number(selectPlazo ? selectPlazo.value : 12);

        if (monto <= 0) {
            if (lblCuotaEstimada) lblCuotaEstimada.textContent = '$ 0';
            if (lblTotalPagar) lblTotalPagar.textContent = '$ 0';
            if (lblEstadoEval) lblEstadoEval.textContent = 'Ingrese un monto válido';
            return;
        }

        const cuota = calcularCuotaPrestamo(monto, meses);
        const totalPagar = cuota * meses;
        const evaluacion = evaluarViabilidadPrestamo(monto, usuarioActivo.saldo || 5000000);

        if (lblCuotaEstimada) lblCuotaEstimada.textContent = formatoCOP.format(cuota);
        if (lblTotalPagar) lblTotalPagar.textContent = formatoCOP.format(totalPagar);
        if (lblEstadoEval) {
            lblEstadoEval.textContent = `${evaluacion.estado}: ${evaluacion.mensaje}`;
            lblEstadoEval.style.color = evaluacion.estado === 'RECHAZADO' ? '#f87171' : '#34d399';
        }
    };

    inputMonto.addEventListener('input', () => {
        const val = leerMonto();
        inputMonto.value = val > 0 ? formatearConPuntos(val) : '';
        actualizarSimulacion();
    });

    if (selectPlazo) {
        selectPlazo.addEventListener('change', actualizarSimulacion);
    }

    formPrestamo.addEventListener('submit', (e) => {
        e.preventDefault();
        const monto = leerMonto();
        const meses = Number(selectPlazo.value);
        const concepto = inputConcepto ? inputConcepto.value.trim() : '';

        if (monto < 500000) {
            Swal.fire({
                icon: 'warning',
                title: 'Monto mínimo',
                text: 'El valor mínimo para solicitar un préstamo es de $ 500.000 COP.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
            return;
        }

        const cuotaMensual = calcularCuotaPrestamo(monto, meses);
        const evaluacion = evaluarViabilidadPrestamo(monto, usuarioActivo.saldo || 5000000);

        if (evaluacion.estado === 'RECHAZADO') {
            Swal.fire({
                icon: 'error',
                title: 'Solicitud No Viable',
                text: evaluacion.mensaje,
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
            return;
        }

        const solicitudCreada = registrarSolicitudPrestamo({
            monto,
            meses,
            cuotaMensual,
            estadoEvaluacion: evaluacion,
            concepto
        });

        Swal.fire({
            icon: 'success',
            title: '¡Solicitud Registrada!',
            html: `
                <div style="text-align: left; font-size: 0.9rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 14px; border-radius: 12px;">
                    <p style="margin: 4px 0;"><strong>Radicado:</strong> <span style="color: #e5a93c; font-family: monospace;">${solicitudCreada.radicado}</span></p>
                    <p style="margin: 4px 0;"><strong>Estado:</strong> <span style="color: #34d399;">${solicitudCreada.estado}</span></p>
                    <p style="margin: 4px 0;"><strong>Cuota Mensual:</strong> ${formatoCOP.format(solicitudCreada.cuotaMensual)}</p>
                </div>
            `,
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c',
            confirmButtonText: 'Aceptar'
        }).then(() => {
            formPrestamo.reset();
            actualizarSimulacion();
        });
    });
}