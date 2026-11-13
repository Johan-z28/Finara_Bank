package suscripcionesPagos;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Modelo de Pago Pendiente en la agenda mensual (HU-22).
 */
public class PagoPendiente {
    private String id;
    private String username;
    private String nombre;
    private String tipo; // SERVICIO, TARJETA, CUOTA, OTRO
    private double monto;
    private LocalDate fechaVencimiento;
    private boolean pagado;
    private LocalDate fechaPago;

    public PagoPendiente(String id, String username, String nombre, String tipo,
                         double monto, LocalDate fechaVencimiento) {
        if (nombre == null || nombre.trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del pago es obligatorio.");
        }
        if (monto <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor a cero.");
        }
        if (fechaVencimiento == null) {
            throw new IllegalArgumentException("La fecha de vencimiento es obligatoria.");
        }

        this.id = id;
        this.username = username;
        this.nombre = nombre.trim();
        this.tipo = normalizarTipo(tipo);
        this.monto = monto;
        this.fechaVencimiento = fechaVencimiento;
        this.pagado = false;
        this.fechaPago = null;
    }

    private String normalizarTipo(String tipo) {
        if (tipo == null) return "OTRO";
        String t = tipo.trim().toUpperCase();
        if ("SERVICIO".equals(t) || "TARJETA".equals(t) || "CUOTA".equals(t) || "OTRO".equals(t)) {
            return t;
        }
        return "OTRO";
    }

    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getNombre() { return nombre; }
    public String getTipo() { return tipo; }
    public double getMonto() { return monto; }
    public LocalDate getFechaVencimiento() { return fechaVencimiento; }
    public boolean isPagado() { return pagado; }
    public LocalDate getFechaPago() { return fechaPago; }

    public void marcarComoPagado() {
        this.pagado = true;
        this.fechaPago = LocalDate.now();
    }

    public String getEstadoPago() {
        if (pagado) {
            return "PAGADO";
        }
        LocalDate hoy = LocalDate.now();
        long diasRestantes = ChronoUnit.DAYS.between(hoy, fechaVencimiento);
        if (diasRestantes < 0) {
            return "VENCIDO";
        }
        if (diasRestantes <= 3) {
            return "PROXIMO";
        }
        return "PENDIENTE";
    }
}
