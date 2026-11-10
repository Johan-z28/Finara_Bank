package movimientos;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Servicio encargado de la lógica de consulta y filtrado de movimientos (HU-05).
 */
public class ServicioMovimientos {

    public static class ResumenMovimientos {
        private final int totalTransacciones;
        private final double totalIngresos;
        private final double totalEgresos;
        private final double balanceNeto;

        public ResumenMovimientos(int totalTransacciones, double totalIngresos, double totalEgresos) {
            this.totalTransacciones = totalTransacciones;
            this.totalIngresos = totalIngresos;
            this.totalEgresos = totalEgresos;
            this.balanceNeto = totalIngresos - totalEgresos;
        }

        public int getTotalTransacciones() { return totalTransacciones; }
        public double getTotalIngresos() { return totalIngresos; }
        public double getTotalEgresos() { return totalEgresos; }
        public double getBalanceNeto() { return balanceNeto; }
    }

    public static List<MovimientoFinanciero> consultarPorCuenta(List<MovimientoFinanciero> historial, String numeroCuenta) {
        if (historial == null || numeroCuenta == null) return Collections.emptyList();
        String numLimpio = numeroCuenta.replaceAll("\\D", "");
        List<MovimientoFinanciero> filtrados = new ArrayList<>();
        for (MovimientoFinanciero m : historial) {
            if (m.getNumeroCuenta().equals(numLimpio) || (numLimpio.length() == 4 && m.getNumeroCuenta().endsWith(numLimpio))) {
                filtrados.add(m);
            }
        }
        return filtrados;
    }

    public static List<MovimientoFinanciero> filtrarPorTipoOperacion(List<MovimientoFinanciero> historial, String tipoOp) {
        if (historial == null || tipoOp == null) return Collections.emptyList();
        List<MovimientoFinanciero> filtrados = new ArrayList<>();
        for (MovimientoFinanciero m : historial) {
            if (m.getTipoOperacion().equalsIgnoreCase(tipoOp)) {
                filtrados.add(m);
            }
        }
        return filtrados;
    }

    public static List<MovimientoFinanciero> filtrarPorCategoria(List<MovimientoFinanciero> historial, String categoria) {
        if (historial == null || categoria == null) return Collections.emptyList();
        List<MovimientoFinanciero> filtrados = new ArrayList<>();
        for (MovimientoFinanciero m : historial) {
            if (m.getCategoria().equalsIgnoreCase(categoria)) {
                filtrados.add(m);
            }
        }
        return filtrados;
    }

    public static List<MovimientoFinanciero> filtrarPorRangoDias(List<MovimientoFinanciero> historial, int dias) {
        if (historial == null) return Collections.emptyList();
        LocalDateTime limite = LocalDateTime.now().minusDays(dias);
        List<MovimientoFinanciero> filtrados = new ArrayList<>();
        for (MovimientoFinanciero m : historial) {
            if (!m.getFechaHora().isBefore(limite)) {
                filtrados.add(m);
            }
        }
        return filtrados;
    }

    public static ResumenMovimientos calcularResumen(List<MovimientoFinanciero> movimientos) {
        if (movimientos == null || movimientos.isEmpty()) {
            return new ResumenMovimientos(0, 0.0, 0.0);
        }
        double ingresos = 0.0;
        double egresos = 0.0;
        for (MovimientoFinanciero m : movimientos) {
            if ("INGRESO".equalsIgnoreCase(m.getTipoOperacion())) {
                ingresos += m.getValor();
            } else {
                egresos += m.getValor();
            }
        }
        return new ResumenMovimientos(movimientos.size(), ingresos, egresos);
    }
}
