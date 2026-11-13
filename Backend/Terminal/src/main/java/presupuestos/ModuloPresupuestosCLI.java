package presupuestos;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Scanner;

/**
 * Interfaz de terminal (CLI) orientada al Frontend para Elaboración de Presupuesto (HU-18 / HU-23).
 */
public class ModuloPresupuestosCLI {
    private GestorPresupuestos gestor;
    private Scanner scanner;
    private NumberFormat formatoCOP;

    public ModuloPresupuestosCLI() {
        this.gestor = new GestorPresupuestos();
        this.scanner = new Scanner(System.in);
        this.formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        this.formatoCOP.setMaximumFractionDigits(0);
    }

    public static void main(String[] args) {
        ModuloPresupuestosCLI cli = new ModuloPresupuestosCLI();
        cli.iniciar("Juan");
    }

    public void iniciar(String usuarioActivo) {
        String usuario = (usuarioActivo != null && !usuarioActivo.trim().isEmpty()) ? usuarioActivo : "Juan";
        String periodo = gestor.obtenerPeriodoActual();
        boolean salir = false;

        while (!salir) {
            System.out.println("\n========================================================");
            System.out.println("     FINARA FINANZAS - ELABORACIÓN DE PRESUPUESTO       ");
            System.out.println("     Usuario: " + usuario + " | Periodo: " + periodo);
            System.out.println("========================================================");
            System.out.println("1. Ver Métricas y Uso del Presupuesto Mensual");
            System.out.println("2. Registrar Rubro de Presupuesto (Ingreso / Gasto)");
            System.out.println("3. Ver Ingresos y Gastos Registrados");
            System.out.println("4. Editar Rubro existente");
            System.out.println("5. Eliminar Rubro");
            System.out.println("6. Cambiar Periodo Mensual (YYYY-MM)");
            System.out.println("0. Salir");
            System.out.print("Seleccione una opción: ");

            String opcion = scanner.nextLine().trim();
            switch (opcion) {
                case "1":
                    mostrarMetricasYProgreso(usuario, periodo);
                    break;
                case "2":
                    registrarRubroMenu(usuario, periodo);
                    break;
                case "3":
                    mostrarListadosSeparados(usuario, periodo);
                    break;
                case "4":
                    editarRubro(usuario, periodo);
                    break;
                case "5":
                    eliminarRubro(usuario, periodo);
                    break;
                case "6":
                    System.out.print("Ingrese nuevo periodo (YYYY-MM, ej. 2026-11): ");
                    String nuevo = scanner.nextLine().trim();
                    if (nuevo.matches("^\\d{4}-\\d{2}$")) {
                        periodo = nuevo;
                        System.out.println("[✓] Periodo cambiado a " + periodo);
                    } else {
                        System.out.println("[!] Formato inválido. Use YYYY-MM.");
                    }
                    break;
                case "0":
                    salir = true;
                    System.out.println("Saliendo del módulo de Presupuestos...");
                    break;
                default:
                    System.out.println("[!] Opción inválida. Intente de nuevo.");
            }
        }
    }

    private void mostrarMetricasYProgreso(String usuario, String periodo) {
        GestorPresupuestos.ResumenPresupuesto res = gestor.calcularResumen(usuario, periodo);

        System.out.println("\n--- MÉTRICAS DEL PRESUPUESTO (" + periodo + ") ---");
        System.out.println("Ingresos Estimados   : " + formatoCOP.format(res.getTotalIngresos()) + " (Total presupuestado)");
        System.out.println("Gastos Planificados  : " + formatoCOP.format(res.getTotalGastos()) + " (" + res.getPorcentajeGastado() + "% de los ingresos)");
        System.out.println("Saldo Neto           : " + formatoCOP.format(res.getSaldoNeto()) + " (" + res.getEstadoBalanceTexto() + ")");

        // Barra de progreso presupuestaria
        int pctBarra = Math.min(100, res.getPorcentajeGastado());
        int bloquesLlenos = pctBarra / 5; // Barra de 20 caracteres
        StringBuilder barra = new StringBuilder("[");
        for (int i = 0; i < 20; i++) {
            barra.append(i < bloquesLlenos ? "█" : "░");
        }
        barra.append("]");

        System.out.println("\nUso del presupuesto mensual: " + res.getPorcentajeGastado() + "% consumido");
        System.out.println(barra.toString());
    }

    private void registrarRubroMenu(String usuario, String periodo) {
        System.out.println("\n--- REGISTRAR RUBRO DE PRESUPUESTO ---");
        System.out.println("Tipo:");
        System.out.println("  1. Ingreso Estimado (INGRESO)");
        System.out.println("  2. Gasto Presupuestado (GASTO)");
        System.out.print("Seleccione tipo (1 o 2): ");
        String tipoOpt = scanner.nextLine().trim();

        String tipo;
        if ("1".equals(tipoOpt) || "INGRESO".equalsIgnoreCase(tipoOpt)) {
            tipo = "INGRESO";
            System.out.println("Categorías de Ingreso: salario | honorarios | inversiones | otros_ingresos");
        } else if ("2".equals(tipoOpt) || "GASTO".equalsIgnoreCase(tipoOpt)) {
            tipo = "GASTO";
            System.out.println("Categorías de Gasto: vivienda | alimentacion | transporte | educacion | salud | entretenimiento | otros_gastos");
        } else {
            System.out.println("[!] Tipo inválido.");
            return;
        }

        System.out.print("Categoría: ");
        String categoria = scanner.nextLine().trim();

        System.out.print("Concepto o Descripción: ");
        String descripcion = scanner.nextLine().trim();

        System.out.print("Monto (COP): ");
        double monto = leerMonto();

        try {
            ItemPresupuesto creado = gestor.crearItem(usuario, tipo, categoria, descripcion, monto, periodo);
            System.out.println("[✓] Rubro agregado correctamente con ID: " + creado.getId());
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void mostrarListadosSeparados(String usuario, String periodo) {
        GestorPresupuestos.ResumenPresupuesto res = gestor.calcularResumen(usuario, periodo);
        List<ItemPresupuesto> ingresos = res.getIngresos();
        List<ItemPresupuesto> gastos = res.getGastos();

        System.out.println("\n--- INGRESOS REGISTRADOS | Total: " + formatoCOP.format(res.getTotalIngresos()) + " ---");
        if (ingresos.isEmpty()) {
            System.out.println("  No hay ingresos registrados en este mes.");
        } else {
            for (ItemPresupuesto item : ingresos) {
                System.out.printf("  [%s] %-14s | %-25s | %s%n",
                        item.getId(), item.getCategoria(), item.getDescripcion(), formatoCOP.format(item.getMonto()));
            }
        }

        System.out.println("\n--- GASTOS REGISTRADOS | Total: " + formatoCOP.format(res.getTotalGastos()) + " ---");
        if (gastos.isEmpty()) {
            System.out.println("  No hay gastos registrados en este mes.");
        } else {
            for (ItemPresupuesto item : gastos) {
                System.out.printf("  [%s] %-14s | %-25s | %s%n",
                        item.getId(), item.getCategoria(), item.getDescripcion(), formatoCOP.format(item.getMonto()));
            }
        }
    }

    private void editarRubro(String usuario, String periodo) {
        mostrarListadosSeparados(usuario, periodo);
        System.out.print("\nIngrese el ID del rubro a editar: ");
        String id = scanner.nextLine().trim();

        System.out.print("Nueva descripción (deje vacío para conservar): ");
        String desc = scanner.nextLine().trim();

        System.out.print("Nuevo monto (COP): ");
        double monto = leerMonto();

        try {
            gestor.actualizarItem(id, null, null, desc.isEmpty() ? null : desc, monto, periodo);
            System.out.println("[✓] Rubro actualizado exitosamente.");
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void eliminarRubro(String usuario, String periodo) {
        mostrarListadosSeparados(usuario, periodo);
        System.out.print("\nIngrese el ID del rubro a eliminar: ");
        String id = scanner.nextLine().trim();
        try {
            gestor.eliminarItem(id);
            System.out.println("[✓] Rubro eliminado correctamente.");
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private double leerMonto() {
        try {
            String limpio = scanner.nextLine().trim().replace("$", "").replace(".", "").replace(",", ".");
            if (limpio.isEmpty()) return 0.0;
            return Double.parseDouble(limpio);
        } catch (Exception e) {
            return 0.0;
        }
    }
}
