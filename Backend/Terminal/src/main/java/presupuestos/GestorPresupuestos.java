package presupuestos;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Servicio gestor para Elaboración de Presupuesto Mensual (HU-18 / HU-23).
 * Alineado con la lógica de presupuestoService.js en el Frontend.
 */
public class GestorPresupuestos {
    private List<ItemPresupuesto> items;
    private AtomicInteger secuenciaId;

    public GestorPresupuestos() {
        this.items = new ArrayList<>();
        this.secuenciaId = new AtomicInteger(1);
    }

    public static class ResumenPresupuesto {
        private double totalIngresos;
        private double totalGastos;
        private double saldoNeto;
        private int porcentajeGastado;
        private boolean esDeficit;
        private boolean esSuperavit;
        private List<ItemPresupuesto> ingresos;
        private List<ItemPresupuesto> gastos;

        public ResumenPresupuesto(double totalIngresos, double totalGastos,
                                  List<ItemPresupuesto> ingresos, List<ItemPresupuesto> gastos) {
            this.totalIngresos = totalIngresos;
            this.totalGastos = totalGastos;
            this.saldoNeto = totalIngresos - totalGastos;
            this.porcentajeGastado = totalIngresos > 0
                    ? (int) Math.round((totalGastos / totalIngresos) * 100.0)
                    : (totalGastos > 0 ? 100 : 0);
            this.esDeficit = this.saldoNeto < 0;
            this.esSuperavit = this.saldoNeto > 0;
            this.ingresos = ingresos;
            this.gastos = gastos;
        }

        public double getTotalIngresos() { return totalIngresos; }
        public double getTotalGastos() { return totalGastos; }
        public double getSaldoNeto() { return saldoNeto; }
        public int getPorcentajeGastado() { return porcentajeGastado; }
        public boolean isEsDeficit() { return esDeficit; }
        public boolean isEsSuperavit() { return esSuperavit; }
        public List<ItemPresupuesto> getIngresos() { return ingresos; }
        public List<ItemPresupuesto> getGastos() { return gastos; }

        public String getEstadoBalanceTexto() {
            if (esDeficit) return "Déficit (Gastos superan ingresos)";
            if (esSuperavit) return "Superávit disponible";
            return "Balance equilibrado";
        }
    }

    public String obtenerPeriodoActual() {
        return YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
    }

    public ItemPresupuesto crearItem(String username, String tipo, String categoria,
                                     String descripcion, double monto, String periodo) {
        String userNorm = normalizarUsuario(username);
        String periodoFinal = (periodo == null || periodo.trim().isEmpty()) ? obtenerPeriodoActual() : periodo.trim();
        String id = "PRE-" + System.currentTimeMillis() + "-" + secuenciaId.getAndIncrement();

        ItemPresupuesto nuevo = new ItemPresupuesto(id, userNorm, tipo, categoria, descripcion, monto, periodoFinal);
        items.add(0, nuevo);
        return nuevo;
    }

    public List<ItemPresupuesto> obtenerPorUsuarioYPeriodo(String username, String periodo) {
        String userNorm = normalizarUsuario(username);
        List<ItemPresupuesto> resultado = new ArrayList<>();

        for (ItemPresupuesto item : items) {
            boolean coincideUsuario = item.getUsername().equalsIgnoreCase(userNorm);
            boolean coincidePeriodo = (periodo == null || periodo.trim().isEmpty()) || item.getPeriodo().equals(periodo.trim());
            if (coincideUsuario && coincidePeriodo) {
                resultado.add(item);
            }
        }
        return resultado;
    }

    public ItemPresupuesto actualizarItem(String id, String tipo, String categoria,
                                          String descripcion, double monto, String periodo) {
        ItemPresupuesto objetivo = buscarPorId(id);
        if (objetivo == null) {
            throw new IllegalArgumentException("El rubro de presupuesto no existe: " + id);
        }

        if (tipo != null && !tipo.trim().isEmpty()) {
            objetivo.setTipo(tipo);
        }
        if (categoria != null && !categoria.trim().isEmpty()) {
            objetivo.setCategoria(categoria);
        }
        if (descripcion != null) {
            objetivo.setDescripcion(descripcion);
        }
        if (monto > 0) {
            objetivo.setMonto(monto);
        } else {
            throw new IllegalArgumentException("El monto debe ser mayor a cero.");
        }
        if (periodo != null && !periodo.trim().isEmpty()) {
            objetivo.setPeriodo(periodo);
        }

        return objetivo;
    }

    public boolean eliminarItem(String id) {
        ItemPresupuesto objetivo = buscarPorId(id);
        if (objetivo == null) {
            throw new IllegalArgumentException("El rubro de presupuesto no fue encontrado: " + id);
        }
        return items.remove(objetivo);
    }

    public ResumenPresupuesto calcularResumen(String username, String periodo) {
        List<ItemPresupuesto> lista = obtenerPorUsuarioYPeriodo(username, periodo);
        List<ItemPresupuesto> ingresos = new ArrayList<>();
        List<ItemPresupuesto> gastos = new ArrayList<>();
        double totalIngresos = 0.0;
        double totalGastos = 0.0;

        for (ItemPresupuesto item : lista) {
            if ("INGRESO".equals(item.getTipo())) {
                totalIngresos += item.getMonto();
                ingresos.add(item);
            } else if ("GASTO".equals(item.getTipo())) {
                totalGastos += item.getMonto();
                gastos.add(item);
            }
        }

        return new ResumenPresupuesto(totalIngresos, totalGastos, ingresos, gastos);
    }

    public ItemPresupuesto buscarPorId(String id) {
        if (id == null) return null;
        for (ItemPresupuesto item : items) {
            if (item.getId().equals(id)) {
                return item;
            }
        }
        return null;
    }

    private String normalizarUsuario(String username) {
        return (username == null || username.trim().isEmpty()) ? "juan" : username.trim().toLowerCase();
    }
}
