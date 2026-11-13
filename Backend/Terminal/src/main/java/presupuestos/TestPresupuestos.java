package presupuestos;

import java.util.List;

/**
 * Pruebas unitarias básicas de consola para el módulo de Presupuestos 50/30/20 (HU-18 / HU-23).
 */
public class TestPresupuestos {
    public static void main(String[] args) {
        System.out.println("=== INICIANDO PRUEBAS DE PRESUPUESTOS 50/30/20 (HU-18) ===");
        GestorPresupuestos gestor = new GestorPresupuestos();
        String usuario = "Juan";
        String periodo = "2026-11";

        // 1. Registrar ingresos
        ItemPresupuesto salario = gestor.crearItem(usuario, "INGRESO", "salario", "Salario mensual", 4000000, periodo);
        assert salario.getId().startsWith("PRE-") : "Error en formato de ID";
        System.out.println("[OK] Registro de ingreso");

        // 2. Registrar gastos (Necesidades y Deseos)
        ItemPresupuesto arriendo = gestor.crearItem(usuario, "GASTO", "vivienda", "Arriendo apartamento", 1500000, periodo);
        gestor.crearItem(usuario, "GASTO", "alimentacion", "Mercado mensual", 500000, periodo);
        gestor.crearItem(usuario, "GASTO", "entretenimiento", "Cine y streaming", 400000, periodo);

        // 3. Validar resumen y Regla 50/30/20
        GestorPresupuestos.ResumenPresupuesto res = gestor.calcularResumen(usuario, periodo);
        assert res.getTotalIngresos() == 4000000 : "Error en total ingresos";
        assert res.getTotalGastos() == 2400000 : "Error en total gastos";
        assert res.getSaldoNeto() == 1600000 : "Error en saldo neto";
        assert res.getPorcentajeGastado() == 60 : "Error en porcentaje gastado";
        assert res.isEsSuperavit() : "Error en indicador de superávit";
        assert res.getNecesidadesReal() == 2000000 : "Error en necesidades (50%)";
        assert res.getNecesidadesIdeal50() == 2000000 : "Error en ideal 50%";
        assert res.getDeseosReal() == 400000 : "Error en deseos (30%)";
        assert res.getAhorroIdeal20() == 800000 : "Error en ideal 20%";
        System.out.println("[OK] Cálculo de resumen presupuestal y Regla 50/30/20");

        // 4. Actualizar un rubro
        gestor.actualizarItem(arriendo.getId(), null, null, "Arriendo + Administración", 1600000, periodo);
        res = gestor.calcularResumen(usuario, periodo);
        assert res.getTotalGastos() == 2500000 : "Error tras actualizar gasto";
        System.out.println("[OK] Actualización de rubro presupuestal");

        // 5. Eliminar un rubro
        boolean eliminado = gestor.eliminarItem(arriendo.getId());
        assert eliminado : "Error al eliminar rubro";
        List<ItemPresupuesto> lista = gestor.obtenerPorUsuarioYPeriodo(usuario, periodo);
        assert lista.size() == 3 : "Error en tamaño de lista post-eliminación";
        System.out.println("[OK] Eliminación de rubro y filtrado por usuario/periodo");

        System.out.println("=== TODAS LAS PRUEBAS PASARON EXITOSAMENTE ===");
    }
}
