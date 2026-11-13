package suscripcionesPagos;

/**
 * Modelo de Suscripción o Gasto Hormiga recurrente (HU-22).
 */
public class Suscripcion {
    private String id;
    private String username;
    private String nombre;
    private String categoria;
    private double monto;
    private String frecuencia; // SEMANAL, MENSUAL, ANUAL
    private String estado; // ACTIVA, PAUSADA, CANCELADA
    private double ahorroAcumulado;

    public Suscripcion(String id, String username, String nombre, String categoria,
                       double monto, String frecuencia) {
        if (nombre == null || nombre.trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre de la suscripción o gasto es obligatorio.");
        }
        if (monto <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor a cero.");
        }

        this.id = id;
        this.username = username;
        this.nombre = nombre.trim();
        this.categoria = (categoria != null && !categoria.trim().isEmpty()) ? categoria.trim() : "Otro";
        this.monto = monto;
        this.frecuencia = normalizarFrecuencia(frecuencia);
        this.estado = "ACTIVA";
        this.ahorroAcumulado = 0.0;
    }

    private String normalizarFrecuencia(String frecuencia) {
        if (frecuencia == null) return "MENSUAL";
        String f = frecuencia.trim().toUpperCase();
        if ("SEMANAL".equals(f) || "ANUAL".equals(f) || "MENSUAL".equals(f)) {
            return f;
        }
        return "MENSUAL";
    }

    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getNombre() { return nombre; }
    public String getCategoria() { return categoria; }
    public double getMonto() { return monto; }
    public String getFrecuencia() { return frecuencia; }
    public String getEstado() { return estado; }
    public double getAhorroAcumulado() { return ahorroAcumulado; }

    public void setEstado(String nuevoEstado) {
        if (nuevoEstado == null) return;
        String e = nuevoEstado.trim().toUpperCase();
        if ("ACTIVA".equals(e) || "PAUSADA".equals(e) || "CANCELADA".equals(e)) {
            this.estado = e;
        } else {
            throw new IllegalArgumentException("Estado inválido. Use ACTIVA, PAUSADA o CANCELADA.");
        }
    }

    public void setAhorroAcumulado(double ahorroAcumulado) {
        this.ahorroAcumulado = Math.max(0.0, ahorroAcumulado);
    }

    public long calcularCostoMensual() {
        if ("SEMANAL".equals(frecuencia)) {
            return Math.round(monto * 4.333333);
        }
        if ("ANUAL".equals(frecuencia)) {
            return Math.round(monto / 12.0);
        }
        return Math.round(monto);
    }

    public long calcularCostoAnual() {
        if ("SEMANAL".equals(frecuencia)) {
            return Math.round(monto * 52.0);
        }
        if ("MENSUAL".equals(frecuencia)) {
            return Math.round(monto * 12.0);
        }
        return Math.round(monto);
    }
}
