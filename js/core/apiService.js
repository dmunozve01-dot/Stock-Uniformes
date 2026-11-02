class APIService {
  // Obtener la URL base del config
  async getBaseUrl() {
    return await APP_CONFIG.getApiUrl();
  }

  // ==========================================
  // AUTENTICACIÓN Y USUARIOS
  // ==========================================
  async getUserRole(email) { 
    const url = await this.getBaseUrl();
    if (!url) return { role: "USER", name: "Invitado" };
    try {
      const res = await fetch(`${url}?action=getUserRole&email=${encodeURIComponent(email)}`);
      const json = await res.json();
      return json.success ? { role: json.role, name: json.name } : { role: "USER", name: "Invitado" };
    } catch (err) { 
      console.warn("Error getUserRole:", err);
      return { role: "USER", name: "Invitado" }; 
    }
  }

  async syncUser(userData) {
    const url = await this.getBaseUrl();
    if (!url) return;
    try {
      await fetch(url, {
        method: "POST", 
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveUser", user: userData })
      });
    } catch (err) { console.warn("Error syncUser:", err); }
  }

  // ==========================================
  // INVENTARIO
  // ==========================================
  async getInventory() {
    const url = await this.getBaseUrl();
    if (!url) return [];
    try {
      const res = await fetch(`${url}?action=getInventory`);
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (err) { 
      console.warn("Error getInventory:", err);
      return []; 
    }
  }

  async createInventory(itemData) {
    const url = await this.getBaseUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: "POST", 
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createInventory", item: itemData })
      });
      return true; 
    } catch (err) { 
      console.warn("Error createInventory:", err);
      return false; 
    }
  }

  async updateInventory(itemData) {
    const url = await this.getBaseUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: "POST", 
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateInventory", item: itemData })
      });
      return true; 
    } catch (err) { 
      console.warn("Error updateInventory:", err);
      return false; 
    }
  }

  async bulkCreateInventory(itemsArray) {
    const url = await this.getBaseUrl();
    if (!url) return { success: false };
    try {
      await fetch(url, {
        method: "POST", 
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulkCreateInventory", items: itemsArray })
      });
      // Retornamos success: true porque no-cors no permite leer la respuesta del servidor
      return { success: true, msg: "Lote procesado. Revisa la tabla para ver los cambios." }; 
    } catch (err) { 
      console.warn("Error bulkCreateInventory:", err);
      return { success: false }; 
    }
  }

  // ==========================================
  // MOVIMIENTOS (ENTREGAS)
  // ==========================================
  async getMoves() {
    const url = await this.getBaseUrl();
    if (!url) return [];
    try {
      const res = await fetch(`${url}?action=getMoves`);
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (err) { 
      console.warn("Error getMoves:", err);
      return []; 
    }
  }

  async registerMove(moveData) {
    const url = await this.getBaseUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: "POST", 
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "registerMove", move: moveData })
      });
      return true; 
    } catch (err) { 
      console.warn("Error registerMove:", err);
      return false; 
    }
  }

  async toggleMoveStatus(idMovimiento, nuevoEstado) {
    const url = await this.getBaseUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: "POST", 
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleMoveStatus", id_movimiento: idMovimiento, nuevo_estado: nuevoEstado })
      });
      return true; 
    } catch (err) { 
      console.warn("Error toggleMoveStatus:", err);
      return false; 
    }
  }
}

// Instancia global para usar en toda la app
const apiService = new APIService();