/**
 * LogicPuzzle Lab - UI Controller
 * ==================================
 * Navigation, modals, toasts, and UI state management.
 */

export class UIController {
    constructor() {
        this.currentScreen = 'main-menu';
        this.screenHistory = [];
        this.toastContainer = null;

        this._initToastContainer();
    }

    _initToastContainer() {
        this.toastContainer = document.getElementById('toast-container');
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toast-container';
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        }
    }

    /**
     * Navigate to a screen.
     */
    navigateTo(screenId) {
        // Hide current screen
        const current = document.getElementById(this.currentScreen);
        if (current) current.classList.remove('active');

        // Show new screen
        const next = document.getElementById(screenId);
        if (next) {
            next.classList.add('active');
            this.screenHistory.push(this.currentScreen);
            this.currentScreen = screenId;
        }

        // Update navbar active state (desktop + mobile)
        document.querySelectorAll('.nav-btn[data-screen]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === screenId);
        });

        this._updateMobileNav(screenId);
        this.closeMobileNav();
    }

    /**
     * Initialize mobile navigation drawer.
     */
    initMobileNav(onNavigate) {
        this._mobileNavHandler = onNavigate;

        const toggleBtns = document.querySelectorAll('.mobile-menu-btn');
        const overlay = document.getElementById('mobile-nav-overlay');
        const closeBtn = document.getElementById('mobile-nav-close');

        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => this.openMobileNav());
        });

        closeBtn?.addEventListener('click', () => this.closeMobileNav());

        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeMobileNav();
        });

        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                const screen = link.dataset.screen;
                if (screen && this._mobileNavHandler) {
                    this._mobileNavHandler(screen);
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeMobileNav();
        });
    }

    _updateMobileNav(screenId) {
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.screen === screenId);
        });
    }

    openMobileNav() {
        document.getElementById('mobile-nav-overlay')?.classList.add('active');
        document.body.classList.add('nav-open');
    }

    closeMobileNav() {
        document.getElementById('mobile-nav-overlay')?.classList.remove('active');
        document.body.classList.remove('nav-open');
    }

    /**
     * Go back to previous screen.
     */
    goBack() {
        if (this.screenHistory.length > 0) {
            const prevScreen = this.screenHistory.pop();
            const current = document.getElementById(this.currentScreen);
            if (current) current.classList.remove('active');

            const prev = document.getElementById(prevScreen);
            if (prev) prev.classList.add('active');

            this.currentScreen = prevScreen;
        }
    }

    /**
     * Show a toast notification.
     */
    showToast(message, type = 'info', duration = 3000) {
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
        `;

        this.toastContainer.appendChild(toast);

        // Auto-remove
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Show a modal dialog.
     */
    showModal(title, bodyHtml, buttons = []) {
        const overlay = document.getElementById('modal-overlay');
        if (!overlay) return;

        const modalTitle = overlay.querySelector('.modal-header h3');
        const modalBody = overlay.querySelector('.modal-body');
        const modalFooter = overlay.querySelector('.modal-footer');

        if (modalTitle) modalTitle.textContent = title;
        if (modalBody) modalBody.innerHTML = bodyHtml;

        if (modalFooter) {
            modalFooter.innerHTML = '';
            for (const btn of buttons) {
                const button = document.createElement('button');
                button.className = `btn ${btn.class || 'btn-outline'}`;
                button.textContent = btn.text;
                button.addEventListener('click', () => {
                    if (btn.action) btn.action();
                    this.hideModal();
                });
                modalFooter.appendChild(button);
            }
        }

        overlay.classList.add('active');
    }

    /**
     * Hide the modal.
     */
    hideModal() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    /**
     * Show success overlay for puzzle completion.
     */
    showSuccess(stars, message, onContinue) {
        const overlay = document.getElementById('success-overlay');
        if (!overlay) return;

        const starsContainer = overlay.querySelector('.success-stars');
        const msgEl = overlay.querySelector('.success-message');
        const btnContainer = overlay.querySelector('.success-buttons');

        // Render stars
        if (starsContainer) {
            starsContainer.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                const star = document.createElement('span');
                star.className = 'star-anim';
                star.textContent = i < stars ? '⭐' : '☆';
                starsContainer.appendChild(star);
            }
        }

        if (msgEl) msgEl.textContent = message;

        if (btnContainer) {
            btnContainer.innerHTML = '';
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary btn-lg';
            btn.textContent = 'Continuar';
            btn.addEventListener('click', () => {
                overlay.classList.remove('active');
                if (onContinue) onContinue();
            });
            btnContainer.appendChild(btn);
        }

        overlay.classList.add('active');
    }

    /**
     * Hide success overlay.
     */
    hideSuccess() {
        const overlay = document.getElementById('success-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    /**
     * Update timer display.
     */
    updateTimer(timeString) {
        const timerEl = document.getElementById('puzzle-timer');
        if (timerEl) timerEl.textContent = timeString;
    }

    /**
     * Format an expression with syntax highlighting.
     */
    formatExpression(expression) {
        return expression
            .replace(/\bAND\b/g, '<span class="expr-and">AND</span>')
            .replace(/\bOR\b/g, '<span class="expr-or">OR</span>')
            .replace(/\bNOT\b/g, '<span class="expr-not">NOT</span>')
            .replace(/\bNAND\b/g, '<span class="expr-and">NAND</span>')
            .replace(/\bNOR\b/g, '<span class="expr-or">NOR</span>')
            .replace(/\bXOR\b/g, '<span class="expr-xor">XOR</span>')
            .replace(/\bXNOR\b/g, '<span class="expr-xor">XNOR</span>')
            .replace(/\b([A-Z])\b/g, '<span class="expr-var">$1</span>')
            .replace(/([()])/g, '<span class="expr-paren">$1</span>');
    }
}
