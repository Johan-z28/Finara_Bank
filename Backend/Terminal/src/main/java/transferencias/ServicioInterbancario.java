package transferencias;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;

public class ServicioInterbancario {
    public static final double COMISION_ACH = 6500.0;
    public static final double SOBREGIRO_CORRIENTE = 0.20;
    public static final double TOPE_AVANCE_CREDITO = 0.50;

    public static final List<String> BANCOS_CONVENIO_ACH = Collections.unmodifiableList(Arrays.asList(
            "Bancolombia",
            "Banco de Bogotá",
            "Davivienda",
            "BBVA Colombia",
            "Banco de Occidente",
            "Banco Popular",
            "Scotiabank Colpatria",
            "Banco Caja Social",
            "Banco AV Villas",
            "Nequi",
            "Daviplata",
            "Lulo Bank",
            "Nu Colombia"
    ));

    public static class ResultadoValidacion {
        private final boolean valido;
        private final String mensajeError;
        private final double comision;
        private final double totalDebitar;
        private final double disponible;

        public ResultadoValidacion(boolean valido, String mensajeError, double comision, double totalDebitar, double disponible) {
            this.valido = valido;
            this.mensajeError = mensajeError;
            this.comision = comision;
            this.totalDebitar = totalDebitar;
            this.disponible = disponible;
        }

        public boolean isValido() { return valido; }
        public String getMensajeError() { return mensajeError; }
        public double getComision() { return comision; }
        public double getTotalDebitar() { return totalDebitar; }
        public double getDisponible() { return disponible; }
    }

    public static double calcularDisponible(Map<String, String> cuentaOrigen) {
        if (cuentaOrigen == null) return 0.0;

        String saldoStr = cuentaOrigen.getOrDefault("saldo", "0").replaceAll("[^0-9.-]", "");
        double saldo = 0.0;
        try {
            saldo = Double.parseDouble(saldoStr);
        } catch (NumberFormatException e) {
            saldo = 0.0;
        }

        String tipo = cuentaOrigen.getOrDefault("tipo", "AHORROS").toUpperCase();
        if (tipo.contains("CREDITO")) {
            return Math.max(0.0, Math.floor(saldo * TOPE_AVANCE_CREDITO));
        } else if (tipo.contains("CORRIENTE")) {
            double sobregiro = Math.max(0.0, saldo * SOBREGIRO_CORRIENTE);
            return Math.max(0.0, saldo + sobregiro);
        }
        return Math.max(0.0, saldo);
    }

    public static ResultadoValidacion validarTransferenciaInterbancaria(Map<String, String> cuentaOrigen, SolicitudInterbancaria solicitud) {
        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        formatoCOP.setMaximumFractionDigits(0);

        if (cuentaOrigen == null) {
            return new ResultadoValidacion(false, "Debe seleccionar una cuenta de origen válida.", 0, 0, 0);
        }

        boolean bloqueada = Boolean.parseBoolean(cuentaOrigen.getOrDefault("bloqueada", "false"))
                || "BLOQUEADA".equalsIgnoreCase(cuentaOrigen.getOrDefault("estado", "ACTIVA"));
        if (bloqueada) {
            return new ResultadoValidacion(false, "El producto de origen se encuentra bloqueado temporalmente. Desbloquéelo para operar.", 0, 0, 0);
        }

        if (solicitud.getBancoDestino() == null || solicitud.getBancoDestino().trim().isEmpty()) {
            return new ResultadoValidacion(false, "Debe seleccionar una entidad bancaria receptora.", 0, 0, 0);
        }

        if (!BANCOS_CONVENIO_ACH.contains(solicitud.getBancoDestino().trim())) {
            return new ResultadoValidacion(false, "La entidad bancaria seleccionada no está conectada a la red ACH.", 0, 0, 0);
        }

        String numDestino = solicitud.getNumeroCuentaDestino() != null ? solicitud.getNumeroCuentaDestino().replaceAll("\\D", "") : "";
        if (numDestino.length() < 5) {
            return new ResultadoValidacion(false, "El número de cuenta de destino debe tener al menos 5 dígitos numéricos.", 0, 0, 0);
        }

        if (solicitud.getTitularBeneficiario() == null || solicitud.getTitularBeneficiario().trim().isEmpty()) {
            return new ResultadoValidacion(false, "Debe ingresar el nombre completo del beneficiario.", 0, 0, 0);
        }

        if (solicitud.getMonto() <= 0) {
            return new ResultadoValidacion(false, "El monto a transferir debe ser mayor a cero.", 0, 0, 0);
        }

        double disponible = calcularDisponible(cuentaOrigen);
        double totalDebitar = solicitud.getMonto() + COMISION_ACH;

        if (totalDebitar > disponible) {
            String msg = "Saldo insuficiente para cubrir el monto y la comisión ACH de " + formatoCOP.format(COMISION_ACH)
                    + ". Disponible actual: " + formatoCOP.format(disponible) + ".";
            return new ResultadoValidacion(false, msg, COMISION_ACH, totalDebitar, disponible);
        }

        return new ResultadoValidacion(true, null, COMISION_ACH, totalDebitar, disponible);
    }

    public static ComprobanteTransferencia procesarTransferenciaInterbancaria(Map<String, String> cuentaOrigen, SolicitudInterbancaria solicitud) throws Exception {
        ResultadoValidacion validacion = validarTransferenciaInterbancaria(cuentaOrigen, solicitud);
        if (!validacion.isValido()) {
            throw new IllegalArgumentException(validacion.getMensajeError());
        }

        String saldoStr = cuentaOrigen.getOrDefault("saldo", "0").replaceAll("[^0-9.-]", "");
        double saldoAnterior = Double.parseDouble(saldoStr);
        double nuevoSaldo = saldoAnterior - validacion.getTotalDebitar();
        cuentaOrigen.put("saldo", String.valueOf((long) nuevoSaldo));

        Random random = new Random();
        long numeroAleatorio = 10000000L + (long)(random.nextDouble() * 90000000L);
        String referenciaACH = "ACH-" + numeroAleatorio;

        return new ComprobanteTransferencia(
                referenciaACH,
                LocalDateTime.now(),
                "Finara Bank S.A.",
                cuentaOrigen.getOrDefault("tipo", "Cuenta de Ahorros"),
                cuentaOrigen.getOrDefault("numero", "0000"),
                solicitud.getBancoDestino(),
                solicitud.getTipoCuentaDestino(),
                solicitud.getNumeroCuentaDestino(),
                solicitud.getTitularBeneficiario(),
                solicitud.getDocumentoBeneficiario(),
                solicitud.getMonto(),
                validacion.getComision(),
                validacion.getTotalDebitar(),
                nuevoSaldo,
                solicitud.getConcepto(),
                "TRANSMITIDA_ACH"
        );
    }
}
