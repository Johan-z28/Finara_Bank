package transferencias;

/**
 * Modelo POO para cuentas bancarias y tarjetas en memoria para Finara Bank.
 */
public class CuentaBancaria {
    private final String numero;
    private final String titular;
    private final String documentoTitular;
    private final String tipo; // AHORROS, CORRIENTE, CREDITO
    private double saldo;
    private double deudaActual;
    private double cupoDisponible;
    private final double cupoMaximo;
    private boolean bloqueada;

    // Constructor para Cuentas de Ahorros o Corrientes
    public CuentaBancaria(String numero, String titular, String documentoTitular, String tipo, double saldo, boolean bloqueada) {
        this.numero = numero != null ? numero.replaceAll("\\D", "") : "";
        this.titular = titular != null ? titular.trim() : "";
        this.documentoTitular = documentoTitular != null ? documentoTitular.trim() : "";
        this.tipo = tipo != null ? tipo.trim().toUpperCase() : "AHORROS";
        this.saldo = Math.max(0.0, saldo);
        this.bloqueada = bloqueada;
        this.deudaActual = 0.0;
        this.cupoDisponible = 0.0;
        this.cupoMaximo = 0.0;
    }

    // Constructor para Tarjetas de Crédito
    public CuentaBancaria(String numero, String titular, String documentoTitular, double cupoMaximo, double deudaActual, boolean bloqueada) {
        this.numero = numero != null ? numero.replaceAll("\\D", "") : "";
        this.titular = titular != null ? titular.trim() : "";
        this.documentoTitular = documentoTitular != null ? documentoTitular.trim() : "";
        this.tipo = "CREDITO";
        this.cupoMaximo = Math.max(0.0, cupoMaximo);
        this.deudaActual = Math.max(0.0, Math.min(deudaActual, this.cupoMaximo));
        this.cupoDisponible = Math.max(0.0, this.cupoMaximo - this.deudaActual);
        this.saldo = 0.0;
        this.bloqueada = bloqueada;
    }

    public String getNumero() { return numero; }
    public String getTitular() { return titular; }
    public String getDocumentoTitular() { return documentoTitular; }
    public String getTipo() { return tipo; }
    public double getSaldo() { return saldo; }
    public double getDeudaActual() { return deudaActual; }
    public double getCupoDisponible() { return cupoDisponible; }
    public double getCupoMaximo() { return cupoMaximo; }
    public boolean isBloqueada() { return bloqueada; }

    public void setBloqueada(boolean bloqueada) {
        this.bloqueada = bloqueada;
    }

    public void debitarSaldo(double monto) {
        this.saldo -= monto;
    }

    public void acreditarSaldo(double monto) {
        this.saldo += monto;
    }

    public void aumentarDeuda(double valorAvance) {
        this.deudaActual += valorAvance;
        this.cupoDisponible = Math.max(0.0, this.cupoMaximo - this.deudaActual);
    }

    public double getDisponibleParaOperar() {
        if (bloqueada) return 0.0;
        if ("CREDITO".equals(tipo)) {
            return Math.max(0.0, Math.floor(cupoDisponible * ServicioInterbancario.TOPE_AVANCE_CREDITO));
        } else if ("CORRIENTE".equals(tipo)) {
            double sobregiro = Math.max(0.0, saldo * ServicioInterbancario.SOBREGIRO_CORRIENTE);
            return Math.max(0.0, saldo + sobregiro);
        } else {
            return Math.max(0.0, saldo);
        }
    }
}

