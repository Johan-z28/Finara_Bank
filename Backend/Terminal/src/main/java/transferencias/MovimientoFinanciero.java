package transferencias;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Registro de movimiento financiero para auditoría y consulta (HU-05).
 */
public class MovimientoFinanciero {
    private final String idMovimiento;
    private final String referencia;
    private final String numeroCuenta;
    private final String tipoOperacion; // TRANSFERENCIA_INTERNA, RETIRO, AVANCE_CREDITO
    private final String categoria; // "Transferencia", "Retiro", "Avance"
    private final String naturaleza; // "DEBITO", "CREDITO"
    private final double monto;
    private final double saldoPosterior;
    private final LocalDateTime fechaHora;
    private final String descripcion;

    public MovimientoFinanciero(String idMovimiento, String referencia, String numeroCuenta,
                                String tipoOperacion, String categoria, String naturaleza,
                                double monto, double saldoPosterior, LocalDateTime fechaHora,
                                String descripcion) {
        this.idMovimiento = idMovimiento;
        this.referencia = referencia;
        this.numeroCuenta = numeroCuenta;
        this.tipoOperacion = tipoOperacion;
        this.categoria = categoria;
        this.naturaleza = naturaleza;
        this.monto = monto;
        this.saldoPosterior = saldoPosterior;
        this.fechaHora = fechaHora;
        this.descripcion = descripcion;
    }

    public String getIdMovimiento() { return idMovimiento; }
    public String getReferencia() { return referencia; }
    public String getNumeroCuenta() { return numeroCuenta; }
    public String getTipoOperacion() { return tipoOperacion; }
    public String getCategoria() { return categoria; }
    public String getNaturaleza() { return naturaleza; }
    public double getMonto() { return monto; }
    public double getSaldoPosterior() { return saldoPosterior; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public String getDescripcion() { return descripcion; }

    @Override
    public String toString() {
        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        formatoCOP.setMaximumFractionDigits(0);
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
        String signo = "DEBITO".equalsIgnoreCase(naturaleza) ? "-" : "+";
        return "[" + fechaHora.format(dtf) + "] " + idMovimiento + " | Ref: " + referencia +
                " | Cta: •••• " + (numeroCuenta.length() > 4 ? numeroCuenta.substring(numeroCuenta.length() - 4) : numeroCuenta) +
                " | " + tipoOperacion + " (" + categoria + ") | " + signo + formatoCOP.format(monto) +
                " | Saldo/Cupo Resultante: " + formatoCOP.format(saldoPosterior) +
                " | Detalle: " + descripcion;
    }
}

