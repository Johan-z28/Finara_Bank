package core;

import AsesoriaFinanciera.EvaluacionFinanciera;
import AsesoriaFinanciera.GestorSaludFinanciera;
import Prestamos.GestorPrestamos;
import Prestamos.Prestamos;
import admin.crud;
import asesoriaEndeudamiento.GestorEndeudamiento;
import asesoriaEndeudamiento.Obligacion;
import beneficios.Beneficio;
import beneficios.ServicioBeneficios;
import consignaciones.ServicioConsignaciones;
import fondoEmergencia.FondoEmergencia;
import fondoEmergencia.GestorFondoEmergencia;
import form.LoginService;
import movimientos.MovimientoFinanciero;
import planificacion.PlanMensual;
import planificacion.ServicioPlanificacion;
import presupuestos.GestorPresupuestos;
import retiros.ComprobanteRetiro;
import retiros.ServicioRetiros;
import suscripcionesPagos.GestorSuscripcionesPagos;
import suscripcionesPagos.PagoPendiente;
import transferencias.ComprobanteTransferencia;
import transferencias.ServicioInterbancario;
import transferencias.SolicitudInterbancaria;
import transferenciasInternas.ComprobanteTransferenciaInterna;
import transferenciasInternas.ServicioTransferenciasInternas;

import java.io.File;
import java.nio.file.Files;
import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Prueba de aceptación integral automatizada de Finara Bank.
 * Valida reglas de negocio, estado compartido entre módulos, persistencia y navegación CLI en main.
 */
public class TestFlujoIntegral {

    public static void main(String[] args) throws Exception {
        Consola.configurarUTF8();
        File tempFile = Files.createTempFile("finara_test_", ".bin").toFile();
        tempFile.delete();
        BaseDatosFinara.setArchivoPersistenciaOverride(tempFile);
        BaseDatosFinara.reiniciarEnMemoria();

        try {
            ejecutarPruebasServiciosIntegrados();
            ejecutarPruebaNavegacionMainCLI(tempFile);
            System.out.println("\n=== TODAS LAS PRUEBAS INTEGRALES PASARON EXITOSAMENTE ===");
        } finally {
            BaseDatosFinara.setArchivoPersistenciaOverride(null);
            if (tempFile.exists()) {
                tempFile.delete();
            }
        }
    }

    private static void ejecutarPruebasServiciosIntegrados() throws Exception {
        System.out.println(">>> 1. Registro, Seguridad SHA-256, Bloqueo y Desbloqueo Admin <<<");
        BaseDatosFinara db = BaseDatosFinara.getInstancia();

        // Registro simulado por CLI de Cliente A y Cliente B
        String flujoRegistro = String.join("\n",
                "Laura Gómez",
                "laura@finara.com",
                "10203040",
                "3001112233",
                "1996-03-14",
                "ClaveSegura1*",
                "ClaveSegura1*",
                "Calle 10 # 5-20",
                "Mateo Ruiz",
                "mateo@finara.com",
                "90807060",
                "3009998877",
                "1994-07-20",
                "ClaveMateo1*",
                "ClaveMateo1*",
                "Carrera 7 # 12-40"
        ) + "\n";
        Scanner scReg = new Scanner(flujoRegistro);
        form.signUp.registrarUsuario(scReg, db.getUsuarios());
        form.signUp.registrarUsuario(scReg, db.getUsuarios());

        Map<String, String> laura = db.getUsuarios().get("laura@finara.com");
        Map<String, String> mateo = db.getUsuarios().get("mateo@finara.com");
        verificar(laura != null && mateo != null, "Ambos usuarios deben quedar registrados");
        verificar(Seguridad.esHash(laura.get("password")), "La contraseña debe guardarse con hash SHA-256 + salt");
        verificar(db.getRepositorioCuentas().contarProductosUsuario("laura@finara.com") == 0, "Usuario nuevo debe iniciar con 0 productos");
        verificar(db.getRepositorioMovimientos().obtenerMovimientosUsuario("laura@finara.com").isEmpty(), "Usuario nuevo no debe tener movimientos demo");

        // Bloqueo tras 3 intentos fallidos
        for (int i = 0; i < 3; i++) {
            LoginService.ResultadoAutenticacion r = LoginService.autenticar(db.getUsuarios(), "laura@finara.com", "incorrecta");
            verificar(!r.isAutenticado(), "Clave incorrecta debe rechazar login");
        }
        LoginService.ResultadoAutenticacion rBloq = LoginService.autenticar(db.getUsuarios(), "laura@finara.com", "ClaveSegura1*");
        verificar(rBloq.isCuentaBloqueada() && !rBloq.isAutenticado(), "Cuenta bloqueada tras 3 intentos fallidos");

        // Admin desbloquea + verifica login por username
        LoginService.desbloquearCuenta(laura);
        LoginService.ResultadoAutenticacion rOk = LoginService.autenticar(db.getUsuarios(), "laura", "ClaveSegura1*");
        verificar(rOk.isAutenticado(), "Debe autenticar por username tras desbloqueo");

        // Admin carga datos demo sin afectar clientes existentes
        crud.cargarDatosDemostracion();
        verificar(db.getUsuarios().containsKey("carlos.demo@finara.com"), "Admin debe cargar usuario demo");

        System.out.println(">>> 2. Productos Reales, Consignación, Retiro y Transferencias <<<");
        RepositorioCuentas repo = db.getRepositorioCuentas();
        RepositorioMovimientos movs = db.getRepositorioMovimientos();

        // Laura abre Ahorros (via solicitud Débito) y Mateo abre Ahorros
        Map<String, String> ctaLaura = repo.crearCuenta("laura@finara.com", "Laura Gómez", "AHORROS", 0.0, 0.0);
        Map<String, String> tcLaura = repo.crearCuenta("laura@finara.com", "Laura Gómez", "CREDITO", 0.0, 5000000.0);
        Map<String, String> ctaMateo = repo.crearCuenta("mateo@finara.com", "Mateo Ruiz", "AHORROS", 0.0, 0.0);
        verificar(repo.contarProductosUsuario("laura@finara.com") == 2, "Laura debe tener 2 productos");

        // Consignar $1.000.000 a Laura
        ServicioConsignaciones.ResultadoConsignacion dep =
                ServicioConsignaciones.procesarConsignacion("laura@finara.com", ctaLaura, 1_000_000, "Salario inicial");
        verificar(dep.isExito(), "Consignación debe ser exitosa");
        verificar(Math.abs(RepositorioCuentas.parsearNumero(ctaLaura.get("saldo")) - 1_000_000) < 0.01, "Saldo tras consignación = 1.000.000");

        // Retiro $100.000 de Laura (aplica interés ahorros 1.5% sobre monto: (1.000.000 + 1.500) - 100.000 = 901.500)
        ComprobanteRetiro ret = ServicioRetiros.procesarRetiro(ctaLaura, 100_000, "Terminal Finara", "Cajero Finara");
        movs.registrarMovimiento("laura@finara.com", ret.getReferencia(), ctaLaura.get("numero"),
                "AHORROS", "Retiro", "EGRESO", 100_000, ret.getNuevoSaldo(), "Retiro cajero");
        verificar(Math.abs(RepositorioCuentas.parsearNumero(ctaLaura.get("saldo")) - 901_500) < 0.01,
                "Saldo tras retiro con rendimiento 1.5% debe ser 901.500");

        // Transferencia interna Laura -> Mateo por $200.000 (comisión $0)
        ComprobanteTransferenciaInterna trfInt = ServicioTransferenciasInternas.procesarTransferencia(
                ctaLaura, ctaMateo, 200_000, "Pago almuerzo");
        movs.registrarMovimiento("laura@finara.com", trfInt.getReferencia(), ctaLaura.get("numero"),
                "AHORROS", "Transferencia", "EGRESO", 200_000, trfInt.getSaldoResultanteOrigen(), "Transferencia a Mateo");
        movs.registrarMovimiento("mateo@finara.com", trfInt.getReferencia(), ctaMateo.get("numero"),
                "AHORROS", "Transferencia", "INGRESO", 200_000, 200_000, "Transferencia de Laura");
        verificar(Math.abs(RepositorioCuentas.parsearNumero(ctaLaura.get("saldo")) - 701_500) < 0.01, "Saldo Laura = 701.500");
        verificar(Math.abs(RepositorioCuentas.parsearNumero(ctaMateo.get("saldo")) - 200_000) < 0.01, "Saldo Mateo = 200.000");
        verificar(movs.obtenerMovimientosUsuario("mateo@finara.com").size() == 1, "Mateo debe ver el ingreso");

        // Transferencia interbancaria ACH por $100.000 + $6.500 comisión = $106.500
        SolicitudInterbancaria solAch = new SolicitudInterbancaria(
                "Bancolombia", "Ahorros", "1234567890", "Proveedor Externo", "998877", 100_000, "Servicios");
        ComprobanteTransferencia trfAch = ServicioInterbancario.procesarTransferenciaInterbancaria(ctaLaura, solAch);
        movs.registrarMovimiento("laura@finara.com", trfAch.getReferencia(), ctaLaura.get("numero"),
                "AHORROS", "Transferencia ACH", "EGRESO", trfAch.getTotalDebitado(), trfAch.getSaldoRestante(), "ACH Bancolombia");
        verificar(Math.abs(RepositorioCuentas.parsearNumero(ctaLaura.get("saldo")) - 595_000) < 0.01,
                "Saldo Laura tras ACH ($106.500) = 595.000");

        System.out.println(">>> 3. Préstamos (Desembolso + Pago de Cuota + Estados) <<<");
        GestorPrestamos gp = new GestorPrestamos();
        Prestamos pAprob = gp.solicitarPrestamo("laura@finara.com", 2_000_000, 12, "libre", "Remodelación");
        verificar("APROBADO".equals(pAprob.getEstado()), "Préstamo <= 5M debe aprobarse automáticamente");
        verificar(Math.abs(RepositorioCuentas.parsearNumero(ctaLaura.get("saldo")) - 2_595_000) < 0.01,
                "Préstamo aprobado debe desembolsarse en cuenta de ahorros");

        Prestamos pRev = gp.solicitarPrestamo("laura@finara.com", 10_000_000, 24, "vehiculo", "Auto");
        verificar("EN_REVISION".equals(pRev.getEstado()), "Préstamo 5M-30M queda EN_REVISION");

        Prestamos pRech = gp.solicitarPrestamo("laura@finara.com", 40_000_000, 60, "hipotecario", "Apartamento");
        verificar("RECHAZADO".equals(pRech.getEstado()), "Préstamo > 30M queda RECHAZADO");

        double saldoAntesCuota = RepositorioCuentas.parsearNumero(ctaLaura.get("saldo"));
        gp.pagarCuota("laura@finara.com", pAprob, ctaLaura);
        verificar(pAprob.getCuotasPagadas() == 1, "Debe registrar 1 cuota pagada");
        verificar(RepositorioCuentas.parsearNumero(ctaLaura.get("saldo")) < saldoAntesCuota, "Pago de cuota debe debitar cuenta");

        System.out.println(">>> 4. Finanzas Personales, Endeudamiento, Pagos, HU-30 y Beneficios <<<");
        // Endeudamiento sincroniza préstamo real FINARA
        GestorEndeudamiento ge = new GestorEndeudamiento("laura@finara.com");
        ge.setIngresoMensual(4_000_000);
        List<Obligacion> obs = ge.getObligaciones();
        verificar(!obs.isEmpty() && "FINARA".equals(obs.get(0).getOrigen()), "Endeudamiento debe sincronizar préstamo FINARA");
        verificar(!ge.eliminarObligacion(obs.get(0).getId()), "No se debe poder eliminar manualmente deuda FINARA");

        // Suscripciones y Pagos proyecta cuota próxima
        GestorSuscripcionesPagos gsp = new GestorSuscripcionesPagos();
        List<PagoPendiente> pendientes = gsp.obtenerPagosPendientes("laura@finara.com");
        verificar(!pendientes.isEmpty(), "Agenda debe proyectar automáticamente la cuota del préstamo");

        // Fondo emergencia con abono real
        GestorFondoEmergencia gfe = new GestorFondoEmergencia();
        gfe.guardarMetaUsuario("laura@finara.com", 3_000_000, 1_000_000, 3, "AHORROS", ctaLaura.get("numero"), 0);
        FondoEmergencia fondo = gfe.registrarAbonoDesdeCuenta("laura@finara.com", 100_000, ctaLaura);
        verificar(Math.abs(fondo.getSaldoActual() - 100_000) < 0.01, "Fondo debe sumar abono real");

        // Presupuestos + Planificación HU-30
        GestorPresupuestos gpres = new GestorPresupuestos();
        String periodo = gpres.obtenerPeriodoActual();
        gpres.crearItem("laura@finara.com", "INGRESO", "salario", "Nómina", 4_000_000, periodo);

        PlanMensual plan = ServicioPlanificacion.obtenerOCrearPlan("laura@finara.com", periodo);
        plan.setIngresosEstimados(4_000_000);
        plan.setMetaAhorro(500_000);
        plan.asignarCategoria("otros_gastos", 300_000);
        ServicioPlanificacion.guardarPlan("laura@finara.com", plan);
        Map<String, Double> ejecutado = ServicioPlanificacion.calcularEjecucionRealPorCategoria("laura@finara.com", periodo);
        verificar(ejecutado.getOrDefault("otros_gastos", 0.0) > 0, "HU-30 debe detectar egresos reales del mes");

        // Salud financiera
        GestorSaludFinanciera gsf = new GestorSaludFinanciera("laura@finara.com");
        EvaluacionFinanciera ev = gsf.generarDiagnostico(4_000_000, 1_500_000, ge.calcularDeudaTotal(),
                fondo.getSaldoActual() + repo.calcularSaldoConsolidado("laura@finara.com"), "Fondo");
        verificar(ev.getScore() >= 0 && ev.getScore() <= 100, "Score de salud debe estar entre 0 y 100");

        // Beneficios según productos + redención + puntos
        verificar(ServicioBeneficios.obtenerPuntosFinara("laura@finara.com") == 0, "Puntos Finara deben iniciar en 0");
        List<Beneficio> bensLaura = ServicioBeneficios.obtenerBeneficiosCliente("laura@finara.com");
        verificar(!bensLaura.isEmpty(), "Laura con Ahorros y Crédito debe tener beneficios elegibles");
        boolean redimio = ServicioBeneficios.redimirBeneficio("laura@finara.com", "BEN-CB01");
        verificar(redimio && ServicioBeneficios.obtenerPuntosFinara("laura@finara.com") == 100,
                "Redimir beneficio debe sumar 100 puntos Finara");
        // Mateo solo tiene Ahorros -> no debe tener beneficio exclusivo de Crédito Gold
        List<Beneficio> bensMateo = ServicioBeneficios.obtenerBeneficiosCliente("mateo@finara.com");
        for (Beneficio b : bensMateo) {
            verificar(!"Tarjeta de Crédito Gold".equalsIgnoreCase(b.getProductoAplica()),
                    "Cliente sin Crédito Gold no debe recibir beneficios exclusivos Gold");
        }

        // Persistencia: guardar -> reiniciar memoria -> cargar -> verificar integridad
        double saldoFinalLauraAntes = RepositorioCuentas.parsearNumero(ctaLaura.get("saldo"));
        BaseDatosFinara.guardar();
        BaseDatosFinara.reiniciarEnMemoria();
        BaseDatosFinara.cargar();

        BaseDatosFinara dbRecargada = BaseDatosFinara.getInstancia();
        verificar(dbRecargada.getUsuarios().containsKey("laura@finara.com"), "Persistencia debe conservar usuarios");
        verificar(dbRecargada.getPrestamosUsuario("laura@finara.com").size() == 3, "Persistencia debe conservar préstamos");
        verificar(ServicioBeneficios.obtenerPuntosFinara("laura@finara.com") == 100, "Persistencia debe conservar puntos");
        double saldoRecargado = dbRecargada.getRepositorioCuentas().calcularSaldoConsolidado("laura@finara.com");
        verificar(Math.abs(saldoRecargado - saldoFinalLauraAntes) < 0.01, "Persistencia debe conservar saldos exactos");
        System.out.println("  [OK] Persistencia binaria validada.");
    }

    private static void ejecutarPruebaNavegacionMainCLI(File tempFile) throws Exception {
        System.out.println(">>> 5. Prueba end-to-end de main.ejecutar(Scanner) <<<");
        // Navegación automatizada sobre la BD persistida:
        // 2 (Login) -> laura@finara.com / ClaveSegura1*
        // -> 1 (Dashboard) -> 0 (volver)
        // -> 2 (Mis cuentas)
        // -> 8 (Movimientos) -> 1 (ver todos) -> 0 (volver)
        // -> 12 (Mi perfil) -> 1 (ver datos) -> 0 (volver)
        // -> 0 (Cerrar sesión)
        // -> 4 (Salir)
        String scriptMain = String.join("\n",
                "2",
                "laura@finara.com",
                "ClaveSegura1*",
                "1",
                "0",
                "2",
                "8",
                "1",
                "0",
                "12",
                "1",
                "0",
                "0",
                "4"
        ) + "\n";

        Class.forName("main").getMethod("ejecutar", Scanner.class).invoke(null, new Scanner(scriptMain));
        verificar(tempFile.exists() && tempFile.length() > 0, "Al salir de main debe existir archivo persistido");
        System.out.println("  [OK] Flujo completo de main.java ejecutado sin errores.");
    }

    private static void verificar(boolean condicion, String mensaje) {
        if (!condicion) {
            throw new AssertionError("FALLO EN PRUEBA INTEGRAL: " + mensaje);
        }
    }
}
