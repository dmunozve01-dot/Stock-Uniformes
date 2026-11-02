class APIService {
  async getBaseUrl() { return await APP_CONFIG.getApiUrl(); }

  async getUserRole(email) { 
    const url = await this.getBaseUrl();
    if (!url) return { role: "USER", name: "Invitado" };
    try {
      const res = await fetch(`${url}?action=getUserRole&email=${encodeURIComponent(email)}`);
      const json = await res.json();
      return json.success ? { role: json.role, name: json.name } : { role: "USER", name: "Invitado" };
    } catch (err) { return { role: "USER", name: "Invitado" }; }
  }

  async syncUser(userData) {
    const url = await this.getBaseUrl();
    if (!url) return;
    try {
      await fetch(url, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveUser", user: userData })
      });
    } catch (err) { console.warn("Error syncUser:", err); }
  }

  async getInventory() {
    const url = await this.getBaseUrl();
    if (!url) return [];
    try {
      const res = await fetch(`${url}?action=getInventory`);
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (err) { return []; }
  }

  async getMoves() {
    const url = await this.getBaseUrl();
    if (!url) return [];
    try {
      const res = await fetch(`${url}?action=getMoves`);
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (err) { return []; }
  }

  async registerMove(moveData) {
    const url = await this.getBaseUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "registerMove", move: moveData })
      });
      return true; 
    } catch (err) { return false; }
  }

  async toggleMoveStatus(idMovimiento, nuevoEstado) {
    const url = await this.getBaseUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleMoveStatus", id_movimiento: idMovimiento, nuevo_estado: nuevoEstado })
      });
      return true; 
    } catch (err) { return false; }
  }

  async createInventory(itemData) {
    const url = await this.getBaseUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createInventory", item: itemData })
      });
      return true; 
    } catch (err) { return false; }
  }

  async bulkCreateInventory(itemsArray) {
    const url = await this.getBaseUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulkCreateInventory", items: itemsArray })
      });
      return true; 
    } catch (err) { return false; }
  }
}
const apiService = new APIService();