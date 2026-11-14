package asesoriaEndeudamiento;

import core.BaseDatosFinara;
import core.Consola;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Módulo CLI integrado para Asesoría y Control de Endeudamiento.
 */
public class ModuloEndeudamientoCLI {
    private final GestorEndeudamiento gestor;
    private final Scanner scanner;

    public ModuloEndeudamientoCLI() {
        this("cliente@finara.com", Consola.getScanner());
    }

    public ModuloEndeudamientoCLI(String correo, Scanner scanner) {
        this.gestor = new GestorEndeudamiento(correo);
        this.scanner = scanner != null ? scanner : Consola.getScanner();
    }

    public static void main(String[] args) {
        BaseDatosFinara.cargar();
        ModuloEndeudamientoCLI cli = new ModuloEndeudamientoCLI();
        cli.iniciar();
    }

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        String correo = datosUsuario != null
                ? datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "cliente@finara.com"))
                : "cliente@finara.com";
        ModuloEndeudamientoCLI cli = new ModuloEndeudamientoCLI(correo, scanner);
        cli.iniciar();
    }

    public void iniciar() {
        boolean continuar = true;
        while (continuar) {
            List<Obligacion> lista = gestor.getObligaciones();
            double pct = gestor.calcularPorcentajeEndeudamiento();

            Consola.titulo("FINARA BANK - ASESORÍA Y CONTROL DE ENDEUDAMIENTO");
            System.out.println("Ingreso Mensual Base : " + Consola.formatoCOP(gestor.getIngresoMensual()));
            System.out.println("Deuda Total Acum.    : " + Consola.formatoCOP(gestor.calcularDeudaTotal()));
            System.out.println("Cuota Mensual Total  : " + Consola.formatoCOP(gestor.calcularCuotaMensualTotal()));
            if (gestor.getIngresoMensual() > 0) {
                System.out.printf("Nivel Endeudamiento  : %.1f%% -> %s%n", pct, gestor.clasificarNivelRiesgo(pct));
                System.out.println("Capacidad Disp. (30%): " + Consola.formatoCOP(gestor.calcularCapacidadDisponible()) + "/mes");
            } else {
                System.out.println("Nivel Endeudamiento  : Configure su ingreso mensual (opción 2) para calcular el ratio.");
            }
            System.out.println("Obligaciones activas : " + lista.size());
            System.out.println("-------------------------------------------------------");
            System.out.println("1. Ver Lista de Obligaciones (Finara y Externas)");
            System.out.println("2. Configurar Ingreso Mensual Neto");
            System.out.println("3. Agregar Nueva Obligación / Deuda Manual");
            System.out.println("4. Eliminar Obligación Manual");
            System.out.println("5. Simulador de Liquidación (Avalancha vs Bola de Nieve)");
            System.out.println("0. Volver al menú anterior");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-5): ", 0, 5);
            switch (opcion) {
                case 1:
                    verObligaciones(lista);
                    break;
                case 2:
                    configurarIngreso();
                    break;
                case 3:
                    agregarObligacionManual();
                    break;
                case 4:
                    eliminarObligacionManual(lista);
                    break;
                case 5:
                    ejecutarSimulador(lista);
                    break;
                case 0:
                    continuar = false;
                    break;
            }
        }
    }

    private void verObligaciones(List<Obligacion> lista) {
        Consola.subtitulo("OBLIGACIONES REGISTRADAS");
        if (lista.isEmpty()) {
            System.out.println("No tienes obligaciones ni deudas registradas actualmente.");
            return;
        }
        int i = 1;
        for (Obligacion o : lista) {
            System.out.println(i++ + ". [" + o.getId() + "] " + o);
        }
    }

    private void configurarIngreso() {
        double ing = Consola.leerMonto(scanner, "Nuevo ingreso mensual neto en COP (0 cancelar): ");
        if (ing > 0) {
            gestor.setIngresoMensual(ing);
            System.out.println("[✓] Ingreso mensual actualizado a " + Consola.formatoCOP(ing) + ".");
        }
    }

    private void agregarObligacionManual() {
        Consola.subtitulo("REGISTRAR OBLIGACIÓN EXTERNA");
        String entidad = Consola.leerLineaObligatoria(scanner, "Entidad (ej. Banco Externo, 0 cancelar): ");
        if (entidad == null) return;

        System.out.println("Tipo: 1. TARJETA  2. PRESTAMO  3. HIPOTECA  4. VEHICULO  5. LIBRANZA  6. OTRO");
        int t = Consola.leerEntero(scanner, "Seleccione tipo (1-6, 0 cancelar): ", 1, 6);
        if (t <= 0) return;
        String[] tipos = {"TARJETA", "PRESTAMO", "HIPOTECA", "VEHICULO", "LIBRANZA", "OTRO"};

        double saldo = Consola.leerMonto(scanner, "Saldo total adeudado en COP (0 cancelar): ");
        if (saldo <= 0) return;

        double cuota = Consola.leerMonto(scanner, "Cuota mensual actual en COP (0 cancelar): ");
        if (cuota <= 0) return;

        double tasaOpt = Consola.leerMontoOpcional(scanner, "Tasa de interés E.A. % (Enter = 18): ");
        double tasa = (tasaOpt < 0) ? 18.0 : tasaOpt;

        int plazo = Consola.leerEntero(scanner, "Plazo restante en meses (1-360, 0 cancelar): ", 1, 360);
        if (plazo <= 0) return;

        String id = "OBL-MAN-" + (System.currentTimeMillis() % 100000);
        gestor.agregarObligacion(new Obligacion(id, tipos[t - 1], entidad, saldo, cuota, tasa, plazo, "MANUAL", ""));
        System.out.println("[✓] Obligación agregada con ID: " + id);
    }

    private void eliminarObligacionManual(List<Obligacion> lista) {
        if (lista.isEmpty()) {
            System.out.println("[i] No hay obligaciones registradas.");
            return;
        }
        verObligaciones(lista);
        String id = Consola.leerLinea(scanner, "ID de la obligación manual a eliminar (0 cancelar): ");
        if ("0".equals(id) || id.isEmpty()) return;

        if (gestor.eliminarObligacion(id)) {
            System.out.println("[✓] Obligación manual eliminada.");
        } else {
            System.out.println("[!] No se pudo eliminar (verifique el ID o si es una obligación protegida origen FINARA).");
        }
    }

    private void ejecutarSimulador(List<Obligacion> lista) {
        if (lista.isEmpty()) {
            System.out.println("\n[i] No hay obligaciones activas para simular.");
            return;
        }
        Consola.subtitulo("SIMULADOR DE LIQUIDACIÓN DE DEUDAS");
        double abonoExtra = Consola.leerMontoOpcional(scanner, "Abono extra mensual adicional en COP (Enter = $0): ");
        if (abonoExtra < 0) abonoExtra = 0;

        GestorEndeudamiento.ResultadoSimulacion aval = gestor.simularEstrategia(abonoExtra, "AVALANCHA");
        GestorEndeudamiento.ResultadoSimulacion bola = gestor.simularEstrategia(abonoExtra, "BOLA_NIEVE");

        System.out.println("\nComparativa de Estrategias (con abono extra de " + Consola.formatoCOP(abonoExtra) + "/mes):");
        System.out.printf(" • AVALANCHA (Mayor tasa primero) : %d mes(es) | Intereses: %s | Ahorro: %s%n",
                aval.meses, Consola.formatoCOP(aval.totalIntereses), Consola.formatoCOP(aval.ahorroIntereses));
        System.out.printf(" • BOLA DE NIEVE (Menor saldo)    : %d mes(es) | Intereses: %s | Ahorro: %s%n",
                bola.meses, Consola.formatoCOP(bola.totalIntereses), Consola.formatoCOP(bola.ahorroIntereses));
    }
}
