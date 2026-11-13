package planificacion;

import java.io.Serializable;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Modelo de Planificación Financiera Mensual (HU-30).
 */
public class PlanMensual implements Serializable {
    private static final long serialVersionUID = 1L;

    private String periodo; // YYYY-MM
    private double ingresosEstimados;
    private double metaAhorro;
    private Map<String, Double> asignacionesPorCategoria;

    public PlanMensual(String periodo, double ingresosEstimados, double metaAhorro) {
        this.periodo = periodo;
        this.ingresosEstimados = Math.max(0, ingresosEstimados);
        this.metaAhorro = Math.max(0, metaAhorro);
        this.asignacionesPorCategoria = new LinkedHashMap<>();
    }

    public String getPeriodo() { return periodo; }
    public void setPeriodo(String periodo) { this.periodo = periodo; }
    public double getIngresosEstimados() { return ingresosEstimados; }
    public void setIngresosEstimados(double ingresosEstimados) { this.ingresosEstimados = Math.max(0, ingresosEstimados); }
    public double getMetaAhorro() { return metaAhorro; }
    public void setMetaAhorro(double metaAhorro) { this.metaAhorro = Math.max(0, metaAhorro); }

    public Map<String, Double> getAsignacionesPorCategoria() {
        if (asignacionesPorCategoria == null) {
            asignacionesPorCategoria = new LinkedHashMap<>();
        }
        return asignacionesPorCategoria;
    }

    public void asignarCategoria(String categoria, double monto) {
        if (categoria != null && !categoria.trim().isEmpty()) {
            getAsignacionesPorCategoria().put(categoria.trim().toLowerCase(), Math.max(0, monto));
        }
    }

    public double getTotalAsignado() {
        double suma = 0.0;
        for (double v : getAsignacionesPorCategoria().values()) {
            suma += v;
        }
        return suma;
    }

    public double getDisponibleSinAsignar() {
        return ingresosEstimados - getTotalAsignado() - metaAhorro;
    }
}
