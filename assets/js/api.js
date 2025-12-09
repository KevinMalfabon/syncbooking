/**
 * Cliente API Centralizado
 * Todas las llamadas al backend deben pasar por aquí
 */

class APIClient {
  constructor() {
    this.baseURL = CONFIG.API_BASE_URL;
    this.useMock = CONFIG.USE_MOCK_DATA;
  }

  /**
   * Realiza una petición HTTP
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      requiresAuth = false
    } = options;

    // Si estamos en modo mock, usar datos simulados
    if (this.useMock) {
      return this.mockRequest(endpoint, method, body);
    }

    // Construir headers
    const finalHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    // Añadir token de autenticación si es necesario
    if (requiresAuth) {
      const token = this.getToken();
      if (token) {
        finalHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Configurar petición
    const fetchOptions = {
      method,
      headers: finalHeaders
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, fetchOptions);
      
      // Manejar errores HTTP
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  /**
   * Peticiones simuladas (mock)
   */
  async mockRequest(endpoint, method, body) {
    // Simular delay de red
    await this.delay(500);

    console.log('🔶 Mock API Call:', { endpoint, method, body });

    // Simular diferentes respuestas según el endpoint
    if (endpoint.includes('/auth/login')) {
      return this.mockLogin(body);
    }
    
    if (endpoint.includes('/reservations') && method === 'POST') {
      return this.mockCreateReservation(body);
    }
    
    if (endpoint.includes('/reservations') && method === 'GET') {
      return this.mockGetReservations();
    }
    
    if (endpoint.includes('/dashboard/stats')) {
      return this.mockGetStats();
    }
    
    if (endpoint.includes('/dashboard/tables')) {
      return this.mockGetTables();
    }

    if (endpoint.includes('/reservations/availability')) {
      return this.mockCheckAvailability(body);
    }

    return { success: true, data: {} };
  }

  // ============================================
  // MOCK DATA RESPONSES
  // ============================================

  mockLogin(credentials) {
    if (credentials.email && credentials.password) {
      return {
        token: 'mock_jwt_token_' + Date.now(),
        user: {
          id: 1,
          email: credentials.email,
          name: 'Admin Restaurant',
          restaurant_name: 'La Bella Italia',
          role: 'admin'
        }
      };
    }
    throw new Error('Credenciales inválidas');
  }

  mockCreateReservation(data) {
    return {
      id: Math.floor(Math.random() * 10000),
      confirmation_code: 'RES-' + Date.now(),
      status: 'confirmed',
      ...data,
      created_at: new Date().toISOString()
    };
  }

  mockGetReservations() {
    const statuses = ['confirmed', 'pending', 'cancelled', 'completed'];
    const names = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez', 'Luis Rodríguez'];
    
    const reservations = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      date: this.getRandomDate(),
      time: this.getRandomTime(),
      guests: Math.floor(Math.random() * 6) + 2,
      customer_name: names[Math.floor(Math.random() * names.length)],
      customer_email: 'cliente@example.com',
      customer_phone: '+52 55 1234 5678',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      confirmation_code: 'RES-' + (1000 + i),
      created_at: new Date().toISOString()
    }));

    return { reservations };
  }

  mockGetStats() {
    return {
      today_reservations: 12,
      week_reservations: 48,
      month_revenue: 125000,
      occupancy_rate: 78,
      changes: {
        today: '+15%',
        week: '+8%',
        revenue: '+12%',
        occupancy: '-3%'
      }
    };
  }

  mockGetTables() {
    return {
      tables: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        number: i + 1,
        capacity: Math.floor(Math.random() * 4) + 2,
        status: Math.random() > 0.3 ? 'available' : 'occupied'
      }))
    };
  }

  mockCheckAvailability(data) {
    const { date, time } = data;
    const availableSlots = ['12:00', '12:30', '13:00', '19:00', '19:30', '20:00', '20:30', '21:00'];
    
    return {
      available: Math.random() > 0.2,
      available_slots: availableSlots,
      tables_available: Math.floor(Math.random() * 5) + 1
    };
  }

  // Helpers para mocks
  getRandomDate() {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + Math.floor(Math.random() * 30));
    return futureDate.toISOString().split('T')[0];
  }

  getRandomTime() {
    const hours = ['12:00', '12:30', '13:00', '13:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
    return hours[Math.floor(Math.random() * hours.length)];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // MÉTODOS DE AUTENTICACIÓN
  // ============================================

  saveToken(token) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
  }

  getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  }

  removeToken() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
  }

  saveUser(user) {
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  }

  getUser() {
    const userData = localStorage.getItem(CONFIG.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  // ============================================
  // API ENDPOINTS - AUTENTICACIÓN
  // ============================================

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: credentials
    });
    
    if (response.token) {
      this.saveToken(response.token);
      this.saveUser(response.user);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        requiresAuth: true
      });
    } finally {
      this.removeToken();
    }
  }

  async verifyToken() {
    return this.request('/auth/verify', {
      method: 'POST',
      requiresAuth: true
    });
  }

  // ============================================
  // API ENDPOINTS - RESERVACIONES (CLIENTE)
  // ============================================

  async createReservation(reservationData) {
    return this.request('/reservations', {
      method: 'POST',
      body: reservationData
    });
  }

  async getReservation(id) {
    return this.request(`/reservations/${id}`, {
      method: 'GET'
    });
  }

  async checkAvailability(date, time, guests) {
    return this.request('/reservations/availability', {
      method: 'POST',
      body: { date, time, guests }
    });
  }

  // ============================================
  // API ENDPOINTS - DASHBOARD (RESTAURANTE)
  // ============================================

  async getDashboardStats() {
    return this.request('/dashboard/stats', {
      method: 'GET',
      requiresAuth: true
    });
  }

  async getDashboardReservations(filters = {}) {
    const queryString = CONFIG.buildQueryString(filters);
    return this.request(`/dashboard/reservations${queryString}`, {
      method: 'GET',
      requiresAuth: true
    });
  }

  async updateReservationStatus(id, status) {
    return this.request(`/dashboard/reservations/${id}`, {
      method: 'PATCH',
      body: { status },
      requiresAuth: true
    });
  }

  async deleteReservation(id) {
    return this.request(`/dashboard/reservations/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    });
  }

  async getTables() {
    return this.request('/dashboard/tables', {
      method: 'GET',
      requiresAuth: true
    });
  }

  async updateTable(id, tableData) {
    return this.request(`/dashboard/tables/${id}`, {
      method: 'PUT',
      body: tableData,
      requiresAuth: true
    });
  }

  async getAvailability(date) {
    return this.request(`/dashboard/availability?date=${date}`, {
      method: 'GET',
      requiresAuth: true
    });
  }

  async updateAvailability(date, slots) {
    return this.request('/dashboard/availability', {
      method: 'POST',
      body: { date, slots },
      requiresAuth: true
    });
  }

  async getBlockedDates() {
    return this.request('/dashboard/blocked-dates', {
      method: 'GET',
      requiresAuth: true
    });
  }

  async blockDate(date, reason) {
    return this.request('/dashboard/blocked-dates', {
      method: 'POST',
      body: { date, reason },
      requiresAuth: true
    });
  }

  async unblockDate(date) {
    return this.request(`/dashboard/blocked-dates/${date}`, {
      method: 'DELETE',
      requiresAuth: true
    });
  }
}

// Crear instancia global
window.api = new APIClient();

console.log('✅ API Client initialized');