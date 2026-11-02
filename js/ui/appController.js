class AppController {
  constructor() {
    this.currentUser = JSON.parse(sessionStorage.getItem('sw_user')) || JSON.parse(localStorage.getItem('sw_user'));
    this.inventory = [];
    this.moves = [];
    this.users = []; // Nueva lista para usuarios
    this.editingSku = null; 
  }

  async init() {
    if (!this.currentUser) return window.location.replace('index.html');
    checkSessionAndLoadUI();

    if (this.currentUser.role === 'ADMIN') {
      document.getElementById('adminTools').classList.remove('hidden');
      document.querySelectorAll('.admin-col').forEach(el => el.classList.remove('hidden'));
      // El botón de usuarios se muestra gracias a auth.js
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

  renderInventory(filterText = '') {
    const tbody = document.querySelector('#tableInventory tbody');
    tbody.innerHTML = '';
    
    let filtered = this.inventory.filter(item => item.Estado !== 'ELIMINADO');

    if (filterText) {
      const text = filterText.toLowerCase();
      filtered = filtered.filter(item => 
        String(item.ID_SKU).toLowerCase().includes(text) || 
        String(item.Tipo).toLowerCase().includes(text) ||
        String(item.Color).toLowerCase().includes(text) ||
        String(item.Ubicacion).toLowerCase().includes(text)
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron prendas activas.</td></tr>';
      return;
    }

    filtered.forEach(item => {
      const adminActions = this.currentUser.role === 'ADMIN' ? `
        <td class="admin-col" style="display: flex; gap: 5px;">
          <button class="btn-restore" onclick="app.openEditModal('${item.ID_SKU}')" style="background:#e0f2fe; color:#0284c7; padding: 6px 10px;" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-delete" onclick="app.deleteSku('${item.ID_SKU}')" title="Eliminar prenda" style="padding: 6px 10px;">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      ` : '';

      tbody.innerHTML += `
        <tr>
          <td><b>${item.ID_SKU}</b></td>
          <td>${item.Tipo}</td>
          <td>${item.Talla}</td>
          <td>${item.Color}</td>
          <td>${item.Ubicacion || 'N/A'}</td>
          <td><b>${item.Stock_Actual}</b></td>
          ${adminActions}
        </tr>
      `;
    });
  }

  populateSkuSelect() {
    const select = document.getElementById('moveSkuSelect');
    select.innerHTML = '<option value="">Seleccione SKU...</option>';
    this.inventory.filter(i => i.Estado !== 'ELIMINADO' && Number(i.Stock_Actual) > 0).forEach(item => {
      select.innerHTML += `<option value="${item.ID_SKU}">${item.ID_SKU} - ${item.Tipo} ${item.Talla} (Stock: ${item.Stock_Actual})</option>`;
    });
  }

  renderMoves() {
    const tbody = document.querySelector('#tableMoves tbody');
    tbody.innerHTML = '';
    const activos = this.moves.filter(m => m.Estado === 'ACTIVO');
    
    if (activos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay entregas registradas.</td></tr>';
      return;
    }

    activos.forEach(m => {
      const fecha = new Date(m.Fecha).toLocaleString('es-PE');
      tbody.innerHTML += `
        <tr>
          <td style="font-size:0.8rem; font-weight:bold;">${m.ID_Movimiento}</td>
          <td style="font-size:0.8rem; color:var(--text-gray);">${fecha}</td>
          <td>${m.ID_SKU}</td>
          <td><b style="color:var(--anc-pink);">-${m.Cantidad}</b></td>
          <td>${m.DNI}</td>
          <td>${m.Nombre} ${m.Apellido}</td>
          <td>${m.Admin}</td>
          <td>
            <button class="btn-delete" onclick="app.deleteMove('${m.ID_Movimiento}')" title="Anular entrega" style="padding: 6px 10px;">
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
    
    const movesAnulados = this.moves.filter(m => m.Estado === 'ANULADO');
    const prendasEliminadas = this.inventory.filter(i => i.Estado === 'ELIMINADO');

    if (movesAnulados.length === 0 && prendasEliminadas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">La papelera está vacía.</td></tr>';
      return;
    }

    movesAnulados.forEach(m => {
      const fecha = new Date(m.Fecha).toLocaleString('es-PE');
      tbody.innerHTML += `
        <tr>
          <td style="font-size:0.8rem; font-weight:bold; color:var(--anc-pink);">MOV: ${m.ID_Movimiento}</td>
          <td style="font-size:0.8rem; color:var(--text-gray);">${fecha}</td>
          <td>Entrega de: ${m.ID_SKU}</td>
          <td>${m.Cantidad}</td>
          <td>${m.Nombre} ${m.Apellido}</td>
          <td>
            <button class="btn-restore" onclick="app.restoreMove('${m.ID_Movimiento}')" title="Restaurar entrega">
              <i class="fa-solid fa-rotate-left"></i> Restaurar
            </button>
          </td>
        </tr>
      `;
    });

    prendasEliminadas.forEach(item => {
      tbody.innerHTML += `
        <tr style="background:#fff1f2;">
          <td style="font-size:0.8rem; font-weight:bold; color:var(--danger);">SKU: ${item.ID_SKU}</td>
          <td style="font-size:0.8rem; color:var(--text-gray);">Prenda eliminada</td>
          <td>${item.Tipo} ${item.Talla} ${item.Color}</td>
          <td>${item.Stock_Actual}</td>
          <td>Ubic: ${item.Ubicacion}</td>
          <td>
            <button class="btn-restore" onclick="app.restoreSku('${item.ID_SKU}')" title="Restaurar prenda">
              <i class="fa-solid fa-rotate-left"></i> Restaurar
            </button>
          </td>
        </tr>
      `;
    });
  }

  async loadUsers() {
    const tbody = document.querySelector('#tableUsers tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Cargando usuarios...</td></tr>';
    
    this.users = await apiService.getUsers();
    tbody.innerHTML = '';

    this.users.forEach(u => {
      const isBlocked = String(u.Estado).toUpperCase() === 'BLOQUEADO';
      const badgeColor = isBlocked ? 'var(--danger)' : 'var(--success)';
      const btnText = isBlocked ? 'Desbloquear' : 'Bloquear';
      const btnColor = isBlocked ? '#dc2626' : '#64748b';

      tbody.innerHTML += `
        <tr>
          <td><b>${u.Email}</b></td>
          <td>${u.Nombre}</td>
          <td><span style="background:#e2e8f0; padding:2px 8px; border-radius:4px; font-size:0.75rem;">${u.Rol}</span></td>
          <td style="color:${badgeColor}; font-weight:bold;">${u.Estado || 'ACTIVO'}</td>
          <td>
            <button class="btn" onclick="app.toggleUser('${u.Email}', '${isBlocked ? 'ACTIVO' : 'BLOQUEADO'}')" style="background:${btnColor}; color:white; padding: 6px 12px; font-size:0.8rem;">
              ${btnText}
            </button>
          </td>
        </tr>
      `;
    });
  }

  async toggleUser(email, nuevoEstado) {
    const accion = nuevoEstado === 'BLOQUEADO' ? 'bloquear' : 'desbloquear';
    if (!confirm(`¿Estás seguro de ${accion} al usuario ${email}?`)) return;

    const success = await apiService.toggleUserStatus(email, nuevoEstado);
    if (success) {
      alert(`✅ Usuario ${accion}do correctamente.`);
      await this.loadUsers();
    } else {
      alert("❌ Error al actualizar usuario.");
    }
  }

  setupListeners() {
    document.getElementById('btnTabInv').addEventListener('click', () => this.switchTab('panelInv', 'btnTabInv'));
    document.getElementById('btnTabMoves').addEventListener('click', () => this.switchTab('panelMoves', 'btnTabMoves'));
    document.getElementById('btnTabTrash').addEventListener('click', () => this.switchTab('panelTrash', 'btnTabTrash'));
    document.getElementById('btnTabUsers').addEventListener('click', () => {
      this.switchTab('panelUsers', 'btnTabUsers');
      this.loadUsers();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.renderInventory(e.target.value);
    });

    document.getElementById('btnSaveMove').addEventListener('click', () => this.saveMove());
    document.getElementById('btnNewSku').addEventListener('click', () => this.openCreateModal());
    document.getElementById('btnCancelSku').addEventListener('click', () => {
      const modal = document.getElementById('modalSku');
      modal.classList.add('hidden');
      modal.style.display = 'none';
    });
    document.getElementById('btnSaveSku').addEventListener('click', () => this.saveSku());
    
    document.getElementById('btnDownloadTemplate').addEventListener('click', () => this.downloadTemplate());
    document.getElementById('btnUploadExcel').addEventListener('click', () => {
      document.getElementById('excelFileInput').click();
    });
    document.getElementById('excelFileInput').addEventListener('change', (e) => this.handleExcelUpload(e));
  }

  switchTab(panelId, btnId) {
    document.querySelectorAll('.panel').forEach(p => {
      p.style.display = 'none';
      p.classList.remove('active');
    });
    document.querySelectorAll('.btn-tab').forEach(b => {
      b.classList.remove('active');
    });
    const panel = document.getElementById(panelId);
    if(panel) {
      panel.style.display = 'block';
      panel.classList.add('active');
    }
    const btn = document.getElementById(btnId);
    if(btn) btn.classList.add('active');
  }

  openCreateModal() {
    this.editingSku = null;
    document.getElementById('modalSkuTitle').innerText = "Registrar Prenda Nueva";
    document.getElementById('modalSkuId').style.display = 'none';
    document.getElementById('skuType').value = '';
    document.getElementById('skuSize').value = '';
    document.getElementById('skuColor').value = '';
    document.getElementById('skuLocation').value = '';
    document.getElementById('skuStock').value = '0';
    const modal = document.getElementById('modalSku');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  openEditModal(skuId) {
    const item = this.inventory.find(i => i.ID_SKU === skuId);
    if (!item) return;
    this.editingSku = skuId;
    document.getElementById('modalSkuTitle').innerText = "Editar Prenda";
    document.getElementById('modalSkuId').style.display = 'block';
    document.getElementById('modalSkuId').innerText = `ID: ${item.ID_SKU}`;
    document.getElementById('skuType').value = item.Tipo;
    document.getElementById('skuSize').value = item.Talla;
    document.getElementById('skuColor').value = item.Color;
    document.getElementById('skuLocation').value = item.Ubicacion;
    document.getElementById('skuStock').value = item.Stock_Actual;
    const modal = document.getElementById('modalSku');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  async saveSku() {
    const item = {
      tipo: document.getElementById('skuType').value,
      talla: document.getElementById('skuSize').value,
      color: document.getElementById('skuColor').value,
      ubicacion: document.getElementById('skuLocation').value,
      stock: parseInt(document.getElementById('skuStock').value) || 0
    };
    if (!item.tipo) return alert("El Tipo de prenda es obligatorio.");
    const btn = document.getElementById('btnSaveSku');
    btn.disabled = true;
    btn.innerHTML = 'Guardando...';
    let success = false;
    if (this.editingSku) {
      item.id_sku = this.editingSku;
      success = await apiService.updateInventory(item);
    } else {
      success = await apiService.createInventory(item);
    }
    if (success) {
      alert(this.editingSku ? "✅ Prenda actualizada." : "✅ Prenda registrada.");
      const modal = document.getElementById('modalSku');
      modal.classList.add('hidden');
      modal.style.display = 'none';
      await this.loadData();
    } else {
      alert("❌ Error al guardar.");
    }
    btn.disabled = false;
    btn.innerHTML = 'Guardar';
  }

  async deleteSku(skuId) {
    if (!confirm(`¿Estás seguro de mover la prenda ${skuId} a la papelera?`)) return;
    const success = await apiService.deleteInventory(skuId);
    if (success) {
      alert("✅ Prenda movida a la papelera.");
      await this.loadData();
    } else {
      alert("❌ Error al eliminar.");
    }
  }

  async restoreSku(skuId) {
    if (!confirm(`¿Restaurar la prenda ${skuId} al inventario activo?`)) return;
    const item = this.inventory.find(i => i.ID_SKU === skuId);
    if (!item) return;
    item.estado = 'ACTIVO';
    const success = await apiService.updateInventory(item);
    if (success) {
      alert("✅ Prenda restaurada.");
      await this.loadData();
    } else {
      alert("❌ Error al restaurar.");
    }
  }

  async saveMove() {
    const sku = document.getElementById('moveSkuSelect').value;
    const cantidad = parseInt(document.getElementById('moveQty').value);
    if (!sku || cantidad < 1) return alert("Seleccione un SKU y cantidad válida.");
    const moveData = {
      tipo: 'ENTREGA',
      id_sku: sku, 
      cantidad,
      dni: document.getElementById('moveDni').value,
      nombre: document.getElementById('moveName').value,
      apellido: document.getElementById('moveLastname').value,
      admin: this.currentUser.name
    };
    if (!moveData.dni || !moveData.nombre) return alert("El DNI y Nombre son obligatorios.");
    const btn = document.getElementById('btnSaveMove');
    btn.disabled = true; 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
    const success = await apiService.registerMove(moveData);
    if (success) {
      alert("✅ Entrega registrada.");
      document.getElementById('moveQty').value = '1';
      document.getElementById('moveDni').value = '';
      document.getElementById('moveName').value = '';
      document.getElementById('moveLastname').value = '';
      setTimeout(async () => { 
        await this.loadData(); 
        btn.disabled = false; 
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Entregar y Descontar'; 
      }, 1500);
    } else {
      alert("❌ Error al registrar.");
      btn.disabled = false; 
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Entregar y Descontar';
    }
  }

  async deleteMove(id) {
    if (!confirm("¿Anular esta entrega?")) return;
    const success = await apiService.toggleMoveStatus(id, 'ANULADO');
    if (success) setTimeout(async () => await this.loadData(), 1500);
  }

  async restoreMove(id) {
    if (!confirm("¿Restaurar esta entrega?")) return;
    const success = await apiService.toggleMoveStatus(id, 'ACTIVO');
    if (success) setTimeout(async () => await this.loadData(), 1500);
  }

  downloadTemplate() {
    const data = [
      ["Tipo", "Talla", "Color", "Ubicacion", "Stock"],
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
        if (itemsToUpload.length === 0) throw new Error("No se encontraron datos válidos.");
        const res = await apiService.bulkCreateInventory(itemsToUpload);
        if (res.success) {
          alert(`✅ ${res.msg}`);
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