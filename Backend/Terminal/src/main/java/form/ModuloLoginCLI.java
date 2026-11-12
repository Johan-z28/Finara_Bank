package form;

import java.util.Map;
import java.util.Scanner;
import tarjetaPoo.GestorTarjetas;

/**
 * Módulo interactivo CLI para inicio de sesión con control de seguridad y bloqueo (HU-02).
 */
public class ModuloLoginCLI {

    public static void iniciarSesion(Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {
        System.out.println("\n-----------------------------------------");
        System.out.println("        INICIO DE SESIÓN SEGURO          ");
        System.out.println("-----------------------------------------");

        if (baseDatosUsuarios == null || baseDatosUsuarios.isEmpty()) {
            System.out.println("No hay usuarios registrados en el sistema todavía.");
            return;
        }

        System.out.print("Ingrese su correo electrónico o usuario: ");
        String identificador = scanner.nextLine().trim();

        System.out.print("Ingrese su contraseña: ");
        String password = scanner.nextLine().trim();

        LoginService.ResultadoAutenticacion resultado =
                LoginService.autenticar(baseDatosUsuarios, identificador, password);

        if (resultado.isAutenticado()) {
            System.out.println("\n✅ " + resultado.getMensaje());
            Map<String, String> datosUsuario = resultado.getUsuario();

            // Renderizado del panel de usuario tras autenticación exitosa
            boolean sesionActiva = true;
            while (sesionActiva) {
                System.out.println("\n=========================================");
                System.out.println("        PANEL PRINCIPAL DE USUARIO       ");
                System.out.println("=========================================");
                System.out.println(" Sesión activa: " + datosUsuario.getOrDefault("nombre", "Usuario"));
                System.out.println(" Correo:        " + datosUsuario.getOrDefault("correo", "N/A"));
                System.out.println(" Estado cuenta: " + datosUsuario.getOrDefault("estado", "ACTIVA"));
                System.out.println("-----------------------------------------");
                System.out.println("1. Gestionar Perfil");
                System.out.println("2. Catálogo y Solicitud de Tarjetas (POO)");
                System.out.println("3. Cerrar sesión");
                System.out.print("Elija una opción (1-3): ");

                String subMenu = scanner.nextLine().trim();
                switch (subMenu) {
                    case "1":
                        ProfileManager.gestionarPerfil(scanner, datosUsuario);
                        break;
                    case "2":
                        GestorTarjetas.gestionarMenuTarjetas(scanner, datosUsuario);
                        break;
                    case "3":
                        sesionActiva = false;
                        System.out.println("Sesión cerrada correctamente.");
                        break;
                    default:
                        System.out.println("Opción inválida.");
                }
            }
        } else {
            if (resultado.isCuentaBloqueada()) {
                System.out.println("\n⛔ " + resultado.getMensaje());
            } else {
                System.out.println("\n❌ Error: " + resultado.getMensaje());
                System.out.println("💡 Indicador de seguridad: Te quedan " + resultado.getIntentosRestantes() + " intento(s) antes del bloqueo definitivo.");
            }
        }
    }
}
