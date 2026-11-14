package AsesoriaFinanciera;

import asesoriaEndeudamiento.GestorEndeudamiento;
import core.BaseDatosFinara;
import core.Consola;
import fondoEmergencia.FondoEmergencia;
import presupuestos.GestorPresupuestos;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Interfaz CLI integrada de Asesoría de Salud Financiera (Score + Diagnóstico).
 * Pre-carga deuda total, ahorro disponible e ingresos desde los módulos integrados, permitiendo ajuste.
 */
public class MainSaludFinanciera {

    public static void main(String[] args) {
        BaseDatosFinara.cargar();
        iniciar(Consola.getScanner(), null);
    }

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        Scanner sc = scanner != null ? scanner : Consola.getScanner();
        String correo = datosUsuario != null
                ? datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "cliente@finara.com")).toLowerCase()
                : "cliente@finara.com";

        GestorSaludFinanciera gestor = new GestorSaludFinanciera(correo);
        boolean enModulo = true;

        while (enModulo) {
            Consola.titulo("MÓDULO DE ASESORÍA Y SALUD FINANCIERA FINARA");
            System.out.println("1. Realizar nuevo diagnóstico (con precarga automática de datos reales)");
            System.out.println("2. Ver historial de diagnósticos");
            System.out.println("3. Consultar detalle por ID de evaluación");
            System.out.println("0. Volver al menú anterior");

            int opcion = Consola.leerEntero(sc, "Seleccione una opción (0-3): ", 0, 3);
            switch (opcion) {
                case 1:
                    ejecutarDiagnostico(sc, gestor, correo);
                    break;
                case 2:
                    mostrarHistorial(gestor.obtenerHistorial());
                    break;
                case 3:
                    String id = Consola.leerLinea(sc, "ID de evaluación (ej. EVAL-..., 0 cancelar): ");
                    if (!"0".equals(id) && !id.isEmpty()) {
                        EvaluacionFinanciera ev = gestor.buscarPorId(id);
                        if (ev != null) {
                            imprimirDetalle(ev);
                        } else {
                            System.out.println("[!] Evaluación no encontrada.");
                        }
                    }
                    break;
                case 0:
                    enModulo = false;
                    break;
            }
        }
    }

    private static void ejecutarDiagnostico(Scanner sc, GestorSaludFinanciera gestor, String correo) {
        BaseDatosFinara db = BaseDatosFinara.getInstancia();

        // Precarga real desde Presupuestos, Endeudamiento y Fondo/Cuentas
        GestorPresupuestos gp = new GestorPresupuestos();
        GestorPresupuestos.ResumenPresupuesto resumenPres = gp.calcularResumen(correo, gp.obtenerPeriodoActual());
        double ingresosSug = resumenPres.getTotalIngresos();
        double gastosSug = resumenPres.getTotalGastos();

        GestorEndeudamiento ge = new GestorEndeudamiento(correo);
        double deudaSug = ge.calcularDeudaTotal();

        FondoEmergencia fe = db.getFondoEmergencia(correo);
        double ahorroFondo = (fe != null) ? fe.getSaldoActual() : 0.0;
        double ahorroCuentas = db.getRepositorioCuentas().calcularSaldoConsolidado(correo);
        double ahorroSug = ahorroFondo + ahorroCuentas;

        Consola.subtitulo("DATOS PARA DIAGNÓSTICO (Enter conserva valor real calculado)");
        System.out.println("  • Ingresos desde Presupuestos   : " + Consola.formatoCOP(ingresosSug));
        System.out.println("  • Gastos desde Presupuestos     : " + Consola.formatoCOP(gastosSug));
        System.out.println("  • Deuda total real (Finara+Ext.): " + Consola.formatoCOP(deudaSug));
        System.out.println("  • Ahorro real (Cuentas + Fondo) : " + Consola.formatoCOP(ahorroSug));

        double ingresosOpt = Consola.leerMontoOpcional(sc,
                "Ingresos mensuales [" + Consola.formatoCOP(ingresosSug) + "] (Enter conserva): ");
        double ingresos = (ingresosOpt < 0) ? ingresosSug : ingresosOpt;

        double gastosOpt = Consola.leerMontoOpcional(sc,
                "Gastos mensuales [" + Consola.formatoCOP(gastosSug) + "] (Enter conserva): ");
        double gastos = (gastosOpt < 0) ? gastosSug : gastosOpt;

        double deudaOpt = Consola.leerMontoOpcional(sc,
                "Deuda total [" + Consola.formatoCOP(deudaSug) + "] (Enter conserva): ");
        double deuda = (deudaOpt < 0) ? deudaSug : deudaOpt;

        double ahorroOpt = Consola.leerMontoOpcional(sc,
                "Ahorro disponible [" + Consola.formatoCOP(ahorroSug) + "] (Enter conserva): ");
        double ahorro = (ahorroOpt < 0) ? ahorroSug : ahorroOpt;

        String meta = Consola.leerLinea(sc, "Meta financiera principal (ej. Fondo emergencia, Comprar casa): ");

        EvaluacionFinanciera res = gestor.generarDiagnostico(ingresos, gastos, deuda, ahorro, meta);
        imprimirDetalle(res);
    }

    private static void mostrarHistorial(List<EvaluacionFinanciera> lista) {
        Consola.subtitulo("HISTORIAL DE DIAGNÓSTICOS");
        if (lista.isEmpty()) {
            System.out.println("No hay evaluaciones registradas.");
            return;
        }
        for (EvaluacionFinanciera ev : lista) {
            System.out.println(" • [" + ev.getIdEvaluacion() + "] Fecha: " + ev.getFechaEvaluacion()
                    + " | Score: " + ev.getScore() + "/100 (" + ev.getNivelSalud() + ")");
        }
    }

    private static void imprimirDetalle(EvaluacionFinanciera ev) {
        System.out.println("\n=======================================================");
        System.out.println("  DIAGNÓSTICO DE SALUD FINANCIERA [" + ev.getIdEvaluacion() + "]");
        System.out.println("=======================================================");
        System.out.println("Score Salud : " + ev.getScore() + " / 100");
        System.out.println("Nivel       : " + ev.getNivelSalud());
        System.out.println("Ingresos    : " + Consola.formatoCOP(ev.getIngresosMensuales())
                + " | Gastos: " + Consola.formatoCOP(ev.getGastosMensuales()));
        System.out.println("Deuda total : " + Consola.formatoCOP(ev.getDeudaTotal())
                + " | Ahorro: " + Consola.formatoCOP(ev.getAhorroActual()));

        if (!ev.getPuntosFuertes().isEmpty()) {
            System.out.println("\n[+] Puntos fuertes:");
            for (String f : ev.getPuntosFuertes()) System.out.println("    - " + f);
        }
        if (!ev.getOportunidadesMejora().isEmpty()) {
            System.out.println("\n[!] Oportunidades de mejora:");
            for (String m : ev.getOportunidadesMejora()) System.out.println("    - " + m);
        }
        if (!ev.getRecomendaciones().isEmpty()) {
            System.out.println("\n[*] Recomendaciones:");
            for (String r : ev.getRecomendaciones()) System.out.println("    - " + r);
        }
        System.out.println("=======================================================");
    }
}
