package planificacion;

import core.BaseDatosFinara;
import core.RepositorioMovimientos;
import movimientos.MovimientoFinanciero;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Servicio de Planificación Financiera Mensual (HU-30).
 * Compara montos planificados por categoría contra los egresos reales de RepositorioMovimientos.
 */
public class ServicioPlanificacion {

    public static final List<String> CATEGORIAS_PLAN = Arrays.asList(
            "vivienda",
            "alimentacion",
            "transporte",
            "educacion",
            "salud",
            "entretenimiento",
            "otros_gastos"
    );

    public static String obtenerPeriodoActual() {
        return YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
    }

    public static PlanMensual obtenerOCrearPlan(String correo, String periodo) {
        String c = BaseDatosFinara.normalizarCorreo(correo);
        String p = (periodo == null || periodo.trim().isEmpty()) ? obtenerPeriodoActual() : periodo.trim();
        Map<String, PlanMensual> planes = BaseDatosFinara.getInstancia().getPlanesUsuario(c);
        PlanMensual plan = planes.get(p);
        if (plan == null) {
            plan = new PlanMensual(p, 0.0, 0.0);
            for (String cat : CATEGORIAS_PLAN) {
                plan.asignarCategoria(cat, 0.0);
            }
            planes.put(p, plan);
        }
        return plan;
    }

    public static void guardarPlan(String correo, PlanMensual plan) {
        if (plan == null) return;
        String c = BaseDatosFinara.normalizarCorreo(correo);
        BaseDatosFinara.getInstancia().getPlanesUsuario(c).put(plan.getPeriodo(), plan);
        BaseDatosFinara.guardar();
    }

    public static Map<String, Double> calcularEjecucionRealPorCategoria(String correo, String periodo) {
        Map<String, Double> ejecutado = new LinkedHashMap<>();
        for (String cat : CATEGORIAS_PLAN) {
            ejecutado.put(cat, 0.0);
        }

        YearMonth ymObjetivo;
        try {
            ymObjetivo = YearMonth.parse(periodo, DateTimeFormatter.ofPattern("yyyy-MM"));
        } catch (Exception e) {
            ymObjetivo = YearMonth.now();
        }

        RepositorioMovimientos repoMovs = BaseDatosFinara.getInstancia().getRepositorioMovimientos();
        for (MovimientoFinanciero m : repoMovs.obtenerMovimientosUsuario(correo)) {
            if (!"EGRESO".equalsIgnoreCase(m.getTipoOperacion()) || m.getFechaHora() == null) {
                continue;
            }
            if (!YearMonth.from(m.getFechaHora()).equals(ymObjetivo)) {
                continue;
            }
            if ("Ahorro".equalsIgnoreCase(m.getCategoria())) {
                continue; // Los traslados a ahorro se contabilizan en meta de ahorro
            }
            String catMapeada = mapearMovimientoACategoria(m.getCategoria(), m.getDescripcion());
            ejecutado.put(catMapeada, ejecutado.getOrDefault(catMapeada, 0.0) + m.getValor());
        }
        return ejecutado;
    }

    public static double calcularAhorroEjecutadoMes(String correo, String periodo) {
        YearMonth ymObjetivo;
        try {
            ymObjetivo = YearMonth.parse(periodo, DateTimeFormatter.ofPattern("yyyy-MM"));
        } catch (Exception e) {
            ymObjetivo = YearMonth.now();
        }
        double total = 0.0;
        for (MovimientoFinanciero m : BaseDatosFinara.getInstancia().getRepositorioMovimientos().obtenerMovimientosUsuario(correo)) {
            if ("EGRESO".equalsIgnoreCase(m.getTipoOperacion())
                    && m.getFechaHora() != null
                    && YearMonth.from(m.getFechaHora()).equals(ymObjetivo)
                    && "Ahorro".equalsIgnoreCase(m.getCategoria())) {
                total += m.getValor();
            }
        }
        return total;
    }

    public static String mapearMovimientoACategoria(String categoria, String descripcion) {
        String texto = ((categoria != null ? categoria : "") + " " + (descripcion != null ? descripcion : "")).toLowerCase();

        if (contieneAlguno(texto, "vivienda", "arriendo", "hipoteca", "alquiler", "administracion", "servicios", "agua", "luz", "energia", "gas", "internet")) {
            return "vivienda";
        }
        if (contieneAlguno(texto, "alimentacion", "mercado", "supermercado", "comida", "restaurante", "despensa", "cafe")) {
            return "alimentacion";
        }
        if (contieneAlguno(texto, "transporte", "gasolina", "uber", "taxi", "bus", "metro", "peaje", "vehiculo")) {
            return "transporte";
        }
        if (contieneAlguno(texto, "educacion", "universidad", "colegio", "matricula", "curso", "libro")) {
            return "educacion";
        }
        if (contieneAlguno(texto, "salud", "eps", "medicina", "farmacia", "medico", "odontolog")) {
            return "salud";
        }
        if (contieneAlguno(texto, "entretenimiento", "cine", "streaming", "netflix", "spotify", "ocio", "juego")) {
            return "entretenimiento";
        }
        return "otros_gastos";
    }

    private static boolean contieneAlguno(String texto, String... claves) {
        for (String c : claves) {
            if (texto.contains(c)) {
                return true;
            }
        }
        return false;
    }

    public static String evaluarEstadoCategoria(double planificado, double ejecutado) {
        if (planificado <= 0) {
            return ejecutado > 0 ? "EXCEDIDO (Sin presupuesto asignado)" : "SIN ASIGNAR";
        }
        double pct = (ejecutado / planificado) * 100.0;
        if (pct > 100.0) {
            return String.format("EXCEDIDO (%.0f%% > 100%%)", pct);
        }
        if (pct > 85.0) {
            return String.format("CERCA DEL LÍMITE (%.0f%%)", pct);
        }
        return String.format("DENTRO DEL PLAN (%.0f%%)", pct);
    }
}
