package planificacionFinanciera;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class GestorPlanificacion {
    // Almacenamiento en memoria indexado por usuario:periodo
    private Map<String, PlanPresupuestal> planes;

    public GestorPlanificacion() {
        this.planes = new HashMap<>();
    }

    private String generarClave(String usuario, String periodo) {
        return (usuario != null ? usuario.toLowerCase() : "default") + ":" + periodo;
    }

    public void guardarPlan(PlanPresupuestal plan) {
        if (plan != null) {
            String clave = generarClave(plan.getUsuario(), plan.getPeriodo());
            planes.put(clave, plan);
        }
    }

    public PlanPresupuestal obtenerPlan(String usuario, String periodo) {
        String clave = generarClave(usuario, periodo);
        return planes.get(clave);
    }

    public String calcularPeriodoAnterior(String periodo) {
        if (periodo == null || !periodo.contains("-")) return "2026-10";
        String[] partes = periodo.split("-");
        int anio = Integer.parseInt(partes[0]);
        int mes = Integer.parseInt(partes[1]);

        mes -= 1;
        if (mes < 1) {
            mes = 12;
            anio -= 1;
        }

        return String.format("%04d-%02d", anio, mes);
    }

    public PlanPresupuestal copiarPlanMesAnterior(String usuario, String periodoDestino) {
        String periodoAnterior = calcularPeriodoAnterior(periodoDestino);
        PlanPresupuestal planAnterior = obtenerPlan(usuario, periodoAnterior);

        if (planAnterior == null) {
            return null;
        }

        PlanPresupuestal nuevoPlan = new PlanPresupuestal(usuario, periodoDestino);
        for (Map.Entry<String, Double> entry : planAnterior.getIngresosEstimados().entrySet()) {
            nuevoPlan.setIngresoEstimado(entry.getKey(), entry.getValue());
        }

        for (CategoriaAsignacion asig : planAnterior.getAsignaciones()) {
            nuevoPlan.agregarOActualizarAsignacion(asig.getId(), asig.getNombre(), asig.getMontoPlanificado());
        }

        nuevoPlan.setMetaAhorro(planAnterior.getMetaAhorro());
        guardarPlan(nuevoPlan);
        return nuevoPlan;
    }

    public boolean limpiarPlan(String usuario, String periodo) {
        String clave = generarClave(usuario, periodo);
        return planes.remove(clave) != null;
    }

    public List<CategoriaAsignacion> compararConEjecutado(String usuario, String periodo, Map<String, Double> gastosReales) {
        PlanPresupuestal plan = obtenerPlan(usuario, periodo);
        List<CategoriaAsignacion> resultado = new ArrayList<>();

        if (plan != null) {
            for (CategoriaAsignacion asig : plan.getAsignaciones()) {
                double real = gastosReales != null ? gastosReales.getOrDefault(asig.getId(), 0.0) : 0.0;
                resultado.add(new CategoriaAsignacion(asig.getId(), asig.getNombre(), asig.getMontoPlanificado(), real));
            }
        }

        return resultado;
    }
}
