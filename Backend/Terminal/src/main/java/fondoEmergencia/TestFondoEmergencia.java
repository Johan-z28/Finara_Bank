package fondoEmergencia;

/**
 * Pruebas unitarias básicas de consola para el módulo Fondo de Emergencia (HU-19).
 */
public class TestFondoEmergencia {
    public static void main(String[] args) {
        System.out.println("=== INICIANDO PRUEBAS DE FONDO DE EMERGENCIA (HU-19) ===");
        GestorFondoEmergencia gestor = new GestorFondoEmergencia();

        // 1. Prueba de simulación sugerida
        GestorFondoEmergencia.ResultadoSimulacion sim = gestor.calcularFondoSugerido(2000000, 6);
        assert sim.getCoberturaMinima() == 6000000 : "Error en cobertura mínima 3x";
        assert sim.getCoberturaRecomendada() == 12000000 : "Error en cobertura recomendada 6x";
        assert sim.getTotalSugerido() == 12000000 : "Error en total sugerido";
        System.out.println("[OK] Simulación de cobertura mínima (3x) y recomendada (6x)");

        // 2. Prueba de creación de meta y cálculo de progreso
        FondoEmergencia fondo = gestor.guardarMetaUsuario(
                "Juan", 12000000, 2000000, 6, "CTA-01", "4001-1234-5678", 6000000
        );
        assert fondo.getPorcentajeReal() == 50 : "Error en porcentaje inicial";
        assert fondo.getMontoFaltante() == 6000000 : "Error en monto faltante";
        assert Math.abs(fondo.getMesesCubiertos() - 3.0) < 0.01 : "Error en meses cubiertos";
        assert fondo.getNivelSeguridad().equals("Buen camino (Más del 50%)") : "Error en nivel de seguridad";
        System.out.println("[OK] Creación de meta y métricas iniciales (50% avance)");

        // 3. Prueba de proyección de tiempo
        int meses = gestor.simularMesesParaMeta(fondo.getMontoFaltante(), 1500000);
        assert meses == 4 : "Error en proyección de meses para alcanzar meta";
        System.out.println("[OK] Proyección de aportes mensuales (4 meses)");

        // 4. Prueba de abono hasta completar la meta
        gestor.registrarAbono("Juan", 6000000);
        assert fondo.getPorcentajeReal() == 100 : "Error en porcentaje post-abono";
        assert fondo.getMontoFaltante() == 0 : "Error en monto faltante post-abono";
        assert fondo.getNivelSeguridad().equals("¡Meta cumplida y protegida!") : "Error en estado final";
        System.out.println("[OK] Registro de abono y cumplimiento de meta al 100%");

        System.out.println("=== TODAS LAS PRUEBAS PASARON EXITOSAMENTE ===");
    }
}
