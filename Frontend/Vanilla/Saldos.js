import { initGlobalComponents } from './Global/app.js';
import { obtenerCuentas, SesionExpiradaError } from './CuentasService.js';
import { crearCuentaCard } from './CuentaCard.js';

const CLAVE_PRIVACIDAD = 'saldosOcultos';

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa componentes globales (menú, perfil, etc.)
    initGlobalComponents();

    const lista = document.getElementById('cuentasLista');
    const estado = document.getElementById('cuentasEstado');
    const btnOjo = document.getElementById('toggleSaldos');

    if (!lista || !estado) {
        console.warn('Contenedores del DOM para las cuentas no encontrados.');
        return;
    }

    let ocultar = localStorage.getItem(CLAVE_PRIVACIDAD) === 'true';
    let cuentas = [];
    let cargando = false;

    const pintarOjo = () => {
        if (!btnOjo) return;
        const icono = btnOjo.querySelector('i');
        if (icono) {
            icono.className = ocultar ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
        }
        btnOjo.setAttribute('aria-pressed', String(ocultar));
        btnOjo.setAttribute('aria-label', ocultar ? 'Mostrar saldos' : 'Ocultar saldos');
    };

    const mostrarEstado = (mensaje, { reintentar = false } = {}) => {
        estado.replaceChildren();
        const p = document.createElement('p');
        p.textContent = mensaje;
        estado.appendChild(p);

        if (reintentar) {
            const b = document.createElement('button');
            b.className = 'btn-reintentar';
            b.textContent = 'Reintentar';
            b.addEventListener('click', cargar);
            estado.appendChild(b);
        }
        estado.classList.remove('hidden');
    };

    const pintarCuentas = () => {
        lista.replaceChildren(...cuentas.map(c => crearCuentaCard(c, { ocultarSaldo: ocultar })));
    };

    async function cargar() {
        if (cargando) return;
        cargando = true;

        estado.classList.add('hidden');
        lista.setAttribute('aria-busy', 'true');
        
        // Renderizar Skeletons durante la carga
        lista.replaceChildren(...Array.from({ length: 3 }, () => {
            const s = document.createElement('div');
            s.className = 'cuenta-card cuenta-card--skeleton';
            return s;
        }));

        try {
            cuentas = await obtenerCuentas();
            
            if (!cuentas || !cuentas.length) {
                lista.replaceChildren();
                mostrarEstado('Aún no tienes cuentas asociadas.');
            } else {
                pintarCuentas();
            }
        } catch (err) {
            lista.replaceChildren();
            if (err instanceof SesionExpiradaError) {
                // Limpiar credenciales locales si aplica antes de redirigir
                localStorage.removeItem('authToken'); 
                window.location.href = '../index.html';
                return;
            }
            mostrarEstado('No pudimos cargar tus cuentas. Intenta de nuevo.', { reintentar: true });
        } finally {
            cargando = false;
            lista.setAttribute('aria-busy', 'false');
        }
    }

    if (btnOjo) {
        btnOjo.addEventListener('click', () => {
            ocultar = !ocultar;
            localStorage.setItem(CLAVE_PRIVACIDAD, String(ocultar));
            pintarOjo();
            if (cuentas.length) {
                pintarCuentas();
            }
        });
        pintarOjo();
    }

    cargar();
});