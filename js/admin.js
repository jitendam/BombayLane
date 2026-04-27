window.BombayLane = window.BombayLane || {};

BombayLane.admin = {
  async renderStats() {
    const root = document.getElementById('admin-stats');
    if (!root) return;

    root.innerHTML = '<div class="spinner"></div>';

    try {
      const [restaurantsRes, ordersRes] = await Promise.all([
        BombayLane.api.request('/api/restaurants'),
        BombayLane.api.request('/api/admin/orders')
      ]);

      const orders = ordersRes.orders || [];
      const delivered = orders.filter((o) => o.status === 'delivered');
      const revenue = delivered.reduce((sum, o) => sum + (o.total || 0), 0);

      root.innerHTML = `
        <div class="stat-card fade-in">
          <div class="stat-icon">🍴</div>
          <div class="stat-value">${(restaurantsRes.restaurants || []).length}</div>
          <div class="stat-label">Restaurants</div>
        </div>
        <div class="stat-card fade-in">
          <div class="stat-icon">📦</div>
          <div class="stat-value">${orders.length}</div>
          <div class="stat-label">Total Orders</div>
        </div>
        <div class="stat-card fade-in">
          <div class="stat-icon">💰</div>
          <div class="stat-value">₹${revenue.toFixed(0)}</div>
          <div class="stat-label">Revenue</div>
        </div>`;
    } catch (error) {
      root.innerHTML = `<div class="card"><p>${BombayLane.escapeHtml(error.message)}</p></div>`;
    }
  },

  async loadOrders() {
    const container = document.getElementById('orders-table-body');
    if (!container) return;
    container.innerHTML = '<tr><td colspan="7"><div class="spinner"></div></td></tr>';

    const statusLabels = {
      placed: 'Placed', confirmed: 'Confirmed', preparing: 'Preparing',
      out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled'
    };
    const allStatuses = Object.keys(statusLabels);

    try {
      const result = await BombayLane.api.request('/api/admin/orders');
      const orders = result.orders || [];

      container.innerHTML = orders.length
        ? orders.map((o) => {
          const shortId = BombayLane.escapeHtml(o._id.slice(-6).toUpperCase());
          const restaurant = BombayLane.escapeHtml(o.restaurantName || '—');
          const customer = BombayLane.escapeHtml(o.customerName || '—');
          const date = new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const statusOpts = allStatuses.map((s) =>
            `<option value="${s}"${o.status === s ? ' selected' : ''}>${statusLabels[s]}</option>`
          ).join('');
          return `
            <tr>
              <td><strong>#${shortId}</strong></td>
              <td>${date}</td>
              <td>${restaurant}</td>
              <td>${customer}</td>
              <td>₹${Number(o.total || 0).toFixed(2)}</td>
              <td><span class="badge badge-${o.status}">${BombayLane.escapeHtml(statusLabels[o.status] || o.status)}</span></td>
              <td class="actions">
                <select class="input" style="width:auto;padding:.3rem .5rem;font-size:.82rem" data-order-id="${BombayLane.escapeAttr(o._id)}">
                  ${statusOpts}
                </select>
                <button class="btn btn-sm" data-update-order="${BombayLane.escapeAttr(o._id)}">Update</button>
              </td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="7"><p class="muted" style="text-align:center;padding:1.5rem">No orders yet.</p></td></tr>';

      // Bind update buttons
      container.querySelectorAll('[data-update-order]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const orderId = btn.dataset.updateOrder;
          const select = container.querySelector(`select[data-order-id="${orderId}"]`);
          if (!select) return;
          try {
            await BombayLane.api.request(`/api/orders/${orderId}/status`, {
              method: 'PUT',
              body: JSON.stringify({ status: select.value })
            });
            BombayLane.notify('Status updated ✅');
            this.loadOrders();
          } catch (err) {
            BombayLane.notify(err.message);
          }
        });
      });
    } catch (error) {
      container.innerHTML = `<tr><td colspan="7"><p class="muted">${BombayLane.escapeHtml(error.message)}</p></td></tr>`;
    }
  },

  async loadUsers() {
    const container = document.getElementById('users-table-body');
    if (!container) return;
    container.innerHTML = '<tr><td colspan="5"><div class="spinner"></div></td></tr>';

    try {
      // Derive unique customers from the admin orders endpoint which returns customer info
      const result = await BombayLane.api.request('/api/admin/orders');
      // Extract unique customers
      const seen = new Set();
      const users = [];
      (result.orders || []).forEach((o) => {
        if (o.customerId && !seen.has(o.customerId)) {
          seen.add(o.customerId);
          users.push({ _id: o.customerId, name: o.customerName, email: o.customerEmail, role: 'customer' });
        }
      });

      container.innerHTML = users.length
        ? users.map((u) => `
            <tr>
              <td>${BombayLane.escapeHtml(u.name || '—')}</td>
              <td>${BombayLane.escapeHtml(u.email || '—')}</td>
              <td><span class="badge badge-${u.role}">${BombayLane.escapeHtml(u.role)}</span></td>
              <td>${BombayLane.escapeHtml(u.phone || '—')}</td>
              <td>${BombayLane.escapeHtml(u.address || '—')}</td>
            </tr>`).join('')
        : '<tr><td colspan="5"><p class="muted" style="text-align:center;padding:1.5rem">No users found.</p></td></tr>';
    } catch (error) {
      // Fallback: no admin access
      container.innerHTML = `<tr><td colspan="5"><p class="muted">${BombayLane.escapeHtml(error.message)}</p></td></tr>`;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('admin-stats')) BombayLane.admin.renderStats();
  if (document.getElementById('orders-table-body')) BombayLane.admin.loadOrders();
  if (document.getElementById('users-table-body')) BombayLane.admin.loadUsers();
});
