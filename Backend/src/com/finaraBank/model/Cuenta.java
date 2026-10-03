public class Cuenta {
    private String idCuenta;
    private String idUsuario;
    private String tipoCuenta;
    private String numeroCuenta;
    private double saldo;

    public Cuenta(String idCuenta, String idUsuario, String tipoCuenta, String numeroCuenta, double saldo) {
        this.idCuenta = idCuenta;
        this.idUsuario = idUsuario;
        this.tipoCuenta = tipoCuenta;
        this.numeroCuenta = numeroCuenta;
        this.saldo = saldo;
    }

    public String getIdCuenta() { return idCuenta; }
    public String getIdUsuario() { return idUsuario; }
    public String getTipoCuenta() { return tipoCuenta; }
    public String getNumeroCuenta() { return numeroCuenta; }
    public double getSaldo() { return saldo; }

    public String getNumeroParcial() {
        if (numeroCuenta != null && numeroCuenta.length() >= 4) {
            return "**** **** " + numeroCuenta.substring(numeroCuenta.length() - 4);
        }
        return "**** " + numeroCuenta;
    }
}