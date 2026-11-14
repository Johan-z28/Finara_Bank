package cuentas;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Módulo de consulta de cuentas, tarjetas y saldos consolidados del cliente.
 */
public class ModuloCuentasCLI {

    public static void main(String[] args) {
        BaseDatosFinara.cargar();
        iniciar(Consola.getScanner(), new java.util.HashMap<>());
    }

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        if (datosUsuario == null || datosUsuario.isEmpty()) {
            System.out.println("[!] Debe iniciar sesión para consultar sus cuentas.");
            return;
        }
        String correo = datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "")).toLowerCase();
        String titular = datosUsuario.getOrDefault("nombre", "Cliente Finara");

        Consola.titulo("MIS CUENTAS Y SALDOS - FINARA BANK");
        System.out.println("Titular: " + titular + " (" + correo + ")");

        RepositorioCuentas repo = BaseDatosFinara.getInstancia().getRepositorioCuentas();
        List<Map<String, String>> cuentas = repo.obtenerCuentasUsuario(correo);

        if (cuentas.isEmpty()) {
            System.out.println("\n[i] Aún no tienes cuentas ni tarjetas activas en Finara Bank.");
            System.out.println("    Dirígete a 'Solicitar producto' en el menú para abrir tu primer producto.");
            return;
        }

        System.out.println("-------------------------------------------------------");
        int i = 1;
        for (Map<String, String> c : cuentas) {
            String tipo = c.getOrDefault("tipo", "AHORROS").toUpperCase();
            String num = c.getOrDefault("numero", "");
            String estado = c.getOrDefault("estado", "ACTIVA");

            if ("CREDITO".equals(tipo)) {
                double cupoMax = RepositorioCuentas.parsearNumero(c.get("cupoMaximo"));
                double cupoDisp = RepositorioCuentas.parsearNumero(c.get("cupoDisponible"));
                double deuda = RepositorioCuentas.parsearNumero(c.get("deudaActual"));
                System.out.printf("%d. Tarjeta de Crédito Gold | %s | Estado: %s%n", i++, Consola.enmascararCuenta(num), estado);
                System.out.println("   Número completo (ref) : " + num);
                System.out.println("   Cupo Total            : " + Consola.formatoCOP(cupoMax));
                System.out.println("   Cupo Disponible       : " + Consola.formatoCOP(cupoDisp));
                System.out.println("   Deuda Actual          : " + Consola.formatoCOP(deuda));
            } else {
                double saldo = RepositorioCuentas.parsearNumero(c.get("saldo"));
                String nombreTipo = "CORRIENTE".equals(tipo) ? "Cuenta Corriente" : "Cuenta de Ahorros";
                System.out.printf("%d. %-18s | %s | Estado: %s%n", i++, nombreTipo, Consola.enmascararCuenta(num), estado);
                System.out.println("   Número completo       : " + num);
                System.out.println("   Saldo Disponible      : " + Consola.formatoCOP(saldo));
            }
            System.out.println("-------------------------------------------------------");
        }

        System.out.println("Saldo consolidado (Ahorros + Corriente): " + Consola.formatoCOP(repo.calcularSaldoConsolidado(correo)));
        System.out.println("Deuda total en Tarjetas de Crédito     : " + Consola.formatoCOP(repo.calcularDeudaTotalTarjetas(correo)));
    }
}
