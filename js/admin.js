window.BombayLane = window.BombayLane || {};

BombayLane.admin = {
  async renderStats() {
    const root = document.getElementById('admin-stats');
    if (!root) return;

    root.innerHTML = '<div class="spinner" aria-label="Loading"></div>';

    try {
      const [restaurantsRes, ordersRes] = await Promise.all([
        BombayLane.api.request('/api/restaurants'),
        BombayLane.api.request('/api/orders')
      ]);

      const orders = ordersRes.orders || [];
      const delivered = orders.filter((order) => order.status === 'delivered');
      const revenue = delivered.reduce((sum, order) => sum + order.total, 0);

      root.innerHTML = `
        <article class="card"><h3>Restaurants</h3><p>${(restaurantsRes.restaurants || []).length}</p></article>
        <article class="card"><h3>Total Orders</h3><p>${orders.length}</p></article>
        <article class="card"><h3>Revenue</h3><p>₹${revenue.toFixed(2)}</p></article>
      `;
    } catch (error) {
      root.innerHTML = `<article class="card">${error.message}</article>`;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => BombayLane.admin.renderStats());
