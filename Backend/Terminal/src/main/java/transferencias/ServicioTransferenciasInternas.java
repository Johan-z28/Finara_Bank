package transferencias;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Servicio encargado de la lógica de negocio de HU-06:
 * Transferencias internas entre cuentas Finara Bank (propias o a terceros).
 */
public class ServicioTransferenciasInternas {

    public static class ResultadoTransferenciaInterna {
        private final boolean exitoso;
        private final String mensaje;
        private final ComprobanteTransaccion comprobante;

        public ResultadoTransferenciaInterna(boolean exitoso, String mensaje, ComprobanteTransaccion comprobante) {
            this.exitoso = exitoso;
            this.mensaje = mensaje;
            this.comprobante = comprobante;
        }

        public boolean isExitoso() { return exitoso; }
        public String getMensaje() { return mensaje; }
        public ComprobanteTransaccion getComprobante() { return comprobante; }
    }

    public static ResultadoTransferenciaInterna transferir(
            Map<String, CuentaBancaria> cuentasRepo,
            List<MovimientoFinanciero> historialRepo,
            String numeroOrigen,
            String numeroDestino,
            double monto,
            String concepto) {

        if (cuentasRepo == null) {
            return new ResultadoTransferenciaInterna(false, "El repositorio de cuentas no está disponible.", null);
        }

        String nOrigen = numeroOrigen != null ? numeroOrigen.replaceAll("\\D", "") : "";
        String nDestino = numeroDestino != null ? numeroDestino.replaceAll("\\D", "") : "";

        if (nOrigen.isEmpty() || !cuentasRepo.containsKey(nOrigen)) {
            return new ResultadoTransferenciaInterna(false, "La cuenta de origen no existe en Finara Bank.", null);
        }

        if (nDestino.isEmpty() || !cuentasRepo.containsKey(nDestino)) {
            return new ResultadoTransferenciaInterna(false, "La cuenta de destino no existe en Finara Bank.", null);
        }

        if (nOrigen.equals(nDestino)) {
            return new ResultadoTransferenciaInterna(false, "No se puede transferir dinero hacia la misma cuenta de origen.", null);
        }

        CuentaBancaria cuentaOrigen = cuentasRepo.get(nOrigen);
        CuentaBancaria cuentaDestino = cuentasRepo.get(nDestino);

        if (cuentaOrigen.isBloqueada()) {
            return new ResultadoTransferenciaInterna(false, "La cuenta de origen se encuentra bloqueada para operar.", null);
        }
        if (cuentaDestino.isBloqueada()) {
            return new ResultadoTransferenciaInterna(false, "La cuenta de destino se encuentra bloqueada temporalmente. No puede recibir transferencias.", null);
        }

        if (Double.isNaN(monto) || Double.isInfinite(monto) || monto <= 0.0) {
            return new ResultadoTransferenciaInterna(false, "El monto a transferir debe ser mayor a cero.", null);
        }

        double disponible = cuentaOrigen.getDisponibleParaOperar();
        if (monto > disponible) {
            return new ResultadoTransferenciaInterna(false, "Saldo insuficiente. Disponible: $" + (long)disponible + " COP.", null);
        }

        String referencia = "TRF-INT-" + System.currentTimeMillis() + "-" + (1000 + new Random().nextInt(9000));
        LocalDateTime fechaHora = LocalDateTime.now();

        try {
            // Débito en origen
            cuentaOrigen.debitarSaldo(monto);
            // Crédito en destino
            cuentaDestino.acreditarSaldo(monto);

            // Registro en HU-05 (Movimientos)
            if (historialRepo != null) {
                historialRepo.add(new MovimientoFinanciero(
                        "MOV-" + System.nanoTime(),
                        referencia,
                        cuentaOrigen.getNumero(),
                        "TRANSFERENCIA_INTERNA",
                        "Transferencia",
                        "DEBITO",
                        monto,
                        cuentaOrigen.getSaldo(),
                        fechaHora,
                        "Transferencia enviada a cuenta Finara •••• " + (nDestino.length() > 4 ? nDestino.substring(nDestino.length() - 4) : nDestino) +
                                (concepto != null && !concepto.trim().isEmpty() ? " - " + concepto : "")
                ));

                historialRepo.add(new MovimientoFinanciero(
                        "MOV-" + System.nanoTime(),
                        referencia,
                        cuentaDestino.getNumero(),
                        "TRANSFERENCIA_INTERNA",
                        "Transferencia",
                        "CREDITO",
                        monto,
                        cuentaDestino.getSaldo(),
                        fechaHora,
                        "Transferencia recibida de cuenta Finara •••• " + (nOrigen.length() > 4 ? nOrigen.substring(nOrigen.length() - 4) : nOrigen) +
                                (concepto != null && !concepto.trim().isEmpty() ? " - " + concepto : "")
                ));
            }

            ComprobanteTransaccion comprobante = new ComprobanteTransaccion(
                    "TRANSFERENCIA INTERNA FINARA",
                    referencia,
                    fechaHora,
                    cuentaOrigen.getTipo(),
                    cuentaOrigen.getNumero(),
                    cuentaDestino.getTipo(),
                    cuentaDestino.getNumero(),
                    cuentaDestino.getTitular(),
                    monto,
                    0.0,
                    monto,
                    cuentaOrigen.getSaldo(),
                    cuentaOrigen.getCupoDisponible(),
                    concepto,
                    "EXITOSA"
            );

            return new ResultadoTransferenciaInterna(true, "Transferencia realizada con éxito.", comprobante);

        } catch (Exception e) {
            cuentaOrigen.acreditarSaldo(monto);
            return new ResultadoTransferenciaInterna(false, "Error al procesar transferencia: " + e.getMessage(), null);
        }
    }
}

