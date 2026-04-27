window.BombayLane = window.BombayLane || {};

BombayLane.profile = {
  async init() {
    const user = this.getUser();
    if (!user) {
      window.location.href = '/pages/auth.html';
      return;
    }

    // Avatar
    const avatarEl = document.getElementById('profile-avatar');
    if (avatarEl) {
      avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
    }

    // User info
    const nameDisplay = document.getElementById('user-name-display');
    const emailDisplay = document.getElementById('user-email-display');
    const roleBadge = document.getElementById('user-role-badge');
    if (nameDisplay) nameDisplay.textContent = user.name || '';
    if (emailDisplay) emailDisplay.textContent = user.email || '';
    if (roleBadge) {
      roleBadge.textContent = (user.role || 'customer').replace('_', ' ');
      roleBadge.className = `badge badge-${user.role || 'customer'}`;
    }

    // Pre-fill form
    const nameInput = document.getElementById('profile-name');
    const phoneInput = document.getElementById('profile-phone');
    const addressInput = document.getElementById('profile-address');
    if (nameInput) nameInput.value = user.name || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (addressInput) addressInput.value = user.address || '';

    // Save button
    document.getElementById('save-profile-btn')?.addEventListener('click', () => this.saveProfile());

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      localStorage.removeItem('bl_token');
      localStorage.removeItem('bl_user');
      BombayLane.notify('Logged out');
      setTimeout(() => { window.location.href = '/index.html'; }, 600);
    });

    // Load recent orders
    this.loadRecentOrders();
  },

  async saveProfile() {
    const btn = document.getElementById('save-profile-btn');
    const payload = {
      name: document.getElementById('profile-name')?.value?.trim(),
      phone: document.getElementById('profile-phone')?.value?.trim(),
      address: document.getElementById('profile-address')?.value?.trim()
    };

    if (!payload.name) {
      BombayLane.notify('Name is required');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    try {
      const result = await BombayLane.api.request('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const currentUser = this.getUser() || {};
      localStorage.setItem('bl_user', JSON.stringify({ ...currentUser, ...result.user }));
      BombayLane.notify('Profile updated ✅');
      document.getElementById('user-name-display').textContent = result.user.name || '';
    } catch (error) {
      BombayLane.notify(error.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Save Profile'; }
    }
  },

  async loadRecentOrders() {
    const container = document.getElementById('recent-orders');
    if (!container) return;
    container.innerHTML = '<div class="spinner"></div>';

    try {
      const result = await BombayLane.api.request('/api/orders');
      const orders = (result.orders || []).slice(0, 5);
      const statusLabels = { placed: 'Placed', confirmed: 'Confirmed', preparing: 'Preparing', out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled' };

      container.innerHTML = orders.length
        ? `<table class="data-table">
            <thead><tr><th>Order #</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${orders.map((o) => `
                <tr>
                  <td>#${BombayLane.escapeHtml(o._id.slice(-6).toUpperCase())}</td>
                  <td>${new Date(o.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</td>
                  <td>₹${Number(o.total || 0).toFixed(2)}</td>
                  <td><span class="badge badge-${o.status}">${BombayLane.escapeHtml(statusLabels[o.status] || o.status)}</span></td>
                  <td><a class="btn btn-sm btn-outline" href="/pages/order-track.html?id=${BombayLane.escapeAttr(o._id)}">Track</a></td>
                </tr>`).join('')}
            </tbody>
           </table>`
        : '<p class="muted" style="text-align:center;padding:1rem">No orders yet.</p>';
    } catch {
      container.innerHTML = '<p class="muted">Could not load orders.</p>';
    }
  },

  getUser() {
    try { return JSON.parse(localStorage.getItem('bl_user')); } catch { return null; }
  }
};

document.addEventListener('DOMContentLoaded', () => BombayLane.profile.init());
