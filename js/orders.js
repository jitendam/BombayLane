window.BombayLane = window.BombayLane || {};

BombayLane.orders = {
  async placeOrder() {
    const cart = BombayLane.cart.getItems();
    if (!cart.length) {
      BombayLane.notify('Cart is empty');
      return;
    }

    const restaurantId = BombayLane.cart.getRestaurantId();
    if (!restaurantId) {
      BombayLane.notify('No restaurant associated with cart. Please add items from a restaurant first.');
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
      await BombayLane.api.request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId,
          deliveryAddress,
          items: cart.map((item) => ({ menuItemId: item.id, quantity: item.quantity }))
        })
      });

      BombayLane.cart.clear();
      BombayLane.notify('Order placed successfully');
      setTimeout(() => { window.location.href = '/pages/orders.html'; }, 800);
    } catch (error) {
      BombayLane.notify(error.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
    }
  },
  async loadHistory() {
    const list = document.getElementById('orders-list');
    if (!list) return;

    try {
      const result = await BombayLane.api.request('/api/orders');
      const orders = result.orders || [];
      const activeStatuses = new Set(['placed', 'confirmed', 'preparing', 'out_for_delivery']);

      list.innerHTML = orders.length
        ? orders.map((order) => {
          const isActive = activeStatuses.has(order.status);
          return `<li class="card">
            <div class="row">
              <strong>#${BombayLane.escapeHtml(order.id.slice(-6))}</strong>
              <span class="badge">${BombayLane.escapeHtml(order.status)}</span>
            </div>
            <p class="muted">Total: ₹${Number(order.total || 0).toFixed(2)}</p>
            <div class="row" style="margin-top:.5rem">
              <button class="btn btn-secondary" onclick="BombayLane.orders.reorder('${BombayLane.escapeAttr(order.id)}')">Reorder</button>
              ${isActive ? `<button class="btn" onclick="BombayLane.orders.startTracking('${BombayLane.escapeAttr(order.id)}')">Track</button>` : ''}
            </div>
          </li>`;
        }).join('')
        : '<li class="card">No orders yet.</li>';
    } catch (error) {
      BombayLane.notify(error.message);
    }
  },
  async reorder(orderId) {
    try {
      const result = await BombayLane.api.request(`/api/orders/${orderId}`);
      (result.order.items || []).forEach((item) => {
        BombayLane.cart.add({ id: item.menuItem, name: item.name, price: item.price, quantity: item.quantity });
      });
      BombayLane.notify('Items added to cart');
    } catch (error) {
      BombayLane.notify(error.message);
    }
  },
  startTracking(orderId) {
    const section = document.getElementById('tracking-section');
    const label = document.getElementById('tracking-order-label');
    const tracker = document.getElementById('order-status');
    if (!tracker) return;

    if (label) label.textContent = '#' + orderId.slice(-6);
    if (section) section.style.display = '';
    tracker.textContent = 'loading…';

    let currentStatus = 'placed';
    const timer = setInterval(async () => {
      try {
        const result = await BombayLane.api.request(`/api/orders/${orderId}`);
        currentStatus = result.order.status || currentStatus;
      } catch {
        // keep previous status on network error
      }
      tracker.textContent = currentStatus;
      if (currentStatus === 'delivered' || currentStatus === 'cancelled') clearInterval(timer);
    }, 5000);
  }
};
