import { initGlobalComponents } from './app.js';
import { obtenerCuentas, SesionExpiradaError } from './cuentasService.js';
import { crearCuentaCard } from './CuentaCard.js';
const CLAVE_PRIVACIDAD = 'saldosOcultos';

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa la hamburguesa, el menú de perfil y los datos compartidos
    initGlobalComponents();

    const lista = document.getElementById('cuentasLista');
    const estado = document.getElementById('cuentasEstado');
    const btnOjo = document.getElementById('toggleSaldos');
    let ocultar = localStorage.getItem(CLAVE_PRIVACIDAD) === 'true';
    let cuentas = [];

    const pintarOjo = () => {
        btnOjo.querySelector('i').className = ocultar ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
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
        estado.classList.add('hidden');
        lista.setAttribute('aria-busy', 'true');
        lista.replaceChildren(...Array.from({ length: 3 }, () => {
            const s = document.createElement('div');
            s.className = 'cuenta-card cuenta-card--skeleton';
            return s;
        }));

        try {
            cuentas = await obtenerCuentas();
            if (!cuentas.length) {
                lista.replaceChildren();
                mostrarEstado('Aún no tienes cuentas asociadas.');
            } else {
                pintarCuentas();
            }
        } catch (err) {
            lista.replaceChildren();
            if (err instanceof SesionExpiradaError) {
                window.location.href = '../index.html';
                return;
            }
            mostrarEstado('No pudimos cargar tus cuentas. Intenta de nuevo.', { reintentar: true });
        } finally {
            lista.setAttribute('aria-busy', 'false');
        }
    }

    btnOjo.addEventListener('click', () => {
        ocultar = !ocultar;
        localStorage.setItem(CLAVE_PRIVACIDAD, String(ocultar));
        pintarOjo();
        pintarCuentas();
    });

    pintarOjo();
    cargar();
});