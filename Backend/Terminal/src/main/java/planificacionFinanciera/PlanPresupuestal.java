package planificacionFinanciera;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PlanPresupuestal {
    private String usuario;
    private String periodo; // YYYY-MM
    private Map<String, Double> ingresosEstimados;
    private List<CategoriaAsignacion> asignaciones;
    private double metaAhorro;
    private String fechaActualizacion;

    public PlanPresupuestal(String usuario, String periodo) {
        this.usuario = usuario;
        this.periodo = periodo;
        this.ingresosEstimados = new HashMap<>();
        this.asignaciones = new ArrayList<>();
        this.metaAhorro = 0.0;
        this.fechaActualizacion = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    public String getUsuario() {
        return usuario;
    }

    public String getPeriodo() {
        return periodo;
    }

    public Map<String, Double> getIngresosEstimados() {
        return ingresosEstimados;
    }

    public void setIngresoEstimado(String categoria, double monto) {
        ingresosEstimados.put(categoria, Math.max(0, monto));
        actualizarFecha();
    }

    public List<CategoriaAsignacion> getAsignaciones() {
        return asignaciones;
    }

    public void agregarOActualizarAsignacion(String id, String nombre, double monto) {
        for (CategoriaAsignacion asig : asignaciones) {
            if (asig.getId().equalsIgnoreCase(id)) {
                asig.setMontoPlanificado(monto);
                actualizarFecha();
                return;
            }
        }
        asignaciones.add(new CategoriaAsignacion(id, nombre, monto));
        actualizarFecha();
    }

    public double getMetaAhorro() {
        return metaAhorro;
    }

    public void setMetaAhorro(double metaAhorro) {
        this.metaAhorro = Math.max(0, metaAhorro);
        actualizarFecha();
    }

    public String getFechaActualizacion() {
        return fechaActualizacion;
    }

    private void actualizarFecha() {
        this.fechaActualizacion = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    public double getTotalIngresosEstimados() {
        return ingresosEstimados.values().stream().mapToDouble(Double::doubleValue).sum();
    }

    public double getTotalAsignaciones() {
        return asignaciones.stream().mapToDouble(CategoriaAsignacion::getMontoPlanificado).sum();
    }

    public double getTotalComprometido() {
        return getTotalAsignaciones() + metaAhorro;
    }

    public double getSaldoPorAsignar() {
        return getTotalIngresosEstimados() - getTotalComprometido();
    }

    public String getEstadoSaldo() {
        double saldo = getSaldoPorAsignar();
        if (getTotalIngresosEstimados() == 0 && getTotalComprometido() == 0) {
            return "SIN_DATOS";
        }
        if (Math.abs(saldo) < 0.001) {
            return "EQUILIBRADO";
        }
        return saldo > 0 ? "SOBRANTE" : "DEFICIT";
    }
}
