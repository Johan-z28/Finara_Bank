package core;

import AsesoriaFinanciera.EvaluacionFinanciera;
import Prestamos.Prestamos;
import asesoriaEndeudamiento.Obligacion;
import beneficios.Beneficio;
import fondoEmergencia.FondoEmergencia;
import planificacion.PlanMensual;
import presupuestos.ItemPresupuesto;
import suscripcionesPagos.PagoPendiente;
import suscripcionesPagos.Suscripcion;
import tarjetaPoo.miTarjeta;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Singleton: único origen de verdad en memoria de Finara Bank,
 * con persistencia automática en Backend/Terminal/data/finara_data.bin.
 */
public class BaseDatosFinara implements Serializable {
    private static final long serialVersionUID = 1L;

    private static BaseDatosFinara instancia;
    private static boolean shutdownHookRegistrado = false;
    private static File archivoPersistenciaOverride = null;

    // 1. Usuarios (correo -> mapa de campos)
    private Map<String, Map<String, String>> usuarios = new HashMap<>();

    // 2. Cuentas compartidas y movimientos reales
    private RepositorioCuentas repositorioCuentas = new RepositorioCuentas();
    private RepositorioMovimientos repositorioMovimientos = new RepositorioMovimientos();

    // 3. Productos de tarjeta por usuario
    private Map<String, List<miTarjeta>> tarjetasPorUsuario = new HashMap<>();

    // 4. Préstamos por usuario
    private Map<String, List<Prestamos>> prestamosPorUsuario = new HashMap<>();

    // 5. Beneficios y Puntos Finara por usuario (inician en 0)
    private Map<String, List<Beneficio>> beneficiosPorUsuario = new HashMap<>();
    private Map<String, Integer> puntosFinaraPorUsuario = new HashMap<>();

    // 6. Estado de módulos de finanzas personales por usuario
    private Map<String, FondoEmergencia> fondosPorUsuario = new HashMap<>();
    private Map<String, List<ItemPresupuesto>> presupuestosPorUsuario = new HashMap<>();
    private Map<String, Double> ingresosEndeudamientoPorUsuario = new HashMap<>();
    private Map<String, List<Obligacion>> obligacionesPorUsuario = new HashMap<>();
    private Map<String, List<Suscripcion>> suscripcionesPorUsuario = new HashMap<>();
    private Map<String, List<PagoPendiente>> pagosPorUsuario = new HashMap<>();
    private Map<String, List<EvaluacionFinanciera>> evaluacionesSaludPorUsuario = new HashMap<>();
    private Map<String, Map<String, PlanMensual>> planesPorUsuarioPeriodo = new HashMap<>();

    private BaseDatosFinara() {
    }

    public static synchronized BaseDatosFinara getInstancia() {
        if (instancia == null) {
            instancia = new BaseDatosFinara();
            registrarShutdownHook();
        }
        return instancia;
    }

    public static synchronized void setArchivoPersistenciaOverride(File archivo) {
        archivoPersistenciaOverride = archivo;
    }

    public static File obtenerArchivoPersistencia() {
        if (archivoPersistenciaOverride != null) {
            return archivoPersistenciaOverride;
        }
        File rutaDesdeRaiz = new File("Backend" + File.separator + "Terminal");
        if (rutaDesdeRaiz.isDirectory()) {
            return new File(rutaDesdeRaiz, "data" + File.separator + "finara_data.bin");
        }
        return new File("data" + File.separator + "finara_data.bin");
    }

    public static synchronized void cargar() {
        registrarShutdownHook();
        File archivo = obtenerArchivoPersistencia();
        if (!archivo.exists() || !archivo.isFile() || archivo.length() == 0) {
            if (instancia == null) {
                instancia = new BaseDatosFinara();
            }
            return;
        }
        try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream(archivo))) {
            Object obj = ois.readObject();
            if (obj instanceof BaseDatosFinara) {
                BaseDatosFinara cargada = (BaseDatosFinara) obj;
                cargada.inicializarColeccionesNulas();
                instancia = cargada;
            } else {
                instancia = new BaseDatosFinara();
            }
        } catch (Exception e) {
            System.out.println("[!] No se pudo restaurar finara_data.bin (archivo nuevo o incompatible). Iniciando base limpia.");
            instancia = new BaseDatosFinara();
        }
    }

    public static synchronized void guardar() {
        if (instancia == null) {
            return;
        }
        File archivo = obtenerArchivoPersistencia();
        File directorio = archivo.getParentFile();
        if (directorio != null && !directorio.exists()) {
            directorio.mkdirs();
        }
        try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(archivo))) {
            oos.writeObject(instancia);
            oos.flush();
        } catch (Exception e) {
            System.out.println("[!] Advertencia: no fue posible guardar el estado en disco: " + e.getMessage());
        }
    }

    public static synchronized void reiniciarEnMemoria() {
        instancia = new BaseDatosFinara();
    }

    private static void registrarShutdownHook() {
        if (!shutdownHookRegistrado) {
            shutdownHookRegistrado = true;
            Runtime.getRuntime().addShutdownHook(new Thread(BaseDatosFinara::guardar));
        }
    }

    private void inicializarColeccionesNulas() {
        if (usuarios == null) usuarios = new HashMap<>();
        if (repositorioCuentas == null) repositorioCuentas = new RepositorioCuentas();
        if (repositorioMovimientos == null) repositorioMovimientos = new RepositorioMovimientos();
        if (tarjetasPorUsuario == null) tarjetasPorUsuario = new HashMap<>();
        if (prestamosPorUsuario == null) prestamosPorUsuario = new HashMap<>();
        if (beneficiosPorUsuario == null) beneficiosPorUsuario = new HashMap<>();
        if (puntosFinaraPorUsuario == null) puntosFinaraPorUsuario = new HashMap<>();
        if (fondosPorUsuario == null) fondosPorUsuario = new HashMap<>();
        if (presupuestosPorUsuario == null) presupuestosPorUsuario = new HashMap<>();
        if (ingresosEndeudamientoPorUsuario == null) ingresosEndeudamientoPorUsuario = new HashMap<>();
        if (obligacionesPorUsuario == null) obligacionesPorUsuario = new HashMap<>();
        if (suscripcionesPorUsuario == null) suscripcionesPorUsuario = new HashMap<>();
        if (pagosPorUsuario == null) pagosPorUsuario = new HashMap<>();
        if (evaluacionesSaludPorUsuario == null) evaluacionesSaludPorUsuario = new HashMap<>();
        if (planesPorUsuarioPeriodo == null) planesPorUsuarioPeriodo = new HashMap<>();
    }

    public static String normalizarCorreo(String correo) {
        return correo == null ? "" : correo.trim().toLowerCase();
    }

    // ==================== GETTERS PRINCIPALES ====================

    public Map<String, Map<String, String>> getUsuarios() {
        return usuarios;
    }

    public RepositorioCuentas getRepositorioCuentas() {
        return repositorioCuentas;
    }

    public RepositorioMovimientos getRepositorioMovimientos() {
        return repositorioMovimientos;
    }

    public synchronized List<miTarjeta> getTarjetasUsuario(String correo) {
        return tarjetasPorUsuario.computeIfAbsent(normalizarCorreo(correo), k -> new ArrayList<>());
    }

    public synchronized List<Prestamos> getPrestamosUsuario(String correo) {
        return prestamosPorUsuario.computeIfAbsent(normalizarCorreo(correo), k -> new ArrayList<>());
    }

    public synchronized List<Beneficio> getBeneficiosUsuario(String correo) {
        return beneficiosPorUsuario.computeIfAbsent(normalizarCorreo(correo), k -> new ArrayList<>());
    }

    public synchronized int getPuntosFinara(String correo) {
        return puntosFinaraPorUsuario.getOrDefault(normalizarCorreo(correo), 0);
    }

    public synchronized void sumarPuntosFinara(String correo, int puntos) {
        String c = normalizarCorreo(correo);
        puntosFinaraPorUsuario.put(c, Math.max(0, getPuntosFinara(c) + puntos));
    }

    public synchronized FondoEmergencia getFondoEmergencia(String correo) {
        return fondosPorUsuario.get(normalizarCorreo(correo));
    }

    public synchronized void setFondoEmergencia(String correo, FondoEmergencia fondo) {
        String c = normalizarCorreo(correo);
        if (fondo == null) {
            fondosPorUsuario.remove(c);
        } else {
            fondosPorUsuario.put(c, fondo);
        }
    }

    public synchronized List<ItemPresupuesto> getPresupuestosUsuario(String correo) {
        return presupuestosPorUsuario.computeIfAbsent(normalizarCorreo(correo), k -> new ArrayList<>());
    }

    public synchronized double getIngresoEndeudamiento(String correo) {
        return ingresosEndeudamientoPorUsuario.getOrDefault(normalizarCorreo(correo), 0.0);
    }

    public synchronized void setIngresoEndeudamiento(String correo, double ingreso) {
        ingresosEndeudamientoPorUsuario.put(normalizarCorreo(correo), Math.max(0.0, ingreso));
    }

    public synchronized List<Obligacion> getObligacionesUsuario(String correo) {
        return obligacionesPorUsuario.computeIfAbsent(normalizarCorreo(correo), k -> new ArrayList<>());
    }

    public synchronized List<Suscripcion> getSuscripcionesUsuario(String correo) {
        return suscripcionesPorUsuario.computeIfAbsent(normalizarCorreo(correo), k -> new ArrayList<>());
    }

    public synchronized List<PagoPendiente> getPagosUsuario(String correo) {
        return pagosPorUsuario.computeIfAbsent(normalizarCorreo(correo), k -> new ArrayList<>());
    }

    public synchronized List<EvaluacionFinanciera> getEvaluacionesSaludUsuario(String correo) {
        return evaluacionesSaludPorUsuario.computeIfAbsent(normalizarCorreo(correo), k -> new ArrayList<>());
    }

    public synchronized Map<String, PlanMensual> getPlanesUsuario(String correo) {
        return planesPorUsuarioPeriodo.computeIfAbsent(normalizarCorreo(correo), k -> new HashMap<>());
    }

    public synchronized Map<String, String> buscarUsuarioPorCorreoOUsername(String identificador) {
        if (identificador == null) return null;
        String id = identificador.trim();
        if (usuarios.containsKey(id)) return usuarios.get(id);
        if (usuarios.containsKey(id.toLowerCase())) return usuarios.get(id.toLowerCase());
        for (Map<String, String> u : usuarios.values()) {
            String correo = u.getOrDefault("correo", "");
            String username = u.getOrDefault("username", "");
            if (correo.equalsIgnoreCase(id) || username.equalsIgnoreCase(id)) {
                return u;
            }
        }
        return null;
    }

    public synchronized void eliminarTodoDeUsuario(String correo) {
        String c = normalizarCorreo(correo);
        usuarios.remove(c);
        tarjetasPorUsuario.remove(c);
        prestamosPorUsuario.remove(c);
        beneficiosPorUsuario.remove(c);
        puntosFinaraPorUsuario.remove(c);
        fondosPorUsuario.remove(c);
        presupuestosPorUsuario.remove(c);
        ingresosEndeudamientoPorUsuario.remove(c);
        obligacionesPorUsuario.remove(c);
        suscripcionesPorUsuario.remove(c);
        pagosPorUsuario.remove(c);
        evaluacionesSaludPorUsuario.remove(c);
        planesPorUsuarioPeriodo.remove(c);
    }
}
