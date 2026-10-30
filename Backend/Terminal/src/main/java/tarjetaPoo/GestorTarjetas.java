package tarjetaPoo;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Scanner;

public class GestorTarjetas {
    // Relaciona el correo del usuario con una lista o Map de sus tarjetas aprobadas
    private static Map<String, List<miTarjeta>> repositorioTarjetas = new HashMap<>();

    public static void gestionarMenuTarjetas(Scanner scanner, Map<String, String> datosUsuario) {
        String correo = datosUsuario.get("correo");
        repositorioTarjetas.putIfAbsent(correo, new ArrayList<>());

        boolean enMenu = true;
        while (enMenu) {
            System.out.println("\n--- GESTIÓN DE TARJETAS (POO) ---");
            System.out.println("1. Ver mis tarjetas solicitadas");
            System.out.println("2. Solicitar nueva tarjeta");
            System.out.println("3. Volver al menú principal");
            System.out.print("Seleccione una opción: ");
            String opcion = scanner.nextLine().trim();

            switch (opcion) {
                case "1":
                    List<miTarjeta> misTarjetas = repositorioTarjetas.get(correo);
                    if (misTarjetas.isEmpty()) {
                        System.out.println("No tienes tarjetas activas en este momento.");
                    } else {
                        System.out.println("\n--- TUS PRODUCTOS FINANCIEROS ---");
                        for (miTarjeta t : misTarjetas) {
                            t.mostrarDetalles();
                            System.out.println("-----------------------------------");
                        }
                    }
                    break;
                case "2":
                    System.out.println("\nSeleccione el tipo de tarjeta a solicitar:");
                    System.out.println("1. Tarjeta Débito");
                    System.out.println("2. Tarjeta de Crédito Gold");
                    System.out.println("3. Tarjeta Cuenta Corriente");
                    System.out.print("Opción: ");
                    String tipoOp = scanner.nextLine().trim();

                    miTarjeta nuevaTarjeta = null;
                    if (tipoOp.equals("1")) nuevaTarjeta = new TarjetaDebito();
                    else if (tipoOp.equals("2")) nuevaTarjeta = new TarjetaCredito();
                    else if (tipoOp.equals("3")) nuevaTarjeta = new TarjetaCorriente();
                    else {
                        System.out.println("Opción inválida.");
                        break;
                    }

                    System.out.print("Ingrese sus ingresos anuales estimados: ");
                    double ingresos = Double.parseDouble(scanner.nextLine().trim());
                    System.out.print("Ingrese su estrato socioeconómico (1-6): ");
                    int estrato = Integer.parseInt(scanner.nextLine().trim());

                    if (nuevaTarjeta.validarYAprobar(ingresos, estrato)) {
                        repositorioTarjetas.get(correo).add(nuevaTarjeta);
                        System.out.println("¡Solicitud Aprobada! Se ha generado tu " + nuevaTarjeta.getTitulo());
                        System.out.println("N° Tarjeta: " + nuevaTarjeta.getNumeroTarjeta());
                        System.out.println("📦 Tu plástico físico será enviado a tu domicilio (Plazo: hasta 1 semana).");
                    } else {
                        System.out.println("❌ Solicitud rechazada: No cumples con los requisitos mínimos de ingresos o estrato para este producto.");
                    }
                    break;
                case "3":
                    enMenu = false;
                    break;
                default:
                    System.out.println("Opción no válida.");
            }
        }
    }
}