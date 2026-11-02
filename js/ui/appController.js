class AppController {
  constructor() {
    this.currentUser = JSON.parse(sessionStorage.getItem('sw_user')) || JSON.parse(localStorage.getItem('sw_user'));
    this.inventory = [];
    this.moves = [];
  }

  async init() {
    if (!this.currentUser) return window.location.replace('index.html');
    checkSessionAndLoadUI();

    if (this.currentUser.role === 'ADMIN') {
      document.getElementById('btnNewSku').classList.remove('hidden');
      document.getElementById('btnTabExcel').classList.remove('hidden');
    }

    this.setupListeners();
    await this.loadData();
  }

  async loadData() {
    this.inventory = await apiService.getInventory();
    this.renderInventory();
    this.populateSkuSelect();

    this.moves = await apiService.getMoves();
    this.renderMoves();
    this.renderTrash();
  }

  renderInventory() {
    const tbody = document.querySelector('#tableInventory tbody');
    tbody.innerHTML = '';
    if (this.inventory.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay prendas en inventario.</td></tr>';
      return;
    }
    this.inventory.forEach(item => {
      tbody.innerHTML += `
        <tr>
          <td><b>${item.ID_SKU}</b></td>
          <td>${item.Tipo}</td>
          <td>${item.Talla}</td>
          <td>${item.Color}</td>
          <td>${item.Ubicacion}</td>
          <td><b>${item.Stock_Actual}</b></td>
        </tr>
      `;
    });
  }

  populateSkuSelect() {
    const select = document.getElementById('moveSkuSelect');
    select.innerHTML = '<option value="">Seleccione SKU...</option>';
    this.inventory.forEach(item => {
      select.innerHTML += `<option value="${item.ID_SKU}">${item.ID_SKU} - ${item.Tipo} ${item.Talla} (Stock: ${item.Stock_Actual})</option>`;
    });
  }

  renderMoves() {
    const tbody = document.querySelector('#tableMoves tbody');
    tbody.innerHTML = '';
    const activos = this.moves.filter(m => m.Estado === 'ACTIVO');
    
    if (activos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No hay movimientos activos.</td></tr>';
      return;
    }

    activos.forEach(m => {
      const fecha = new Date(m.Fecha).toLocaleString('es-PE');
      const color = m.Tipo === 'ENTREGA' ? 'var(--anc-pink)' : 'var(--success)';
      const signo = m.Tipo === 'ENTREGA' ? '-' : '+';
      
      tbody.innerHTML += `
        <tr>
          <td style="font-size:0.8rem; font-weight:bold;">${m.ID_Movimiento}</td>
          <td style="font-size:0.8rem; color:var(--text-gray);">${fecha}</td>
          <td style="color:${color}; font-weight:bold;">${m.Tipo}</td>
          <td>${m.ID_SKU}</td>
          <td><b style="color:${color};">${signo}${m.Cantidad}</b></td>
          <td>${m.DNI}</td>
          <td>${m.Nombre} ${m.Apellido}</td>
          <td>${m.Admin}</td>
          <td>
            <button class="btn-delete" onclick="app.deleteMove('${m.ID_Movimiento}')" title="Anular y mover a papelera">
              <i class="fa-solid fa-ban"></i>
            </button>
          </td>
        </tr>
      `;
    });
  }

  renderTrash() {
    const tbody = document.querySelector('#tableTrash tbody');
    tbody.innerHTML = '';
    const anulados = this.moves.filter(m => m.Estado === 'ANULADO');
    
    if (anulados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">La papelera está vacía.</td></tr>';
      return;
    }

    anulados.forEach(m => {
      const fecha = new Date(m.Fecha).toLocaleString('es-PE');
      tbody.innerHTML += `
        <tr>
          <td style="font-size:0.8rem; font-weight:bold;">${m.ID_Movimiento}</td>
          <td style="font-size:0.8rem; color:var(--text-gray);">${fecha}</td>
          <td>${m.Tipo}</td>
          <td>${m.ID_SKU}</td>
          <td>${m.Cantidad}</td>
          <td>${m.Nombre} ${m.Apellido}</td>
          <td>
            <button class="btn-restore" onclick="app.restoreMove('${m.ID_Movimiento}')" title="Restaurar movimiento">
              <i class="fa-solid fa-rotate-left"></i> Restaurar
            </button>
          </td>
        </tr>
      `;
    });
  }

  setupListeners() {
    document.getElementById('btnTabInv').addEventListener('click', () => this.switchTab('panelInv', 'btnTabInv'));
    document.getElementById('btnTabMoves').addEventListener('click', () => this.switchTab('panelMoves', 'btnTabMoves'));
    document.getElementById('btnTabTrash').addEventListener('click', () => this.switchTab('panelTrash', 'btnTabTrash'));
    document.getElementById('btnTabExcel').addEventListener('click', () => this.switchTab('panelExcel', 'btnTabExcel'));

    document.getElementById('moveType').addEventListener('change', (e) => {
      const isDelivery = e.target.value === 'ENTREGA';
      document.getElementById('deliveryFields').style.display = isDelivery ? 'flex' : 'none';
    });
    document.getElementById('btnSaveMove').addEventListener('click', () => this.saveMove());

    document.getElementById('btnNewSku').addEventListener('click', () => {
      document.getElementById('modalNewSku').classList.remove('hidden');
    });
    document.getElementById('btnCancelSku').addEventListener('click', () => {
      document.getElementById('modalNewSku').classList.add('hidden');
    });
    document.getElementById('btnSaveSku').addEventListener('click', () => this.saveNewSku());

    document.getElementById('btnDownloadTemplate').addEventListener('click', () => this.downloadTemplate());
    document.getElementById('btnUploadExcel').addEventListener('click', () => {
      document.getElementById('excelFileInput').click();
    });
    document.getElementById('excelFileInput').addEventListener('change', (e) => this.handleExcelUpload(e));
  }

  switchTab(panelId, btnId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(panelId).classList.remove('hidden');
    document.getElementById(btnId).classList.add('active');
  }

  async saveMove() {
    const tipo = document.getElementById('moveType').value;
    const sku = document.getElementById('moveSkuSelect').value;
    const cantidad = parseInt(document.getElementById('moveQty').value);
    
    if (!sku || cantidad < 1) return alert("Seleccione un SKU y cantidad válida.");

    const moveData = {
      tipo, id_sku: sku, cantidad,
      dni: tipo === 'ENTREGA' ? document.getElementById('moveDni').value : '-',
      nombre: tipo === 'ENTREGA' ? document.getElementById('moveName').value : '-',
      apellido: tipo === 'ENTREGA' ? document.getElementById('moveLastname').value : '-',
      admin: this.currentUser.name
    };

    if (tipo === 'ENTREGA' && (!moveData.dni || !moveData.nombre)) {
      return alert("Para entregas, el DNI y Nombre son obligatorios.");
    }

    const btn = document.getElementById('btnSaveMove');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

    const success = await apiService.registerMove(moveData);
    
    if (success) {
      alert("✅ Movimiento registrado.");
      document.getElementById('moveQty').value = '1';
      document.getElementById('moveDni').value = '';
      document.getElementById('moveName').value = '';
      document.getElementById('moveLastname').value = '';
      setTimeout(async () => { 
        await this.loadData(); 
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Movimiento'; 
      }, 1500);
    } else {
      alert("❌ Error al registrar.");
      btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Movimiento';
    }
  }

  async deleteMove(id) {
    if (!confirm("¿Seguro que deseas anular este movimiento?")) return;
    const success = await apiService.toggleMoveStatus(id, 'ANULADO');
    if (success) setTimeout(async () => await this.loadData(), 1500);
  }

  async restoreMove(id) {
    if (!confirm("¿Restaurar este movimiento?")) return;
    const success = await apiService.toggleMoveStatus(id, 'ACTIVO');
    if (success) setTimeout(async () => await this.loadData(), 1500);
  }

  async saveNewSku() {
    const item = {
      tipo: document.getElementById('newType').value,
      talla: document.getElementById('newSize').value,
      color: document.getElementById('newColor').value,
      ubicacion: document.getElementById('newLocation').value,
      stock: parseInt(document.getElementById('newStock').value) || 0
    };

    if (!item.tipo) return alert("El Tipo de prenda es obligatorio.");

    const btn = document.getElementById('btnSaveSku');
    btn.disabled = true;

    const success = await apiService.createInventory(item);
    if (success) {
      alert("✅ SKU creado con éxito.");
      document.getElementById('modalNewSku').classList.add('hidden');
      document.getElementById('newType').value = '';
      document.getElementById('newSize').value = '';
      document.getElementById('newColor').value = '';
      document.getElementById('newLocation').value = '';
      document.getElementById('newStock').value = '0';
      setTimeout(async () => { await this.loadData(); btn.disabled = false; }, 1500);
    } else {
      alert("❌ Error al crear.");
      btn.disabled = false;
    }
  }

  // ==========================================
  // LÓGICA DE CARGA MASIVA (EXCEL)
  // ==========================================
  downloadTemplate() {
    const data = [
      ["Tipo", "Talla", "Color", "Ubicacion", "Stock"],
      ["Camisa", "M", "Azul", "Mass-09-01-02-01", 10],
      ["Pantalon", "32", "Negro", "Mass-09-01-02-02", 5]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "Plantilla_Inventario_ANC.xlsx");
  }

  async handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const btn = document.getElementById('btnUploadExcel');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) throw new Error("El archivo está vacío.");

        const itemsToUpload = jsonData.filter(row => row.Tipo).map(row => ({
          tipo: row.Tipo || '-',
          talla: row.Talla || '-',
          color: row.Color || '-',
          ubicacion: row.Ubicacion || '-',
          stock: parseInt(row.Stock) || 0
        }));

        if (itemsToUpload.length === 0) throw new Error("No se encontraron datos válidos (columna 'Tipo' vacía).");

        const success = await apiService.bulkCreateInventory(itemsToUpload);
        
        if (success) {
          alert(`✅ Se subieron ${itemsToUpload.length} prendas correctamente.`);
          await this.loadData();
        } else {
          alert("❌ Error al subir el lote.");
        }
      } catch (err) {
        console.error(err);
        alert("❌ Error al leer el Excel: " + err.message);
      } finally {
        event.target.value = '';
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tableInventory')) {
    app = new AppController();
    app.init();
  }
});