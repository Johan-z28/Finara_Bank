/**
 * themeManager.js - Gestor de Temas (Modo Oscuro / Modo Claro) para Finara Bank
 * Almacena la preferencia del usuario en localStorage ('finara_theme')
 * y aplica la clase 'light-theme' o 'dark-theme' al elemento <html> o <body>.
 */

const THEME_STORAGE_KEY = 'finara_theme';
const DEFAULT_THEME = 'dark'; // Finara Bank es por defecto oscuro

export function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
        return saved;
    }
    return DEFAULT_THEME;
}

export function applyTheme(theme) {
    const isLight = theme === 'light';
    const root = document.documentElement;
    const body = document.body;

    if (isLight) {
        root.classList.add('light-theme');
        root.classList.remove('dark-theme');
        if (body) {
            body.classList.add('light-theme');
            body.classList.remove('dark-theme');
        }
    } else {
        root.classList.add('dark-theme');
        root.classList.remove('light-theme');
        if (body) {
            body.classList.add('dark-theme');
            body.classList.remove('light-theme');
        }
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // Actualizar todos los botones o toggles de tema presentes en la página
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.setAttribute('data-theme', theme);
        btn.setAttribute('aria-label', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
        btn.setAttribute('title', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
        
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        }

        const textSpan = btn.querySelector('.theme-text');
        if (textSpan) {
            textSpan.textContent = isLight ? 'Modo Oscuro' : 'Modo Claro';
        }
    });

    // Actualizar logotipos si existen variantes para fondos claros (excluyendo plásticos de tarjeta que tienen su propio diseño)
    document.querySelectorAll('.sidebar-logo, .navbar .logo-svg, .navbar-logo').forEach(logo => {
        if (isLight) {
            if (logo.dataset.lightSrc) {
                logo.src = logo.dataset.lightSrc;
            } else if (logo.src.includes('Logo_finara.svg')) {
                logo.src = logo.src.replace('Logo_finara.svg', 'Logo_finara_gold.svg');
            }
        } else {
            if (logo.dataset.darkSrc) {
                logo.src = logo.dataset.darkSrc;
            } else if (logo.src.includes('Logo_finara_gold.svg') || logo.src.includes('Logo_finara_black.svg')) {
                logo.src = logo.src.replace(/Logo_finara_(gold|black)\.svg/, 'Logo_finara.svg');
            }
        }
    });

    // Disparar evento personalizado por si alguna vista requiere reaccionar
    window.dispatchEvent(new CustomEvent('finaraThemeChanged', { detail: { theme } }));
}

export function toggleTheme() {
    const current = getPreferredTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    return next;
}

export function initTheme() {
    const current = getPreferredTheme();
    applyTheme(current);

    // Delegación de eventos para cualquier botón de toggle
    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.theme-toggle-btn');
        if (toggleBtn) {
            e.preventDefault();
            toggleTheme();
        }
    });
}

// Ejecutar inmediatamente para evitar parpadeos visuales
if (typeof document !== 'undefined') {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
    if (saved === 'light') {
        document.documentElement.classList.add('light-theme');
        if (document.body) document.body.classList.add('light-theme');
    } else {
        document.documentElement.classList.add('dark-theme');
        if (document.body) document.body.classList.add('dark-theme');
    }
}

