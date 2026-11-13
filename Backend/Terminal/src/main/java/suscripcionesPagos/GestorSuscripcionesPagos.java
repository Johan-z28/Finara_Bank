package suscripcionesPagos;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Gestor de lógica de negocio para el Módulo 2 en 1: Suscripciones, Gastos Hormiga y Pagos Pendientes (HU-22).
 */
public class GestorSuscripcionesPagos {
    private Map<String, List<Suscripcion>> suscripcionesPorUsuario;
    private Map<String, List<PagoPendiente>> pagosPorUsuario;
    private AtomicInteger secuencia;

    public GestorSuscripcionesPagos() {
        this.suscripcionesPorUsuario = new HashMap<>();
        this.pagosPorUsuario = new HashMap<>();
        this.secuencia = new AtomicInteger(1);
    }

    public static class AhorroPotencial {
        private long mensual;
        private long anual;
        private double acumulado;

        public AhorroPotencial(long mensual, long anual, double acumulado) {
            this.mensual = mensual;
            this.anual = anual;
            this.acumulado = acumulado;
        }

        public long getMensual() { return mensual; }
        public long getAnual() { return anual; }
        public double getAcumulado() { return acumulado; }
    }

    public Suscripcion crearSuscripcion(String username, String nombre, String categoria,
                                         double monto, String frecuencia) {
        String user = normalizarUsuario(username);
        String id = "SUS-" + System.currentTimeMillis() + "-" + secuencia.getAndIncrement();
        Suscripcion s = new Suscripcion(id, user, nombre, categoria, monto, frecuencia);
        suscripcionesPorUsuario.computeIfAbsent(user, k -> new ArrayList<>()).add(0, s);
        return s;
    }

    public List<Suscripcion> obtenerSuscripciones(String username) {
        String user = normalizarUsuario(username);
        return new ArrayList<>(suscripcionesPorUsuario.getOrDefault(user, new ArrayList<>()));
    }

    public Suscripcion cambiarEstadoSuscripcion(String username, String id, String nuevoEstado) {
        String user = normalizarUsuario(username);
        List<Suscripcion> lista = suscripcionesPorUsuario.getOrDefault(user, new ArrayList<>());
        for (Suscripcion s : lista) {
            if (s.getId().equals(id)) {
                s.setEstado(nuevoEstado);
                if ("PAUSADA".equals(s.getEstado()) || "CANCELADA".equals(s.getEstado())) {
                    s.setAhorroAcumulado(s.getAhorroAcumulado() + s.calcularCostoMensual());
                }
                return s;
            }
        }
        throw new IllegalArgumentException("Suscripción no encontrada: " + id);
    }

    public boolean eliminarSuscripcion(String username, String id) {
        String user = normalizarUsuario(username);
        List<Suscripcion> lista = suscripcionesPorUsuario.get(user);
        if (lista == null) return false;
        return lista.removeIf(s -> s.getId().equals(id));
    }

    public PagoPendiente crearPagoPendiente(String username, String nombre, String tipo,
                                            double monto, LocalDate fechaVencimiento) {
        String user = normalizarUsuario(username);
        String id = "PAG-" + System.currentTimeMillis() + "-" + secuencia.getAndIncrement();
        PagoPendiente p = new PagoPendiente(id, user, nombre, tipo, monto, fechaVencimiento);
        pagosPorUsuario.computeIfAbsent(user, k -> new ArrayList<>()).add(0, p);
        return p;
    }

    public List<PagoPendiente> obtenerPagosPendientes(String username) {
        String user = normalizarUsuario(username);
        return new ArrayList<>(pagosPorUsuario.getOrDefault(user, new ArrayList<>()));
    }

    public PagoPendiente marcarPagoComoPagado(String username, String id) {
        String user = normalizarUsuario(username);
        List<PagoPendiente> lista = pagosPorUsuario.getOrDefault(user, new ArrayList<>());
        for (PagoPendiente p : lista) {
            if (p.getId().equals(id)) {
                p.marcarComoPagado();
                return p;
            }
        }
        throw new IllegalArgumentException("Pago pendiente no encontrado: " + id);
    }

    public boolean eliminarPagoPendiente(String username, String id) {
        String user = normalizarUsuario(username);
        List<PagoPendiente> lista = pagosPorUsuario.get(user);
        if (lista == null) return false;
        return lista.removeIf(p -> p.getId().equals(id));
    }

    public AhorroPotencial calcularAhorroPotencial(String username) {
        List<Suscripcion> lista = obtenerSuscripciones(username);
        long mensual = 0;
        long anual = 0;
        double acumulado = 0;

        for (Suscripcion s : lista) {
            String estado = s.getEstado();
            if ("PAUSADA".equals(estado) || "CANCELADA".equals(estado)) {
                mensual += s.calcularCostoMensual();
                anual += s.calcularCostoAnual();
            }
            acumulado += s.getAhorroAcumulado();
        }
        return new AhorroPotencial(mensual, anual, acumulado);
    }

    public long calcularGastoSuscripcionesActivasMensual(String username) {
        long total = 0;
        for (Suscripcion s : obtenerSuscripciones(username)) {
            if ("ACTIVA".equals(s.getEstado())) {
                total += s.calcularCostoMensual();
            }
        }
        return total;
    }

    public double calcularTotalPagosPorPagar(String username) {
        double total = 0;
        for (PagoPendiente p : obtenerPagosPendientes(username)) {
            if (!p.isPagado()) {
                total += p.getMonto();
            }
        }
        return total;
    }

    public double calcularGastoFijoMensual(String username) {
        return calcularGastoSuscripcionesActivasMensual(username) + calcularTotalPagosPorPagar(username);
    }

    public int contarAlertasVencimiento(String username) {
        int alertas = 0;
        for (PagoPendiente p : obtenerPagosPendientes(username)) {
            String estado = p.getEstadoPago();
            if ("VENCIDO".equals(estado) || "PROXIMO".equals(estado)) {
                alertas++;
            }
        }
        return alertas;
    }

    private String normalizarUsuario(String username) {
        return (username == null || username.trim().isEmpty()) ? "juan" : username.trim().toLowerCase();
    }
}
