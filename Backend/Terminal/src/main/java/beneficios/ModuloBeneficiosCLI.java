package beneficios;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Módulo CLI interactivo para visualizar y redimir beneficios exclusivos por usuario (HU-08).
 * Compatible con main.java mediante iniciar(scanner, datosUsuario).
 */
public class ModuloBeneficiosCLI {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        String correo = datosUsuario != null ? datosUsuario.getOrDefault("correo", "cliente@finara.com") : "cliente@finara.com";
        String nombre = datosUsuario != null ? datosUsuario.getOrDefault("nombre", "Cliente Finara") : "Cliente Finara";

        boolean enModulo = true;

        while (enModulo) {
            System.out.println("\n===============================================================");
            System.out.println("          PROGRAMA DE BENEFICIOS Y RECOMPENSAS FINARA          ");
            System.out.println("===============================================================");
            System.out.println(" Cliente: " + nombre + " (" + correo + ")");
            System.out.println("---------------------------------------------------------------");
            System.out.println("1. Ver Mis Beneficios Activos");
            System.out.println("2. Generar Nuevos Beneficios Aleatorios (Ruleta de Recompensas)");
            System.out.println("3. Explorar Catálogo General de Beneficios Finara");
            System.out.println("4. Redimir Beneficio o Cupón Promocional");
            System.out.println("5. Volver al menú anterior");
            System.out.print("Seleccione una opción (1-5): ");

            String opcion = scanner.nextLine().trim();

            switch (opcion) {
                case "1":
                    mostrarBeneficiosUsuario(correo);
                    break;
                case "2":
                    generarNuevosAleatorios(correo);
                    break;
                case "3":
                    mostrarCatalogoGlobal();
                    break;
                case "4":
                    ejecutarRedencion(scanner, correo);
                    break;
                case "5":
                    enModulo = false;
                    System.out.println("Saliendo del módulo de beneficios...");
                    break;
                default:
                    System.out.println("❌ Opción inválida.");
            }
        }
    }

    private static void mostrarBeneficiosUsuario(String correo) {
        List<Beneficio> misBeneficios = ServicioBeneficios.obtenerBeneficiosCliente(correo);
        System.out.println("\n--- TUS BENEFICIOS ASIGNADOS ---");
        if (misBeneficios.isEmpty()) {
            System.out.println("No tienes beneficios activos en este momento.");
            return;
        }
        for (Beneficio b : misBeneficios) {
            b.imprimirFicha();
        }
    }

    private static void generarNuevosAleatorios(String correo) {
        System.out.println("\n🎲 ¡Girando la ruleta de beneficios Finara Bank!...");
        List<Beneficio> nuevos = ServicioBeneficios.generarBeneficiosAleatoriosParaUsuario(correo, 3);
        System.out.println("✨ ¡Se han generado " + nuevos.size() + " nuevos beneficios aleatorios para tu cuenta!");
        for (Beneficio b : nuevos) {
            b.imprimirFicha();
        }
    }

    private static void mostrarCatalogoGlobal() {
        List<Beneficio> catalogo = ServicioBeneficios.getCatalogoGlobal();
        System.out.println("\n--- CATÁLOGO GLOBAL DE BENEFICIOS FINARA BANK ---");
        for (Beneficio b : catalogo) {
            b.imprimirFicha();
        }
    }

    private static void ejecutarRedencion(Scanner scanner, String correo) {
        System.out.println("\n--- REDIMIR BENEFICIO O CUPÓN ---");
        System.out.print("Ingrese el ID del beneficio (ej. BEN-CB01) o el código promocional: ");
        String codigo = scanner.nextLine().trim();

        if (codigo.isEmpty()) {
            System.out.println("❌ Código inválido.");
            return;
        }

        boolean exito = ServicioBeneficios.redimirBeneficio(correo, codigo);
        if (exito) {
            System.out.println("\n🎉 ¡BENEFICIO REDIMIDO CON ÉXITO!");
            System.out.println("Se ha aplicado el beneficio a tu cuenta. Disfrútalo en tu próxima transacción o compra.");
        } else {
            System.out.println("\n❌ No fue posible redimir el beneficio. Verifica que el código sea correcto y no haya sido redimido previamente.");
        }
    }
}
