/**
 * Manejo de Autenticación
 * Control de login, logout y verificación de sesión
 */

class AuthManager {
  constructor() {
    this.loginForm = null;
    this.init();
  }

  init() {
    // Verificar si estamos en la página de login
    if (document.getElementById('loginForm')) {
      this.setupLoginPage();
    }

    // Proteger páginas del dashboard
    if (window.location.pathname.includes('/dashboard/') && 
        !window.location.pathname.includes('login.html')) {
      this.protectPage();
    }
  }

  /**
   * Configurar página de login
   */
  setupLoginPage() {
    this.loginForm = document.getElementById('loginForm');
    
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Si ya está autenticado, redirigir al dashboard
    if (api.isAuthenticated()) {
      window.location.href = '/dashboard/index.html';
    }
  }

  /**
   * Manejar submit del formulario de login
   */
  async handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = this.loginForm.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('loginError');

    // Limpiar errores previos
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';

    // Validaciones básicas
    if (!email || !password) {
      this.showError('Por favor, completa todos los campos');
      return;
    }

    if (!this.validateEmail(email)) {
      this.showError('Por favor, ingresa un email válido');
      return;
    }

    // Deshabilitar botón y mostrar loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Iniciando sesión...';

    try {
      // Intentar login
      const response = await api.login({ email, password });

      // Mostrar mensaje de éxito
      UI.showToast('¡Inicio de sesión exitoso!', 'success');

      // Pequeño delay para que el usuario vea el toast
      await this.delay(500);

      // Redirigir al dashboard
      window.location.href = '/dashboard/index.html';

    } catch (error) {
      console.error('Login error:', error);
      this.showError(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      
      // Restaurar botón
      submitBtn.disabled = false;
      submitBtn.textContent = 'Iniciar Sesión';
    }
  }

  /**
   * Proteger páginas que requieren autenticación
   */
  protectPage() {
    if (!api.isAuthenticated()) {
      // Guardar la URL a la que intentaba acceder
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      
      // Redirigir al login
      window.location.href = '/dashboard/login.html';
      return false;
    }

    // Cargar información del usuario
    this.loadUserInfo();
    return true;
  }

  /**
   * Cargar información del usuario en el sidebar
   */
  loadUserInfo() {
    const user = api.getUser();
    
    if (!user) return;

    // Actualizar nombre de usuario en el sidebar
    const userNameElement = document.querySelector('.sidebar-user-name');
    const userRoleElement = document.querySelector('.sidebar-user-role');
    const userAvatarElement = document.querySelector('.sidebar-user-avatar');
    const restaurantNameElement = document.querySelector('.sidebar-restaurant');

    if (userNameElement) {
      userNameElement.textContent = user.name || user.email;
    }

    if (userRoleElement) {
      userRoleElement.textContent = user.role === 'admin' ? 'Administrador' : 'Usuario';
    }

    if (userAvatarElement) {
      const initials = this.getInitials(user.name || user.email);
      userAvatarElement.textContent = initials;
    }

    if (restaurantNameElement) {
      restaurantNameElement.textContent = user.restaurant_name || 'Mi Restaurante';
    }
  }

  /**
   * Cerrar sesión
   */
  async logout() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      try {
        UI.showLoader();
        
        await api.logout();
        
        UI.showToast('Sesión cerrada exitosamente', 'success');
        
        // Pequeño delay antes de redirigir
        await this.delay(500);
        
        window.location.href = '/dashboard/login.html';
      } catch (error) {
        console.error('Logout error:', error);
        // Limpiar sesión local aunque falle el servidor
        api.removeToken();
        window.location.href = '/dashboard/login.html';
      } finally {
        UI.hideLoader();
      }
    }
  }

  /**
   * Verificar si la sesión es válida
   */
  async verifySession() {
    if (!api.isAuthenticated()) {
      return false;
    }

    try {
      await api.verifyToken();
      return true;
    } catch (error) {
      console.error('Session verification failed:', error);
      api.removeToken();
      return false;
    }
  }

  /**
   * Obtener iniciales del nombre
   */
  getInitials(name) {
    if (!name) return '?';
    
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Validar formato de email
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Mostrar error en el formulario de login
   */
  showError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
  });
} else {
  window.authManager = new AuthManager();
}

console.log('✅ Auth Manager initialized');