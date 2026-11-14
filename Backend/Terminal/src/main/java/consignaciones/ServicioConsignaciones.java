package consignaciones;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;
import core.RepositorioMovimientos;

import java.util.Map;
import java.util.UUID;

/**
 * Servicio para procesar consignaciones a cuentas de ahorros/corriente
 * y abonos/pagos a deuda de tarjetas de crédito.
 */
public class ServicioConsignaciones {

    public static class ResultadoConsignacion {
        private final boolean exito;
        private final String mensaje;
        private final String referencia;
        private final double nuevoSaldoODeuda;

        public ResultadoConsignacion(boolean exito, String mensaje, String referencia, double nuevoSaldoODeuda) {
            this.exito = exito;
            this.mensaje = mensaje;
            this.referencia = referencia;
            this.nuevoSaldoODeuda = nuevoSaldoODeuda;
        }

        public boolean isExito() { return exito; }
        public String getMensaje() { return mensaje; }
        public String getReferencia() { return referencia; }
        public double getNuevoSaldoODeuda() { return nuevoSaldoODeuda; }
    }

    public static ResultadoConsignacion procesarConsignacion(
            String correo,
            Map<String, String> cuentaDestino,
            double monto,
            String descripcion) {

        if (cuentaDestino == null) {
            return new ResultadoConsignacion(false, "Debe seleccionar una cuenta válida.", "", 0);
        }
        if (RepositorioCuentas.esBloqueada(cuentaDestino)) {
            return new ResultadoConsignacion(false, "El producto seleccionado se encuentra bloqueado.", "", 0);
        }
        if (monto <= 0) {
            return new ResultadoConsignacion(false, "El monto de la consignación debe ser mayor a $0.", "", 0);
        }

        String tipo = cuentaDestino.getOrDefault("tipo", "AHORROS").toUpperCase();
        String numero = cuentaDestino.getOrDefault("numero", "");
        String ref = "DEP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        BaseDatosFinara db = BaseDatosFinara.getInstancia();
        RepositorioMovimientos movs = db.getRepositorioMovimientos();

        if ("CREDITO".equals(tipo)) {
            double deudaActual = RepositorioCuentas.parsearNumero(cuentaDestino.get("deudaActual"));
            double cupoMax = RepositorioCuentas.parsearNumero(cuentaDestino.get("cupoMaximo"));
            double cupoDisp = RepositorioCuentas.parsearNumero(cuentaDestino.get("cupoDisponible"));

            if (deudaActual <= 0) {
                return new ResultadoConsignacion(false, "La tarjeta de crédito no tiene deuda pendiente para abonar.", "", 0);
            }
            if (monto > deudaActual) {
                return new ResultadoConsignacion(false,
                        "El monto (" + Consola.formatoCOP(monto) + ") excede la deuda actual de la tarjeta ("
                                + Consola.formatoCOP(deudaActual) + ").", "", deudaActual);
            }

            double nuevaDeuda = Math.max(0.0, deudaActual - monto);
            double nuevoCupo = Math.min(cupoMax, cupoDisp + monto);
            cuentaDestino.put("deudaActual", String.format(java.util.Locale.US, "%.2f", nuevaDeuda));
            cuentaDestino.put("cupoDisponible", String.format(java.util.Locale.US, "%.2f", nuevoCupo));

            String descFinal = (descripcion != null && !descripcion.isEmpty())
                    ? descripcion
                    : "Pago a deuda Tarjeta de Crédito " + Consola.enmascararCuenta(numero);

            movs.registrarMovimiento(correo, ref, numero, "Tarjeta de Crédito", "Pago Tarjeta", "EGRESO", monto, nuevoCupo, descFinal);
            BaseDatosFinara.guardar();
            return new ResultadoConsignacion(true, "Pago aplicado correctamente a su tarjeta de crédito.", ref, nuevaDeuda);
        } else {
            double saldoActual = RepositorioCuentas.parsearNumero(cuentaDestino.get("saldo"));
            double nuevoSaldo = saldoActual + monto;
            RepositorioCuentas.actualizarSaldo(cuentaDestino, nuevoSaldo);

            String tipoNombre = "CORRIENTE".equals(tipo) ? "Corriente" : "Ahorros";
            String descFinal = (descripcion != null && !descripcion.isEmpty())
                    ? descripcion
                    : "Consignación en efectivo / canal digital a " + tipoNombre;

            movs.registrarMovimiento(correo, ref, numero, tipoNombre, "Depósito", "INGRESO", monto, nuevoSaldo, descFinal);
            BaseDatosFinara.guardar();
            return new ResultadoConsignacion(true, "Consignación acreditada exitosamente.", ref, nuevoSaldo);
        }
    }
}
