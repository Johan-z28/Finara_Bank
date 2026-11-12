package gestionDeudas;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public class PagoPendiente {
    private String id;
    private String nombre;
    private String tipo; // SERVICIO, TARJETA, CUOTA, OTRO
    private double monto;
    private String fechaVencimiento; // YYYY-MM-DD
    private boolean pagado;
    private String origen; // MANUAL, PRESTAMO, TARJETA
    private String referencia;

    public PagoPendiente(String id, String nombre, String tipo, double monto, String fechaVencimiento, String origen, String referencia) {
        this.id = id;
        this.nombre = nombre;
        this.tipo = tipo != null ? tipo.toUpperCase() : "SERVICIO";
        this.monto = monto;
        this.fechaVencimiento = fechaVencimiento;
        this.pagado = false;
        this.origen = origen != null ? origen.toUpperCase() : "MANUAL";
        this.referencia = referencia != null ? referencia : "";
    }

    public String obtenerEstadoSemaforo() {
        if (pagado) {
            return "PAGADO (Al día)";
        }
        if (fechaVencimiento == null || fechaVencimiento.isEmpty()) {
            return "AL DÍA";
        }
        try {
            LocalDate hoy = LocalDate.now();
            LocalDate venc = LocalDate.parse(fechaVencimiento);
            long dias = ChronoUnit.DAYS.between(hoy, venc);

            if (dias < 0) {
                return "🔴 VENCIDO (hace " + Math.abs(dias) + " días)";
            } else if (dias <= 7) {
                return "🟡 PRÓXIMO A VENCER (" + dias + " días)";
            } else {
                return "🟢 AL DÍA (faltan " + dias + " días)";
            }
        } catch (Exception e) {
            return "AL DÍA";
        }
    }

    // Getters y Setters
    public String getId() { return id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public double getMonto() { return monto; }
    public void setMonto(double monto) { this.monto = monto; }
    public String getFechaVencimiento() { return fechaVencimiento; }
    public void setFechaVencimiento(String fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }
    public boolean isPagado() { return pagado; }
    public void setPagado(boolean pagado) { this.pagado = pagado; }
    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }
    public String getReferencia() { return referencia; }
    public void setReferencia(String referencia) { this.referencia = referencia; }

    @Override
    public String toString() {
        return String.format("[%s] %-25s | Tipo: %-8s | Monto: $%,10.0f | Vence: %-10s | %s",
                (pagado ? "✓ PAGADO" : "PENDIENTE"), nombre, tipo, monto, fechaVencimiento, obtenerEstadoSemaforo());
    }
}
