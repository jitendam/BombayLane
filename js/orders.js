window.BombayLane = window.BombayLane || {};

const ORDER_STATUSES = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
const STATUS_LABELS = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

BombayLane.orders = {
  async placeOrder() {
    const cart = BombayLane.cart.getItems();
    if (!cart.length) {
      BombayLane.notify('Your cart is empty');
      return;
    }

    const restaurantId = BombayLane.cart.getRestaurantId();
    if (!restaurantId) {
      BombayLane.notify('Unable to determine restaurant. Please re-add items.');
      return;
    }

    const deliveryAddress = document.getElementById('delivery-address')?.value?.trim();
    if (!deliveryAddress) {
      BombayLane.notify('Please enter a delivery address.');
      return;
    }

    const btn = document.getElementById('place-order-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing order…'; }

    try {
      const result = await BombayLane.api.request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId,
          deliveryAddress,
          items: cart.map((item) => ({ menuItemId: item.id, quantity: item.quantity }))
        })
      });

      BombayLane.cart.clear();
      BombayLane.notify('Order placed successfully! Redirecting…');

      setTimeout(() => {
        window.location.href = `/pages/orders.html?highlight=${result.order._id}`;
      }, 1000);
    } catch (error) {
      BombayLane.notify(error.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
    }
  },

  renderStatusBar(status) {
    if (status === 'cancelled') {
      return '<div class="status-cancelled">✕ Order Cancelled</div>';
    }
    const steps = ORDER_STATUSES.map((s) => {
      const idx = ORDER_STATUSES.indexOf(s);
      const current = ORDER_STATUSES.indexOf(status);
      const cls = idx < current ? 'done' : idx === current ? 'active' : 'pending';
      return `<div class="step ${cls}">${STATUS_LABELS[s]}</div>`;
    });
    return `<div class="status-bar">${steps.join('<div class="step-sep"></div>')}</div>`;
  },

  async loadHistory() {
    const list = document.getElementById('orders-list');
    if (!list) return;

    list.innerHTML = '<div class="spinner" aria-label="Loading orders"></div>';

    const token = localStorage.getItem('bl_token');
    if (!token) {
      list.innerHTML = '<li class="card muted">Please <a href="/pages/auth.html">login</a> to view your orders.</li>';
      return;
    }

    try {
      const result = await BombayLane.api.request('/api/orders');
      const orders = result.orders || [];

      // Highlight a specific order if redirected from checkout
      const params = new URLSearchParams(location.search);
      const highlight = params.get('highlight');

      list.innerHTML = orders.length
        ? orders.map((order) => {
          const restaurantName = order.restaurant?.name || 'Restaurant';
          const items = (order.items || []).map((i) =>
            `${BombayLane.escapeHtml(i.name)} ×${i.quantity}`
          ).join(', ');
          const isHighlighted = order._id === highlight;
          return `
            <li class="card order-card ${isHighlighted ? 'order-highlight' : ''}" id="order-${BombayLane.escapeAttr(order._id)}">
              <div class="row">
                <div>
                  <strong>${BombayLane.escapeHtml(restaurantName)}</strong>
                  <p class="muted">#${BombayLane.escapeHtml(order._id.slice(-6).toUpperCase())} &nbsp;•&nbsp; ${new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <span class="badge badge-${BombayLane.escapeAttr(order.status)}">${BombayLane.escapeHtml(STATUS_LABELS[order.status] || order.status)}</span>
              </div>
              <p class="order-items muted">${items}</p>
              ${this.renderStatusBar(order.status)}
              <div class="row" style="margin-top:.75rem">
                <strong>₹${Number(order.total || 0).toFixed(2)}</strong>
                <div style="display:flex;gap:.5rem">
                  <button class="btn btn-secondary" onclick="BombayLane.orders.reorder('${BombayLane.escapeAttr(order._id)}')">Reorder</button>
                </div>
              </div>
            </li>`;
        }).join('')
        : '<li class="card muted" style="text-align:center;padding:2rem">No orders yet. <a href="/pages/restaurants.html">Start ordering →</a></li>';

      // Scroll to highlighted order
      if (highlight) {
        const el = document.getElementById(`order-${highlight}`);
        if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
      }
    } catch (error) {
      list.innerHTML = `<li class="card muted">${BombayLane.escapeHtml(error.message)}</li>`;
    }
  },

  async reorder(orderId) {
    try {
      const result = await BombayLane.api.request(`/api/orders/${orderId}`);
      const items = result.order.items || [];
      const restaurant = result.order.restaurant;
      const restaurantId = typeof restaurant === 'object' ? restaurant._id : restaurant;
      const restaurantName = typeof restaurant === 'object' ? restaurant.name : '';

      BombayLane.cart.clear();
      items.forEach((item) => {
        BombayLane.cart.add({
          id: item.menuItem,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          restaurantId,
          restaurantName
        });
      });
      BombayLane.notify('Items added to cart');
      setTimeout(() => { window.location.href = '/pages/cart.html'; }, 800);
    } catch (error) {
      BombayLane.notify(error.message);
    }
  },

  // Legacy method kept for backwards compat
  startTracking(orderId) {
    if (!orderId) return;
    const tracker = document.getElementById('order-status');
    if (!tracker) return;

    const poll = async () => {
      try {
        const result = await BombayLane.api.request(`/api/orders/${orderId}`);
        tracker.textContent = STATUS_LABELS[result.order.status] || result.order.status;
        if (result.order.status === 'delivered' || result.order.status === 'cancelled') return;
      } catch { /* ignore */ }
      setTimeout(poll, 10000);
    };
    poll();
  }
};
