window.BombayLane = window.BombayLane || {};

const ORDER_STEPS = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
const ORDER_STEP_LABELS = { placed: 'Placed', confirmed: 'Confirmed', preparing: 'Preparing', out_for_delivery: 'On the Way', delivered: 'Delivered' };

BombayLane.orders = {
  async placeOrder() {
    const cart = BombayLane.cart.getItems();
    if (!cart.length) {
      BombayLane.notify('Your cart is empty');
      return;
    }

    const restaurantId = BombayLane.cart.getRestaurantId();
    if (!restaurantId) {
      BombayLane.notify('No restaurant selected. Please add items from the menu first.');
      return;
    }

    const deliveryAddress = document.getElementById('delivery-address')?.value?.trim();
    if (!deliveryAddress) {
      BombayLane.notify('Please enter a delivery address');
      document.getElementById('delivery-address')?.focus();
      return;
    }

    const errEl = document.getElementById('checkout-error');
    const btn = document.getElementById('place-order-btn');

    try {
      if (btn) { btn.disabled = true; btn.textContent = 'Placing order…'; }
      if (errEl) errEl.classList.add('hidden');

      const result = await BombayLane.api.request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId,
          deliveryAddress,
          items: cart.map((item) => ({ menuItemId: item.id, quantity: item.quantity }))
        })
      });

      BombayLane.cart.clear();
      BombayLane.notify('🎉 Order placed! Estimated delivery in ~30 mins');
      setTimeout(() => { window.location.href = '/pages/orders.html'; }, 1200);
    } catch (error) {
      if (errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
      BombayLane.notify(error.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Place Order 🍛'; }
    }
  },

  async loadHistory() {
    const list = document.getElementById('orders-list');
    if (!list) return;

    list.innerHTML = '<div class="spinner"></div>';

    try {
      const result = await BombayLane.api.request('/api/orders');
      const orders = result.orders || [];

      if (!orders.length) {
        list.innerHTML = `
          <li class="card empty-state">
            <div style="font-size:3rem;margin-bottom:.75rem">📋</div>
            <h3>No orders yet</h3>
            <p><a href="/pages/restaurants.html" style="color:var(--brand)">Browse menu</a> to place your first order</p>
          </li>`;
        return;
      }

      list.innerHTML = orders.map((order) => {
        const statusClass = `badge-${order.status}`;
        const statusLabel = ORDER_STEP_LABELS[order.status] || order.status;
        const stepsHtml = this._buildSteps(order.status);
        const itemsHtml = (order.items || []).map(i => `
          <div style="display:flex;justify-content:space-between;font-size:.85rem;padding:.25rem 0;border-bottom:1px solid var(--border)">
            <span>${BombayLane.escapeHtml(i.name)} × ${i.quantity}</span>
            <span style="color:var(--muted)">₹${(i.price * i.quantity).toFixed(0)}</span>
          </div>
        `).join('');

        const date = new Date(order.createdAt);
        const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        return `
          <li class="card fade-in" style="padding:1.25rem">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;margin-bottom:.75rem">
              <div>
                <strong style="font-size:1rem">Order #${BombayLane.escapeHtml(order._id.slice(-6).toUpperCase())}</strong>
                <p class="muted" style="margin:.2rem 0 0;font-size:.82rem">${dateStr}</p>
              </div>
              <span class="badge ${statusClass}">${statusLabel}</span>
            </div>
            ${stepsHtml}
            <div style="margin:.75rem 0">${itemsHtml}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;margin-top:.5rem">
              <span style="font-weight:800">Total: ₹${Number(order.total || 0).toFixed(2)}</span>
              <button class="btn btn-secondary btn-sm" onclick="BombayLane.orders.reorder('${BombayLane.escapeAttr(order._id)}')">🔄 Reorder</button>
            </div>
          </li>`;
      }).join('');
    } catch (error) {
      list.innerHTML = `<li class="card"><p class="muted">${BombayLane.escapeHtml(error.message)}</p><p><a href="/pages/auth.html" style="color:var(--brand)">Please log in</a> to see your orders.</p></li>`;
    }
  },

  _buildSteps(currentStatus) {
    if (currentStatus === 'cancelled') {
      return `<p style="color:#C62828;font-size:.85rem;margin:.5rem 0">❌ This order was cancelled.</p>`;
    }
    const currentIdx = ORDER_STEPS.indexOf(currentStatus);
    const stepsHtml = ORDER_STEPS.map((s, i) => {
      const cls = i < currentIdx ? 'done' : i === currentIdx ? 'active' : '';
      return `
        <div class="step ${cls}">
          <div class="step-dot">${i < currentIdx ? '✓' : (i + 1)}</div>
          <span class="step-label">${ORDER_STEP_LABELS[s]}</span>
        </div>`;
    }).join('');
    return `<div class="status-steps">${stepsHtml}</div>`;
  },

  async reorder(orderId) {
    try {
      const result = await BombayLane.api.request(`/api/orders/${orderId}`);
      const order = result.order;
      const restaurantId = typeof order.restaurant === 'object' ? order.restaurant._id : order.restaurant;
      (order.items || []).forEach((item) => {
        BombayLane.cart.add({
          id: item.menuItem,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          restaurantId
        });
      });
      BombayLane.notify('Items added to cart');
    } catch (error) {
      BombayLane.notify(error.message);
    }
  }
};
