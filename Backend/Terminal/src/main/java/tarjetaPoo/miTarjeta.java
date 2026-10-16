package tarjetaPoo;

import java.util.Random;

// Clase Padre Abstracta
public abstract class miTarjeta {
    protected String tipo;
    protected String titulo;
    protected String numeroTarjeta;
    protected String proposito;
    protected double ingresosRequeridos;

    public miTarjeta(String tipo, String titulo, String proposito, double ingresosRequeridos) {
        this.tipo = tipo;
        this.titulo = titulo;
        this.proposito = proposito;
        this.ingresosRequeridos = ingresosRequeridos;
        this.numeroTarjeta = generarNumeroUnico();
    }

    private String generarNumeroUnico() {
        Random rand = new Random();
        int b1 = 1000 + rand.nextInt(9000);
        int b2 = 1000 + rand.nextInt(9000);
        int b3 = 1000 + rand.nextInt(9000);
        return "4532 " + b1 + " " + b2 + " " + b3;
    }

    public abstract boolean validarYAprobar(double ingresos, int estrato);

    public String getTitulo() { return titulo; }
    public String getNumeroTarjeta() { return numeroTarjeta; }
    public String getTipo() { return tipo; }

    public void mostrarDetalles() {
        System.out.println("   [Producto] " + titulo);
        System.out.println("   N° Tarjeta: " + numeroTarjeta);
        System.out.println("   Propósito: " + proposito);
    }
}

// Subclase 1: Tarjeta Débito
class TarjetaDebito extends miTarjeta {
    public TarjetaDebito() {
        super("debito", "Tarjeta Débito Finara", "Guardar y retirar dinero de forma segura.", 0);
    }
    @Override
    public boolean validarYAprobar(double ingresos, int estrato) {
        return true; // Se aprueba para todos
    }
}

// Subclase 2: Tarjeta de Crédito Gold
class TarjetaCredito extends miTarjeta {
    public TarjetaCredito() {
        super("credito", "Tarjeta de Crédito Gold", "Financiamiento y compras a cuotas.", 20000000);
    }
    @Override
    public boolean validarYAprobar(double ingresos, int estrato) {
        return ingresos >= 20000000 && estrato >= 2;
    }
}

// Subclase 3: Tarjeta Cuenta Corriente
class TarjetaCorriente extends miTarjeta {
    public TarjetaCorriente() {
        super("corriente", "Tarjeta Cuenta Corriente", "Gestión diaria y sobregiro autorizado.", 12000000);
    }
    @Override
    public boolean validarYAprobar(double ingresos, int estrato) {
        return ingresos >= 12000000;
    }
}