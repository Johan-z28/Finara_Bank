package form;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

public class signUp {

    public static void registrarUsuario(Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {
        System.out.println("-----------------------------------------");
        System.out.println("     REGISTRO DE NUEVO CLIENTE           ");
        System.out.println("-----------------------------------------");

        // 1. Nombre completo
        System.out.print("Ingrese su nombre completo: ");
        String nombre = scanner.nextLine().trim();
        if (nombre.isEmpty()) {
            System.out.println("Error: El nombre no puede estar vacío.");
            return;
        }

        // 2. Correo electrónico (Validación con regex y duplicados)
        System.out.print("Ingrese su correo electrónico: ");
        String correo = scanner.nextLine().trim();
        String regexCorreo = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
        if (!correo.matches(regexCorreo)) {
            System.out.println("Error: Formato de correo electrónico inválido.");
            return;
        }
        if (baseDatosUsuarios.containsKey(correo)) {
            System.out.println("Error: Este correo electrónico ya se encuentra registrado.");
            return;
        }

        // 3. Número de documento
        System.out.print("Ingrese su número de documento: ");
        String documento = scanner.nextLine().trim();
        if (documento.isEmpty()) {
            System.out.println("Error: El documento no puede estar vacío.");
            return;
        }

        // 4. Teléfono
        System.out.print("Ingrese su número de teléfono: ");
        String telefono = scanner.nextLine().trim();
        if (telefono.isEmpty()) {
            System.out.println("Error: El teléfono no puede estar vacío.");
            return;
        }

        // 5. Fecha de nacimiento y validación de mayoría de edad (Mínimo 18 años)
        System.out.print("Ingrese su fecha de nacimiento (AAAA-MM-DD): ");
        String fechaStr = scanner.nextLine().trim();
        LocalDate fechaNacimiento;
        try {
            // Permitir formato flexible con uno o dos dígitos para mes y día
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-M-d");
            fechaNacimiento = LocalDate.parse(fechaStr, formatter);
        } catch (DateTimeParseException e) {
            System.out.println("Error: Formato de fecha inválido. Utilice el formato AAAA-MM-DD (ej. 1999-08-02).");
            return;
        }

        int edad = Period.between(fechaNacimiento, LocalDate.now()).getYears();
        if (edad < 18) {
            System.out.println("Acceso Denegado: Debe ser mayor de 18 años para registrarse en Finara Bank.");
            return;
        }

        // 6. Contraseña y confirmación
        System.out.print("Ingrese su contraseña (mínimo 8 caracteres): ");
        String password = scanner.nextLine().trim();
        if (password.length() < 8) {
            System.out.println("Error: La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        System.out.print("Confirme su contraseña: ");
        String confirmPassword = scanner.nextLine().trim();
        if (!password.equals(confirmPassword)) {
            System.out.println("Error: Las contraseñas no coinciden.");
            return;
        }

        // 7. Dirección
        System.out.print("Ingrese su dirección: ");
        String direccion = scanner.nextLine().trim();
        if (direccion.isEmpty()) {
            System.out.println("Error: La dirección no puede estar vacía.");
            return;
        }

        // Construir el diccionario de datos del usuario
        Map<String, String> datosUsuario = new HashMap<>();
        datosUsuario.put("nombre", nombre);
        datosUsuario.put("correo", correo);
        datosUsuario.put("documento", documento);
        datosUsuario.put("telefono", telefono);
        datosUsuario.put("fechaNacimiento", fechaStr);
        datosUsuario.put("password", password);
        datosUsuario.put("direccion", direccion);
        datosUsuario.put("rol", "Cliente");
        datosUsuario.put("productosActivos", "0");
        datosUsuario.put("saldoDisponible", "$ 0");

        // Almacenar en la base de datos temporal en memoria (Map principal usando el correo como clave)
        baseDatosUsuarios.put(correo, datosUsuario);

        System.out.println("\n ¡Registro exitoso en Finara Bank!");
        System.out.println("Bienvenido/a, " + nombre + ". Ya puede iniciar sesión en el sistema.");
    }
}