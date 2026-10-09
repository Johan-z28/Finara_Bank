package admin;

import java.util.Map;
import java.util.Scanner;

public class crud {

    public static void gestionarCRUD(Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {
        boolean enCrud = true;

        while (enCrud) {
            System.out.println("\n-----------------------------------------");
            System.out.println("     PANEL DE ADMINISTRACIÓN (CRUD)      ");
            System.out.println("-----------------------------------------");
            System.out.println("1. Listar usuarios registrados (Read)");
            System.out.println("2. Actualizar datos de un usuario (Update)");
            System.out.println("3. Eliminar usuario (Delete)");
            System.out.println("4. Volver al menú principal");
            System.out.print("Seleccione una opción (1-4): ");

            String opcion = scanner.nextLine().trim();

            switch (opcion) {
                case "1":
                    listarUsuarios(baseDatosUsuarios);
                    break;
                case "2":
                    actualizarUsuario(scanner, baseDatosUsuarios);
                    break;
                case "3":
                    eliminarUsuario(scanner, baseDatosUsuarios);
                    break;
                case "4":
                    enCrud = false;
                    System.out.println("Saliendo del panel de administración...");
                    break;
                default:
                    System.out.println("Error: Opción no válida. Intente de nuevo.");
            }
        }
    }

    private static void listarUsuarios(Map<String, Map<String, String>> baseDatosUsuarios) {
        System.out.println("\n--- LISTA DE USUARIOS REGISTRADOS ---");
        if (baseDatosUsuarios.isEmpty()) {
            System.out.println("No hay usuarios registrados en el sistema.");
            return;
        }

        int contador = 1;
        for (Map.Entry<String, Map<String, String>> entry : baseDatosUsuarios.entrySet()) {
            Map<String, String> datos = entry.getValue();
            System.out.println(contador + ". Correo: " + entry.getKey());
            System.out.println("   - Nombre: " + datos.get("nombre"));
            System.out.println("   - Documento: " + datos.get("documento"));
            System.out.println("   - Teléfono: " + datos.get("telefono"));
            System.out.println("   - Rol: " + datos.get("rol"));
            System.out.println("-----------------------------------------");
            contador++;
        }
    }

    private static void actualizarUsuario(Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {
        System.out.println("\n--- ACTUALIZAR USUARIO ---");
        if (baseDatosUsuarios.isEmpty()) {
            System.out.println("No hay usuarios registrados para actualizar.");
            return;
        }

        System.out.print("Ingrese el correo electrónico del usuario que desea actualizar: ");
        String correo = scanner.nextLine().trim();

        if (!baseDatosUsuarios.containsKey(correo)) {
            System.out.println("Error: No existe un usuario registrado con ese correo.");
            return;
        }

        Map<String, String> datos = baseDatosUsuarios.get(correo);
        System.out.println("Usuario encontrado: " + datos.get("nombre"));
        System.out.println("¿Qué campo desea actualizar?");
        System.out.println("1. Nombre completo");
        System.out.println("2. Teléfono");
        System.out.println("3. Dirección");
        System.out.print("Seleccione una opción (1-3): ");
        String campoOpcion = scanner.nextLine().trim();

        switch (campoOpcion) {
            case "1":
                System.out.print("Ingrese el nuevo nombre completo: ");
                String nuevoNombre = scanner.nextLine().trim();
                if (!nuevoNombre.isEmpty()) {
                    datos.put("nombre", nuevoNombre);
                    System.out.println("¡Nombre actualizado con éxito!");
                } else {
                    System.out.println("Error: El nombre no puede estar vacío.");
                }
                break;
            case "2":
                System.out.print("Ingrese el nuevo teléfono: ");
                String nuevoTelefono = scanner.nextLine().trim();
                if (!nuevoTelefono.isEmpty()) {
                    datos.put("telefono", nuevoTelefono);
                    System.out.println("¡Teléfono actualizado con éxito!");
                } else {
                    System.out.println("Error: El teléfono no puede estar vacío.");
                }
                break;
            case "3":
                System.out.print("Ingrese la nueva dirección: ");
                String nuevaDireccion = scanner.nextLine().trim();
                if (!nuevaDireccion.isEmpty()) {
                    datos.put("direccion", nuevaDireccion);
                    System.out.println("¡Dirección actualizada con éxito!");
                } else {
                    System.out.println("Error: La dirección no puede estar vacía.");
                }
                break;
            default:
                System.out.println("Opción de actualización no válida.");
        }
    }

    private static void eliminarUsuario(Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {
        System.out.println("\n--- ELIMINAR USUARIO ---");
        if (baseDatosUsuarios.isEmpty()) {
            System.out.println("No hay usuarios registrados para eliminar.");
            return;
        }

        System.out.print("Ingrese el correo electrónico del usuario a eliminar: ");
        String correo = scanner.nextLine().trim();

        if (baseDatosUsuarios.containsKey(correo)) {
            baseDatosUsuarios.remove(correo);
            System.out.println("¡Usuario eliminado correctamente del sistema!");
        } else {
            System.out.println("Error: No se encontró ningún usuario con ese correo.");
        }
    }
}