package transferencias;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Servicio encargado de la lógica de negocio de HU-28:
 * Retiro de dinero desde cuentas de Ahorros (con 1.5% de interés a favor),
 * Cuentas Corrientes (con sobregiro 20%) y Tarjetas de Crédito (avances 50%).
 */
public class ServicioRetiros {

    public static final double TASA_INTERES_AHORROS = 0.015; // 1.5% rendimiento

    public static class ResultadoRetiro {
        private final boolean exitoso;
        private final String mensaje;
        private final ComprobanteTransaccion comprobante;

        public ResultadoRetiro(boolean exitoso, String mensaje, ComprobanteTransaccion comprobante) {
            this.exitoso = exitoso;
            this.mensaje = mensaje;
            this.comprobante = comprobante;
        }

        public boolean isExitoso() { return exitoso; }
        public String getMensaje() { return mensaje; }
        public ComprobanteTransaccion getComprobante() { return comprobante; }
    }

    public static ResultadoRetiro retirar(
            Map<String, CuentaBancaria> cuentasRepo,
            List<MovimientoFinanciero> historialRepo,
            String numeroCuenta,
            double monto,
            String concepto) {

        if (cuentasRepo == null) {
            return new ResultadoRetiro(false, "El repositorio de cuentas no está disponible.", null);
        }

        String nCuenta = numeroCuenta != null ? numeroCuenta.replaceAll("\\D", "") : "";
        if (nCuenta.isEmpty() || !cuentasRepo.containsKey(nCuenta)) {
            return new ResultadoRetiro(false, "La cuenta o tarjeta seleccionada no existe.", null);
        }

        CuentaBancaria cuenta = cuentasRepo.get(nCuenta);

        if (cuenta.isBloqueada()) {
            return new ResultadoRetiro(false, "El producto financiero seleccionado se encuentra bloqueado.", null);
        }

        if (Double.isNaN(monto) || Double.isInfinite(monto) || monto <= 0.0) {
            return new ResultadoRetiro(false, "El monto a retirar debe ser mayor a cero.", null);
        }

        double disponible = cuenta.getDisponibleParaOperar();
        if (monto > disponible) {
            return new ResultadoRetiro(false, "El monto supera el disponible actual ($" + (long)disponible + " COP).", null);
        }

        double interesGenerado = 0.0;
        double saldoPosterior = 0.0;
        double cupoPosterior = 0.0;
        String tipoOp = "RETIRO";
        String cat = "Retiro";

        if ("AHORROS".equals(cuenta.getTipo())) {
            // Regla HU-28: 1.5% de rendimiento calculado sobre el monto retirado
            interesGenerado = Math.round(monto * TASA_INTERES_AHORROS);
            // saldo = saldo + interes - monto
            cuenta.acreditarSaldo(interesGenerado);
            cuenta.debitarSaldo(monto);
            saldoPosterior = cuenta.getSaldo();
        } else if ("CORRIENTE".equals(cuenta.getTipo())) {
            cuenta.debitarSaldo(monto);
            saldoPosterior = cuenta.getSaldo();
        } else if ("CREDITO".equals(cuenta.getTipo())) {
            // Avance de efectivo
            tipoOp = "AVANCE_CREDITO";
            cat = "Avance";
            cuenta.aumentarDeuda(monto);
            cupoPosterior = cuenta.getCupoDisponible();
        }

        String referencia = "RET-" + System.currentTimeMillis() + "-" + (1000 + new Random().nextInt(9000));
        LocalDateTime fechaHora = LocalDateTime.now();

        // Registro en HU-05 (Movimientos)
        if (historialRepo != null) {
            String desc = "Retiro de efectivo en cajero/corresponsal";
            if (interesGenerado > 0) {
                desc += " (+ Interés: $" + (long)interesGenerado + ")";
            }
            if (concepto != null && !concepto.trim().isEmpty()) {
                desc += " - " + concepto;
            }

            historialRepo.add(new MovimientoFinanciero(
                    "MOV-" + System.nanoTime(),
                    referencia,
                    cuenta.getNumero(),
                    tipoOp,
                    cat,
                    "DEBITO",
                    monto,
                    "CREDITO".equals(cuenta.getTipo()) ? cupoPosterior : saldoPosterior,
                    fechaHora,
                    desc
            ));
        }

        ComprobanteTransaccion comprobante = new ComprobanteTransaccion(
                "RETIRO DE EFECTIVO FINARA",
                referencia,
                fechaHora,
                cuenta.getTipo(),
                cuenta.getNumero(),
                "",
                "",
                cuenta.getTitular(),
                monto,
                interesGenerado,
                monto,
                saldoPosterior,
                cupoPosterior,
                concepto,
                "EXITOSA"
        );

        return new ResultadoRetiro(true, "Retiro procesado exitosamente.", comprobante);
    }
}

