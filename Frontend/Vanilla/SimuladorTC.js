// Vanilla/SimuladorTC.js
import { calcularCuotaMensual, ejecutarCompraTarjetaCredito, obtenerTarjetaCreditoExclusiva } from './CreditoSimulador.js';

export function initSimuladorTCView() {
    const inputMonto = document.getElementById('tcMonto');
    const selectCuotas = document.getElementById('tcCuotas');
    const form = document.getElementById('formSimuladorTC');
    const lblCupoTCDisponible = document.getElementById('lblCupoTCDisponible');
    const lblSubTarjetaInfo = document.getElementById('lblSubTarjetaInfo');

    function actualizarCupoPantalla() {
        const tarjetaCredito = obtenerTarjetaCreditoExclusiva();
        
        let cupo = 3000000;
        let nombreTarjeta = "Tarjeta de Crédito (Gold)";
        let numeroRef = "•••• 2488";

        if (tarjetaCredito) {
            if (typeof tarjetaCredito.saldo === 'number') cupo = tarjetaCredito.saldo;
            else if (typeof tarjetaCredito.cupoDisponible === 'number') cupo = tarjetaCredito.cupoDisponible;
            else if (tarjetaCredito.cupoDisponible || tarjetaCredito.saldo) {
                const val = parseFloat(String(tarjetaCredito.cupoDisponible || tarjetaCredito.saldo).replace(/[^0-9.-]+/g, ""));
                if (!isNaN(val)) cupo = val;
            }

            if (tarjetaCredito.nombre || tarjetaCredito.tipo) {
                nombreTarjeta = tarjetaCredito.nombre || tarjetaCredito.tipo;
            }
            const numCompleto = String(tarjetaCredito.numero || tarjetaCredito.numeroTarjeta || "");
            if (numCompleto.length >= 4) {
                numeroRef = "•••• " + numCompleto.slice(-4);
            }
        }

        if (lblCupoTCDisponible) {
            lblCupoTCDisponible.textContent = "$ " + Math.round(cupo).toLocaleString("es-CO");
        }
        if (lblSubTarjetaInfo) {
            lblSubTarjetaInfo.textContent = `${nombreTarjeta} · ${numeroRef}`;
        }
    }

    function obtenerMontoNumerico() {
        if (!inputMonto) return 0;
        // Limpia los puntos de miles antes de operar matemáticamente
        const valorLimpio = inputMonto.value.replace(/\./g, '').replace(/[^0-9.-]+/g, "");
        return parseFloat(valorLimpio) || 0;
    }

    function actualizarCalculo() {
        if (!inputMonto || !selectCuotas) return;

        const monto = obtenerMontoNumerico();
        const cuotas = parseInt(selectCuotas.value, 10) || 1;

        const res = calcularCuotaMensual(monto, cuotas);

        const lblTasa = document.getElementById('lblTasa');
        const lblCuotaMensual = document.getElementById('lblCuotaMensual');
        const lblTotalIntereses = document.getElementById('lblTotalIntereses');
        const lblTotalPagar = document.getElementById('lblTotalPagar');

        if (lblTasa) lblTasa.textContent = res.tasaMensualPorcentaje + "% mensual";
        if (lblCuotaMensual) lblCuotaMensual.textContent = "$ " + Math.round(res.cuotaMensual).toLocaleString("es-CO");
        if (lblTotalIntereses) lblTotalIntereses.textContent = "$ " + Math.round(res.interesesTotales).toLocaleString("es-CO");
        if (lblTotalPagar) lblTotalPagar.textContent = "$ " + Math.round(res.totalPagar).toLocaleString("es-CO");
    }

    if (inputMonto) {
        inputMonto.addEventListener('input', () => {
            let valorLimpio = inputMonto.value.replace(/\D/g, "");
            if (valorLimpio) {
                inputMonto.value = parseInt(valorLimpio, 10).toLocaleString("es-CO");
            } else {
                inputMonto.value = "";
            }
            actualizarCalculo();
        });
    }

    if (selectCuotas) {
        selectCuotas.addEventListener('change', actualizarCalculo);
    }

    actualizarCupoPantalla();
    actualizarCalculo();

    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();

            const establecimiento = document.getElementById('tcEstablecimiento').value;
            const montoNum = obtenerMontoNumerico();
            const cuotas = selectCuotas.value;

            const tarjetaCredito = obtenerTarjetaCreditoExclusiva();

            if (!tarjetaCredito) {
                if (window.Swal) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Sin Tarjeta de Crédito',
                        text: 'No se encontró una Tarjeta de Crédito activa en tus productos.',
                        background: '#12151c',
                        color: '#fff',
                        confirmButtonColor: '#e5a93c'
                    });
                } else {
                    alert('No se encontró una Tarjeta de Crédito activa.');
                }
                return;
            }

            const resultado = ejecutarCompraTarjetaCredito({
                numeroTarjeta: tarjetaCredito.numero || tarjetaCredito.numeroTarjeta,
                establecimiento,
                monto: montoNum,
                cuotas
            });

            if (resultado.exito) {
                if (window.Swal) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Compra Procesada Con Éxito!',
                        html: `
                            <p style="color: #cbd5e1;">Tu transacción en <b>${establecimiento}</b> se realizó con éxito.</p>
                            <div style="background: rgba(229,169,60,0.1); border: 1px dashed rgba(229,169,60,0.3); padding: 1rem; border-radius: 10px; margin-top: 10px; text-align: left;">
                                <p style="margin: 4px 0; color: #fff;"><b>Monto:</b> $ ${montoNum.toLocaleString("es-CO")}</p>
                                <p style="margin: 4px 0; color: #fff;"><b>Plazo:</b> ${cuotas} cuota(s)</p>
                                <p style="margin: 4px 0; color: #e5a93c;"><b>Cuota Mensual:</b> $ ${Math.round(resultado.calculo.cuotaMensual).toLocaleString("es-CO")}</p>
                                <p style="margin: 4px 0; color: #34d399;"><b>Nuevo Cupo Crédito:</b> $ ${Math.round(resultado.nuevoCupo).toLocaleString("es-CO")}</p>
                            </div>
                        `,
                        background: '#12151c',
                        color: '#fff',
                        confirmButtonColor: '#e5a93c'
                    }).then(() => {
                        form.reset();
                        actualizarCupoPantalla();
                        actualizarCalculo();
                    });
                } else {
                    alert(`¡Compra procesada con éxito! Nuevo cupo: $ ${Math.round(resultado.nuevoCupo).toLocaleString("es-CO")}`);
                    form.reset();
                    actualizarCupoPantalla();
                    actualizarCalculo();
                }
            } else {
                if (window.Swal) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error en Transacción',
                        text: resultado.mensaje,
                        background: '#12151c',
                        color: '#fff',
                        confirmButtonColor: '#ef4444'
                    });
                } else {
                    alert(resultado.mensaje);
                }
            }
        };
    }
}