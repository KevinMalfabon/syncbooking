/**
 * Flujo de Reservación del Cliente
 * Maneja todo el proceso de hacer una reserva
 */

class BookingFlow {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.bookingData = {
      date: null,
      time: null,
      guests: 2,
      name: '',
      email: '',
      phone: '',
      notes: ''
    };

    this.init();
  }

  init() {
    // Solo inicializar en la página de booking
    if (!document.getElementById('bookingForm')) return;

    this.setupElements();
    this.setupEventListeners();
    this.initializeForm();
  }

  setupElements() {
    this.form = document.getElementById('bookingForm');
    this.sections = {
      datetime: document.getElementById('section-datetime'),
      details: document.getElementById('section-details'),
      confirmation: document.getElementById('section-confirmation')
    };

    this.buttons = {
      next1: document.getElementById('btn-next-1'),
      back2: document.getElementById('btn-back-2'),
      next2: document.getElementById('btn-next-2'),
      newReservation: document.getElementById('btn-new-reservation')
    };

    this.inputs = {
      date: document.getElementById('date'),
      guests: document.getElementById('guests'),
      name: document.getElementById('name'),
      email: document.getElementById('email'),
      phone: document.getElementById('phone'),
      notes: document.getElementById('notes')
    };

    this.displays = {
      guestCount: document.getElementById('guestCount'),
      timeSlots: document.getElementById('timeSlots')
    };
  }

  setupEventListeners() {
    // Navegación entre pasos
    this.buttons.next1?.addEventListener('click', () => this.nextStep());
    this.buttons.back2?.addEventListener('click', () => this.previousStep());
    this.buttons.next2?.addEventListener('click', () => this.submitReservation());
    this.buttons.newReservation?.addEventListener('click', () => this.resetFlow());

    // Guest counter
    document.getElementById('btn-decrease')?.addEventListener('click', () => this.decreaseGuests());
    document.getElementById('btn-increase')?.addEventListener('click', () => this.increaseGuests());

    // Date change
    this.inputs.date?.addEventListener('change', () => this.handleDateChange());

    // Form validation
    ['name', 'email', 'phone'].forEach(field => {
      this.inputs[field]?.addEventListener('blur', () => this.validateField(field));
    });
  }

  initializeForm() {
    // Establecer fecha mínima (hoy + 2 horas según config)
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + CONFIG.LIMITS.MIN_ADVANCE_HOURS);
    this.inputs.date.min = minDate.toISOString().split('T')[0];

    // Establecer fecha máxima
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + CONFIG.LIMITS.MAX_ADVANCE_DAYS);
    this.inputs.date.max = maxDate.toISOString().split('T')[0];

    // Actualizar display de huéspedes
    this.updateGuestDisplay();

    // Mostrar primer paso
    this.showStep(1);
  }

  // ============================================
  // NAVEGACIÓN ENTRE PASOS
  // ============================================

  async nextStep() {
    if (!await this.validateCurrentStep()) {
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.showStep(this.currentStep);

      // Si llegamos al paso de confirmación, mostrar resumen
      if (this.currentStep === 3) {
        this.showConfirmationSummary();
      }
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.showStep(this.currentStep);
    }
  }

  showStep(step) {
    // Ocultar todas las secciones
    Object.values(this.sections).forEach(section => {
      section?.classList.remove('active');
    });

    // Mostrar sección actual
    const sectionMap = {
      1: this.sections.datetime,
      2: this.sections.details,
      3: this.sections.confirmation
    };

    sectionMap[step]?.classList.add('active');

    // Actualizar indicador de pasos
    this.updateStepsIndicator();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateStepsIndicator() {
    for (let i = 1; i <= this.totalSteps; i++) {
      const step = document.querySelector(`[data-step="${i}"]`);
      if (!step) continue;

      step.classList.remove('active', 'completed');

      if (i < this.currentStep) {
        step.classList.add('completed');
      } else if (i === this.currentStep) {
        step.classList.add('active');
      }
    }
  }

  // ============================================
  // VALIDACIONES
  // ============================================

  async validateCurrentStep() {
    if (this.currentStep === 1) {
      return this.validateDateTimeStep();
    } else if (this.currentStep === 2) {
      return this.validateDetailsStep();
    }
    return true;
  }

  async validateDateTimeStep() {
    const date = this.inputs.date.value;
    const time = this.bookingData.time;
    const guests = this.bookingData.guests;

    if (!date) {
      UI.showToast('Por favor selecciona una fecha', 'error');
      return false;
    }

    if (!time) {
      UI.showToast('Por favor selecciona un horario', 'error');
      return false;
    }

    // Validar que la fecha no sea pasada
    const selectedDate = new Date(date + 'T' + time);
    const now = new Date();
    
    if (selectedDate < now) {
      UI.showToast('No puedes reservar en una fecha pasada', 'error');
      return false;
    }

    // Verificar disponibilidad (opcional, según configuración)
    try {
      UI.showLoader();
      const availability = await api.checkAvailability(date, time, guests);
      
      if (!availability.available) {
        UI.showToast('Lo sentimos, ese horario no está disponible', 'error');
        return false;
      }

      this.bookingData.date = date;
      return true;

    } catch (error) {
      console.error('Error checking availability:', error);
      // En caso de error, permitir continuar (el backend validará)
      this.bookingData.date = date;
      return true;
    } finally {
      UI.hideLoader();
    }
  }

  validateDetailsStep() {
    const name = this.inputs.name.value.trim();
    const email = this.inputs.email.value.trim();
    const phone = this.inputs.phone.value.trim();

    if (!name || name.length < 3) {
      UI.showToast('Por favor ingresa un nombre válido', 'error');
      this.inputs.name.focus();
      return false;
    }

    if (!email || !this.validateEmail(email)) {
      UI.showToast('Por favor ingresa un email válido', 'error');
      this.inputs.email.focus();
      return false;
    }

    if (!phone || phone.length < 10) {
      UI.showToast('Por favor ingresa un teléfono válido', 'error');
      this.inputs.phone.focus();
      return false;
    }

    // Guardar datos
    this.bookingData.name = name;
    this.bookingData.email = email;
    this.bookingData.phone = phone;
    this.bookingData.notes = this.inputs.notes.value.trim();

    return true;
  }

  validateField(fieldName) {
    const input = this.inputs[fieldName];
    const value = input.value.trim();

    let isValid = true;
    let message = '';

    switch(fieldName) {
      case 'name':
        isValid = value.length >= 3;
        message = 'El nombre debe tener al menos 3 caracteres';
        break;
      case 'email':
        isValid = this.validateEmail(value);
        message = 'Por favor ingresa un email válido';
        break;
      case 'phone':
        isValid = value.length >= 10;
        message = 'Por favor ingresa un teléfono válido';
        break;
    }

    if (!isValid && value) {
      input.classList.add('error');
      const errorSpan = input.parentElement.querySelector('.form-error');
      if (errorSpan) {
        errorSpan.textContent = message;
      }
    } else {
      input.classList.remove('error');
      const errorSpan = input.parentElement.querySelector('.form-error');
      if (errorSpan) {
        errorSpan.textContent = '';
      }
    }

    return isValid;
  }

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // ============================================
  // MANEJO DE FECHA Y HORA
  // ============================================

  async handleDateChange() {
    const date = this.inputs.date.value;
    if (!date) return;

    // Generar horarios disponibles
    await this.loadTimeSlots(date);
  }

  async loadTimeSlots(date) {
    const container = this.displays.timeSlots;
    container.innerHTML = '<div class="loader-sm"></div>';

    try {
      // Generar slots de tiempo (30 minutos de intervalo)
      const slots = this.generateTimeSlots();

      container.innerHTML = '';

      slots.forEach(slot => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'time-slot';
        button.textContent = slot;
        button.dataset.time = slot;

        // Marcar como seleccionado si es el time actual
        if (this.bookingData.time === slot) {
          button.classList.add('selected');
        }

        button.addEventListener('click', () => this.selectTimeSlot(slot));

        container.appendChild(button);
      });

    } catch (error) {
      console.error('Error loading time slots:', error);
      container.innerHTML = '<p class="text-center">Error al cargar horarios</p>';
    }
  }

  generateTimeSlots() {
    const slots = [];
    const start = parseInt(CONFIG.DEFAULT_HOURS.OPENING.split(':')[0]);
    const end = parseInt(CONFIG.DEFAULT_HOURS.CLOSING.split(':')[0]);
    const interval = CONFIG.DEFAULT_HOURS.INTERVAL_MINUTES;

    for (let hour = start; hour < end; hour++) {
      for (let min = 0; min < 60; min += interval) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }

    return slots;
  }

  selectTimeSlot(time) {
    // Remover selección anterior
    document.querySelectorAll('.time-slot').forEach(slot => {
      slot.classList.remove('selected');
    });

    // Seleccionar nuevo slot
    const selectedSlot = document.querySelector(`[data-time="${time}"]`);
    selectedSlot?.classList.add('selected');

    this.bookingData.time = time;
  }

  // ============================================
  // CONTADOR DE HUÉSPEDES
  // ============================================

  decreaseGuests() {
    if (this.bookingData.guests > CONFIG.LIMITS.MIN_GUESTS) {
      this.bookingData.guests--;
      this.updateGuestDisplay();
    }
  }

  increaseGuests() {
    if (this.bookingData.guests < CONFIG.LIMITS.MAX_GUESTS) {
      this.bookingData.guests++;
      this.updateGuestDisplay();
    }
  }

  updateGuestDisplay() {
    if (this.displays.guestCount) {
      this.displays.guestCount.textContent = this.bookingData.guests;
    }
    this.inputs.guests.value = this.bookingData.guests;

    // Actualizar botones
    const decreaseBtn = document.getElementById('btn-decrease');
    const increaseBtn = document.getElementById('btn-increase');

    if (decreaseBtn) {
      decreaseBtn.disabled = this.bookingData.guests <= CONFIG.LIMITS.MIN_GUESTS;
    }

    if (increaseBtn) {
      increaseBtn.disabled = this.bookingData.guests >= CONFIG.LIMITS.MAX_GUESTS;
    }
  }

  // ============================================
  // ENVÍO DE RESERVACIÓN
  // ============================================

  async submitReservation() {
    UI.showLoader();

    try {
      // Enviar reservación al backend
      const response = await api.createReservation({
        date: this.bookingData.date,
        time: this.bookingData.time,
        guests: this.bookingData.guests,
        name: this.bookingData.name,
        email: this.bookingData.email,
        phone: this.bookingData.phone,
        notes: this.bookingData.notes
      });

      // Guardar código de confirmación
      this.confirmationCode = response.confirmation_code;

      // Mostrar confirmación
      this.showConfirmation();

      UI.showToast('¡Reservación confirmada!', 'success');

    } catch (error) {
      console.error('Error creating reservation:', error);
      UI.showToast(error.message || 'Error al crear la reservación', 'error');
    } finally {
      UI.hideLoader();
    }
  }

  showConfirmationSummary() {
    // En el paso 2, mostrar resumen antes de confirmar
    // Este método se puede usar para mostrar un resumen en el paso 2
  }

  showConfirmation() {
    // Actualizar código de confirmación
    const codeElement = document.getElementById('confirmationCode');
    if (codeElement) {
      codeElement.textContent = this.confirmationCode;
    }

    // Actualizar detalles
    document.getElementById('confirm-date').textContent = 
      new Date(this.bookingData.date).toLocaleDateString('es-MX', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

    document.getElementById('confirm-time').textContent = this.bookingData.time;
    document.getElementById('confirm-guests').textContent = this.bookingData.guests;
    document.getElementById('confirm-name').textContent = this.bookingData.name;
  }

  // ============================================
  // RESET
  // ============================================

  resetFlow() {
    this.currentStep = 1;
    this.bookingData = {
      date: null,
      time: null,
      guests: 2,
      name: '',
      email: '',
      phone: '',
      notes: ''
    };

    this.form.reset();
    this.initializeForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.bookingFlow = new BookingFlow();
  });
} else {
  window.bookingFlow = new BookingFlow();
}

console.log('✅ Booking Flow initialized');