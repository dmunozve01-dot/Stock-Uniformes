class StoreRepository {
  constructor() {
    this.memoryData = [];
  }
  async loadFromCloud() {
    if (typeof apiService !== 'undefined') {
      const cloudSlots = await apiService.getSlots();
      if (cloudSlots) this.memoryData = cloudSlots;
    }
    return this.memoryData;
  }
  getAll() { return this.memoryData; }
  saveOrUpdate(slot) {
    const idx = this.memoryData.findIndex(i => i.code === slot.code);
    if (idx !== -1) this.memoryData[idx] = slot;
    else this.memoryData.push(slot);
    if (typeof apiService !== 'undefined') apiService.saveSlot(slot);
    return this.memoryData;
  }
}