// Variables globales para Google
window.handleCredentialResponse = function(response) {
  const payload = parseJwt(response.credential);
  saveUserSession({ name: payload.name, email: payload.email, picture: payload.picture });
};

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
      window.location.replace('index.html'); 
    });
  }

  // Mostrar Admin si aplica
  if (user.role === 'ADMIN') {
    const btnAdmin = document.getElementById('btnAdmin');
    if (btnAdmin) btnAdmin.classList.remove('hidden');
  }
}

async function saveUserSession(userData) {
  const remember = document.getElementById('rememberMe')?.checked || false;
  
  if (typeof apiService !== 'undefined') {
    const res = await apiService.getUserRole(userData.email);
    userData.role = res.role;
    if (res.name && res.name !== 'Usuario Desconocido') {
      userData.name = res.name;
    }
    apiService.syncUser(userData); 
  }

  if (remember) localStorage.setItem('sw_user', JSON.stringify(userData));
  else sessionStorage.setItem('sw_user', JSON.stringify(userData));

  window.location.replace('app.html');
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
  } catch (e) { return {}; }
}

// Botón Demo
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