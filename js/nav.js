window.BombayLane = window.BombayLane || {};

BombayLane.nav = {
  init() {
    this.renderAuthState();
    BombayLane.cart?.updateCount?.();

    // Highlight active nav link
    const path = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach((a) => {
      if (a.getAttribute('href') && path.includes(a.getAttribute('href').replace('/index.html', '/'))) {
        a.classList.add('active');
      }
    });
  },

  renderAuthState() {
    const user = this.getUser();
    const authArea = document.getElementById('nav-auth-area');
    if (!authArea) return;

    if (user) {
      const initials = BombayLane.escapeHtml((user.name || 'U').charAt(0).toUpperCase());
      const firstName = BombayLane.escapeHtml((user.name || '').split(' ')[0]);
      authArea.innerHTML = `
        <span class="nav-user">
          <span style="width:30px;height:30px;border-radius:50%;background:var(--brand);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;">${initials}</span>
          ${firstName}
        </span>
        <button class="btn btn-secondary btn-sm" id="nav-logout-btn">Logout</button>`;
      document.getElementById('nav-logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('bl_token');
        localStorage.removeItem('bl_user');
        BombayLane.notify('Logged out');
        setTimeout(() => { window.location.href = '/index.html'; }, 600);
      });
    } else {
      authArea.innerHTML = `<a class="btn btn-outline btn-sm" href="/pages/auth.html">Login / Register</a>`;
    }
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('bl_user'));
    } catch {
      return null;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => BombayLane.nav.init());
