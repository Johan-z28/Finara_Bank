package gestionDeudas;

import java.time.LocalDate;

public class Suscripcion {
    private String id;
    private String nombre;
    private String categoria;
    private double monto;
    private String frecuencia; // SEMANAL, MENSUAL, ANUAL
    private String estado;     // ACTIVA, PAUSADA, CANCELADA
    private String fechaCreacion;
    private String fechaCambioEstado;
    private double ahorroAcumulado;

    public Suscripcion(String id, String nombre, String categoria, double monto, String frecuencia) {
        this.id = id;
        this.nombre = nombre;
        this.categoria = categoria;
        this.monto = monto;
        this.frecuencia = frecuencia != null ? frecuencia.toUpperCase() : "MENSUAL";
        this.estado = "ACTIVA";
        this.fechaCreacion = LocalDate.now().toString();
        this.fechaCambioEstado = null;
        this.ahorroAcumulado = 0.0;
    }

    public double calcularCostoMensual() {
        if (monto <= 0) return 0;
        if ("SEMANAL".equalsIgnoreCase(frecuencia)) {
            return Math.round(monto * 4.333333);
        } else if ("ANUAL".equalsIgnoreCase(frecuencia)) {
            return Math.round(monto / 12.0);
        }
        return Math.round(monto);
    }

    public double calcularCostoAnual() {
        if (monto <= 0) return 0;
        if ("SEMANAL".equalsIgnoreCase(frecuencia)) {
            return Math.round(monto * 52.0);
        } else if ("MENSUAL".equalsIgnoreCase(frecuencia)) {
            return Math.round(monto * 12.0);
        }
        return Math.round(monto);
    }

    // Getters y Setters
    public String getId() { return id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public double getMonto() { return monto; }
    public void setMonto(double monto) { this.monto = monto; }
    public String getFrecuencia() { return frecuencia; }
    public void setFrecuencia(String frecuencia) { this.frecuencia = frecuencia; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) {
        this.estado = estado;
        this.fechaCambioEstado = LocalDate.now().toString();
    }
    public String getFechaCreacion() { return fechaCreacion; }
    public String getFechaCambioEstado() { return fechaCambioEstado; }
    public double getAhorroAcumulado() { return ahorroAcumulado; }
    public void setAhorroAcumulado(double ahorroAcumulado) { this.ahorroAcumulado = ahorroAcumulado; }

    @Override
    public String toString() {
        return String.format("[%s] %-20s | Cat: %-14s | Monto: $%,10.0f (%s) | Mensual: $%,10.0f | Anual: $%,10.0f",
                estado, nombre, categoria, monto, frecuencia, calcularCostoMensual(), calcularCostoAnual());
    }
}
