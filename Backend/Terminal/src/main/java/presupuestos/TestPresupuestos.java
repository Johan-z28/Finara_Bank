package presupuestos;

import java.util.List;

/**
 * Pruebas unitarias básicas de consola para Elaboración de Presupuesto (HU-18 / HU-23).
 */
public class TestPresupuestos {
    public static void main(String[] args) {
        System.out.println("=== INICIANDO PRUEBAS DE ELABORACIÓN DE PRESUPUESTO (HU-18) ===");
        GestorPresupuestos gestor = new GestorPresupuestos();
        String usuario = "Juan";
        String periodo = "2026-11";

        // 1. Registrar ingreso estimado
        ItemPresupuesto salario = gestor.crearItem(usuario, "INGRESO", "salario", "Salario principal", 4000000, periodo);
        assert salario.getId().startsWith("PRE-") : "Error en formato de ID";
        System.out.println("[OK] Registro de ingreso estimado");

        // 2. Registrar gastos presupuestados
        ItemPresupuesto arriendo = gestor.crearItem(usuario, "GASTO", "vivienda", "Pago de arriendo", 1500000, periodo);
        gestor.crearItem(usuario, "GASTO", "alimentacion", "Mercado mensual", 500000, periodo);
        gestor.crearItem(usuario, "GASTO", "entretenimiento", "Cine y ocio", 400000, periodo);

        // 3. Validar métricas del Frontend (Ingresos, Gastos, Saldo Neto, % Uso y listas separadas)
        GestorPresupuestos.ResumenPresupuesto res = gestor.calcularResumen(usuario, periodo);
        assert res.getTotalIngresos() == 4000000 : "Error en ingresos estimados";
        assert res.getTotalGastos() == 2400000 : "Error en gastos planificados";
        assert res.getSaldoNeto() == 1600000 : "Error en saldo neto";
        assert res.getPorcentajeGastado() == 60 : "Error en porcentaje consumido";
        assert res.isEsSuperavit() : "Error en estado de superávit";
        assert res.getIngresos().size() == 1 : "Error en listado de ingresos";
        assert res.getGastos().size() == 3 : "Error en listado de gastos";
        System.out.println("[OK] Cálculo de métricas, uso del presupuesto (60%) y listados separados");

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
