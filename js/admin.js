window.BombayLane = window.BombayLane || {};

// Check admin auth on every admin page
(function checkAdminAuth() {
  const token = localStorage.getItem('bl_token');
  if (!token) {
    window.location.href = '/pages/auth.html?next=' + encodeURIComponent(location.pathname);
    return;
  }
  try {
    const user = JSON.parse(localStorage.getItem('bl_user') || '{}');
    if (user.role !== 'admin') {
      document.body.innerHTML = '<div style="padding:2rem;text-align:center"><h1>Access Denied</h1><p>Admin access required.</p><a href="/">Home</a></div>';
    }
  } catch {}
}());

const STATUS_LABELS = {
  placed: 'Placed', confirmed: 'Confirmed', preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled'
};

BombayLane.admin = {
  async renderStats() {
    const root = document.getElementById('admin-stats');
    if (!root) return;

    root.innerHTML = '<div class="spinner" aria-label="Loading"></div>';

    try {
      const [restaurantsRes, ordersRes, usersRes] = await Promise.all([
        BombayLane.api.request('/api/restaurants'),
        BombayLane.api.request('/api/orders'),
        BombayLane.api.request('/api/admin/users').catch(() => ({ users: [] }))
      ]);

      const orders = ordersRes.orders || [];
      const delivered = orders.filter((order) => order.status === 'delivered');
      const revenue = delivered.reduce((sum, order) => sum + order.total, 0);
      const pending = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));

      root.innerHTML = `
        <article class="card stat-card">
          <h3>Restaurants</h3>
          <p class="stat-number">${(restaurantsRes.restaurants || []).length}</p>
          <a href="/admin/restaurants.html" class="muted stat-link">Manage →</a>
        </article>
        <article class="card stat-card">
          <h3>Total Orders</h3>
          <p class="stat-number">${orders.length}</p>
          <span class="muted">${pending.length} active</span>
        </article>
        <article class="card stat-card">
          <h3>Revenue</h3>
          <p class="stat-number">₹${revenue.toFixed(0)}</p>
          <span class="muted">from ${delivered.length} deliveries</span>
        </article>
        <article class="card stat-card">
          <h3>Users</h3>
          <p class="stat-number">${(usersRes.users || []).length}</p>
          <a href="/admin/users.html" class="muted stat-link">Manage →</a>
        </article>
      `;
    } catch (error) {
      root.innerHTML = `<article class="card">${BombayLane.escapeHtml(error.message)}</article>`;
    }
  },

  async renderOrders() {
    const root = document.getElementById('admin-orders');
    if (!root) return;

    root.innerHTML = '<div class="spinner" aria-label="Loading"></div>';

    try {
      const result = await BombayLane.api.request('/api/orders');
      const orders = (result.orders || []);

      if (!orders.length) {
        root.innerHTML = '<p class="card muted" style="text-align:center;padding:2rem">No orders yet.</p>';
        return;
      }

      root.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order ID</th><th>Customer</th><th>Restaurant</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map((o) => `
              <tr>
                <td class="muted">#${BombayLane.escapeHtml(o._id.slice(-6).toUpperCase())}</td>
                <td>${BombayLane.escapeHtml(o.customer || '-')}</td>
                <td>${BombayLane.escapeHtml(o.restaurant?.name || o.restaurant || '-')}</td>
                <td class="muted">${(o.items || []).length} item(s)</td>
                <td>₹${Number(o.total || 0).toFixed(2)}</td>
                <td><span class="badge badge-${BombayLane.escapeAttr(o.status)}">${BombayLane.escapeHtml(STATUS_LABELS[o.status] || o.status)}</span></td>
                <td class="muted">${new Date(o.createdAt).toLocaleDateString()}</td>
                <td>
                  <select onchange="BombayLane.admin.updateOrderStatus('${BombayLane.escapeAttr(o._id)}', this.value, this)">
                    ${['placed','confirmed','preparing','out_for_delivery','delivered','cancelled'].map((s) =>
                      `<option value="${s}" ${o.status === s ? 'selected' : ''}>${STATUS_LABELS[s] || s}</option>`
                    ).join('')}
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } catch (error) {
      root.innerHTML = `<p class="card muted">${BombayLane.escapeHtml(error.message)}</p>`;
    }
  },

  async updateOrderStatus(orderId, status, selectEl) {
    try {
      await BombayLane.api.request(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      BombayLane.notify(`Order status updated to ${STATUS_LABELS[status] || status}`);
    } catch (err) {
      BombayLane.notify(err.message);
      if (selectEl) selectEl.value = selectEl.dataset.previous;
    }
  },

  async renderRestaurants() {
    const root = document.getElementById('admin-restaurants');
    if (!root) return;

    root.innerHTML = '<div class="spinner" aria-label="Loading"></div>';

    try {
      const result = await BombayLane.api.request('/api/restaurants');
      const restaurants = result.restaurants || [];

      if (!restaurants.length) {
        root.innerHTML = '<p class="card muted" style="text-align:center;padding:2rem">No restaurants yet.</p>';
        return;
      }

      root.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr><th>Name</th><th>City</th><th>Cuisine</th><th>Rating</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${restaurants.map((r) => `
              <tr>
                <td><a href="/pages/restaurant-detail.html?id=${encodeURIComponent(r._id)}">${BombayLane.escapeHtml(r.name)}</a></td>
                <td>${BombayLane.escapeHtml(r.location?.city || '-')}</td>
                <td class="muted">${(r.cuisine || []).join(', ')}</td>
                <td class="rating">★ ${Number(r.averageRating || 0).toFixed(1)}</td>
                <td><span class="badge ${r.isOpen ? 'status-open' : 'status-closed'}">${r.isOpen ? 'Open' : 'Closed'}</span></td>
                <td>
                  <button class="btn btn-secondary" onclick="BombayLane.admin.toggleRestaurant('${BombayLane.escapeAttr(r._id)}', ${!r.isOpen})">
                    ${r.isOpen ? 'Close' : 'Open'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } catch (error) {
      root.innerHTML = `<p class="card muted">${BombayLane.escapeHtml(error.message)}</p>`;
    }
  },

  async toggleRestaurant(id, isOpen) {
    try {
      await BombayLane.api.request(`/api/restaurants/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isOpen })
      });
      BombayLane.notify(`Restaurant ${isOpen ? 'opened' : 'closed'}`);
      this.renderRestaurants();
    } catch (err) {
      BombayLane.notify(err.message);
    }
  },

  async renderUsers() {
    const root = document.getElementById('admin-users');
    if (!root) return;

    root.innerHTML = '<div class="spinner" aria-label="Loading"></div>';

    try {
      const result = await BombayLane.api.request('/api/admin/users');
      const users = result.users || [];

      if (!users.length) {
        root.innerHTML = '<p class="card muted" style="text-align:center;padding:2rem">No users found.</p>';
        return;
      }

      root.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Since</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${users.map((u) => `
              <tr>
                <td>${BombayLane.escapeHtml(u.name)}</td>
                <td class="muted">${BombayLane.escapeHtml(u.email)}</td>
                <td><span class="badge">${BombayLane.escapeHtml(u.role)}</span></td>
                <td class="muted">${BombayLane.escapeHtml(u.phone || '-')}</td>
                <td class="muted">${new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-secondary" style="background:#dc2626"
                    onclick="BombayLane.admin.deleteUser('${BombayLane.escapeAttr(u._id)}')">
                    Delete
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } catch (error) {
      root.innerHTML = `<p class="card muted">${BombayLane.escapeHtml(error.message)}</p>`;
    }
  },

  async deleteUser(id) {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await BombayLane.api.request(`/api/admin/users/${id}`, { method: 'DELETE' });
      BombayLane.notify('User deleted');
      this.renderUsers();
    } catch (err) {
      BombayLane.notify(err.message);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  BombayLane.admin.renderStats?.();
  BombayLane.admin.renderOrders?.();
  BombayLane.admin.renderRestaurants?.();
  BombayLane.admin.renderUsers?.();
});
