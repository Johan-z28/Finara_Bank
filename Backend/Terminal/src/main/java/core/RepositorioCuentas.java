package core;

import java.io.Serializable;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Repositorio centralizado de cuentas y tarjetas.
 * Entrega siempre la MISMA instancia viva Map&lt;String, String&gt; para que retiros,
 * consignaciones, transferencias y pagos mantengan el estado sincronizado en tiempo real.
 */
public class RepositorioCuentas implements Serializable {
    private static final long serialVersionUID = 1L;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final Map<String, List<Map<String, String>>> cuentasPorUsuario = new HashMap<>();

    public synchronized List<Map<String, String>> obtenerCuentasUsuario(String correo) {
        if (correo == null || correo.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return cuentasPorUsuario.computeIfAbsent(normalizarCorreo(correo), k -> new ArrayList<>());
    }

    public synchronized Map<String, String> crearCuenta(
            String correo,
            String titular,
            String tipo,
            double saldoInicial,
            double cupoMaximo) {

        String correoNorm = normalizarCorreo(correo);
        String numero = generarNumeroUnico16Digitos();

        Map<String, String> cuenta = new HashMap<>();
        cuenta.put("tipo", tipo.toUpperCase());
        cuenta.put("numero", numero);
        cuenta.put("titular", titular != null && !titular.isEmpty() ? titular : "Cliente Finara");
        cuenta.put("correoTitular", correoNorm);
        cuenta.put("estado", "ACTIVA");
        cuenta.put("bloqueada", "false");

        if ("CREDITO".equalsIgnoreCase(tipo)) {
            double cupo = Math.max(0.0, cupoMaximo);
            cuenta.put("saldo", "0");
            cuenta.put("cupoMaximo", String.valueOf((long) cupo));
            cuenta.put("cupoDisponible", String.valueOf((long) cupo));
            cuenta.put("deudaActual", "0");
        } else {
            double saldo = Math.max(0.0, saldoInicial);
            cuenta.put("saldo", String.format("%.2f", saldo).replace(",", "."));
        }

        obtenerCuentasUsuario(correoNorm).add(cuenta);
        return cuenta;
    }

    public synchronized Map<String, String> buscarCuentaPorNumero(String numeroBuscado) {
        String limpio = Consola.limpiarNumeroCuenta(numeroBuscado);
        if (limpio.isEmpty()) {
            return null;
        }
        for (List<Map<String, String>> lista : cuentasPorUsuario.values()) {
            for (Map<String, String> cuenta : lista) {
                String numCuenta = Consola.limpiarNumeroCuenta(cuenta.get("numero"));
                if (numCuenta.equals(limpio)) {
                    return cuenta;
                }
            }
        }
        return null;
    }

    public synchronized String buscarCorreoDuenoCuenta(String numeroBuscado) {
        String limpio = Consola.limpiarNumeroCuenta(numeroBuscado);
        if (limpio.isEmpty()) {
            return null;
        }
        for (Map.Entry<String, List<Map<String, String>>> entry : cuentasPorUsuario.entrySet()) {
            for (Map<String, String> cuenta : entry.getValue()) {
                String numCuenta = Consola.limpiarNumeroCuenta(cuenta.get("numero"));
                if (numCuenta.equals(limpio)) {
                    return entry.getKey();
                }
            }
        }
        return null;
    }

    public synchronized Map<String, String> buscarCuentaAhorrosActiva(String correo) {
        for (Map<String, String> cuenta : obtenerCuentasUsuario(correo)) {
            if ("AHORROS".equalsIgnoreCase(cuenta.get("tipo")) && !esBloqueada(cuenta)) {
                return cuenta;
            }
        }
        return null;
    }

    public synchronized List<Map<String, String>> obtenerCuentasDebitoODeposito(String correo) {
        List<Map<String, String>> res = new ArrayList<>();
        for (Map<String, String> cuenta : obtenerCuentasUsuario(correo)) {
            String tipo = cuenta.getOrDefault("tipo", "");
            if ("AHORROS".equalsIgnoreCase(tipo) || "CORRIENTE".equalsIgnoreCase(tipo)) {
                res.add(cuenta);
            }
        }
        return res;
    }

    public synchronized List<Map<String, String>> obtenerCuentasCredito(String correo) {
        List<Map<String, String>> res = new ArrayList<>();
        for (Map<String, String> cuenta : obtenerCuentasUsuario(correo)) {
            if ("CREDITO".equalsIgnoreCase(cuenta.get("tipo"))) {
                res.add(cuenta);
            }
        }
        return res;
    }

    public synchronized int contarProductosUsuario(String correo) {
        return obtenerCuentasUsuario(correo).size();
    }

    public synchronized double calcularSaldoConsolidado(String correo) {
        double total = 0.0;
        for (Map<String, String> cuenta : obtenerCuentasUsuario(correo)) {
            if (!"CREDITO".equalsIgnoreCase(cuenta.get("tipo"))) {
                total += parsearNumero(cuenta.get("saldo"));
            }
        }
        return total;
    }

    public synchronized double calcularDeudaTotalTarjetas(String correo) {
        double total = 0.0;
        for (Map<String, String> cuenta : obtenerCuentasUsuario(correo)) {
            if ("CREDITO".equalsIgnoreCase(cuenta.get("tipo"))) {
                total += parsearNumero(cuenta.get("deudaActual"));
            }
        }
        return total;
    }

    public synchronized boolean tieneProductoTipo(String correo, String tipoProducto) {
        for (Map<String, String> cuenta : obtenerCuentasUsuario(correo)) {
            if (tipoProducto.equalsIgnoreCase(cuenta.get("tipo"))) {
                return true;
            }
        }
        return false;
    }

    public static boolean esBloqueada(Map<String, String> cuenta) {
        if (cuenta == null) {
            return true;
        }
        return "BLOQUEADA".equalsIgnoreCase(cuenta.getOrDefault("estado", "ACTIVA"))
                || "true".equalsIgnoreCase(cuenta.getOrDefault("bloqueada", "false"));
    }

    public static double parsearNumero(String val) {
        if (val == null || val.trim().isEmpty()) {
            return 0.0;
        }
        try {
            return Double.parseDouble(val.trim().replace(",", "."));
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    public static void actualizarSaldo(Map<String, String> cuenta, double nuevoSaldo) {
        if (cuenta != null) {
            cuenta.put("saldo", String.format(java.util.Locale.US, "%.2f", nuevoSaldo));
        }
    }

    private String generarNumeroUnico16Digitos() {
        while (true) {
            StringBuilder sb = new StringBuilder("4532");
            for (int i = 0; i < 12; i++) {
                sb.append(RANDOM.nextInt(10));
            }
            String candidato = sb.toString();
            if (buscarCuentaPorNumero(candidato) == null) {
                return candidato;
            }
        }
    }

    private String normalizarCorreo(String correo) {
        return correo == null ? "" : correo.trim().toLowerCase();
    }
}
