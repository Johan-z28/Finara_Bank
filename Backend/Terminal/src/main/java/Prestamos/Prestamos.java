package Prestamos;

import java.util.ArrayList;
import java.util.List;

public class Prestamos {
    private String radicado;
    private double monto;
    private int meses;
    private double cuotaMensual;
    private String tasaInteres;
    private String estado; // APROBADO, EN_REVISION, RECHAZADO, PAGADO
    private String concepto;
    private String tipoId; // libre, vehiculo, hipotecario
    private boolean activo;
    private int cuotasPagadas;
    private String usuario;
    private List<String> historialPagos;

    public Prestamos(String radicado, double monto, int meses, double cuotaMensual, String tasaInteres, String estado, String concepto, String tipoId, boolean activo, String usuario) {
        this.radicado = radicado;
        this.monto = monto;
        this.meses = meses;
        this.cuotaMensual = cuotaMensual;
        this.tasaInteres = tasaInteres;
        this.estado = estado;
        this.concepto = concepto;
        this.tipoId = tipoId;
        this.activo = activo;
        this.cuotasPagadas = 0;
        this.usuario = usuario != null ? usuario : "usuario_demo";
        this.historialPagos = new ArrayList<>();
    }

    public Prestamos(String radicado, double monto, int meses, double cuotaMensual, String tasaInteres, String estado, String concepto, String tipoId, boolean activo) {
        this(radicado, monto, meses, cuotaMensual, tasaInteres, estado, concepto, tipoId, activo, "usuario_demo");
    }

    // Getters y Setters
    public String getRadicado() { return radicado; }
    public double getMonto() { return monto; }
    public int getMeses() { return meses; }
    public double getCuotaMensual() { return cuotaMensual; }
    public String getTasaInteres() { return tasaInteres; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getConcepto() { return concepto; }
    public String getTipoId() { return tipoId; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public int getCuotasPagadas() { return cuotasPagadas; }
    public void setCuotasPagadas(int cuotasPagadas) { this.cuotasPagadas = cuotasPagadas; }
    public String getUsuario() { return usuario; }
    public void setUsuario(String usuario) { this.usuario = usuario; }
    public List<String> getHistorialPagos() { return historialPagos; }

    public void registrarPago(double valor, String cuentaOrigen) {
        this.cuotasPagadas++;
        this.historialPagos.add("Pago Cuota " + cuotasPagadas + "/" + meses + " - Valor: $" + valor + " - Cuenta: " + cuentaOrigen);
        if (this.cuotasPagadas >= this.meses) {
            this.estado = "PAGADO";
            this.activo = false;
        }
    }
}
