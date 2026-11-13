package fondoEmergencia;

import java.util.HashMap;
import java.util.Map;

/**
 * Servicio gestor del Fondo de Emergencia (HU-19).
 * Maneja la simulación, cálculo de cobertura mínima y recomendada,
 * almacenamiento por usuario, registro de abonos y proyección de metas.
 */
public class GestorFondoEmergencia {
    private Map<String, FondoEmergencia> fondosPorUsuario;

    public GestorFondoEmergencia() {
        this.fondosPorUsuario = new HashMap<>();
    }

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
        FondoEmergencia existente = fondosPorUsuario.get(clave);

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
        fondosPorUsuario.put(clave, nuevo);
        return nuevo;
    }

    public FondoEmergencia obtenerMetaUsuario(String username) {
        String clave = normalizarUsuario(username);
        return fondosPorUsuario.get(clave);
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

    public int simularMesesParaMeta(double montoFaltante, double aporteMensual) {
        if (montoFaltante <= 0) {
            return 0;
        }
        if (aporteMensual <= 0) {
            return -1; // No alcanzable sin aporte positivo
        }
        return (int) Math.ceil(montoFaltante / aporteMensual);
    }

    public boolean eliminarMetaUsuario(String username) {
        String clave = normalizarUsuario(username);
        return fondosPorUsuario.remove(clave) != null;
    }

    private String normalizarUsuario(String username) {
        return (username == null || username.trim().isEmpty()) ? "juan" : username.trim().toLowerCase();
    }
}
