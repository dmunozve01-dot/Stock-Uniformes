class AppController {
  constructor() {
    this.currentUser = JSON.parse(sessionStorage.getItem('sw_user')) || JSON.parse(localStorage.getItem('sw_user'));
    this.inventory = [];
    this.moves = [];
    this.users = []; 
    this.personal = [];
    this.editingSku = null; 
    this.editingPersonal = null;
  }

  async init() {
    if (!this.currentUser) return window.location.replace('index.html');
    checkSessionAndLoadUI();

    if (this.currentUser.role === 'ADMIN') {
      document.getElementById('adminTools').classList.remove('hidden');
      document.querySelectorAll('.admin-col').forEach(el => el.classList.remove('hidden'));
    }

    this.setupListeners();
    await this.loadData();
    await this.loadPersonal();
  }

  async loadData() {
    this.inventory = await apiService.getInventory();
    this.renderInventory();
    
    this.moves = await apiService.getMoves();
    this.renderMoves();
    this.renderTrash();
    
    this.updateDashboard(); 
    this.populateEmployeeDatalist(); 
    this.populatePrendaSelect();     
  }

  // --- LOGICA DEL SELECTOR EN CASCADA (FILTRO) ---
  populatePrendaSelect() {
    const selectTipo = document.getElementById('selectTipoPrenda');
    if(!selectTipo) return;

    // Obtenemos los tipos únicos de prendas activas que TENGAN stock
    const prendasActivas = this.inventory.filter(i => i.Estado !== 'ELIMINADO' && Number(i.Stock_Actual) > 0);
    
    // Set para obtener solo los nombres únicos (BOTAS, CAMISA, etc)
    const tiposUnicos = [...new Set(prendasActivas.map(i => i.Tipo.toUpperCase()))].sort();

    selectTipo.innerHTML = '<option value="">Seleccione una prenda...</option>';
    tiposUnicos.forEach(tipo => {
      selectTipo.innerHTML += `<option value="${tipo}">${tipo}</option>`;
    });
  }

  setupCascadeLogic() {
    const selectTipo = document.getElementById('selectTipoPrenda');
    const selectUbicacion = document.getElementById('selectUbicacion');
    const inputSku = document.getElementById('moveSku');

    if(!selectTipo || !selectUbicacion) return;

    // Cuando cambia la prenda seleccionada
    selectTipo.addEventListener('change', (e) => {
      const tipoSeleccionado = e.target.value;
      
      // Limpiamos el segundo selector y el input oculto
      selectUbicacion.innerHTML = '';
      inputSku.value = '';

      if (!tipoSeleccionado) {
        selectUbicacion.innerHTML = '<option value="">Seleccione ubicación y talla...</option>';
        selectUbicacion.disabled = true;
        return;
      }

      // Filtramos el inventario para buscar solo las de ese tipo con stock
      const opcionesUbicaciones = this.inventory.filter(i => 
        i.Tipo.toUpperCase() === tipoSeleccionado && 
        i.Estado !== 'ELIMINADO' && 
        Number(i.Stock_Actual) > 0
      );

      if (opcionesUbicaciones.length === 0) {
        selectUbicacion.innerHTML = '<option value="">Sin stock en ninguna ubicación</option>';
        selectUbicacion.disabled = true;
        return;
      }

      // Llenamos el selector de ubicaciones
      selectUbicacion.disabled = false;
      selectUbicacion.innerHTML = '<option value="">Seleccione una opción...</option>';
      
      opcionesUbicaciones.forEach(item => {
        // Mostramos en el desplegable: Talla, Color, Ubicación y Stock actual
        const texto = `Talla: ${item.Talla} | Color: ${item.Color} | Ubic: ${item.Ubicacion} (Stock: ${item.Stock_Actual})`;
        selectUbicacion.innerHTML += `<option value="${item.ID_SKU}">${texto}</option>`;
      });
    });

    // Cuando se selecciona una ubicación específica, guardamos su ID_SKU
    selectUbicacion.addEventListener('change', (e) => {
      inputSku.value = e.target.value;
    });
  }

  populateEmployeeDatalist() {
    const datalistPersonal = document.getElementById('datalistPersonal');
    if(datalistPersonal) {
      datalistPersonal.innerHTML = '';
      this.personal.filter(p => String(p.Estado).toUpperCase() === 'ACTIVO').forEach(p => {
        const dni = p['ID Empleado'] || p.ID_Empleado;
        datalistPersonal.innerHTML += `<option value="${dni}">${p.Nombre}</option>`;
      });
    }

    const inputDni = document.getElementById('searchDni');
    if(inputDni) {
      // Remover eventos anteriores clonando el nodo (para que no se dupliquen)
      const newInputDni = inputDni.cloneNode(true);
      inputDni.parentNode.replaceChild(newInputDni, inputDni);

      newInputDni.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const emp = this.personal.find(p => String(p['ID Empleado'] || p.ID_Empleado) === val);
        if (emp) {
          document.getElementById('moveDni').value = val;
          document.getElementById('moveName').value = emp.Nombre;
          newInputDni.style.borderColor = 'var(--neon-green)'; 
        } else {
          document.getElementById('moveDni').value = '';
          document.getElementById('moveName').value = '';
          newInputDni.style.borderColor = 'var(--border-color)';
        }
      });
    }
  }

  // --- LÓGICA DEL DASHBOARD ---
  updateDashboard() {
    let totalPrendas = 0;
    this.inventory.filter(i => i.Estado !== 'ELIMINADO').forEach(item => {
      totalPrendas += Number(item.Stock_Actual) || 0;
    });
    if(document.getElementById('kpiTotalPrendas')) document.getElementById('kpiTotalPrendas').innerText = totalPrendas;

    const totalSkus = this.inventory.filter(i => i.Estado !== 'ELIMINADO').length;
    if(document.getElementById('kpiTotalSkus')) document.getElementById('kpiTotalSkus').innerText = totalSkus;

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    let entregasMes = 0;
    this.moves.filter(m => m.Estado === 'ACTIVO' && m.Tipo === 'ENTREGA').forEach(m => {
      const fechaMov = new Date(m.Fecha);
      if (fechaMov.getMonth() === mesActual && fechaMov.getFullYear() === anioActual) {
        entregasMes += Number(m.Cantidad) || 0;
      }
    });
    if(document.getElementById('kpiEntregas')) document.getElementById('kpiEntregas').innerText = entregasMes;

    const personalActivo = this.personal.filter(p => String(p.Estado).toUpperCase() === 'ACTIVO').length;
    if(document.getElementById('kpiPersonal')) document.getElementById('kpiPersonal').innerText = personalActivo;

    const tbody = document.querySelector('#tableDashboardMoves tbody');
    if(tbody) {
      tbody.innerHTML = '';
      const ultimosMoves = this.moves.slice(0, 5);
      if (ultimosMoves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay actividad reciente.</td></tr>';
        return;
      }
      ultimosMoves.forEach(m => {
        const fecha = new Date(m.Fecha).toLocaleString('es-PE');
        const color = m.Tipo === 'ENTREGA' ? 'var(--danger)' : 'var(--neon-green)';
        const signo = m.Tipo === 'ENTREGA' ? '-' : '+';
        tbody.innerHTML += `
          <tr>
            <td style="font-size:0.8rem; font-weight:bold;">${m.ID_Movimiento}</td>
            <td style="font-size:0.8rem; color:var(--text-gray);">${fecha}</td>
            <td style="color:${color}; font-weight:bold;">${m.Tipo}</td>
            <td>${m.ID_SKU}</td>
            <td><b style="color:${color};">${signo}${m.Cantidad}</b></td>
            <td>${m.Nombre} ${m.Apellido}</td>
          </tr>
        `;
      });
    }
  }

  // --- LÓGICA DE PERSONAL ---
  async loadPersonal() {
    this.personal = await apiService.getPersonal();
    this.renderPersonal();
    this.updateDashboard(); 
    this.populateEmployeeDatalist(); 
  }

  renderPersonal(filterText = '') {
    const tbody = document.querySelector('#tablePersonal tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let filtered = this.personal;
    if (filterText) {
      const text = filterText.toLowerCase();
      filtered = filtered.filter(p => {
        const dni = String(p['ID Empleado'] || p.ID_Empleado || '').toLowerCase();
        const nombre = String(p.Nombre || '').toLowerCase();
        const cliente = String(p.Cliente || '').toLowerCase();
        return dni.includes(text) || nombre.includes(text) || cliente.includes(text);
      });
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontró personal.</td></tr>';
      return;
    }

    filtered.forEach(p => {
      const adminActions = this.currentUser.role === 'ADMIN' ? `
        <td class="admin-col" style="display: flex; gap: 5px;">
          <button class="btn-restore" onclick="app.openEditPersonal('${p['ID Empleado'] || p.ID_Empleado}')" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
        </td>
      ` : '';

      tbody.innerHTML += `
        <tr>
          <td><b>${p['ID Empleado'] || p.ID_Empleado}</b></td>
          <td>${p.Nombre}</td>
          <td>${p['Posición'] || p.Posicion || '-'}</td>
          <td>${p.Cliente || '-'}</td>
          <td>${p.Turno || '-'}</td>
          <td style="color:var(--neon-green); font-weight:bold;">${p.Estado || 'ACTIVO'}</td>
          ${adminActions}
        </tr>
      `;
    });
  }

  openCreatePersonal() {
    this.editingPersonal = null;
    document.getElementById('modalPersonalTitle').innerText = "Registrar Nuevo Ingreso";
    document.getElementById('persId').disabled = false;
    document.getElementById('persId').value = '';
    document.getElementById('persName').value = '';
    document.getElementById('persDate').value = '';
    document.getElementById('persPosition').value = '';
    document.getElementById('persClient').value = '';
    document.getElementById('persShift').value = 'DÍA';
    
    const modal = document.getElementById('modalPersonal');
    modal.classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  openEditPersonal(id) {
    const p = this.personal.find(item => String(item['ID Empleado'] || item.ID_Empleado) === String(id));
    if (!p) return;

    this.editingPersonal = id;
    document.getElementById('modalPersonalTitle').innerText = "Editar Personal";
    document.getElementById('persId').value = p['ID Empleado'] || p.ID_Empleado;
    document.getElementById('persId').disabled = true;
    document.getElementById('persName').value = p.Nombre;
    
    const dateStr = p['Fecha Nacimiento'] || p.Fecha_Nacimiento;
    if (dateStr) {
      try { 
        document.getElementById('persDate').value = new Date(dateStr).toISOString().split('T')[0]; 
      } catch(e) { 
        document.getElementById('persDate').value = ''; 
      }
    } else {
      document.getElementById('persDate').value = '';
    }
    
    document.getElementById('persPosition').value = p['Posición'] || p.Posicion || '';
    document.getElementById('persClient').value = p.Cliente || '';
    document.getElementById('persShift').value = p.Turno || 'DÍA';
    
    const modal = document.getElementById('modalPersonal');
    modal.classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  async savePersonal() {
    const personalData = {
      id_empleado: document.getElementById('persId').value.trim(),
      nombre: document.getElementById('persName').value.trim().toUpperCase(),
      fecha_nac: document.getElementById('persDate').value,
      posicion: document.getElementById('persPosition').value.trim().toUpperCase(),
      cliente: document.getElementById('persClient').value.trim().toUpperCase(),
      turno: document.getElementById('persShift').value,
      estado: 'ACTIVO'
    };

    if (!personalData.id_empleado || !personalData.nombre) {
      return alert("El DNI y el Nombre son obligatorios.");
    }

    const btn = document.getElementById('btnSavePersonal');
    btn.disabled = true;
    
    let success = false;
    if (this.editingPersonal) {
      success = await apiService.updatePersonal(personalData);
    } else {
      success = await apiService.createPersonal(personalData);
    }

    if (success) {
      alert(this.editingPersonal ? "✅ Personal actualizado." : "✅ Ingreso registrado.");
      document.getElementById('modalPersonal').classList.add('hidden');
      await this.loadPersonal(); 
    } else {
      alert("❌ Error al guardar.");
    }
    btn.disabled = false;
  }

  // --- LÓGICA DE INVENTARIO ---
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
          <button class="btn-restore" onclick="app.openEditModal('${item.ID_SKU}')" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-delete" onclick="app.deleteSku('${item.ID_SKU}')" title="Eliminar prenda">
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
          <td><b style="color:var(--danger);">-${m.Cantidad}</b></td>
          <td>${m.DNI}</td>
          <td>${m.Nombre} ${m.Apellido}</td>
          <td>${m.Admin}</td>
          <td>
            <button class="btn-delete" onclick="app.deleteMove('${m.ID_Movimiento}')" title="Anular entrega">
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
          <td style="font-size:0.8rem; font-weight:bold; color:var(--danger);">MOV: ${m.ID_Movimiento}</td>
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
        <tr style="background:rgba(255, 0, 60, 0.05);">
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
      const badgeColor = isBlocked ? 'var(--danger)' : 'var(--neon-green)';
      const btnText = isBlocked ? 'Desbloquear' : 'Bloquear';
      const btnClass = isBlocked ? 'btn-restore' : 'btn-delete'; 

      tbody.innerHTML += `
        <tr>
          <td><b>${u.Email}</b></td>
          <td>${u.Nombre}</td>
          <td><span style="background:var(--bg-hover); border:1px solid var(--border-color); padding:4px 10px; border-radius:20px; font-size:0.75rem;">${u.Rol}</span></td>
          <td style="color:${badgeColor}; font-weight:bold;">${u.Estado || 'ACTIVO'}</td>
          <td>
            <button class="${btnClass}" onclick="app.toggleUser('${u.Email}', '${isBlocked ? 'ACTIVO' : 'BLOQUEADO'}')">
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
    document.getElementById('btnTabDashboard').addEventListener('click', () => this.switchTab('panelDashboard', 'btnTabDashboard'));
    document.getElementById('btnTabInv').addEventListener('click', () => this.switchTab('panelInv', 'btnTabInv'));
    document.getElementById('btnTabMoves').addEventListener('click', () => this.switchTab('panelMoves', 'btnTabMoves'));
    document.getElementById('btnTabTrash').addEventListener('click', () => this.switchTab('panelTrash', 'btnTabTrash'));
    
    const btnTabUsers = document.getElementById('btnTabUsers');
    if(btnTabUsers) {
      btnTabUsers.addEventListener('click', () => {
        this.switchTab('panelUsers', 'btnTabUsers');
        this.loadUsers();
      });
    }

    const btnTabPersonal = document.getElementById('btnTabPersonal');
    if(btnTabPersonal) {
      btnTabPersonal.addEventListener('click', () => this.switchTab('panelPersonal', 'btnTabPersonal'));
    }

    document.getElementById('searchInput').addEventListener('input', (e) => this.renderInventory(e.target.value));
    
    const searchPersonal = document.getElementById('searchPersonal');
    if(searchPersonal) {
      searchPersonal.addEventListener('input', (e) => this.renderPersonal(e.target.value));
    }

    this.setupCascadeLogic();

    document.getElementById('btnSaveMove').addEventListener('click', () => this.saveMove());

    document.getElementById('btnNewSku').addEventListener('click', () => this.openCreateModal());
    document.getElementById('btnCancelSku').addEventListener('click', () => document.getElementById('modalSku').classList.add('hidden'));
    document.getElementById('btnSaveSku').addEventListener('click', () => this.saveSku());

    const btnNewPersonal = document.getElementById('btnNewPersonal');
    if(btnNewPersonal) btnNewPersonal.addEventListener('click', () => this.openCreatePersonal());
    
    const btnCancelPersonal = document.getElementById('btnCancelPersonal');
    if(btnCancelPersonal) btnCancelPersonal.addEventListener('click', () => document.getElementById('modalPersonal').classList.add('hidden'));
    
    const btnSavePersonal = document.getElementById('btnSavePersonal');
    if(btnSavePersonal) btnSavePersonal.addEventListener('click', () => this.savePersonal());

    document.getElementById('btnDownloadTemplate').addEventListener('click', () => this.downloadTemplate());
    document.getElementById('btnUploadExcel').addEventListener('click', () => document.getElementById('excelFileInput').click());
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
    document.getElementById('modalSku').classList.remove('hidden');
    window.scrollTo(0, 0);
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
    document.getElementById('modalSku').classList.remove('hidden');
    window.scrollTo(0, 0);
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
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
    
    let success = false;
    if (this.editingSku) {
      item.id_sku = this.editingSku;
      success = await apiService.updateInventory(item);
    } else {
      success = await apiService.createInventory(item);
    }
    
    if (success) {
      alert(this.editingSku ? "✅ Prenda actualizada." : "✅ Prenda registrada.");
      document.getElementById('modalSku').classList.add('hidden');
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
    const dni = document.getElementById('moveDni').value;
    const nombreCompleto = document.getElementById('moveName').value;
    const sku = document.getElementById('moveSku').value;
    const cantidad = parseInt(document.getElementById('moveQty').value);

    if (!dni || !nombreCompleto) return alert("Debe seleccionar un empleado.");
    if (!sku) return alert("Debe seleccionar la ubicación de la prenda.");
    if (cantidad < 1) return alert("La cantidad debe ser mayor a 0.");

    const nameParts = nombreCompleto.split(' ');
    const nombre = nameParts[0];
    const apellido = nameParts.slice(1).join(' ');

    const moveData = {
      tipo: 'ENTREGA',
      id_sku: sku, 
      cantidad,
      dni: dni,
      nombre: nombre,
      apellido: apellido,
      admin: this.currentUser.name
    };
    
    const btn = document.getElementById('btnSaveMove');
    btn.disabled = true; 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
    
    const success = await apiService.registerMove(moveData);
    
    if (success) {
      alert("✅ Entrega registrada y stock descontado.");
      
      document.getElementById('searchDni').value = '';
      document.getElementById('moveDni').value = '';
      document.getElementById('moveName').value = '';
      document.getElementById('searchDni').style.borderColor = 'var(--border-color)';
      
      document.getElementById('selectTipoPrenda').value = '';
      document.getElementById('selectUbicacion').innerHTML = '<option value="">Primero seleccione una prenda...</option>';
      document.getElementById('selectUbicacion').disabled = true;
      document.getElementById('moveSku').value = '';
      
      document.getElementById('moveQty').value = '1';
      
      setTimeout(async () => { 
        await this.loadData(); 
        btn.disabled = false; 
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Registrar Entrega y Descontar'; 
      }, 1500);
    } else {
      alert("❌ Error al registrar.");
      btn.disabled = false; 
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Registrar Entrega y Descontar';
    }
  }

  async deleteMove(id) {
    if (!confirm("¿Anular esta entrega? El stock regresará al inventario.")) return;
    const success = await apiService.toggleMoveStatus(id, 'ANULADO');
    if (success) setTimeout(async () => await this.loadData(), 1500);
  }

  async restoreMove(id) {
    if (!confirm("¿Restaurar esta entrega? El stock se volverá a descontar.")) return;
    const success = await apiService.toggleMoveStatus(id, 'ACTIVO');
    if (success) setTimeout(async () => await this.loadData(), 1500);
  }

  downloadTemplate() {
    const data = [
      ["Tipo", "Talla", "Color", "Ubicacion", "Stock"]
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