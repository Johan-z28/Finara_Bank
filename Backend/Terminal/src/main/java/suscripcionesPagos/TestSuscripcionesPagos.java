package suscripcionesPagos;

import java.time.LocalDate;

/**
 * Pruebas unitarias básicas de consola para el Módulo 2 en 1: Suscripciones y Pagos Pendientes (HU-22).
 */
public class TestSuscripcionesPagos {
    public static void main(String[] args) {
        System.out.println("=== INICIANDO PRUEBAS DE SUSCRIPCIONES Y PAGOS (HU-22) ===");
        GestorSuscripcionesPagos gestor = new GestorSuscripcionesPagos();
        String usuario = "Juan";

        // 1. Crear suscripciones (semanal, mensual, anual)
        Suscripcion cafe = gestor.crearSuscripcion(usuario, "Café diario", "Café y snacks", 10000, "SEMANAL");
        Suscripcion netflix = gestor.crearSuscripcion(usuario, "Netflix", "Streaming", 40000, "MENSUAL");
        Suscripcion prime = gestor.crearSuscripcion(usuario, "Amazon Prime", "Streaming", 240000, "ANUAL");

        assert cafe.calcularCostoAnual() == 520000 : "Error en proyección anual semanal";
        assert netflix.calcularCostoMensual() == 40000 : "Error en costo mensual";
        assert prime.calcularCostoMensual() == 20000 : "Error en normalización anual a mensual";
        System.out.println("[OK] Creación de suscripciones y normalización de costos (Semanal / Mensual / Anual)");

        // 2. Pausar suscripción y calcular ahorro potencial
        gestor.cambiarEstadoSuscripcion(usuario, netflix.getId(), "PAUSADA");
        GestorSuscripcionesPagos.AhorroPotencial ahorro = gestor.calcularAhorroPotencial(usuario);
        assert ahorro.getMensual() == 40000 : "Error en ahorro potencial mensual";
        assert ahorro.getAnual() == 480000 : "Error en ahorro potencial anual";
        System.out.println("[OK] Pausa de suscripción y cálculo de ahorro potencial");

        // 3. Crear pagos pendientes y validar estados (VENCIDO, PROXIMO, PENDIENTE, PAGADO)
        PagoPendiente vencido = gestor.crearPagoPendiente(usuario, "Factura Agua", "SERVICIO", 85000, LocalDate.now().minusDays(2));
        PagoPendiente proximo = gestor.crearPagoPendiente(usuario, "Tarjeta Finara", "TARJETA", 350000, LocalDate.now().plusDays(2));
        PagoPendiente futuro = gestor.crearPagoPendiente(usuario, "Cuota Gimnasio", "CUOTA", 120000, LocalDate.now().plusDays(15));

        assert "VENCIDO".equals(vencido.getEstadoPago()) : "Error en estado VENCIDO";
        assert "PROXIMO".equals(proximo.getEstadoPago()) : "Error en estado PROXIMO";
        assert "PENDIENTE".equals(futuro.getEstadoPago()) : "Error en estado PENDIENTE";
        assert gestor.contarAlertasVencimiento(usuario) == 2 : "Error en conteo de alertas (vencido + próximo)";
        System.out.println("[OK] Agenda de pagos pendientes y alertas de vencimiento");

        // 4. Marcar pago como pagado y recalcular gasto fijo mensual
        gestor.marcarPagoComoPagado(usuario, vencido.getId());
        assert "PAGADO".equals(vencido.getEstadoPago()) : "Error en estado PAGADO";
        assert gestor.contarAlertasVencimiento(usuario) == 1 : "Error en actualización de alertas tras pago";

        double gastoFijo = gestor.calcularGastoFijoMensual(usuario);
        // Activas: cafe (43333) + prime (20000) = 63333; Pagos no pagados: 350000 + 120000 = 470000
        assert gastoFijo == 63333 + 470000 : "Error en cálculo de gasto fijo mensual total: " + gastoFijo;
        System.out.println("[OK] Pago marcado como pagado y recálculo de gasto fijo mensual");

        System.out.println("=== TODAS LAS PRUEBAS PASARON EXITOSAMENTE ===");
    }
}
