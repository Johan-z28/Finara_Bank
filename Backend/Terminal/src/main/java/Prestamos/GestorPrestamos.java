package Prestamos;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class GestorPrestamos {
    private List<Prestamos> prestamos;

    // Tasas de interés mensuales según el frontend
    public final double TASA_LIBRE = 0.018;
    public final double TASA_VEHIVULO = 0.0138;
    public final double TASA_HIPOTECARIO = 0.0110;

    public GestorPrestamos() {
        this.prestamos = new ArrayList<>();
    }

    public List<Prestamos> getPrestamos() {
        return prestamos;
    }

    // Fórmula matemática de cuota fija (Amortización)
    public double calcularCuota(double monto, int meses, double tasaMensual) {
        if (monto <= 0 || meses <= 0) return 0;
        double numerador = tasaMensual * Math.pow(1 + tasaMensual, meses);
        double denominador = Math.pow(1 + tasaMensual, meses) - 1;
        double cuota = monto * (numerador / denominador);
        return Math.round(cuota);
    }

    // Evaluar viabilidad del crédito según el monto
    public String evaluarViabilidad(double monto) {
        if  (monto <= 5000000) {
            return "APROBADO";
        } else if  (monto <= 30000000) {
            return "EN REVISIÓN";
        } else {
            return "RECHAZADO";
        }
    }

    // Registrar solicitud de préstamo
    public String solicitarPrestamo(double monto, int meses, String concepto, String tipoId) {
        double tasaEM = TASA_LIBRE;
        String tasaTexto = "1.8% Mensual (24% E.A.)";

        if (tipoId.equalsIgnoreCase("vehiculo")) {
            tasaEM = TASA_VEHIVULO;
            tasaTexto = "1.38% Mensual (18% E.A.)";
        } else if (tipoId.equalsIgnoreCase("hipotecario")) {
            tasaEM = TASA_HIPOTECARIO;
            tasaTexto = "1.10% Mensual (14% E.A.)";
        }

        double cuota = calcularCuota(monto,meses,tasaEM);
        String estadoEval = evaluarViabilidad(monto);

        if (estadoEval.equals("RECHAZADO")) {
            return "❌ Solicitud rechazada: El monto excede el límite máximo autorizado ($ 30.000.000 COP).";
        }

        // Generar un radicado automático de prueba
        String radicado = "PRES-202611-" + (1000 + new Random().nextInt(9000));
        boolean esAprobado = estadoEval.equals("APROBADO");

        Prestamos nuevo = new Prestamos(radicado, monto, meses, cuota, tasaTexto, estadoEval, concepto, tipoId, esAprobado);
        prestamos.add(0,nuevo);

        return "✅ Solicitud registrada con éxito.\n   - Radicado: " + radicado + "\n   - Estado: " + estadoEval + "\n   - Cuota Mensual: $" + cuota;
    }

    // Buscar préstamo por número de radicado
    public Prestamos buscarPorRadicado(String radicado) {
        return prestamos.stream()
                .filter(p -> p.getRadicado().equalsIgnoreCase(radicado.trim()))
                .findFirst()
                .orElse(null);
    }
}
