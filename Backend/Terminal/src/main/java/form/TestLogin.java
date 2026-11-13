package form;

import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

/**
 * Clase ejecutable para probar de forma interactiva el inicio de sesión y la regla de 3 intentos / bloqueo (HU-02).
 */
public class TestLogin {
    public static void main(String[] args) {
        System.out.println("=========================================================");
        System.out.println("   SUITE DE PRUEBAS DE INICIO DE SESIÓN SEGURO (HU-02)   ");
        System.out.println("=========================================================");

        // Repositorio de prueba en memoria
        Map<String, Map<String, String>> baseDatos = new HashMap<>();

        Map<String, String> usuarioDemo = new HashMap<>();
        usuarioDemo.put("nombre", "María Sánchez Manco");
        usuarioDemo.put("correo", "mariasanchezmanco@finara.com");
        usuarioDemo.put("username", "mariasanchezmanco");
        usuarioDemo.put("password", "Finara2026*");
        usuarioDemo.put("telefono", "3001234567");
        usuarioDemo.put("documento", "1020304050");
        usuarioDemo.put("estado", "ACTIVA");
        usuarioDemo.put("intentosFallidos", "0");

        baseDatos.put(usuarioDemo.get("correo"), usuarioDemo);

        System.out.println("Usuario de prueba cargado:");
        System.out.println(" • Correo / Usuario: " + usuarioDemo.get("correo"));
        System.out.println(" • Contraseña correcta: " + usuarioDemo.get("password"));
        System.out.println(" • Política: Bloqueo automático al 3er intento fallido.");

        Scanner scanner = new Scanner(System.in);
        boolean continuar = true;

        while (continuar) {
            System.out.println("\n--- MENÚ DE TEST HU-02 ---");
            System.out.println("1. Probar Inicio de Sesión");
            System.out.println("2. Ver estado de la cuenta (Intentos / Bloqueo)");
            System.out.println("3. Desbloquear cuenta manualmente");
            System.out.println("4. Salir");
            System.out.print("Opción (1-4): ");

            String opc = scanner.nextLine().trim();
            switch (opc) {
                case "1":
                    ModuloLoginCLI.iniciarSesion(scanner, baseDatos);
                    break;
                case "2":
                    System.out.println("\nEstado actual de " + usuarioDemo.get("correo") + ":");
                    System.out.println(" • Estado: " + usuarioDemo.getOrDefault("estado", "ACTIVA"));
                    System.out.println(" • Bloqueada: " + usuarioDemo.getOrDefault("bloqueada", "false"));
                    System.out.println(" • Intentos fallidos acumulados: " + usuarioDemo.getOrDefault("intentosFallidos", "0") + " / 3");
                    break;
                case "3":
                    LoginService.desbloquearCuenta(usuarioDemo);
                    System.out.println("✔ Cuenta desbloqueada y contador de intentos reiniciado a 0.");
                    break;
                case "4":
                    continuar = false;
                    System.out.println("Finalizando prueba.");
                    break;
                default:
                    System.out.println("Opción inválida.");
            }
        }

        scanner.close();
    }
}
