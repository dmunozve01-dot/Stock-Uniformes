window.handleCredentialResponse = function(response) {
  const payload = parseJwt(response.credential);
  saveUserSession({ name: payload.name, email: payload.email, picture: payload.picture });
};

async function saveUserSession(userData) {
  const remember = document.getElementById('rememberMe')?.checked || false;
  
  if (typeof apiService !== 'undefined') {
    try {
      const res = await apiService.getUserRole(userData.email);
      
      // VALIDACIONES DE SEGURIDAD
      if (res.error === "TU_CUENTA_ESTA_BLOQUEADA") {
        alert("🚫 Tu cuenta está BLOQUEADA por un administrador. Contacta a soporte.");
        if (typeof google !== 'undefined' && google.accounts) google.accounts.id.disableAutoSelect();
        return; 
      }
      
      if (res.error === "NO_AUTORIZADO") {
        alert("⛔ Acceso Denegado.\n\nTu correo (" + userData.email + ") no está registrado en el sistema de Grupo ANC. Solicita acceso al administrador.");
        if (typeof google !== 'undefined' && google.accounts) google.accounts.id.disableAutoSelect();
        return; 
      }

      // Si pasó las pruebas, guardamos sus datos
      userData.role = res.role || 'USER';
      if (res.name && res.name !== 'Desconocido') userData.name = res.name;
      
    } catch (err) {
      alert("Error de conexión con el servidor.");
      return;
    }
  } else {
    alert("Error interno del sistema.");
    return;
  }

  if (remember) localStorage.setItem('sw_user', JSON.stringify(userData));
  else sessionStorage.setItem('sw_user', JSON.stringify(userData));

  window.location.replace('app.html');
}

function checkSessionAndLoadUI() {
  const user = JSON.parse(sessionStorage.getItem('sw_user')) || JSON.parse(localStorage.getItem('sw_user'));
  if (!user) { window.location.replace('index.html'); return; }

  const nameEl = document.getElementById('userName');
  const emailEl = document.getElementById('userEmail');
  const avatarEl = document.getElementById('userAvatar');

  if (nameEl) nameEl.innerText = user.name || 'Usuario';
  if (emailEl) emailEl.innerText = user.email || '';
  if (avatarEl && user.picture) avatarEl.src = user.picture;

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('sw_user');
      localStorage.removeItem('sw_user');
      if (typeof google !== 'undefined' && google.accounts) google.accounts.id.disableAutoSelect();
      window.location.replace('index.html'); 
    });
  }

  if (user.role === 'ADMIN') {
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.admin-col').forEach(el => el.classList.remove('hidden'));
  }
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
  } catch (e) { return {}; }
}