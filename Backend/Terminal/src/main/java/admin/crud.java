package admin;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;
import core.RepositorioMovimientos;
import core.Seguridad;
import form.LoginService;

import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

/**
 * Panel administrativo CRUD y utilidades de soporte de Finara Bank.
 * Requiere autenticación previa con credenciales administrativas.
 */
public class crud {

    // Credenciales del Administrador Finara Bank (constantes de acceso al panel CRUD)
    public static final String ADMIN_USUARIO = "finara_banck";
    public static final String ADMIN_PASSWORD = "FinaraAdmin2026*";

    public static void iniciar(Scanner scanner, Map<String, String> ignored) {
        gestionarCRUD(scanner, BaseDatosFinara.getInstancia().getUsuarios());
    }

    public static void gestionarCRUD(Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {
        Consola.titulo("ACCESO AL PANEL ADMINISTRATIVO FINARA");
        String user = Consola.leerLinea(scanner, "Usuario administrador (0 para cancelar): ");
        if ("0".equals(user)) {
            return;
        }
        String pass = Consola.leerLinea(scanner, "Contraseña administrador: ");

        if (!ADMIN_USUARIO.equals(user) || !ADMIN_PASSWORD.equals(pass)) {
            System.out.println("[!] Acceso denegado: credenciales de administrador incorrectas.");
            return;
        }

        System.out.println("[✓] Autenticación administrativa verificada.");
        gestionarCRUDAutenticado(scanner, baseDatosUsuarios);
    }

    public static void gestionarCRUDAutenticado(Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {
        boolean enCrud = true;
        while (enCrud) {
            Consola.titulo("PANEL ADMINISTRATIVO (CRUD USUARIOS Y SOPORTE)");
            System.out.println("1. Listar todos los usuarios registrados");
            System.out.println("2. Actualizar datos de un usuario");
            System.out.println("3. Desbloquear cuenta bloqueada");
            System.out.println("4. Eliminar un usuario");
            System.out.println("5. Cargar datos de demostración (clientes y cuentas demo)");
            System.out.println("0. Volver al menú principal");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-5): ", 0, 5);
            switch (opcion) {
                case 1:
                    listarUsuarios(baseDatosUsuarios);
                    break;
                case 2:
                    actualizarUsuario(scanner, baseDatosUsuarios);
                    break;
                case 3:
                    desbloquearUsuario(scanner, baseDatosUsuarios);
                    break;
                case 4:
                    eliminarUsuario(scanner, baseDatosUsuarios);
                    break;
                case 5:
                    cargarDatosDemostracion();
                    break;
                case 0:
                    enCrud = false;
                    break;
            }
        }
    }

    private static void listarUsuarios(Map<String, Map<String, String>> baseDatosUsuarios) {
        Consola.subtitulo("USUARIOS REGISTRADOS (" + baseDatosUsuarios.size() + ")");
        if (baseDatosUsuarios.isEmpty()) {
            System.out.println("No hay clientes registrados actualmente.");
            return;
        }
        RepositorioCuentas repo = BaseDatosFinara.getInstancia().getRepositorioCuentas();
        int i = 1;
        for (Map<String, String> usuario : baseDatosUsuarios.values()) {
            String correo = usuario.getOrDefault("correo", "");
            int productos = repo.contarProductosUsuario(correo);
            double saldo = repo.calcularSaldoConsolidado(correo);
            String estado = usuario.getOrDefault("estado", "ACTIVA");
            System.out.println(i++ + ". " + usuario.getOrDefault("nombre", "N/A")
                    + " | Correo: " + correo
                    + " | Doc: " + usuario.getOrDefault("documento", "N/A")
                    + " | Estado: " + estado
                    + " | Productos: " + productos
                    + " | Saldo: " + Consola.formatoCOP(saldo));
        }
    }

    private static void actualizarUsuario(Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {
        if (baseDatosUsuarios.isEmpty()) {
            System.out.println("No hay usuarios para actualizar.");
            return;
        }
        String correo = Consola.leerLinea(scanner, "Ingrese el correo del usuario a actualizar (0 para cancelar): ").toLowerCase();
        if ("0".equals(correo)) return;

        Map<String, String> usuario = baseDatosUsuarios.get(correo);
        if (usuario == null) {
            System.out.println("[!] Usuario no encontrado con el correo: " + correo);
            return;
        }

        String nuevoNombre = Consola.leerLinea(scanner, "Nuevo nombre (" + usuario.get("nombre") + "): ");
        if (!nuevoNombre.isEmpty()) usuario.put("nombre", nuevoNombre);

        String nuevoTelefono = Consola.leerLinea(scanner, "Nuevo teléfono (" + usuario.get("telefono") + "): ");
        if (!nuevoTelefono.isEmpty()) usuario.put("telefono", nuevoTelefono);

        String nuevaDireccion = Consola.leerLinea(scanner, "Nueva dirección (" + usuario.get("direccion") + "): ");
        if (!nuevaDireccion.isEmpty()) usuario.put("direccion", nuevaDireccion);

        BaseDatosFinara.guardar();
        System.out.println("[✓] Datos del usuario actualizados correctamente.");
    }

    private static void desbloquearUsuario(Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {
        String correo = Consola.leerLinea(scanner, "Ingrese el correo o usuario de la cuenta a desbloquear: ");
        if (correo.isEmpty() || "0".equals(correo)) return;

        Map<String, String> usuario = BaseDatosFinara.getInstancia().buscarUsuarioPorCorreoOUsername(correo);
        if (usuario == null) {
            usuario = baseDatosUsuarios.get(correo.toLowerCase());
        }
        if (usuario == null) {
            System.out.println("[!] No se encontró un usuario con ese identificador.");
            return;
        }
        LoginService.desbloquearCuenta(usuario);
        BaseDatosFinara.guardar();
        System.out.println("[✓] Cuenta de " + usuario.getOrDefault("nombre", correo) + " desbloqueada.");
    }

    private static void eliminarUsuario(Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {
        if (baseDatosUsuarios.isEmpty()) {
            System.out.println("No hay usuarios para eliminar.");
            return;
        }
        String correo = Consola.leerLinea(scanner, "Ingrese el correo del usuario a eliminar: ").toLowerCase();
        if ("0".equals(correo)) return;

        if (baseDatosUsuarios.containsKey(correo)) {
            if (Consola.confirmar(scanner, "¿Confirma eliminar definitivamente a " + correo + "?")) {
                BaseDatosFinara.getInstancia().eliminarTodoDeUsuario(correo);
                BaseDatosFinara.guardar();
                System.out.println("[✓] Usuario eliminado del sistema.");
            }
        } else {
            System.out.println("[!] Usuario no encontrado con el correo: " + correo);
        }
    }

    /**
     * Carga 2 clientes de demostración con cuentas y saldos iniciales (solo invocable por administrador).
     */
    public static void cargarDatosDemostracion() {
        BaseDatosFinara db = BaseDatosFinara.getInstancia();
        Map<String, Map<String, String>> usuarios = db.getUsuarios();
        RepositorioCuentas repoCuentas = db.getRepositorioCuentas();
        RepositorioMovimientos repoMovs = db.getRepositorioMovimientos();

        int creados = 0;

        if (!usuarios.containsKey("carlos.demo@finara.com")) {
            Map<String, String> carlos = crearMapaUsuarioDemo(
                    "Carlos Demo Finara", "carlos.demo@finara.com", "carlos.demo",
                    "1010101010", "3001112233", "1995-05-15", "Calle 10 # 20-30", "Demo1234*"
            );
            usuarios.put("carlos.demo@finara.com", carlos);
            Map<String, String> cAhorros = repoCuentas.crearCuenta("carlos.demo@finara.com", "Carlos Demo Finara", "AHORROS", 3500000, 0);
            repoMovs.registrarMovimiento("carlos.demo@finara.com", "APERTURA-01", cAhorros.get("numero"),
                    "Ahorros", "Depósito", "INGRESO", 3500000, 3500000, "Depósito inicial de demostración");
            repoCuentas.crearCuenta("carlos.demo@finara.com", "Carlos Demo Finara", "CREDITO", 0, 5000000);
            creados++;
        }

        if (!usuarios.containsKey("ana.demo@finara.com")) {
            Map<String, String> ana = crearMapaUsuarioDemo(
                    "Ana Demo Finara", "ana.demo@finara.com", "ana.demo",
                    "2020202020", "3004445566", "1998-09-22", "Carrera 45 # 12-08", "Demo1234*"
            );
            usuarios.put("ana.demo@finara.com", ana);
            Map<String, String> aAhorros = repoCuentas.crearCuenta("ana.demo@finara.com", "Ana Demo Finara", "AHORROS", 1800000, 0);
            repoMovs.registrarMovimiento("ana.demo@finara.com", "APERTURA-02", aAhorros.get("numero"),
                    "Ahorros", "Depósito", "INGRESO", 1800000, 1800000, "Depósito inicial de demostración");
            creados++;
        }

        BaseDatosFinara.guardar();
        if (creados > 0) {
            System.out.println("[✓] Se cargaron " + creados + " clientes de demostración (clave: Demo1234*):");
            System.out.println("    • carlos.demo@finara.com | Ahorros ($3.500.000) + Crédito Gold");
            System.out.println("    • ana.demo@finara.com    | Ahorros ($1.800.000)");
        } else {
            System.out.println("[i] Los datos de demostración ya se encontraban cargados.");
        }
    }

    private static Map<String, String> crearMapaUsuarioDemo(
            String nombre, String correo, String username, String doc, String tel,
            String fechaNac, String dir, String passPlano) {
        Map<String, String> u = new HashMap<>();
        u.put("nombre", nombre);
        u.put("correo", correo);
        u.put("email", correo);
        u.put("username", username);
        u.put("documento", doc);
        u.put("telefono", tel);
        u.put("fechaNacimiento", fechaNac);
        u.put("direccion", dir);
        u.put("password", Seguridad.hashPassword(passPlano));
        u.put("rol", "Cliente (Demo)");
        u.put("estado", "ACTIVA");
        u.put("bloqueada", "false");
        u.put("intentosFallidos", "0");
        return u;
    }
}
