package presupuestos;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Modelo que representa un rubro de ingreso o gasto dentro del Presupuesto Mensual (HU-18 / HU-23).
 */
public class ItemPresupuesto implements Serializable {
    private static final long serialVersionUID = 1L;
    private String id;
    private String username;
    private String tipo; // "INGRESO" o "GASTO"
    private String categoria;
    private String descripcion;
    private double monto;
    private String periodo; // Formato "YYYY-MM"
    private String fechaCreacion;
    private String fechaModificacion;

    public ItemPresupuesto(String id, String username, String tipo, String categoria,
                           String descripcion, double monto, String periodo) {
        if (!"INGRESO".equalsIgnoreCase(tipo) && !"GASTO".equalsIgnoreCase(tipo)) {
            throw new IllegalArgumentException("Tipo inválido. Debe ser INGRESO o GASTO.");
        }
        if (monto <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor a cero.");
        }
        if (categoria == null || categoria.trim().isEmpty()) {
            throw new IllegalArgumentException("La categoría es obligatoria.");
        }

        this.id = id;
        this.username = username;
        this.tipo = tipo.toUpperCase();
        this.categoria = categoria.trim().toLowerCase();
        this.descripcion = descripcion != null ? descripcion.trim() : "";
        this.monto = monto;
        this.periodo = periodo;
        this.fechaCreacion = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        this.fechaModificacion = this.fechaCreacion;
    }

    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) {
        if ("INGRESO".equalsIgnoreCase(tipo) || "GASTO".equalsIgnoreCase(tipo)) {
            this.tipo = tipo.toUpperCase();
            actualizarFechaModificacion();
        }
    }

    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) {
        if (categoria != null && !categoria.trim().isEmpty()) {
            this.categoria = categoria.trim().toLowerCase();
            actualizarFechaModificacion();
        }
    }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion != null ? descripcion.trim() : "";
        actualizarFechaModificacion();
    }

    public double getMonto() { return monto; }
    public void setMonto(double monto) {
        if (monto <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor a cero.");
        }
        this.monto = monto;
        actualizarFechaModificacion();
    }

    public String getPeriodo() { return periodo; }
    public void setPeriodo(String periodo) {
        if (periodo != null && !periodo.trim().isEmpty()) {
            this.periodo = periodo.trim();
            actualizarFechaModificacion();
        }
    }

    public String getFechaCreacion() { return fechaCreacion; }
    public String getFechaModificacion() { return fechaModificacion; }

    private void actualizarFechaModificacion() {
        this.fechaModificacion = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
