window.BombayLane = window.BombayLane || {};

const STATUS_STEPS = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
const STATUS_LABELS = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};
const STATUS_ICONS = { placed: '📋', confirmed: '✅', preparing: '👨‍🍳', out_for_delivery: '🛵', delivered: '🎉', cancelled: '❌' };

BombayLane.orders = {
  async placeOrder() {
    const items = BombayLane.cart.getItems();
    if (!items.length) {
      BombayLane.notify('Cart is empty');
      return;
    }

    const restaurantId = BombayLane.cart.getRestaurantId();
    if (!restaurantId) {
      BombayLane.notify('No restaurant selected. Please add items from a restaurant.');
      return;
    }

    const addressEl = document.getElementById('delivery-address');
    const deliveryAddress = addressEl?.value?.trim();
    if (!deliveryAddress) {
      BombayLane.notify('Please enter a delivery address.');
      addressEl?.focus();
      return;
    }

    const btn = document.getElementById('place-order-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing Order…'; }

    try {
      const result = await BombayLane.api.request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId,
          deliveryAddress,
          items: items.map((item) => ({ menuItemId: item.id, quantity: item.quantity }))
        })
      });

      BombayLane.cart.clear();
      BombayLane.notify('Order placed! 🎉');
      setTimeout(() => {
        window.location.href = `/pages/order-track.html?id=${result.order._id}`;
      }, 500);
    } catch (error) {
      BombayLane.notify(error.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
    }
  },

  async loadHistory() {
    const list = document.getElementById('orders-list');
    if (!list) return;

    list.innerHTML = '<div class="spinner"></div>';

    try {
      const result = await BombayLane.api.request('/api/orders');
      const orders = result.orders || [];

      list.innerHTML = orders.length
        ? orders.map((order) => {
          const orderId = BombayLane.escapeAttr(order._id);
          const shortId = BombayLane.escapeHtml(order._id.slice(-6).toUpperCase());
          const status = order.status || 'placed';
          const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const restaurantName = BombayLane.escapeHtml(
            typeof order.restaurant === 'object' ? (order.restaurant?.name || '') : ''
          );
          return `
            <tr>
              <td><strong>#${shortId}</strong></td>
              <td>${date}</td>
              <td>${restaurantName || '<span class="muted">—</span>'}</td>
              <td>₹${Number(order.total || 0).toFixed(2)}</td>
              <td><span class="badge badge-${status}">${BombayLane.escapeHtml(STATUS_LABELS[status] || status)}</span></td>
              <td class="actions">
                <a class="btn btn-sm btn-outline" href="/pages/order-track.html?id=${orderId}">Track</a>
                <button class="btn btn-sm btn-secondary" data-reorder="${orderId}">Reorder</button>
              </td>
            </tr>`;
        }).join('')
        : `<tr><td colspan="6"><div class="empty-state"><div class="icon">📦</div><h3>No orders yet</h3><p>Your order history will appear here</p><a class="btn" href="/pages/restaurants.html">Order Now</a></div></td></tr>`;

      // Attach reorder listeners
      list.querySelectorAll('[data-reorder]').forEach((btn) => {
        btn.addEventListener('click', () => this.reorder(btn.dataset.reorder));
      });
    } catch (error) {
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        list.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">🔐</div><h3>Please log in</h3><a class="btn" href="/pages/auth.html">Login</a></div></td></tr>`;
      } else {
        list.innerHTML = `<tr><td colspan="6"><p class="muted">${BombayLane.escapeHtml(error.message)}</p></td></tr>`;
      }
    }
  },

  async reorder(orderId) {
    try {
      const result = await BombayLane.api.request(`/api/orders/${orderId}`);
      const order = result.order;
      const restaurantId = typeof order.restaurant === 'object' ? order.restaurant._id : order.restaurant;
      const restaurantName = typeof order.restaurant === 'object' ? order.restaurant.name : '';
      (order.items || []).forEach((item) => {
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
      setTimeout(() => { window.location.href = '/pages/cart.html'; }, 600);
    } catch (error) {
      BombayLane.notify(error.message);
    }
  },

  async startTracking(orderId) {
    if (!orderId) {
      this.showNoOrder();
      return;
    }

    const doUpdate = async () => {
      try {
        const result = await BombayLane.api.request(`/api/orders/${orderId}`);
        this.renderTracker(result.order);
        return result.order.status;
      } catch (err) {
        return null;
      }
    };

    const status = await doUpdate();
    if (status && status !== 'delivered' && status !== 'cancelled') {
      const timer = setInterval(async () => {
        const s = await doUpdate();
        if (!s || s === 'delivered' || s === 'cancelled') clearInterval(timer);
      }, 5000);
    }
  },

  renderTracker(order) {
    const container = document.getElementById('tracker-container');
    if (!container) return;

    const status = order.status || 'placed';
    const isCancelled = status === 'cancelled';
    const stepIdx = STATUS_STEPS.indexOf(status);
    const progressPct = stepIdx >= 0 ? (stepIdx / (STATUS_STEPS.length - 1)) * 80 : 0;

    const restaurantName = typeof order.restaurant === 'object'
      ? BombayLane.escapeHtml(order.restaurant?.name || '')
      : '';

    const stepsHtml = STATUS_STEPS.map((s, i) => {
      const isDone = i < stepIdx;
      const isActive = i === stepIdx;
      const cls = isDone ? 'done' : isActive ? 'active' : '';
      return `
        <div class="tracker-step ${cls}">
          <div class="step-circle">${STATUS_ICONS[s]}</div>
          <span class="step-label">${STATUS_LABELS[s]}</span>
        </div>`;
    }).join('');

    const eta = order.estimatedDeliveryAt
      ? new Date(order.estimatedDeliveryAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : null;

    const itemsHtml = (order.items || []).map((item) =>
      `<div class="summary-row"><span>${BombayLane.escapeHtml(item.name)} ×${item.quantity}</span><span>₹${(item.price * item.quantity).toFixed(2)}</span></div>`
    ).join('');

    container.innerHTML = `
      <div class="tracker-card fade-in" role="status" aria-live="polite" aria-label="Order status: ${BombayLane.escapeAttr(STATUS_LABELS[status] || status)}">
        <div class="row" style="margin-bottom:1.5rem">
          <div>
            <p class="muted" style="margin:0;font-size:.85rem">Order #${BombayLane.escapeHtml(order._id.slice(-6).toUpperCase())}</p>
            <h2 style="margin:.25rem 0 0">${isCancelled ? '❌ Order Cancelled' : STATUS_LABELS[status]}</h2>
            ${restaurantName ? `<p class="muted" style="margin:.25rem 0 0">from ${restaurantName}</p>` : ''}
          </div>
          ${eta && !isCancelled ? `<div style="text-align:right"><p class="muted" style="margin:0;font-size:.82rem">Estimated by</p><p style="margin:0;font-size:1.2rem;font-weight:700">${eta}</p></div>` : ''}
        </div>

        ${isCancelled ? '' : `
          <div class="tracker-bar">
            <div class="tracker-progress" style="width:${progressPct}%"></div>
            ${stepsHtml}
          </div>`}

        <hr class="divider">

        <h3 style="margin:0 0 .75rem;font-size:1rem">Order Summary</h3>
        ${itemsHtml}
        <div class="summary-row total">
          <span>Total</span>
          <span>₹${Number(order.total || 0).toFixed(2)}</span>
        </div>

        <div style="margin-top:1.25rem;display:flex;gap:.75rem;flex-wrap:wrap">
          <a class="btn btn-secondary btn-sm" href="/pages/orders.html">All Orders</a>
          <a class="btn btn-outline btn-sm" href="/pages/restaurants.html">Order Again</a>
        </div>
      </div>`;
  },

  showNoOrder() {
    const container = document.getElementById('tracker-container');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📦</div>
          <h3>No order to track</h3>
          <p>Start by ordering from one of our restaurants</p>
          <a class="btn" href="/pages/restaurants.html">Explore Restaurants</a>
        </div>`;
    }
  }
};
