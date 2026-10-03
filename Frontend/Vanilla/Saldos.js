document.addEventListener("DOMContentLoaded", () => {
    cargarCuentasYSaldos();
});

function cargarCuentasYSaldos() {
    const contenedor = document.getElementById("contenedor-cuentas");
    if (!contenedor) return;

    // Cuentas asociadas al cliente (Punto 1: Tipo, Número Parcial y Saldo)
    const cuentas = [
        { tipoCuenta: "Cuenta de Ahorros", numeroCuenta: "123456789012", saldo: 2500000.00 },
        { tipoCuenta: "Cuenta Corriente", numeroCuenta: "987654321098", saldo: 850000.50 }
    ];

    contenedor.innerHTML = "";

    cuentas.forEach(cuenta => {
        // Enmascaramiento de número parcial (ej. **** **** 9012)
        const ultimosCuatro = cuenta.numeroCuenta.slice(-4);
        const numeroParcial = `**** **** ${ultimosCuatro}`;

        // Formato de Moneda
        const saldoFormateado = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 2
        }).format(cuenta.saldo);

        const tarjetaHtml = `
            <div class="tarjeta-cuenta">
                <div class="encabezado-cuenta">
                    <span class="tipo-cuenta">${cuenta.tipoCuenta}</span>
                    <span class="numero-parcial">${numeroParcial}</span>
                </div>
                <div class="cuerpo-cuenta">
                    <span class="etiqueta-saldo">Saldo disponible</span>
                    <h2 class="monto-saldo">${saldoFormateado}</h2>
                </div>
            </div>
        `;
        contenedor.innerHTML += tarjetaHtml;
    });
}