window.BombayLane = window.BombayLane || {};

const nextStatus = {
  placed: 'confirmed',
  confirmed: 'preparing',
  preparing: 'out_for_delivery',
  out_for_delivery: 'delivered',
  delivered: 'delivered',
  cancelled: 'cancelled'
};

BombayLane.orders = {
  async placeOrder() {
    const cart = BombayLane.cart.getItems();
    if (!cart.length) {
      BombayLane.notify('Cart is empty');
      return;
    }

    const restaurantId = document.getElementById('restaurant-id')?.value;
    const deliveryAddress = document.getElementById('delivery-address')?.value;
    if (!restaurantId || !deliveryAddress) {
      BombayLane.notify('Restaurant ID and delivery address are required.');
      return;
    }

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
    } catch (error) {
      BombayLane.notify(error.message);
    }
  },
  async loadHistory() {
    const list = document.getElementById('orders-list');
    if (!list) return;

    try {
      const result = await BombayLane.api.request('/api/orders');
      const orders = result.orders || [];

      list.innerHTML = orders.length
        ? orders.map((order) => `<li class="card"><div class="row"><strong>#${order._id.slice(-6)}</strong><span class="badge">${order.status}</span></div><p>Total: ₹${order.total}</p><button class="btn btn-secondary" onclick="BombayLane.orders.reorder('${order._id}')">Reorder</button></li>`).join('')
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
    const tracker = document.getElementById('order-status');
    if (!tracker) return;

    let current = 'placed';
    tracker.textContent = current;

    const timer = setInterval(async () => {
      try {
        const result = await BombayLane.api.request(`/api/orders/${orderId}`);
        current = result.order.status || current;
      } catch {
        current = nextStatus[current] || current;
      }
      tracker.textContent = current;
      if (current === 'delivered' || current === 'cancelled') clearInterval(timer);
    }, 5000);
  }
};
