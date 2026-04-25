/* nav.js – shared navigation state (login/logout button, greeting) */
window.BombayLane = window.BombayLane || {};

(function () {
  const token = localStorage.getItem('bl_token');
  const user  = JSON.parse(localStorage.getItem('bl_user') || 'null');

  const navAuth = document.getElementById('nav-auth');
  if (!navAuth) return;

  if (token && user) {
    navAuth.innerHTML = `
      <span id="user-greeting" style="font-size:.82rem;color:var(--muted);margin-right:.25rem">Hi, ${BombayLane.escapeHtml(user.name?.split(' ')[0] || '')}</span>
      <a href="/pages/profile.html" class="btn btn-secondary btn-sm">Profile</a>
      ${user.role === 'admin' ? '<a href="/admin/index.html" class="btn btn-secondary btn-sm">Admin</a>' : ''}
      <button class="btn btn-ghost btn-sm" onclick="BombayLane.logout()">Logout</button>
    `;
  } else {
    navAuth.innerHTML = `<a href="/pages/auth.html" class="btn btn-ghost btn-sm">Login</a>`;
  }

  BombayLane.logout = () => {
    localStorage.removeItem('bl_token');
    localStorage.removeItem('bl_user');
    BombayLane.notify('Logged out');
    setTimeout(() => { location.href = '/index.html'; }, 500);
  };
})();
