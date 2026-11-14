package Prestamos;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Modelo de préstamo Finara Bank (libre inversión, vehículo, hipotecario).
 */
public class Prestamos implements Serializable {
    private static final long serialVersionUID = 1L;

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
    private String fechaRegistro;
    private LocalDate fechaProximaCuota;
    private List<String> historialPagos;
    private String cuentaDesembolso;

    public Prestamos(String radicado, double monto, int meses, double cuotaMensual,
                     String tasaInteres, String estado, String concepto,
                     String tipoId, boolean activo) {
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
        this.fechaRegistro = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        this.fechaProximaCuota = activo ? LocalDate.now().plusMonths(1) : null;
        this.historialPagos = new ArrayList<>();
        this.cuentaDesembolso = "";
    }

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
    public String getFechaRegistro() { return fechaRegistro; }
    public LocalDate getFechaProximaCuota() { return fechaProximaCuota; }
    public void setFechaProximaCuota(LocalDate fechaProximaCuota) { this.fechaProximaCuota = fechaProximaCuota; }
    public String getCuentaDesembolso() { return cuentaDesembolso; }
    public void setCuentaDesembolso(String cuentaDesembolso) { this.cuentaDesembolso = cuentaDesembolso; }

    public List<String> getPagosRealizados() {
        if (historialPagos == null) {
            historialPagos = new ArrayList<>();
        }
        return historialPagos;
    }

    public void registrarPagoCuota(double valorPagado, String numeroCuentaOrigen) {
        this.cuotasPagadas++;
        String registro = String.format("Cuota #%d/%d | %s | %s | Cuenta •••• %s",
                cuotasPagadas,
                meses,
                LocalDate.now(),
                core.Consola.formatoCOP(valorPagado),
                numeroCuentaOrigen != null && numeroCuentaOrigen.length() >= 4
                        ? numeroCuentaOrigen.substring(numeroCuentaOrigen.length() - 4) : "0000");
        getPagosRealizados().add(registro);

        if (cuotasPagadas >= meses) {
            this.estado = "PAGADO";
            this.activo = false;
            this.fechaProximaCuota = null;
        } else {
            this.fechaProximaCuota = LocalDate.now().plusMonths(1);
        }
    }

    public double getSaldoPendienteEstimado() {
        int restantes = Math.max(0, meses - cuotasPagadas);
        return restantes * cuotaMensual;
    }
}
