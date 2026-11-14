package asesoriaEndeudamiento;

import java.io.Serializable;

public class Obligacion implements Serializable {
    private static final long serialVersionUID = 1L;
    private String id;
    private String tipo; // TARJETA, PRESTAMO, HIPOTECA, VEHICULO, LIBRANZA, OTRO
    private String entidad;
    private double saldoTotal;
    private double cuotaMensual;
    private double tasaEA;
    private int plazoRestanteMeses;
    private String origen; // MANUAL, FINARA
    private String referencia;

    public Obligacion(String id, String tipo, String entidad, double saldoTotal, double cuotaMensual, double tasaEA, int plazoRestanteMeses, String origen, String referencia) {
        this.id = id;
        this.tipo = tipo != null ? tipo.toUpperCase() : "PRESTAMO";
        this.entidad = entidad;
        this.saldoTotal = saldoTotal;
        this.cuotaMensual = cuotaMensual;
        this.tasaEA = tasaEA;
        this.plazoRestanteMeses = Math.max(1, plazoRestanteMeses);
        this.origen = origen != null ? origen.toUpperCase() : "MANUAL";
        this.referencia = referencia != null ? referencia : "";
    }

    public double calcularInteresMensual() {
        if (saldoTotal <= 0 || tasaEA <= 0) return 0;
        double tasaMensual = Math.pow(1 + (tasaEA / 100.0), 1.0 / 12.0) - 1;
        return saldoTotal * tasaMensual;
    }

    // Getters y Setters
    public String getId() { return id; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getEntidad() { return entidad; }
    public void setEntidad(String entidad) { this.entidad = entidad; }
    public double getSaldoTotal() { return saldoTotal; }
    public void setSaldoTotal(double saldoTotal) { this.saldoTotal = saldoTotal; }
    public double getCuotaMensual() { return cuotaMensual; }
    public void setCuotaMensual(double cuotaMensual) { this.cuotaMensual = cuotaMensual; }
    public double getTasaEA() { return tasaEA; }
    public void setTasaEA(double tasaEA) { this.tasaEA = tasaEA; }
    public int getPlazoRestanteMeses() { return plazoRestanteMeses; }
    public void setPlazoRestanteMeses(int plazoRestanteMeses) { this.plazoRestanteMeses = plazoRestanteMeses; }
    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }
    public String getReferencia() { return referencia; }
    public void setReferencia(String referencia) { this.referencia = referencia; }

    @Override
    public String toString() {
        return String.format("[%s] %-24s | Tipo: %-9s | Saldo: $%,11.0f | Cuota: $%,9.0f | Tasa: %5.1f%% E.A. | Plazo: %2d m",
                (origen.equals("FINARA") ? "FINARA" : "MANUAL"), entidad, tipo, saldoTotal, cuotaMensual, tasaEA, plazoRestanteMeses);
    }
}
