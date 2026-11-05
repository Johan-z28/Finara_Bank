package transferencias;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Servicio encargado de la lógica de negocio de HU-05:
 * Consulta y filtrado de movimientos financieros en memoria.
 */
public class ServicioMovimientos {

    public static List<MovimientoFinanciero> consultarPorCuenta(List<MovimientoFinanciero> historial, String numeroCuenta) {
        if (historial == null || numeroCuenta == null) return Collections.emptyList();
        String numLimpio = numeroCuenta.replaceAll("\\D", "");
        List<MovimientoFinanciero> resultado = new ArrayList<>();
        for (MovimientoFinanciero m : historial) {
            if (m.getNumeroCuenta().equals(numLimpio)) {
                resultado.add(m);
            }
        }
        return resultado;
    }

    public static List<MovimientoFinanciero> filtrarPorTipo(List<MovimientoFinanciero> historial, String tipoOperacion) {
        if (historial == null || tipoOperacion == null) return Collections.emptyList();
        List<MovimientoFinanciero> resultado = new ArrayList<>();
        for (MovimientoFinanciero m : historial) {
            if (m.getTipoOperacion().equalsIgnoreCase(tipoOperacion) || m.getCategoria().equalsIgnoreCase(tipoOperacion)) {
                resultado.add(m);
            }
        }
        return resultado;
    }

    public static List<MovimientoFinanciero> filtrarPorDias(List<MovimientoFinanciero> historial, int dias) {
        if (historial == null) return Collections.emptyList();
        LocalDateTime limite = LocalDateTime.now().minusDays(dias);
        List<MovimientoFinanciero> resultado = new ArrayList<>();
        for (MovimientoFinanciero m : historial) {
            if (!m.getFechaHora().isBefore(limite)) {
                resultado.add(m);
            }
        }
        return resultado;
    }
}

