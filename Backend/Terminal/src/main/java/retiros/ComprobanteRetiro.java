package retiros;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Representa el comprobante oficial emitido tras un retiro exitoso de dinero.
 */
public class ComprobanteRetiro {
    private final String referencia;
    private final LocalDateTime fechaHora;
    private final String tipoProducto;
    private final String numeroCuenta;
    private final String titular;
    private final double montoRetirado;
    private final double interesRendimiento;
    private final double sobregiroUsado;
    private final double totalDebitado;
    private final double nuevoSaldo;
    private final double nuevoCupoDisponible;
    private final String canal;
    private final String concepto;
    private final String estado;

    public ComprobanteRetiro(String referencia, LocalDateTime fechaHora, String tipoProducto,
                             String numeroCuenta, String titular, double montoRetirado,
                             double interesRendimiento, double sobregiroUsado, double totalDebitado,
                             double nuevoSaldo, double nuevoCupoDisponible, String canal,
                             String concepto, String estado) {
        this.referencia = referencia;
        this.fechaHora = fechaHora;
        this.tipoProducto = tipoProducto;
        this.numeroCuenta = numeroCuenta;
        this.titular = titular;
        this.montoRetirado = montoRetirado;
        this.interesRendimiento = interesRendimiento;
        this.sobregiroUsado = sobregiroUsado;
        this.totalDebitado = totalDebitado;
        this.nuevoSaldo = nuevoSaldo;
        this.nuevoCupoDisponible = nuevoCupoDisponible;
        this.canal = canal;
        this.concepto = concepto;
        this.estado = estado;
    }

    public String getReferencia() { return referencia; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public double getMontoRetirado() { return montoRetirado; }
    public double getInteresRendimiento() { return interesRendimiento; }
    public double getSobregiroUsado() { return sobregiroUsado; }
    public double getNuevoSaldo() { return nuevoSaldo; }
    public double getNuevoCupoDisponible() { return nuevoCupoDisponible; }
    public String getEstado() { return estado; }

    public void imprimirComprobante() {
        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        formatoCOP.setMaximumFractionDigits(0);
        DateTimeFormatter formatoFecha = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

        System.out.println("\n=======================================================");
        System.out.println("              COMPROBANTE DE RETIRO DE DINERO          ");
        System.out.println("                     FINARA BANK                       ");
        System.out.println("=======================================================");
        System.out.println(" Número de Referencia:       " + referencia);
        System.out.println(" Fecha y Hora:               " + fechaHora.format(formatoFecha));
        System.out.println(" Canal / Medio:              " + canal);
        System.out.println(" Estado de Operación:        " + estado);
        System.out.println("-------------------------------------------------------");
        System.out.println(" Producto Financiero:        " + tipoProducto);
        System.out.println(" Número de Cuenta/Plástico:  •••• " + enmascarar(numeroCuenta));
        if (titular != null && !titular.isEmpty()) {
            System.out.println(" Titular:                    " + titular);
        }
        System.out.println(" Concepto / Motivo:          " + (concepto != null && !concepto.isEmpty() ? concepto : "Retiro de efectivo"));
        System.out.println("-------------------------------------------------------");
        System.out.println(" Monto Solicitado:           " + formatoCOP.format(montoRetirado));

        if (interesRendimiento > 0.0) {
            System.out.println(" Rendimiento Abonado (1.5%): +" + formatoCOP.format(interesRendimiento));
        }
        if (sobregiroUsado > 0.0) {
            System.out.println(" Uso de Sobregiro (20%):     " + formatoCOP.format(sobregiroUsado));
        }

        System.out.println(" Total Debitado / Operación: " + formatoCOP.format(totalDebitado));

        if (nuevoCupoDisponible > 0.0) {
            System.out.println(" Cupo Disponible Resultante: " + formatoCOP.format(nuevoCupoDisponible));
        } else {
            System.out.println(" Saldo Resultante:           " + formatoCOP.format(nuevoSaldo));
        }

        System.out.println(" Comisión de Retiro:         $0 COP");
        System.out.println("=======================================================");
    }

    private String enmascarar(String num) {
        if (num == null) return "0000";
        String limpio = num.replaceAll("\\D", "");
        return limpio.length() > 4 ? limpio.substring(limpio.length() - 4) : limpio;
    }
}
