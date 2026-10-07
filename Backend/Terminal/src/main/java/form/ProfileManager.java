package form;

import java.util.Map;
import java.util.Scanner;

public class ProfileManager {

    /**
     * Muestra el menú de perfil del usuario y gestiona las opciones de visualización y edición.
     */
    public static void gestionarPerfil(Scanner scanner, Map<String, String> datosUsuario) {
        boolean enPerfil = true;

        while (enPerfil) {
            System.out.println("\n=========================================");
            System.out.println("            MI PERFIL - FINARA           ");
            System.out.println("=========================================");
            System.out.println("Nombre:           " + datosUsuario.getOrDefault("nombre", "Usuario"));
            System.out.println("Rol:              " + datosUsuario.getOrDefault("rol", "Cliente"));
            System.out.println("Correo electrónico: " + datosUsuario.getOrDefault("email", "No registrado"));
            System.out.println("Teléfono:         " + datosUsuario.getOrDefault("telefono", "No registrado"));
            System.out.println("Dirección:        " + datosUsuario.getOrDefault("direccion", "No registrada"));
            System.out.println("Productos activos:" + datosUsuario.getOrDefault("productosActivos", "3"));
            System.out.println("Saldo disponible: " + datosUsuario.getOrDefault("saldoDisponible", "$ 2.450.000"));
            System.out.println("-----------------------------------------");
            System.out.println("1. Editar información personal");
            System.out.println("2. Cambiar contraseña");
            System.out.println("3. Volver al menú principal");
            System.out.print("Seleccione una opción (1-3): ");

            String opcion = scanner.nextLine().trim();

            switch (opcion) {
                case "1":
                    editarInformacionPersonal(scanner, datosUsuario);
                    break;
                case "2":
                    cambiarContrasena(scanner, datosUsuario);
                    break;
                case "3":
                    enPerfil = false;
                    System.out.println("Saliendo de la sección de perfil...");
                    break;
                default:
                    System.out.println("Opción no válida. Por favor, intente de nuevo.");
            }
        }
    }

    /**
     * Equivalente a la lógica de edición de perfil e inputs en JavaScript.
     * Permite modificar nombre, correo, teléfono y dirección validando campos no vacíos.
     */
    private static void editarInformacionPersonal(Scanner scanner, Map<String, String> datosUsuario) {
        System.out.println("\n--- EDITAR INFORMACIÓN PERSONAL ---");
        System.out.println("Deje el espacio en blanco y presione Enter si desea mantener el valor actual.");

        // Editar Nombre
        System.out.print("Nombre actual [" + datosUsuario.get("nombre") + "]: ");
        String nuevoNombre = scanner.nextLine().trim();
        if (!nuevoNombre.isEmpty()) {
            datosUsuario.put("nombre", nuevoNombre);
        }

        // Editar Correo
        System.out.print("Correo actual [" + datosUsuario.get("email") + "]: ");
        String nuevoCorreo = scanner.nextLine().trim();
        if (!nuevoCorreo.isEmpty()) {
            if (nuevoCorreo.contains("@") && nuevoCorreo.contains(".")) {
                datosUsuario.put("email", nuevoCorreo);
                // Si también guardas la clave de acceso por correo en el Map principal, puedes actualizarla aquí
            } else {
                System.out.println("⚠️ Formato de correo no válido. No se modificó este campo.");
            }
        }

        // Editar Teléfono
        System.out.print("Teléfono actual [" + datosUsuario.get("telefono") + "]: ");
        String nuevoTelefono = scanner.nextLine().trim();
        if (!nuevoTelefono.isEmpty()) {
            datosUsuario.put("telefono", nuevoTelefono);
        }

        // Editar Dirección
        System.out.print("Dirección actual [" + datosUsuario.get("direccion") + "]: ");
        String nuevaDireccion = scanner.nextLine().trim();
        if (!nuevaDireccion.isEmpty()) {
            datosUsuario.put("direccion", nuevaDireccion);
        }

        System.out.println("¡Información personal actualizada con éxito!");
    }

    /**
     * Equivalente a la función 'cambiarContraseñaFácil()' del frontend.
     * Valida la contraseña actual y exige mínimo 8 caracteres para la nueva.
     */
    private static void cambiarContrasena(Scanner scanner, Map<String, String> datosUsuario) {
        System.out.println("\n--- CAMBIAR CONTRASEÑA ---");
        System.out.print("Ingrese su contraseña actual: ");
        String passwordActual = scanner.nextLine().trim();

        // Validar contraseña actual
        if (!datosUsuario.get("password").equals(passwordActual)) {
            System.out.println("❌ Error: La contraseña actual no coincide con nuestros registros.");
            return;
        }

        System.out.print("Ingrese su nueva contraseña (mínimo 8 caracteres): ");
        String nuevaPassword = scanner.nextLine().trim();

        // Validaciones equivalentes a SweetAlert2
        if (nuevaPassword.length() < 8) {
            System.out.println("⚠️ Atención: La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        if (nuevaPassword.equals(passwordActual)) {
            System.out.println("⚠️ Atención: La nueva contraseña no puede ser igual a la actual.");
            return;
        }

        // Guardar nueva contraseña
        datosUsuario.put("password", nuevaPassword);
        System.out.println("¡Tu contraseña ha sido actualizada correctamente!");
    }
}