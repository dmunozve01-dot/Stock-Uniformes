// ==========================================
// FUNCIÓN GLOBAL QUE GOOGLE LLAMARÁ
// ==========================================
window.handleCredentialResponse = function(response) {
  console.log("✅ Login de Google exitoso");
  const payload = parseJwt(response.credential);
  
  const userData = {
    name: payload.name,
    email: payload.email,
    picture: payload.picture
  };
  
  saveUserSession(userData);
};

// ==========================================
// GUARDAR SESIÓN Y SINCRONIZAR CON EL SHEET
// ==========================================
async function saveUserSession(userData) {
  const remember = document.getElementById('rememberMe')?.checked || false;
  
  // Consultar rol al backend
  if (typeof apiService !== 'undefined') {
    try {
      const res = await apiService.getUserRole(userData.email);
      userData.role = res.role;
      if (res.name && res.name !== 'Usuario Desconocido') {
        userData.name = res.name;
      }
      // Sincronizar usuario (si es nuevo, se agrega como USER)
      apiService.syncUser(userData); 
    } catch (err) {
      console.warn("Error consultando rol:", err);
      userData.role = "USER";
    }
  } else {
    userData.role = "USER";
  }

  // Guardar sesión
  if (remember) {
    localStorage.setItem('sw_user', JSON.stringify(userData));
  } else {
    sessionStorage.setItem('sw_user', JSON.stringify(userData));
  }

  window.location.replace('app.html');
}

// ==========================================
// VERIFICAR SESIÓN EN APP.HTML
// ==========================================
function checkSessionAndLoadUI() {
  const user = JSON.parse(sessionStorage.getItem('sw_user')) || JSON.parse(localStorage.getItem('sw_user'));
  if (!user) { window.location.replace('index.html'); return; }

  const nameEl = document.getElementById('userName');
  const emailEl = document.getElementById('userEmail');
  const avatarEl = document.getElementById('userAvatar');

  if (nameEl) nameEl.innerText = user.name || 'Usuario';
  if (emailEl) emailEl.innerText = user.email || '';
  if (avatarEl && user.picture) avatarEl.src = user.picture;

  // Botón Salir
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('sw_user');
      localStorage.removeItem('sw_user');
      
      // Desloguear también de Google
      if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
      }
      
      window.location.replace('index.html'); 
    });
  }

  // Mostrar Admin si aplica
  if (user.role === 'ADMIN') {
    const btnAdmin = document.getElementById('btnAdmin');
    if (btnAdmin) btnAdmin.classList.remove('hidden');
  }
}

// ==========================================
// DECODIFICAR JWT DE GOOGLE
// ==========================================
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(
      decodeURIComponent(
        window.atob(base64).split('').map(c => 
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
      )
    );
  } catch (e) { 
    console.error("Error decodificando JWT:", e);
    return {}; 
  }
}

// ==========================================
// BOTÓN DEMO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const btnDemo = document.getElementById('btnDemoLogin');
  if (btnDemo) {
    btnDemo.addEventListener('click', (e) => {
      e.preventDefault();
      saveUserSession({ 
        name: "Operario Demo", 
        email: "operario@almacen.com", 
        picture: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" 
      });
    });
  }
});