package movimientos;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Representa un registro de movimiento financiero en Finara Bank (HU-05).
 */
public class MovimientoFinanciero {
    private final String idMovimiento;
    private final String referencia;
    private final String numeroCuenta;
    private final String tipoProducto; // Ahorros, Corriente, Tarjeta de Crédito
    private final String categoria;     // Transferencia, Retiro, Pago, Depósito, Interés
    private final String tipoOperacion; // INGRESO, EGRESO
    private final double valor;
    private final double saldoPosterior;
    private final LocalDateTime fechaHora;
    private final String descripcion;

    public MovimientoFinanciero(String idMovimiento, String referencia, String numeroCuenta,
                                String tipoProducto, String categoria, String tipoOperacion,
                                double valor, double saldoPosterior, LocalDateTime fechaHora,
                                String descripcion) {
        this.idMovimiento = idMovimiento;
        this.referencia = referencia;
        this.numeroCuenta = numeroCuenta != null ? numeroCuenta.replaceAll("\\D", "") : "";
        this.tipoProducto = tipoProducto != null ? tipoProducto : "Cuenta de Ahorros";
        this.categoria = categoria != null ? categoria : "General";
        this.tipoOperacion = tipoOperacion != null ? tipoOperacion.toUpperCase() : "EGRESO";
        this.valor = Math.max(0.0, valor);
        this.saldoPosterior = saldoPosterior;
        this.fechaHora = fechaHora != null ? fechaHora : LocalDateTime.now();
        this.descripcion = descripcion != null ? descripcion : "Movimiento bancario";
    }

    public String getIdMovimiento() { return idMovimiento; }
    public String getReferencia() { return referencia; }
    public String getNumeroCuenta() { return numeroCuenta; }
    public String getTipoProducto() { return tipoProducto; }
    public String getCategoria() { return categoria; }
    public String getTipoOperacion() { return tipoOperacion; }
    public double getValor() { return valor; }
    public double getSaldoPosterior() { return saldoPosterior; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public String getDescripcion() { return descripcion; }

    public void imprimirFila(NumberFormat formatoCOP, DateTimeFormatter dtf) {
        String ultimos4 = numeroCuenta.length() > 4 ? numeroCuenta.substring(numeroCuenta.length() - 4) : numeroCuenta;
        String signo = "INGRESO".equalsIgnoreCase(tipoOperacion) ? "+" : "-";
        System.out.printf("| %-19s | %-12s | •••• %-4s | %-14s | %-10s | %1s%-13s | %14s | %-28s |\n",
                fechaHora.format(dtf),
                idMovimiento,
                ultimos4,
                categoria,
                tipoOperacion,
                signo,
                formatoCOP.format(valor),
                formatoCOP.format(saldoPosterior),
                descripcion.length() > 28 ? descripcion.substring(0, 25) + "..." : descripcion
        );
    }
}
