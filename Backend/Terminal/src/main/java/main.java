import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;
import admin.crud; // <-- Importar la clase crud desde el paquete admin
import form.ProfileManager;
import form.signUp;

public class main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Map<String, Map<String, String>> baseDatosUsuarios = new HashMap<>();
        boolean continuar = true;

        System.out.println("=========================================");
        System.out.println("   ¡Bienvenido a Finara Bank (CLI)!      ");
        System.out.println("=========================================");

        while (continuar) {
            System.out.println("\n¿Qué desea realizar?");
            System.out.println("1. Registrarse");
            System.out.println("2. Iniciar sesión");
            System.out.println("3. Panel de Administración (CRUD)"); // <-- Nueva opción añadida
            System.out.println("4. Salir");
            System.out.print("Seleccione una opción (1-4): ");

            String opcion = scanner.nextLine().trim();

            switch (opcion) {
                case "1":
                    System.out.println("\n--- MÓDULO DE REGISTRO ---");
                    signUp.registrarUsuario(scanner, baseDatosUsuarios);
                    break;
                case "2":
                    System.out.println("\n--- MÓDULO DE INICIO DE SESIÓN ---");
                    if (baseDatosUsuarios.isEmpty()) {
                        System.out.println("No hay usuarios registrados en el sistema todavía.");
                    } else {
                        System.out.print("Ingrese su correo electrónico: ");
                        String correoLogin = scanner.nextLine().trim();
                        if (baseDatosUsuarios.containsKey(correoLogin)) {
                            System.out.print("Ingrese su contraseña: ");
                            String passLogin = scanner.nextLine().trim();
                            Map<String, String> datosUsuario = baseDatosUsuarios.get(correoLogin);
                            if (datosUsuario.get("password").equals(passLogin)) {
                                System.out.println("¡Inicio de sesión exitoso! Bienvenido de nuevo, " + datosUsuario.get("nombre"));
                                ProfileManager.gestionarPerfil(scanner, datosUsuario);
                            } else {
                                System.out.println("Error: Contraseña incorrecta.");
                            }
                        } else {
                            System.out.println("Error: El correo no se encuentra registrado.");
                        }
                    }
                    break;
                case "3":
                    // <-- Llamado al CRUD de administración pasando el Map principal -->
                    crud.gestionarCRUD(scanner, baseDatosUsuarios);
                    break;
                case "4":
                    continuar = false;
                    System.out.println("Gracias por usar Finara Bank. ¡Hasta pronto!");
                    break;
                default:
                    System.out.println("Opción no válida. Por favor, intente de nuevo.");
            }
        }
        scanner.close();
    }
}