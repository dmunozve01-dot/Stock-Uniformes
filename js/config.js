const APP_CONFIG = {
  // ⚠️ AQUÍ PEGA LA URL QUE TE DA GOOGLE APPS SCRIPT AL IMPLEMENTAR (Termina en /exec)
  DIRECT_API_URL: "https://script.google.com/macros/s/AKfycbyuSkv4Nb5ewFYEV5MBkdQx7Qj5-PF41XRl08RT-cLAX4nswFDiwIXHU5RAXachfT2z/exec",

  async getApiUrl() {
    if (this.DIRECT_API_URL && this.DIRECT_API_URL.includes("http") && !this.DIRECT_API_URL.includes("TU_URL_AQUI")) {
      return this.DIRECT_API_URL;
    }
    console.warn("⚠️ No se ha configurado la URL del API en config.js");
    return null;
  }
};