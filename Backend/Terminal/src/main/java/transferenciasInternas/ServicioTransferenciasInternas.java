package transferenciasInternas;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;

/**
 * Servicio encargado de la lógica transaccional de transferencias internas entre cuentas Finara (HU-06).
 */
public class ServicioTransferenciasInternas {

    public static final double COMISION_INTERNA = 0.0;
    public static final double SOBREGIRO_CORRIENTE = 0.20;
    public static final double TOPE_AVANCE_CREDITO = 0.50;

    public static class ResultadoValidacion {
        private final boolean valido;
        private final String mensajeError;
        private final double monto;
        private final double comision;
        private final double totalDebitar;
        private final double disponible;

        public ResultadoValidacion(boolean valido, String mensajeError, double monto, double comision, double totalDebitar, double disponible) {
            this.valido = valido;
            this.mensajeError = mensajeError;
            this.monto = monto;
            this.comision = comision;
            this.totalDebitar = totalDebitar;
            this.disponible = disponible;
        }

        public boolean isValido() { return valido; }
        public String getMensajeError() { return mensajeError; }
        public double getMonto() { return monto; }
        public double getComision() { return comision; }
        public double getTotalDebitar() { return totalDebitar; }
        public double getDisponible() { return disponible; }
    }

    public static double calcularDisponible(Map<String, String> cuenta) {
        if (cuenta == null) return 0.0;
        String tipo = cuenta.getOrDefault("tipo", "AHORROS").toUpperCase();

        if (tipo.contains("CREDITO") || tipo.contains("CRÉDITO")) {
            double cupo = parsearDouble(cuenta.getOrDefault("cupoDisponible", cuenta.getOrDefault("saldo", "0")));
            return Math.max(0.0, Math.floor(cupo * TOPE_AVANCE_CREDITO));
        }

        double saldo = parsearDouble(cuenta.getOrDefault("saldo", "0"));
        if (tipo.contains("CORRIENTE")) {
            double sobregiro = Math.max(0.0, saldo * SOBREGIRO_CORRIENTE);
            return Math.max(0.0, saldo + sobregiro);
        }

        return Math.max(0.0, saldo);
    }

    public static ResultadoValidacion validarTransferencia(Map<String, String> origen, Map<String, String> destino, double monto) {
        if (origen == null) {
            return new ResultadoValidacion(false, "Debe seleccionar una cuenta de origen válida.", 0, 0, 0, 0);
        }
        if (destino == null) {
            return new ResultadoValidacion(false, "Debe seleccionar una cuenta de destino válida.", 0, 0, 0, 0);
        }

        String numOrigen = origen.getOrDefault("numero", "").replaceAll("\\D", "");
        String numDestino = destino.getOrDefault("numero", "").replaceAll("\\D", "");

        if (numOrigen.isEmpty()) {
            return new ResultadoValidacion(false, "El número de cuenta de origen no es válido.", 0, 0, 0, 0);
        }
        if (numDestino.isEmpty()) {
            return new ResultadoValidacion(false, "El número de cuenta de destino no es válido.", 0, 0, 0, 0);
        }

        if (numOrigen.equals(numDestino)) {
            return new ResultadoValidacion(false, "No se puede transferir a la misma cuenta de origen.", 0, 0, 0, 0);
        }

        boolean origBloq = Boolean.parseBoolean(origen.getOrDefault("bloqueada", "false"))
                || "BLOQUEADA".equalsIgnoreCase(origen.getOrDefault("estado", "ACTIVA"));
        if (origBloq) {
            return new ResultadoValidacion(false, "La cuenta de origen se encuentra bloqueada temporalmente.", 0, 0, 0, 0);
        }

        boolean destBloq = Boolean.parseBoolean(destino.getOrDefault("bloqueada", "false"))
                || "BLOQUEADA".equalsIgnoreCase(destino.getOrDefault("estado", "ACTIVA"));
        if (destBloq) {
            return new ResultadoValidacion(false, "La cuenta de destino se encuentra bloqueada. No puede recibir fondos.", 0, 0, 0, 0);
        }

        if (Double.isNaN(monto) || Double.isInfinite(monto) || monto <= 0.0) {
            return new ResultadoValidacion(false, "El monto a transferir debe ser mayor a cero.", 0, 0, 0, 0);
        }

        double disponible = calcularDisponible(origen);
        double comision = COMISION_INTERNA;
        double totalDebitar = monto + comision;

        if (totalDebitar > disponible) {
            return new ResultadoValidacion(false,
                    "Saldo insuficiente. Disponible: $" + (long)disponible + " COP.",
                    monto, comision, totalDebitar, disponible);
        }

        return new ResultadoValidacion(true, "Transferencia válida.", monto, comision, totalDebitar, disponible);
    }

    public static ComprobanteTransferenciaInterna procesarTransferencia(
            Map<String, String> origen, Map<String, String> destino, double monto, String concepto) throws Exception {

        ResultadoValidacion val = validarTransferencia(origen, destino, monto);
        if (!val.isValido()) {
            throw new IllegalArgumentException(val.getMensajeError());
        }

        double saldoActualOrigen = parsearDouble(origen.getOrDefault("saldo", "0"));
        double nuevoSaldoOrigen = saldoActualOrigen - val.getTotalDebitar();

        double saldoActualDestino = parsearDouble(destino.getOrDefault("saldo", "0"));
        double nuevoSaldoDestino = saldoActualDestino + monto;

        // Atomicidad: Débito en origen y Crédito en destino
        origen.put("saldo", String.valueOf((long) nuevoSaldoOrigen));
        destino.put("saldo", String.valueOf((long) nuevoSaldoDestino));

        String ref = "TRF-INT-" + System.currentTimeMillis() + "-" + (1000 + new Random().nextInt(9000));
        LocalDateTime fechaHora = LocalDateTime.now();

        return new ComprobanteTransferenciaInterna(
                ref,
                fechaHora,
                origen.getOrDefault("tipo", "Cuenta de Ahorros"),
                origen.getOrDefault("numero", "0000"),
                origen.getOrDefault("titular", "Cliente Finara"),
                destino.getOrDefault("tipo", "Cuenta de Ahorros"),
                destino.getOrDefault("numero", "0000"),
                destino.getOrDefault("titular", "Beneficiario Finara"),
                monto,
                val.getComision(),
                val.getTotalDebitar(),
                nuevoSaldoOrigen,
                concepto,
                "EXITOSA"
        );
    }

    private static double parsearDouble(String str) {
        if (str == null) return 0.0;
        try {
            return Double.parseDouble(str.replaceAll("[^0-9.-]", ""));
        } catch (Exception e) {
            return 0.0;
        }
    }
}
