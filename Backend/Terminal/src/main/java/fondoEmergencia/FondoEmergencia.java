package fondoEmergencia;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Modelo que representa la meta del Fondo de Emergencia de un usuario (HU-19).
 */
public class FondoEmergencia {
    private String id;
    private String username;
    private double gastosFijosMensuales;
    private int mesesCobertura;
    private double metaMonto;
    private String cuentaVinculadaId;
    private String cuentaVinculadaNumero;
    private double saldoActual;
    private String fechaActualizacion;

    public FondoEmergencia(String id, String username, double gastosFijosMensuales, int mesesCobertura,
                           double metaMonto, String cuentaVinculadaId, String cuentaVinculadaNumero, double saldoActual) {
        this.id = id;
        this.username = username;
        this.gastosFijosMensuales = Math.max(0, gastosFijosMensuales);
        this.mesesCobertura = Math.max(1, Math.min(12, mesesCobertura));
        this.metaMonto = Math.max(0, metaMonto);
        this.cuentaVinculadaId = cuentaVinculadaId;
        this.cuentaVinculadaNumero = cuentaVinculadaNumero;
        this.saldoActual = Math.max(0, saldoActual);
        actualizarFecha();
    }

    public String getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public double getGastosFijosMensuales() {
        return gastosFijosMensuales;
    }

    public void setGastosFijosMensuales(double gastosFijosMensuales) {
        this.gastosFijosMensuales = Math.max(0, gastosFijosMensuales);
        actualizarFecha();
    }

    public int getMesesCobertura() {
        return mesesCobertura;
    }

    public void setMesesCobertura(int mesesCobertura) {
        this.mesesCobertura = Math.max(1, Math.min(12, mesesCobertura));
        actualizarFecha();
    }

    public double getMetaMonto() {
        return metaMonto;
    }

    public void setMetaMonto(double metaMonto) {
        this.metaMonto = Math.max(0, metaMonto);
        actualizarFecha();
    }

    public String getCuentaVinculadaId() {
        return cuentaVinculadaId;
    }

    public void setCuentaVinculadaId(String cuentaVinculadaId) {
        this.cuentaVinculadaId = cuentaVinculadaId;
        actualizarFecha();
    }

    public String getCuentaVinculadaNumero() {
        return cuentaVinculadaNumero;
    }

    public void setCuentaVinculadaNumero(String cuentaVinculadaNumero) {
        this.cuentaVinculadaNumero = cuentaVinculadaNumero;
        actualizarFecha();
    }

    public double getSaldoActual() {
        return saldoActual;
    }

    public void setSaldoActual(double saldoActual) {
        this.saldoActual = Math.max(0, saldoActual);
        actualizarFecha();
    }

    public String getFechaActualizacion() {
        return fechaActualizacion;
    }

    private void actualizarFecha() {
        this.fechaActualizacion = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    public int getPorcentajeReal() {
        if (metaMonto <= 0) {
            return 0;
        }
        return (int) Math.round((saldoActual / metaMonto) * 100.0);
    }

    public int getPorcentajeAvance() {
        return Math.min(100, getPorcentajeReal());
    }

    public double getMontoFaltante() {
        if (metaMonto <= 0) {
            return 0.0;
        }
        return Math.max(0.0, metaMonto - saldoActual);
    }

    public double getMesesCubiertos() {
        if (gastosFijosMensuales <= 0) {
            return 0.0;
        }
        return saldoActual / gastosFijosMensuales;
    }

    public String getNivelSeguridad() {
        if (metaMonto <= 0) {
            return "Sin meta definida";
        }
        int porcentaje = getPorcentajeReal();
        if (porcentaje >= 100) {
            return "¡Meta cumplida y protegida!";
        }
        if (porcentaje >= 50) {
            return "Buen camino (Más del 50%)";
        }
        return "En construcción";
    }
}
