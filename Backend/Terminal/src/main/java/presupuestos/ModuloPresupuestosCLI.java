package presupuestos;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Scanner;

/**
 * Interfaz de terminal (CLI) independiente para el módulo de Presupuestos (HU-18 / HU-23).
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
            System.out.println("     FINARA FINANZAS - PRESUPUESTOS 50/30/20 (HU-18)    ");
            System.out.println("     Usuario: " + usuario + " | Periodo: " + periodo);
            System.out.println("========================================================");
            System.out.println("1. Ver resumen y análisis Regla 50/30/20");
            System.out.println("2. Registrar nuevo INGRESO");
            System.out.println("3. Registrar nuevo GASTO");
            System.out.println("4. Listar rubros registrados en el periodo");
            System.out.println("5. Editar monto o descripción de un rubro");
            System.out.println("6. Eliminar un rubro");
            System.out.println("7. Cambiar periodo (YYYY-MM)");
            System.out.println("0. Salir");
            System.out.print("Seleccione una opción: ");

            String opcion = scanner.nextLine().trim();
            switch (opcion) {
                case "1":
                    mostrarResumen(usuario, periodo);
                    break;
                case "2":
                    registrarRubro(usuario, periodo, "INGRESO");
                    break;
                case "3":
                    registrarRubro(usuario, periodo, "GASTO");
                    break;
                case "4":
                    listarRubros(usuario, periodo);
                    break;
                case "5":
                    editarRubro(usuario, periodo);
                    break;
                case "6":
                    eliminarRubro();
                    break;
                case "7":
                    System.out.print("Ingrese nuevo periodo (YYYY-MM): ");
                    String nuevo = scanner.nextLine().trim();
                    if (nuevo.matches("^\\d{4}-\\d{2}$")) {
                        periodo = nuevo;
                        System.out.println("[✓] Periodo cambiado a " + periodo);
                    } else {
                        System.out.println("[!] Formato inválido. Use YYYY-MM (ej. 2026-11).");
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

    private void mostrarResumen(String usuario, String periodo) {
        GestorPresupuestos.ResumenPresupuesto res = gestor.calcularResumen(usuario, periodo);

        System.out.println("\n--- RESUMEN PRESUPUESTAL (" + periodo + ") ---");
        System.out.println("Total Ingresos     : " + formatoCOP.format(res.getTotalIngresos()));
        System.out.println("Total Gastos       : " + formatoCOP.format(res.getTotalGastos()) + " (" + res.getPorcentajeGastado() + "% ejecutado)");
        System.out.println("Saldo Neto         : " + formatoCOP.format(res.getSaldoNeto())
                + (res.isEsDeficit() ? " [DÉFICIT]" : (res.isEsSuperavit() ? " [SUPERÁVIT]" : " [EQUILIBRADO]")));

        System.out.println("\n--- ANÁLISIS REGLA 50 / 30 / 20 ---");
        System.out.printf("50%% Necesidades : Actual %-15s | Ideal %-15s%n",
                formatoCOP.format(res.getNecesidadesReal()), formatoCOP.format(res.getNecesidadesIdeal50()));
        System.out.printf("30%% Deseos      : Actual %-15s | Ideal %-15s%n",
                formatoCOP.format(res.getDeseosReal()), formatoCOP.format(res.getDeseosIdeal30()));
        System.out.printf("20%% Ahorro      : Actual %-15s | Ideal %-15s%n",
                formatoCOP.format(res.getAhorroReal()), formatoCOP.format(res.getAhorroIdeal20()));
    }

    private void registrarRubro(String usuario, String periodo, String tipo) {
        System.out.println("\n--- REGISTRAR " + tipo + " ---");
        if ("INGRESO".equals(tipo)) {
            System.out.println("Categorías: salario | honorarios | inversiones | otros_ingresos");
        } else {
            System.out.println("Categorías: vivienda | alimentacion | transporte | educacion | salud | entretenimiento | otros_gastos");
        }
        System.out.print("Categoría: ");
        String categoria = scanner.nextLine().trim();

        System.out.print("Descripción: ");
        String descripcion = scanner.nextLine().trim();

        System.out.print("Monto: ");
        double monto = leerMonto();

        try {
            ItemPresupuesto creado = gestor.crearItem(usuario, tipo, categoria, descripcion, monto, periodo);
            System.out.println("[✓] Rubro creado con ID: " + creado.getId());
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void listarRubros(String usuario, String periodo) {
        List<ItemPresupuesto> lista = gestor.obtenerPorUsuarioYPeriodo(usuario, periodo);
        if (lista.isEmpty()) {
            System.out.println("\n[!] No hay rubros registrados para " + periodo + ".");
            return;
        }

        System.out.println("\n--- RUBROS DE " + periodo + " ---");
        System.out.printf("%-22s | %-8s | %-15s | %-12s | %s%n", "ID", "Tipo", "Categoría", "Monto", "Descripción");
        System.out.println("--------------------------------------------------------------------------------");
        for (ItemPresupuesto item : lista) {
            System.out.printf("%-22s | %-8s | %-15s | %12s | %s%n",
                    item.getId(), item.getTipo(), item.getCategoria(),
                    formatoCOP.format(item.getMonto()), item.getDescripcion());
        }
    }

    private void editarRubro(String usuario, String periodo) {
        listarRubros(usuario, periodo);
        System.out.print("\nIngrese el ID del rubro a editar: ");
        String id = scanner.nextLine().trim();

        System.out.print("Nueva descripción (deje vacío para conservar): ");
        String desc = scanner.nextLine().trim();

        System.out.print("Nuevo monto: ");
        double monto = leerMonto();

        try {
            gestor.actualizarItem(id, null, null, desc.isEmpty() ? null : desc, monto, periodo);
            System.out.println("[✓] Rubro actualizado exitosamente.");
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void eliminarRubro() {
        System.out.print("Ingrese el ID del rubro a eliminar: ");
        String id = scanner.nextLine().trim();
        try {
            gestor.eliminarItem(id);
            System.out.println("[✓] Rubro eliminado.");
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
