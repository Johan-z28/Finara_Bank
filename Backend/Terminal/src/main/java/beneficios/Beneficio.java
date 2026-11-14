package beneficios;

import java.io.Serializable;

/**
 * Representa un beneficio o recompensa que puede recibir un cliente en Finara Bank (HU-08).
 */
public class Beneficio implements Serializable {
    private static final long serialVersionUID = 1L;
    private final String idBeneficio;
    private final String categoria; // Cashback, Descuento, Puntos Finara, Tasa Preferencial, Seguro
    private final String titulo;
    private final String descripcion;
    private final String productoAplica; // Débito, Crédito Gold, Corriente, Todos
    private final String vigencia;
    private final String codigoPromocional;
    private boolean redimido;

    public Beneficio(String idBeneficio, String categoria, String titulo, String descripcion,
                     String productoAplica, String vigencia, String codigoPromocional) {
        this.idBeneficio = idBeneficio;
        this.categoria = categoria;
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.productoAplica = productoAplica;
        this.vigencia = vigencia;
        this.codigoPromocional = codigoPromocional;
        this.redimido = false;
    }

    public String getIdBeneficio() { return idBeneficio; }
    public String getCategoria() { return categoria; }
    public String getTitulo() { return titulo; }
    public String getDescripcion() { return descripcion; }
    public String getProductoAplica() { return productoAplica; }
    public String getVigencia() { return vigencia; }
    public String getCodigoPromocional() { return codigoPromocional; }
    public boolean isRedimido() { return redimido; }

    public void setRedimido(boolean redimido) {
        this.redimido = redimido;
    }

    public void imprimirFicha() {
        System.out.println("   ┌─────────────────────────────────────────────────────────────┐");
        System.out.printf("   │ [%-11s] %-45s │\n", idBeneficio, titulo.length() > 45 ? titulo.substring(0, 42) + "..." : titulo);
        System.out.println("   ├─────────────────────────────────────────────────────────────┤");
        System.out.printf("   │ Categoría:   %-46s │\n", categoria);
        System.out.printf("   │ Aplica para: %-46s │\n", productoAplica);
        System.out.printf("   │ Vigencia:    %-46s │\n", vigencia);
        System.out.printf("   │ Código:      %-46s │\n", codigoPromocional);
        System.out.printf("   │ Estado:      %-46s │\n", (redimido ? "✅ REDIMIDO" : "⭐ DISPONIBLE"));
        System.out.println("   │ Detalle:                                                    │");
        System.out.printf("   │   %-57s │\n", descripcion.length() > 57 ? descripcion.substring(0, 54) + "..." : descripcion);
        System.out.println("   └─────────────────────────────────────────────────────────────┘");
    }
}
