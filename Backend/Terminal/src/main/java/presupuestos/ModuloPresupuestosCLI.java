package presupuestos;

import core.BaseDatosFinara;
import core.Consola;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Interfaz de terminal (CLI) integrada para Elaboración de Presupuesto (HU-18 / HU-23).
 */
public class ModuloPresupuestosCLI {
    private final GestorPresupuestos gestor;
    private final Scanner scanner;

    public ModuloPresupuestosCLI() {
        this(Consola.getScanner());
    }

    public ModuloPresupuestosCLI(Scanner scanner) {
        this.gestor = new GestorPresupuestos();
        this.scanner = scanner != null ? scanner : Consola.getScanner();
    }

    public static void main(String[] args) {
        BaseDatosFinara.cargar();
        ModuloPresupuestosCLI cli = new ModuloPresupuestosCLI(Consola.getScanner());
        cli.iniciar("Juan");
    }

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        String correo = datosUsuario != null
                ? datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "Juan"))
                : "Juan";
        ModuloPresupuestosCLI cli = new ModuloPresupuestosCLI(scanner);
        cli.iniciar(correo);
    }

    public void iniciar(String usuarioActivo) {
        String usuario = (usuarioActivo != null && !usuarioActivo.trim().isEmpty()) ? usuarioActivo : "Juan";
        String periodo = gestor.obtenerPeriodoActual();
        boolean salir = false;

        while (!salir) {
            Consola.titulo("FINARA FINANZAS - ELABORACIÓN DE PRESUPUESTO");
            System.out.println("Usuario: " + usuario + " | Periodo: " + periodo);
            System.out.println("-------------------------------------------------------");
            System.out.println("1. Ver Métricas y Uso del Presupuesto Mensual");
            System.out.println("2. Registrar Rubro de Presupuesto (Ingreso / Gasto)");
            System.out.println("3. Ver Ingresos y Gastos Registrados");
            System.out.println("4. Editar Rubro existente");
            System.out.println("5. Eliminar Rubro");
            System.out.println("6. Cambiar Periodo Mensual (YYYY-MM)");
            System.out.println("0. Volver al menú anterior");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-6): ", 0, 6);
            switch (opcion) {
                case 1:
                    mostrarMetricasYProgreso(usuario, periodo);
                    break;
                case 2:
                    registrarRubroMenu(usuario, periodo);
                    break;
                case 3:
                    mostrarListadosSeparados(usuario, periodo);
                    break;
                case 4:
                    editarRubro(usuario, periodo);
                    break;
                case 5:
                    eliminarRubro(usuario, periodo);
                    break;
                case 6:
                    String nuevo = Consola.leerLinea(scanner, "Ingrese nuevo periodo (YYYY-MM, ej. 2026-11): ");
                    if (nuevo.matches("^\\d{4}-\\d{2}$")) {
                        periodo = nuevo;
                        System.out.println("[✓] Periodo cambiado a " + periodo);
                    } else {
                        System.out.println("[!] Formato inválido. Use YYYY-MM.");
                    }
                    break;
                case 0:
                    salir = true;
                    break;
            }
        }
    }

    private void mostrarMetricasYProgreso(String usuario, String periodo) {
        GestorPresupuestos.ResumenPresupuesto res = gestor.calcularResumen(usuario, periodo);

        Consola.subtitulo("MÉTRICAS DEL PRESUPUESTO (" + periodo + ")");
        System.out.println("Ingresos Estimados   : " + Consola.formatoCOP(res.getTotalIngresos()) + " (Total presupuestado)");
        System.out.println("Gastos Planificados  : " + Consola.formatoCOP(res.getTotalGastos()) + " (" + res.getPorcentajeGastado() + "% de los ingresos)");
        System.out.println("Saldo Neto           : " + Consola.formatoCOP(res.getSaldoNeto()) + " (" + res.getEstadoBalanceTexto() + ")");

        int pctBarra = Math.min(100, res.getPorcentajeGastado());
        int bloquesLlenos = pctBarra / 5;
        StringBuilder barra = new StringBuilder("[");
        for (int i = 0; i < 20; i++) {
            barra.append(i < bloquesLlenos ? "█" : "░");
        }
        barra.append("]");

        System.out.println("\nUso del presupuesto mensual: " + res.getPorcentajeGastado() + "% consumido");
        System.out.println(barra);
    }

    private void registrarRubroMenu(String usuario, String periodo) {
        Consola.subtitulo("REGISTRAR RUBRO DE PRESUPUESTO");
        System.out.println("  1. Ingreso Estimado (INGRESO)");
        System.out.println("  2. Gasto Presupuestado (GASTO)");
        System.out.println("  0. Cancelar");
        int tipoOpt = Consola.leerEntero(scanner, "Seleccione tipo (0-2): ", 0, 2);
        if (tipoOpt <= 0) return;

        String tipo;
        if (tipoOpt == 1) {
            tipo = "INGRESO";
            System.out.println("Categorías de Ingreso: salario | honorarios | inversiones | otros_ingresos");
        } else {
            tipo = "GASTO";
            System.out.println("Categorías de Gasto: vivienda | alimentacion | transporte | educacion | salud | entretenimiento | otros_gastos");
        }

        String categoria = Consola.leerLineaObligatoria(scanner, "Categoría (0 cancelar): ");
        if (categoria == null) return;

        String descripcion = Consola.leerLinea(scanner, "Concepto o Descripción: ");
        double monto = Consola.leerMonto(scanner, "Monto en COP (0 cancelar): ");
        if (monto <= 0) return;

        try {
            ItemPresupuesto creado = gestor.crearItem(usuario, tipo, categoria, descripcion, monto, periodo);
            BaseDatosFinara.guardar();
            System.out.println("[✓] Rubro agregado correctamente con ID: " + creado.getId());
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void mostrarListadosSeparados(String usuario, String periodo) {
        GestorPresupuestos.ResumenPresupuesto res = gestor.calcularResumen(usuario, periodo);
        List<ItemPresupuesto> ingresos = res.getIngresos();
        List<ItemPresupuesto> gastos = res.getGastos();

        Consola.subtitulo("INGRESOS REGISTRADOS | Total: " + Consola.formatoCOP(res.getTotalIngresos()));
        if (ingresos.isEmpty()) {
            System.out.println("  No hay ingresos registrados en este mes.");
        } else {
            for (ItemPresupuesto item : ingresos) {
                System.out.printf("  [%s] %-14s | %-25s | %s%n",
                        item.getId(), item.getCategoria(), item.getDescripcion(), Consola.formatoCOP(item.getMonto()));
            }
        }

        Consola.subtitulo("GASTOS REGISTRADOS | Total: " + Consola.formatoCOP(res.getTotalGastos()));
        if (gastos.isEmpty()) {
            System.out.println("  No hay gastos registrados en este mes.");
        } else {
            for (ItemPresupuesto item : gastos) {
                System.out.printf("  [%s] %-14s | %-25s | %s%n",
                        item.getId(), item.getCategoria(), item.getDescripcion(), Consola.formatoCOP(item.getMonto()));
            }
        }
    }

    private void editarRubro(String usuario, String periodo) {
        mostrarListadosSeparados(usuario, periodo);
        String id = Consola.leerLinea(scanner, "\nIngrese el ID del rubro a editar (0 cancelar): ");
        if ("0".equals(id) || id.isEmpty()) return;

        String desc = Consola.leerLinea(scanner, "Nueva descripción (deje vacío para conservar): ");
        double monto = Consola.leerMonto(scanner, "Nuevo monto en COP (0 cancelar): ");
        if (monto <= 0) return;

        try {
            gestor.actualizarItem(usuario, id, null, null, desc.isEmpty() ? null : desc, monto, periodo);
            BaseDatosFinara.guardar();
            System.out.println("[✓] Rubro actualizado exitosamente.");
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void eliminarRubro(String usuario, String periodo) {
        mostrarListadosSeparados(usuario, periodo);
        String id = Consola.leerLinea(scanner, "\nIngrese el ID del rubro a eliminar (0 cancelar): ");
        if ("0".equals(id) || id.isEmpty()) return;

        try {
            gestor.eliminarItem(usuario, id);
            BaseDatosFinara.guardar();
            System.out.println("[✓] Rubro eliminado correctamente.");
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }
}
