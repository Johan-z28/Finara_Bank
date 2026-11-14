package core;

import movimientos.MovimientoFinanciero;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Repositorio centralizado de movimientos financieros reales por usuario.
 * No precarga datos demo ni inventados.
 */
public class RepositorioMovimientos implements Serializable {
    private static final long serialVersionUID = 1L;

    private final Map<String, List<MovimientoFinanciero>> movimientosPorUsuario = new HashMap<>();

    public synchronized MovimientoFinanciero registrarMovimiento(
            String correo,
            String referencia,
            String numeroCuenta,
            String tipoProducto,
            String categoria,
            String tipoOperacion,
            double valor,
            double saldoPosterior,
            String descripcion) {

        if (correo == null || correo.trim().isEmpty()) {
            return null;
        }
        String correoNorm = correo.trim().toLowerCase();
        String id = "MOV-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        String refFinal = (referencia == null || referencia.trim().isEmpty())
                ? "FIN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()
                : referencia.trim();

        MovimientoFinanciero mov = new MovimientoFinanciero(
                id,
                refFinal,
                Consola.limpiarNumeroCuenta(numeroCuenta),
                tipoProducto != null ? tipoProducto : "FINARA",
                categoria != null ? categoria : "General",
                tipoOperacion != null ? tipoOperacion.toUpperCase() : "EGRESO",
                valor,
                saldoPosterior,
                LocalDateTime.now(),
                descripcion != null ? descripcion : ""
        );

        movimientosPorUsuario.computeIfAbsent(correoNorm, k -> new ArrayList<>()).add(0, mov);
        return mov;
    }

    public synchronized List<MovimientoFinanciero> obtenerMovimientosUsuario(String correo) {
        if (correo == null || correo.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return new ArrayList<>(movimientosPorUsuario.getOrDefault(correo.trim().toLowerCase(), Collections.emptyList()));
    }

    public synchronized List<MovimientoFinanciero> obtenerUltimos(String correo, int limite) {
        List<MovimientoFinanciero> todos = obtenerMovimientosUsuario(correo);
        if (todos.size() <= limite) {
            return todos;
        }
        return new ArrayList<>(todos.subList(0, limite));
    }

    public synchronized List<MovimientoFinanciero> obtenerEgresosMesActual(String correo) {
        YearMonth mesActual = YearMonth.now();
        List<MovimientoFinanciero> egresos = new ArrayList<>();
        for (MovimientoFinanciero m : obtenerMovimientosUsuario(correo)) {
            if ("EGRESO".equalsIgnoreCase(m.getTipoOperacion())
                    && m.getFechaHora() != null
                    && YearMonth.from(m.getFechaHora()).equals(mesActual)) {
                egresos.add(m);
            }
        }
        return egresos;
    }
}
