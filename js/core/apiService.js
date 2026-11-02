class APIService {
  async getBaseUrl() {
    return await APP_CONFIG.getApiUrl();
  }

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
    } catch (err) { 
      console.warn("Error getInventory:", err);
      return []; 
    }
  }

  async getDeliveryHistory() {
    const url = await this.getBaseUrl();
    if (!url) return [];
    try {
      const res = await fetch(`${url}?action=getHistory`);
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (err) { 
      console.warn("Error getHistory:", err);
      return []; 
    }
  }

  async registerDelivery(deliveryData) {
    const url = await this.getBaseUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "registerDelivery", delivery: deliveryData })
      });
      return true; 
    } catch (err) { 
      console.warn("Error registerDelivery:", err); 
      return false; 
    }
  }
}

const apiService = new APIService();