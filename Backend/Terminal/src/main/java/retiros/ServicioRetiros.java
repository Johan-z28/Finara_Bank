package retiros;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;

/**
 * Servicio encargado de la lógica financiera de la HU-28:
 * - Liquidación y aplicación de retiros según tipo de producto.
 * - Rendimiento 1.5% mensual sobre el monto retirado en Cuentas de Ahorros.
 * - Sobregiro del 20% en Cuentas Corrientes.
 * - Tope de avance del 50% en Tarjetas de Crédito.
 */
public class ServicioRetiros {

    public static final double TASA_INTERES_AHORROS = 0.015; // 1.5% mensual
    public static final double TOPE_SOBREGIRO_CORRIENTE = 0.20; // 20% sobregiro
    public static final double TOPE_AVANCE_CREDITO = 0.50; // Hasta 50% de cupo

    public static class ResultadoValidacionRetiro {
        private final boolean valido;
        private final String mensajeError;
        private final double monto;
        private final double disponible;
        private final double interesRendimiento;
        private final boolean usaSobregiro;
        private final double sobregiroUsado;
        private final double nuevoSaldo;
        private final double nuevoCupo;

        public ResultadoValidacionRetiro(boolean valido, String mensajeError, double monto, double disponible,
                                         double interesRendimiento, boolean usaSobregiro, double sobregiroUsado,
                                         double nuevoSaldo, double nuevoCupo) {
            this.valido = valido;
            this.mensajeError = mensajeError;
            this.monto = monto;
            this.disponible = disponible;
            this.interesRendimiento = interesRendimiento;
            this.usaSobregiro = usaSobregiro;
            this.sobregiroUsado = sobregiroUsado;
            this.nuevoSaldo = nuevoSaldo;
            this.nuevoCupo = nuevoCupo;
        }

        public boolean isValido() { return valido; }
        public String getMensajeError() { return mensajeError; }
        public double getMonto() { return monto; }
        public double getDisponible() { return disponible; }
        public double getInteresRendimiento() { return interesRendimiento; }
        public boolean isUsaSobregiro() { return usaSobregiro; }
        public double getSobregiroUsado() { return sobregiroUsado; }
        public double getNuevoSaldo() { return nuevoSaldo; }
        public double getNuevoCupo() { return nuevoCupo; }
    }

    public static double calcularDisponible(Map<String, String> cuenta) {
        if (cuenta == null) return 0.0;
        String tipo = cuenta.getOrDefault("tipo", "AHORROS").toUpperCase();

        if (tipo.contains("CREDITO") || tipo.contains("CRÉDITO")) {
            double cupoDisp = parsearDouble(cuenta.getOrDefault("cupoDisponible", cuenta.getOrDefault("saldo", "0")));
            return Math.max(0.0, Math.floor(cupoDisp * TOPE_AVANCE_CREDITO));
        }

        double saldo = parsearDouble(cuenta.getOrDefault("saldo", "0"));
        if (tipo.contains("CORRIENTE")) {
            double sobregiro = Math.max(0.0, saldo * TOPE_SOBREGIRO_CORRIENTE);
            return Math.max(0.0, saldo + sobregiro);
        }

        return Math.max(0.0, saldo);
    }

    public static ResultadoValidacionRetiro validarRetiro(Map<String, String> cuenta, double monto) {
        if (cuenta == null) {
            return new ResultadoValidacionRetiro(false, "Debe seleccionar una cuenta o tarjeta válida.", 0, 0, 0, false, 0, 0, 0);
        }

        boolean bloqueada = Boolean.parseBoolean(cuenta.getOrDefault("bloqueada", "false"))
                || "BLOQUEADA".equalsIgnoreCase(cuenta.getOrDefault("estado", "ACTIVA"));
        if (bloqueada) {
            return new ResultadoValidacionRetiro(false, "El producto financiero seleccionado se encuentra bloqueado.", 0, 0, 0, false, 0, 0, 0);
        }

        if (Double.isNaN(monto) || Double.isInfinite(monto) || monto <= 0.0) {
            return new ResultadoValidacionRetiro(false, "El monto a retirar debe ser mayor a cero.", 0, 0, 0, false, 0, 0, 0);
        }

        double disponible = calcularDisponible(cuenta);
        if (monto > disponible) {
            return new ResultadoValidacionRetiro(false,
                    "El monto solicitado ($" + (long)monto + " COP) supera el disponible actual ($" + (long)disponible + " COP).",
                    monto, disponible, 0, false, 0, 0, 0);
        }

        String tipo = cuenta.getOrDefault("tipo", "AHORROS").toUpperCase();
        double saldoActual = parsearDouble(cuenta.getOrDefault("saldo", "0"));
        double interesRendimiento = 0.0;
        boolean usaSobregiro = false;
        double sobregiroUsado = 0.0;
        double nuevoSaldo = 0.0;
        double nuevoCupo = 0.0;

        if (tipo.contains("AHORRO") || tipo.contains("DEBITO") || tipo.contains("DÉBITO")) {
            // Regla de negocio de Finara: 1.5% de rendimiento liquidado sobre el monto retirado
            interesRendimiento = Math.round(monto * TASA_INTERES_AHORROS);
            nuevoSaldo = (saldoActual + interesRendimiento) - monto;
        } else if (tipo.contains("CORRIENTE")) {
            if (monto > saldoActual) {
                usaSobregiro = true;
                sobregiroUsado = monto - saldoActual;
            }
            nuevoSaldo = saldoActual - monto;
        } else if (tipo.contains("CREDITO") || tipo.contains("CRÉDITO")) {
            double cupoActual = parsearDouble(cuenta.getOrDefault("cupoDisponible", cuenta.getOrDefault("saldo", "0")));
            nuevoCupo = Math.max(0.0, cupoActual - monto);
        }

        return new ResultadoValidacionRetiro(true, "Validación exitosa.", monto, disponible,
                interesRendimiento, usaSobregiro, sobregiroUsado, nuevoSaldo, nuevoCupo);
    }

    public static ComprobanteRetiro procesarRetiro(Map<String, String> cuenta, double monto, String canal, String concepto) throws Exception {
        ResultadoValidacionRetiro val = validarRetiro(cuenta, monto);
        if (!val.isValido()) {
            throw new IllegalArgumentException(val.getMensajeError());
        }

        String tipo = cuenta.getOrDefault("tipo", "AHORROS").toUpperCase();

        if (tipo.contains("CREDITO") || tipo.contains("CRÉDITO")) {
            cuenta.put("cupoDisponible", String.valueOf((long) val.getNuevoCupo()));
            double deudaActual = parsearDouble(cuenta.getOrDefault("deudaActual", "0"));
            cuenta.put("deudaActual", String.valueOf((long) (deudaActual + monto)));
        } else {
            cuenta.put("saldo", String.valueOf((long) val.getNuevoSaldo()));
        }

        String ref = "RET-" + System.currentTimeMillis() + "-" + (1000 + new Random().nextInt(9000));
        LocalDateTime fechaHora = LocalDateTime.now();

        return new ComprobanteRetiro(
                ref,
                fechaHora,
                cuenta.getOrDefault("tipo", "Cuenta de Ahorros"),
                cuenta.getOrDefault("numero", "0000"),
                cuenta.getOrDefault("titular", "Cliente Finara"),
                monto,
                val.getInteresRendimiento(),
                val.getSobregiroUsado(),
                monto,
                val.getNuevoSaldo(),
                val.getNuevoCupo(),
                canal != null && !canal.isEmpty() ? canal : "Cajero Automático / Corresponsal",
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
