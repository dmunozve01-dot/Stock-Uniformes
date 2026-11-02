class AppController {
  constructor() {
    this.inventory = [];
    this.history = [];
    this.currentUser = JSON.parse(sessionStorage.getItem('sw_user')) || JSON.parse(localStorage.getItem('sw_user'));
  }

  async init() {
    if (!this.currentUser) return window.location.replace('index.html');
    
    checkSessionAndLoadUI();
    this.setupListeners();
    
    await this.loadData();
  }

  async loadData() {
    // Cargar Inventario
    this.inventory = await apiService.getInventory();
    this.renderInventory();

    // Si es Admin, cargar Historial y selector
    if (this.currentUser.role === 'ADMIN') {
      this.history = await apiService.getDeliveryHistory();
      this.renderHistory();
      this.populateSelect();
    }
  }

  renderInventory() {
    const tbody = document.querySelector('#tableInventoryUser tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (this.inventory.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No hay uniformes registrados.</td></tr>`;
      return;
    }

    this.inventory.forEach(item => {
      tbody.innerHTML += `
        <tr>
          <td>${item.Tipo || '-'}</td>
          <td>${item.Talla || '-'}</td>
          <td>${item.Color || '-'}</td>
          <td><b>${item.Stock_Actual || 0}</b></td>
          <td>${item.Ubicacion || 'N/A'}</td>
        </tr>
      `;
    });
  }

  renderHistory() {
    const tbody = document.querySelector('#tableHistory tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (this.history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Sin entregas registradas.</td></tr>`;
      return;
    }

    this.history
      .sort((a,b) => new Date(b.Fecha) - new Date(a.Fecha))
      .forEach(h => {
        const fecha = h.Fecha ? new Date(h.Fecha).toLocaleDateString('es-PE') : 'N/A';
        tbody.innerHTML += `
          <tr>
            <td>${fecha}</td>
            <td>${h.Email_Empleado || '-'}</td>
            <td>ID: ${h.ID_Uniforme || '-'}</td>
            <td>${h.Cantidad || 0}</td>
            <td>${h.Entregado_Por || '-'}</td>
          </tr>
        `;
      });
  }

  populateSelect() {
    const select = document.getElementById('deliveryItemSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccione Uniforme...</option>';
    
    this.inventory.forEach(item => {
      if (Number(item.Stock_Actual) > 0) {
        select.innerHTML += `<option value="${item.ID}">${item.Tipo} Talla ${item.Talla} (Stock: ${item.Stock_Actual})</option>`;
      }
    });
  }

  setupListeners() {
    const btnUser = document.getElementById('btnUser');
    const btnAdmin = document.getElementById('btnAdmin');
    const btnDeliver = document.getElementById('btnDeliverItem');

    if (btnUser) btnUser.addEventListener('click', () => this.switchTab('user'));
    if (btnAdmin) btnAdmin.addEventListener('click', () => this.switchTab('admin'));
    if (btnDeliver) btnDeliver.addEventListener('click', () => this.processDelivery());
  }

  switchTab(tab) {
    document.getElementById('btnUser').classList.toggle('active', tab === 'user');
    document.getElementById('btnAdmin').classList.toggle('active', tab === 'admin');
    document.getElementById('userPanel').classList.toggle('active', tab === 'user');
    document.getElementById('adminPanel').classList.toggle('active', tab === 'admin');
  }

  async processDelivery() {
    const email = document.getElementById('deliveryUserEmail').value.trim();
    const itemId = document.getElementById('deliveryItemSelect').value;
    const qty = parseInt(document.getElementById('deliveryQty').value);

    if (!email || !itemId || qty < 1) {
      return alert("⚠️ Complete todos los campos correctamente.");
    }

    const btn = document.getElementById('btnDeliverItem');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

    const deliveryData = {
      fecha: new Date().toISOString(),
      email_empleado: email,
      id_uniforme: itemId,
      cantidad: qty,
      admin: this.currentUser.name || 'Admin'
    };

    const success = await apiService.registerDelivery(deliveryData);

    if (success) {
      alert("✅ Entrega registrada. Actualizando stock...");
      document.getElementById('deliveryUserEmail').value = '';
      document.getElementById('deliveryQty').value = '1';
      
      // Esperamos un momento para que Google Sheets procese el POST
      setTimeout(async () => {
        await this.loadData(); 
        btn.disabled = false;
        btn.innerHTML = originalText;
      }, 1500);
    } else {
      alert("❌ Error al registrar la entrega.");
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tableInventoryUser')) {
    const app = new AppController();
    app.init();
  }
});