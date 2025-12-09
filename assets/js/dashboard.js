/**
 * Panel Administrativo del Restaurante
 * Gestión de reservas, mesas y disponibilidad
 */

class Dashboard {
  constructor() {
    this.reservations = [];
    this.stats = null;
    this.currentFilter = "all";

    this.init();
  }

  init() {
    // Solo inicializar en páginas del dashboard (excepto login)
    if (
      !window.location.pathname.includes("/dashboard/") ||
      window.location.pathname.includes("login.html")
    ) {
      return;
    }

    this.setupEventListeners();
    this.loadInitialData();
  }

  setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => authManager.logout());
    }

    // Filter buttons
    document.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.currentFilter = e.target.dataset.filter;
        this.filterReservations();
      });
    });

    // Search input con debounce
    const searchInput = document.getElementById("searchReservations");
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchReservations(e.target.value);
        }, CONFIG.UI.DEBOUNCE_DELAY);
      });
    }

    // Date filter
    const dateFilter = document.getElementById("filterDate");
    if (dateFilter) {
      dateFilter.addEventListener("change", () => this.loadReservations());
    }
  }

  async loadInitialData() {
    try {
      UI.showLoader();

      // Determinar qué página estamos viendo
      const path = window.location.pathname;

      if (path.includes("index.html") || path.endsWith("/dashboard/")) {
        await this.loadDashboardData();
      } else if (path.includes("reservations.html")) {
        await this.loadReservations();
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      UI.showToast("Error al cargar datos", "error");
    } finally {
      UI.hideLoader();
    }
  }

  // ============================================
  // DASHBOARD PRINCIPAL
  // ============================================

  async loadDashboardData() {
    try {
      // Cargar estadísticas
      this.stats = await api.getDashboardStats();
      this.renderStats();

      // Cargar reservas recientes
      const response = await api.getDashboardReservations({ limit: 10 });
      this.reservations = response.reservations;
      this.renderRecentReservations();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      throw error;
    }
  }

  renderStats() {
    if (!this.stats) return;

    // Actualizar cards de estadísticas
    const statElements = {
      today: document.getElementById("stat-today"),
      week: document.getElementById("stat-week"),
      revenue: document.getElementById("stat-revenue"),
      occupancy: document.getElementById("stat-occupancy"),
    };

    if (statElements.today) {
      statElements.today.textContent = this.stats.today_reservations;
      const changeEl =
        statElements.today.parentElement.querySelector(".stat-card-change");
      if (changeEl) {
        changeEl.textContent = this.stats.changes.today;
        changeEl.className =
          "stat-card-change " +
          (this.stats.changes.today.startsWith("+") ? "positive" : "negative");
      }
    }

    if (statElements.week) {
      statElements.week.textContent = this.stats.week_reservations;
      const changeEl =
        statElements.week.parentElement.querySelector(".stat-card-change");
      if (changeEl) {
        changeEl.textContent = this.stats.changes.week;
        changeEl.className =
          "stat-card-change " +
          (this.stats.changes.week.startsWith("+") ? "positive" : "negative");
      }
    }

    if (statElements.revenue) {
      statElements.revenue.textContent = this.formatCurrency(
        this.stats.month_revenue
      );
      const changeEl =
        statElements.revenue.parentElement.querySelector(".stat-card-change");
      if (changeEl) {
        changeEl.textContent = this.stats.changes.revenue;
        changeEl.className =
          "stat-card-change " +
          (this.stats.changes.revenue.startsWith("+")
            ? "positive"
            : "negative");
      }
    }

    if (statElements.occupancy) {
      statElements.occupancy.textContent = this.stats.occupancy_rate + "%";
      const changeEl =
        statElements.occupancy.parentElement.querySelector(".stat-card-change");
      if (changeEl) {
        changeEl.textContent = this.stats.changes.occupancy;
        changeEl.className =
          "stat-card-change " +
          (this.stats.changes.occupancy.startsWith("+")
            ? "positive"
            : "negative");
      }
    }
  }

  renderRecentReservations() {
    const container = document.getElementById("recentReservations");
    if (!container) return;

    if (!this.reservations || this.reservations.length === 0) {
      container.innerHTML = this.getEmptyState("No hay reservas recientes");
      return;
    }

    const tbody = container.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = this.reservations
      .slice(0, 5)
      .map(
        (reservation) => `
      <tr>
        <td><strong>${reservation.confirmation_code}</strong></td>
        <td>${reservation.customer_name}</td>
        <td>${this.formatDate(reservation.date)}</td>
        <td>${reservation.time}</td>
        <td>${reservation.guests} personas</td>
        <td>
          <span class="status-badge ${reservation.status}">
            ${this.getStatusText(reservation.status)}
          </span>
        </td>
      </tr>
    `
      )
      .join("");
  }

  // ============================================
  // GESTIÓN DE RESERVAS
  // ============================================

  async loadReservations() {
    try {
      UI.showLoader();

      const dateFilter = document.getElementById("filterDate")?.value;
      const filters = {};

      if (dateFilter) {
        filters.date = dateFilter;
      }

      const response = await api.getDashboardReservations(filters);
      this.reservations = response.reservations;

      this.renderReservations();
    } catch (error) {
      console.error("Error loading reservations:", error);
      UI.showToast("Error al cargar reservas", "error");
    } finally {
      UI.hideLoader();
    }
  }

  renderReservations() {
    const container = document.getElementById("reservationsTable");
    if (!container) return;

    const tbody = container.querySelector("tbody");
    if (!tbody) return;

    let filteredReservations = this.reservations;

    // Aplicar filtro actual
    if (this.currentFilter !== "all") {
      filteredReservations = this.reservations.filter(
        (r) => r.status === this.currentFilter
      );
    }

    if (filteredReservations.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center">
            ${this.getEmptyState("No hay reservas para mostrar")}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filteredReservations
      .map(
        (reservation) => `
      <tr>
        <td style="max-width: 100px;"><strong>${
          reservation.confirmation_code
        }</strong></td>
        <td style="max-width: 120px;" title="${reservation.customer_name}">${
          reservation.customer_name
        }</td>
        <td style="max-width: 130px;" title="${reservation.customer_email}">${
          reservation.customer_email
        }</td>
        <td style="max-width: 120px;">${reservation.customer_phone}</td>
        <td style="max-width: 100px;">${this.formatDate(reservation.date)}</td>
        <td style="max-width: 70px; padding: var(--spacing-sm) var(--spacing-md);">${
          reservation.time
        }</td>
        <td style="max-width: 80px; text-align: center;">${
          reservation.guests
        }</td>
        <td style="max-width: 120px;">
          <span class="status-badge ${reservation.status}">
            ${this.getStatusText(reservation.status)}
          </span>
        </td>
        <td style="max-width: 120px;">
          <div class="table-actions-cell">
            <button class="icon-btn" onclick="dashboard.viewReservation(${
              reservation.id
            })" title="Ver detalles">
              👁️
            </button>
            <button class="icon-btn" onclick="dashboard.editReservation(${
              reservation.id
            })" title="Editar">
              ✏️
            </button>
            <button class="icon-btn danger" onclick="dashboard.cancelReservation(${
              reservation.id
            })" title="Cancelar">
              ❌
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  }

  filterReservations() {
    // Actualizar botones activos
    document.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.filter === this.currentFilter) {
        btn.classList.add("active");
      }
    });

    this.renderReservations();
  }

  searchReservations(query) {
    if (!query) {
      this.renderReservations();
      return;
    }

    const filtered = this.reservations.filter((r) => {
      return (
        r.customer_name.toLowerCase().includes(query.toLowerCase()) ||
        r.customer_email.toLowerCase().includes(query.toLowerCase()) ||
        r.confirmation_code.toLowerCase().includes(query.toLowerCase())
      );
    });

    // Renderizar resultados filtrados (temporal)
    const tbody = document.querySelector("#reservationsTable tbody");
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center">
            No se encontraron resultados para "${query}"
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map(
        (reservation) => `
      <tr>
        <td><strong>${reservation.confirmation_code}</strong></td>
        <td>${reservation.customer_name}</td>
        <td>${reservation.customer_email}</td>
        <td>${reservation.customer_phone}</td>
        <td>${this.formatDate(reservation.date)}</td>
        <td>${reservation.time}</td>
        <td>${reservation.guests}</td>
        <td>
          <span class="status-badge ${reservation.status}">
            ${this.getStatusText(reservation.status)}
          </span>
        </td>
        <td>
          <div class="table-actions-cell">
            <button class="icon-btn" onclick="dashboard.viewReservation(${
              reservation.id
            })">👁️</button>
            <button class="icon-btn" onclick="dashboard.editReservation(${
              reservation.id
            })">✏️</button>
            <button class="icon-btn danger" onclick="dashboard.cancelReservation(${
              reservation.id
            })">❌</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  }

  // ============================================
  // ACCIONES DE RESERVAS
  // ============================================

  viewReservation(id) {
    const reservation = this.reservations.find((r) => r.id === id);
    if (!reservation) return;

    UI.showModal({
      title: "Detalles de Reserva",
      content: `
        <div class="confirmation-details">
          <div class="confirmation-detail-row">
            <span class="confirmation-detail-label">Código:</span>
            <span class="confirmation-detail-value">${
              reservation.confirmation_code
            }</span>
          </div>
          <div class="confirmation-detail-row">
            <span class="confirmation-detail-label">Cliente:</span>
            <span class="confirmation-detail-value">${
              reservation.customer_name
            }</span>
          </div>
          <div class="confirmation-detail-row">
            <span class="confirmation-detail-label">Email:</span>
            <span class="confirmation-detail-value">${
              reservation.customer_email
            }</span>
          </div>
          <div class="confirmation-detail-row">
            <span class="confirmation-detail-label">Teléfono:</span>
            <span class="confirmation-detail-value">${
              reservation.customer_phone
            }</span>
          </div>
          <div class="confirmation-detail-row">
            <span class="confirmation-detail-label">Fecha:</span>
            <span class="confirmation-detail-value">${this.formatDate(
              reservation.date
            )}</span>
          </div>
          <div class="confirmation-detail-row">
            <span class="confirmation-detail-label">Hora:</span>
            <span class="confirmation-detail-value">${reservation.time}</span>
          </div>
          <div class="confirmation-detail-row">
            <span class="confirmation-detail-label">Personas:</span>
            <span class="confirmation-detail-value">${reservation.guests}</span>
          </div>
          <div class="confirmation-detail-row">
            <span class="confirmation-detail-label">Estado:</span>
            <span class="status-badge ${reservation.status}">
              ${this.getStatusText(reservation.status)}
            </span>
          </div>
        </div>
      `,
      actions: [{ text: "Cerrar", class: "btn-secondary" }],
    });
  }

  editReservation(id) {
    UI.showToast("Función de edición en desarrollo", "info");
  }

  async cancelReservation(id) {
    if (!confirm("¿Estás seguro de cancelar esta reserva?")) {
      return;
    }

    try {
      UI.showLoader();

      await api.updateReservationStatus(id, "cancelled");

      // Actualizar en el array local
      const reservation = this.reservations.find((r) => r.id === id);
      if (reservation) {
        reservation.status = "cancelled";
      }

      this.renderReservations();
      UI.showToast("Reserva cancelada exitosamente", "success");
    } catch (error) {
      console.error("Error canceling reservation:", error);
      UI.showToast("Error al cancelar la reserva", "error");
    } finally {
      UI.hideLoader();
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-MX", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  }

  getStatusText(status) {
    const statusMap = {
      confirmed: "Confirmada",
      pending: "Pendiente",
      cancelled: "Cancelada",
      completed: "Completada",
    };
    return statusMap[status] || status;
  }

  getEmptyState(message) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3 class="empty-state-title">${message}</h3>
        <p class="empty-state-text">No se encontraron resultados</p>
      </div>
    `;
  }
}

// UI Helper para modales y toasts
class UIHelper {
  showLoader() {
    let loader = document.getElementById("globalLoader");
    if (!loader) {
      loader = document.createElement("div");
      loader.id = "globalLoader";
      loader.className = "loader-overlay";
      loader.innerHTML = '<div class="loader"></div>';
      document.body.appendChild(loader);
    }
    loader.classList.remove("hidden");
  }

  hideLoader() {
    const loader = document.getElementById("globalLoader");
    if (loader) {
      loader.classList.add("hidden");
    }
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `alert alert-${type}`;
    toast.textContent = message;
    toast.style.cssText =
      "position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;";

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, CONFIG.UI.TOAST_DURATION);
  }

  showModal({ title, content, actions = [] }) {
    // Crear backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="icon-btn" onclick="this.closest('.modal-backdrop').remove()">✕</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${actions
            .map(
              (action) =>
                `<button class="btn ${
                  action.class || "btn-primary"
                }" onclick="this.closest('.modal-backdrop').remove()">
              ${action.text}
            </button>`
            )
            .join("")}
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Click fuera del modal para cerrar
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
      }
    });
  }
}

// Instancia global
window.UI = new UIHelper();

// Inicializar dashboard
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.dashboard = new Dashboard();
  });
} else {
  window.dashboard = new Dashboard();
}

console.log("✅ Dashboard initialized");
