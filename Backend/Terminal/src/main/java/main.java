import AsesoriaFinanciera.MainSaludFinanciera;
import Prestamos.GestorPrestamos;
import admin.crud;
import asesoriaEndeudamiento.ModuloEndeudamientoCLI;
import beneficios.ModuloBeneficiosCLI;
import consignaciones.ModuloConsignacionesCLI;
import core.BaseDatosFinara;
import core.Consola;
import core.Sesion;
import cuentas.ModuloCuentasCLI;
import dashboard.ModuloDashboardCLI;
import fondoEmergencia.ModuloFondoEmergenciaCLI;
import form.ModuloLoginCLI;
import form.ProfileManager;
import form.signUp;
import movimientos.ModuloMovimientosCLI;
import planificacion.ModuloPlanificacionCLI;
import presupuestos.ModuloPresupuestosCLI;
import retiros.ModuloRetirosCLI;
import suscripcionesPagos.ModuloSuscripcionesPagosCLI;
import tarjetaPoo.GestorTarjetas;
import transferencias.ModuloTransferenciasCLI;
import transferenciasInternas.ModuloTransferenciasInternasCLI;

import java.util.Map;
import java.util.Scanner;

/**
 * Orquestador principal de consola de Finara Bank.
 */
public class main {

    public static void main(String[] args) {
        Consola.configurarUTF8();
        BaseDatosFinara.cargar();
        ejecutar(Consola.getScanner());
    }

    public static void ejecutar(Scanner scanner) {
        Scanner sc = (scanner != null) ? scanner : Consola.getScanner();
        boolean continuar = true;

        while (continuar) {
            try {
                Consola.titulo("BIENVENIDO A FINARA BANK (CONSOLA INTEGRADA)");
                System.out.println("1. Registrarse");
                System.out.println("2. Iniciar sesión");
                System.out.println("3. Panel administrativo (CRUD usuarios)");
                System.out.println("4. Salir");

                int opcion = Consola.leerEntero(sc, "Seleccione una opción (1-4): ", 1, 4);
                switch (opcion) {
                    case 1:
                        signUp.registrarUsuario(sc, BaseDatosFinara.getInstancia().getUsuarios());
                        break;
                    case 2:
                        Map<String, String> usuario = ModuloLoginCLI.autenticarInteractivo(
                                sc, BaseDatosFinara.getInstancia().getUsuarios());
                        if (usuario != null) {
                            Sesion.iniciar(usuario);
                            menuCliente(sc, usuario);
                            Sesion.cerrar();
                            BaseDatosFinara.guardar();
                        }
                        break;
                    case 3:
                        crud.iniciar(sc, null);
                        break;
                    case 4:
                        BaseDatosFinara.guardar();
                        System.out.println("\nGracias por utilizar Finara Bank. Estado guardado de forma segura.");
                        continuar = false;
                        break;
                }
            } catch (Exception e) {
                System.out.println("\n[!] Se produjo un error controlado en el menú principal: " + e.getMessage());
            }
        }
    }

    private static void menuCliente(Scanner sc, Map<String, String> usuario) {
        boolean enSesion = true;
        while (enSesion) {
            try {
                String nombre = usuario.getOrDefault("nombre", "Cliente Finara");
                Consola.titulo("MENÚ CLIENTE FINARA BANK - " + nombre.toUpperCase());
                System.out.println("1.  Dashboard");
                System.out.println("2.  Mis cuentas / Saldos");
                System.out.println("3.  Solicitar producto");
                System.out.println("4.  Consignar / Pagar tarjeta");
                System.out.println("5.  Retirar dinero");
                System.out.println("6.  Transferencia interna Finara");
                System.out.println("7.  Transferencia interbancaria ACH");
                System.out.println("8.  Consultar movimientos");
                System.out.println("9.  Préstamos");
                System.out.println("10. Finanzas personales (Presupuestos, Planificación, Fondo, Deuda, Suscripciones, Salud)");
                System.out.println("11. Mis beneficios");
                System.out.println("12. Mi perfil");
                System.out.println("0.  Cerrar sesión");

                int opcion = Consola.leerEntero(sc, "Seleccione una opción (0-12): ", 0, 12);
                switch (opcion) {
                    case 1:
                        ModuloDashboardCLI.iniciar(sc, usuario);
                        break;
                    case 2:
                        ModuloCuentasCLI.iniciar(sc, usuario);
                        break;
                    case 3:
                        GestorTarjetas.iniciar(sc, usuario);
                        break;
                    case 4:
                        ModuloConsignacionesCLI.iniciar(sc, usuario);
                        break;
                    case 5:
                        ModuloRetirosCLI.iniciar(sc, usuario);
                        break;
                    case 6:
                        ModuloTransferenciasInternasCLI.iniciar(sc, usuario);
                        break;
                    case 7:
                        ModuloTransferenciasCLI.iniciar(sc, usuario);
                        break;
                    case 8:
                        ModuloMovimientosCLI.iniciar(sc, usuario);
                        break;
                    case 9:
                        GestorPrestamos.iniciar(sc, usuario);
                        break;
                    case 10:
                        menuFinanzasPersonales(sc, usuario);
                        break;
                    case 11:
                        ModuloBeneficiosCLI.iniciar(sc, usuario);
                        break;
                    case 12:
                        ProfileManager.iniciar(sc, usuario);
                        break;
                    case 0:
                        BaseDatosFinara.guardar();
                        enSesion = false;
                        System.out.println("Sesión cerrada correctamente.");
                        break;
                }
            } catch (Exception e) {
                System.out.println("\n[!] Error controlado en módulo cliente: " + e.getMessage());
            }
        }
    }

    private static void menuFinanzasPersonales(Scanner sc, Map<String, String> usuario) {
        boolean enSubmenu = true;
        while (enSubmenu) {
            try {
                Consola.titulo("FINANZAS PERSONALES Y ASESORÍA FINARA");
                System.out.println("1. Presupuesto mensual (HU-18 / HU-23)");
                System.out.println("2. Planificación financiera mensual (HU-30)");
                System.out.println("3. Fondo de emergencia (HU-19)");
                System.out.println("4. Asesoría y control de endeudamiento");
                System.out.println("5. Suscripciones, gastos hormiga y pagos pendientes (HU-22)");
                System.out.println("6. Diagnóstico de salud financiera");
                System.out.println("0. Volver al menú cliente");

                int op = Consola.leerEntero(sc, "Seleccione una opción (0-6): ", 0, 6);
                switch (op) {
                    case 1:
                        ModuloPresupuestosCLI.iniciar(sc, usuario);
                        break;
                    case 2:
                        ModuloPlanificacionCLI.iniciar(sc, usuario);
                        break;
                    case 3:
                        ModuloFondoEmergenciaCLI.iniciar(sc, usuario);
                        break;
                    case 4:
                        ModuloEndeudamientoCLI.iniciar(sc, usuario);
                        break;
                    case 5:
                        ModuloSuscripcionesPagosCLI.iniciar(sc, usuario);
                        break;
                    case 6:
                        MainSaludFinanciera.iniciar(sc, usuario);
                        break;
                    case 0:
                        enSubmenu = false;
                        break;
                }
            } catch (Exception e) {
                System.out.println("\n[!] Error controlado en finanzas personales: " + e.getMessage());
            }
        }
    }
}
