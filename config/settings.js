/**
 * Configuración Central del Sistema
 * Actualizar estas variables para conectar con backend real
 */

const CONFIG = {
  // URL base del backend - CAMBIAR cuando se conecte Django/Flask
  API_BASE_URL: 'http://localhost:8000/api',
  
  // Endpoints de la API
  ENDPOINTS: {
    // Autenticación
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    VERIFY_TOKEN: '/auth/verify',
    
    // Restaurantes
    RESTAURANTS: '/restaurants',
    RESTAURANT_DETAIL: '/restaurants/:id',
    
    // Reservaciones (Cliente)
    RESERVATIONS: '/reservations',
    RESERVATION_DETAIL: '/reservations/:id',
    CHECK_AVAILABILITY: '/reservations/availability',
    
    // Dashboard (Restaurante)
    DASHBOARD_STATS: '/dashboard/stats',
    DASHBOARD_RESERVATIONS: '/dashboard/reservations',
    DASHBOARD_TABLES: '/dashboard/tables',
    DASHBOARD_AVAILABILITY: '/dashboard/availability',
    DASHBOARD_BLOCKED_DATES: '/dashboard/blocked-dates'
  },
  
  // Configuración de tokens
  TOKEN_KEY: 'restaurant_auth_token',
  USER_KEY: 'restaurant_user_data',
  TOKEN_EXPIRY_HOURS: 24,
  
  // Configuración de la aplicación
  APP: {
    NAME: 'ReservApp',
    VERSION: '1.0.0',
    DEFAULT_LOCALE: 'es-MX',
    DATE_FORMAT: 'YYYY-MM-DD',
    TIME_FORMAT: 'HH:mm'
  },
  
  // Límites y validaciones
  LIMITS: {
    MIN_GUESTS: 1,
    MAX_GUESTS: 20,
    MIN_ADVANCE_HOURS: 2, // Horas mínimas de anticipación
    MAX_ADVANCE_DAYS: 90, // Días máximos adelante
    MAX_RESERVATION_DURATION: 180 // minutos
  },
  
  // Configuración de horarios por defecto
  DEFAULT_HOURS: {
    OPENING: '12:00',
    CLOSING: '23:00',
    INTERVAL_MINUTES: 30
  },
  
  // Configuración de UI
  UI: {
    TOAST_DURATION: 3000, // ms
    LOADING_MIN_TIME: 500, // ms mínimo para mostrar loader
    DEBOUNCE_DELAY: 300 // ms para búsquedas
  },
  
  // Modo de desarrollo (cambiar a false en producción)
  DEV_MODE: true,
  
  // Mock data habilitado (cambiar a false cuando haya backend)
  USE_MOCK_DATA: true
};

// Función helper para construir URLs completas
CONFIG.getURL = function(endpoint, params = {}) {
  let url = this.API_BASE_URL + this.ENDPOINTS[endpoint];
  
  // Reemplazar parámetros en la URL (:id, :slug, etc)
  Object.keys(params).forEach(key => {
    url = url.replace(`:${key}`, params[key]);
  });
  
  return url;
};

// Función para construir query strings
CONFIG.buildQueryString = function(params) {
  const query = Object.keys(params)
    .filter(key => params[key] !== null && params[key] !== undefined)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  return query ? `?${query}` : '';
};

// Log de configuración en desarrollo
if (CONFIG.DEV_MODE) {
  console.log('🔧 CONFIG loaded:', {
    apiBase: CONFIG.API_BASE_URL,
    mockData: CONFIG.USE_MOCK_DATA,
    version: CONFIG.APP.VERSION
  });
}

// Exportar configuración
window.CONFIG = CONFIG;