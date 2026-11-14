package fondoEmergencia;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;

import java.util.Map;
import java.util.UUID;

/**
 * Servicio gestor del Fondo de Emergencia (HU-19).
 * Estado persistido por usuario en BaseDatosFinara y abonos integrados con cuentas reales.
 */
public class GestorFondoEmergencia {

    public static class ResultadoSimulacion {
        private double gastosFijosMensuales;
        private int mesesCobertura;
        private double totalSugerido;
        private double coberturaMinima;
        private double coberturaRecomendada;

        public ResultadoSimulacion(double gastosFijosMensuales, int mesesCobertura) {
            this.gastosFijosMensuales = Math.max(0, gastosFijosMensuales);
            this.mesesCobertura = Math.max(1, Math.min(12, mesesCobertura));
            this.totalSugerido = this.gastosFijosMensuales * this.mesesCobertura;
            this.coberturaMinima = this.gastosFijosMensuales * 3.0;
            this.coberturaRecomendada = this.gastosFijosMensuales * 6.0;
        }

        public double getGastosFijosMensuales() { return gastosFijosMensuales; }
        public int getMesesCobertura() { return mesesCobertura; }
        public double getTotalSugerido() { return totalSugerido; }
        public double getCoberturaMinima() { return coberturaMinima; }
        public double getCoberturaRecomendada() { return coberturaRecomendada; }
    }

    public ResultadoSimulacion calcularFondoSugerido(double gastosFijosMensuales, int mesesCobertura) {
        return new ResultadoSimulacion(gastosFijosMensuales, mesesCobertura);
    }

    public FondoEmergencia guardarMetaUsuario(String username, double metaMonto, double gastosFijos,
                                             int mesesCobertura, String cuentaId, String cuentaNumero, double saldoActual) {
        if (metaMonto <= 0) {
            throw new IllegalArgumentException("El monto de la meta debe ser mayor a cero.");
        }
        if (cuentaId == null || cuentaId.trim().isEmpty()) {
            throw new IllegalArgumentException("Debe seleccionar una cuenta de ahorros o corriente válida.");
        }

        String clave = normalizarUsuario(username);
        BaseDatosFinara db = BaseDatosFinara.getInstancia();
        FondoEmergencia existente = db.getFondoEmergencia(clave);

        if (existente != null) {
            existente.setMetaMonto(metaMonto);
            existente.setGastosFijosMensuales(gastosFijos);
            existente.setMesesCobertura(mesesCobertura);
            existente.setCuentaVinculadaId(cuentaId);
            existente.setCuentaVinculadaNumero(cuentaNumero);
            existente.setSaldoActual(saldoActual);
            return existente;
        }

        String nuevoId = "FE-" + System.currentTimeMillis();
        FondoEmergencia nuevo = new FondoEmergencia(
                nuevoId, clave, gastosFijos, mesesCobertura, metaMonto, cuentaId, cuentaNumero, saldoActual
        );
        db.setFondoEmergencia(clave, nuevo);
        return nuevo;
    }

    public FondoEmergencia obtenerMetaUsuario(String username) {
        return BaseDatosFinara.getInstancia().getFondoEmergencia(normalizarUsuario(username));
    }

    public FondoEmergencia registrarAbono(String username, double montoAbono) {
        if (montoAbono <= 0) {
            throw new IllegalArgumentException("El abono debe ser mayor a cero.");
        }
        FondoEmergencia fondo = obtenerMetaUsuario(username);
        if (fondo == null) {
            throw new IllegalStateException("El usuario no tiene una meta de fondo de emergencia configurada.");
        }
        fondo.setSaldoActual(fondo.getSaldoActual() + montoAbono);
        return fondo;
    }

    /**
     * Registra un abono real debitando la cuenta bancaria de ahorros/corriente seleccionada.
     */
    public FondoEmergencia registrarAbonoDesdeCuenta(String correo, double montoAbono, Map<String, String> cuentaOrigen) {
        if (montoAbono <= 0) {
            throw new IllegalArgumentException("El abono debe ser mayor a cero.");
        }
        FondoEmergencia fondo = obtenerMetaUsuario(correo);
        if (fondo == null) {
            throw new IllegalStateException("Primero debe configurar una meta de Fondo de Emergencia.");
        }
        if (cuentaOrigen == null || RepositorioCuentas.esBloqueada(cuentaOrigen)) {
            throw new IllegalArgumentException("Debe seleccionar una cuenta origen activa.");
        }
        double saldoCuenta = RepositorioCuentas.parsearNumero(cuentaOrigen.get("saldo"));
        if (montoAbono > saldoCuenta) {
            throw new IllegalArgumentException("Saldo insuficiente en la cuenta origen. Disponible: " + Consola.formatoCOP(saldoCuenta));
        }

        double nuevoSaldoCuenta = saldoCuenta - montoAbono;
        RepositorioCuentas.actualizarSaldo(cuentaOrigen, nuevoSaldoCuenta);
        fondo.setSaldoActual(fondo.getSaldoActual() + montoAbono);

        String ref = "FE-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        BaseDatosFinara.getInstancia().getRepositorioMovimientos().registrarMovimiento(
                correo,
                ref,
                cuentaOrigen.get("numero"),
                cuentaOrigen.getOrDefault("tipo", "AHORROS"),
                "Ahorro",
                "EGRESO",
                montoAbono,
                nuevoSaldoCuenta,
                "Abono a Fondo de Emergencia (" + fondo.getId() + ")"
        );
        BaseDatosFinara.guardar();
        return fondo;
    }

    public int simularMesesParaMeta(double montoFaltante, double aporteMensual) {
        if (montoFaltante <= 0) {
            return 0;
        }
        if (aporteMensual <= 0) {
            return -1;
        }
        return (int) Math.ceil(montoFaltante / aporteMensual);
    }

    public boolean eliminarMetaUsuario(String username) {
        String clave = normalizarUsuario(username);
        boolean existia = BaseDatosFinara.getInstancia().getFondoEmergencia(clave) != null;
        BaseDatosFinara.getInstancia().setFondoEmergencia(clave, null);
        return existia;
    }

    private String normalizarUsuario(String username) {
        return (username == null || username.trim().isEmpty()) ? "juan" : username.trim().toLowerCase();
    }
}
