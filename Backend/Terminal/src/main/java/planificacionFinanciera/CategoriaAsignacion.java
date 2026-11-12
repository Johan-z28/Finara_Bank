package planificacionFinanciera;

public class CategoriaAsignacion {
    private String id;
    private String nombre;
    private double montoPlanificado;
    private double montoEjecutado;

    public CategoriaAsignacion(String id, String nombre, double montoPlanificado) {
        this.id = id;
        this.nombre = nombre;
        this.montoPlanificado = Math.max(0, montoPlanificado);
        this.montoEjecutado = 0.0;
    }

    public CategoriaAsignacion(String id, String nombre, double montoPlanificado, double montoEjecutado) {
        this.id = id;
        this.nombre = nombre;
        this.montoPlanificado = Math.max(0, montoPlanificado);
        this.montoEjecutado = Math.max(0, montoEjecutado);
    }

    public String getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public double getMontoPlanificado() {
        return montoPlanificado;
    }

    public void setMontoPlanificado(double montoPlanificado) {
        this.montoPlanificado = Math.max(0, montoPlanificado);
    }

    public double getMontoEjecutado() {
        return montoEjecutado;
    }

    public void setMontoEjecutado(double montoEjecutado) {
        this.montoEjecutado = Math.max(0, montoEjecutado);
    }

    public double getDiferencia() {
        return montoPlanificado - montoEjecutado;
    }

    public double getPorcentajeEjecucion() {
        if (montoPlanificado <= 0) {
            return montoEjecutado > 0 ? 100.0 : 0.0;
        }
        return (montoEjecutado / montoPlanificado) * 100.0;
    }

    public String getEstado() {
        if (montoPlanificado == 0 && montoEjecutado == 0) {
            return "NEUTRO";
        }
        if (montoPlanificado == 0 && montoEjecutado > 0) {
            return "SIN_PLAN";
        }
        double ratio = montoEjecutado / montoPlanificado;
        if (ratio <= 0.85) {
            return "DENTRO";
        }
        if (ratio <= 1.0) {
            return "LIMITE";
        }
        return "EXCEDIDO";
    }
}
