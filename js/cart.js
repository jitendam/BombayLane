window.BombayLane = window.BombayLane || {};

const CART_KEY = 'bl_cart';
const CART_RESTAURANT_KEY = 'bl_cart_restaurant';

const readCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
};

const writeCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));

BombayLane.cart = {
  getItems: readCart,
  getRestaurantId() {
    return localStorage.getItem(CART_RESTAURANT_KEY) || null;
  },
  setRestaurantId(id) {
    if (id) localStorage.setItem(CART_RESTAURANT_KEY, id);
  },
  add(item) {
    // Warn and clear if switching restaurants
    const existing = this.getRestaurantId();
    if (existing && item.restaurantId && existing !== item.restaurantId) {
      if (!window.confirm('Your cart has items from another restaurant. Clear it and start a new order?')) return;
      this.clear();
    }
    if (item.restaurantId) this.setRestaurantId(item.restaurantId);

    const cart = readCart();
    const found = cart.find((entry) => entry.id === item.id);
    if (found) {
      found.quantity += item.quantity || 1;
    } else {
      cart.push({ ...item, quantity: item.quantity || 1 });
    }
    writeCart(cart);
    this.updateCount();
    BombayLane.notify('Added to cart');
    this._refreshSidePanel();
  },
  remove(id) {
    const cart = readCart().filter((item) => item.id !== id);
    writeCart(cart);
    if (!cart.length) localStorage.removeItem(CART_RESTAURANT_KEY);
    this.updateCount();
    this._refreshSidePanel();
  },
  updateQuantity(id, quantity) {
    const cart = readCart();
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;
    if (quantity < 1) {
      this.remove(id);
      return;
    }
    item.quantity = quantity;
    writeCart(cart);
    this.updateCount();
    this._refreshSidePanel();
  },
  clear() {
    writeCart([]);
    localStorage.removeItem(CART_RESTAURANT_KEY);
    this.updateCount();
    this._refreshSidePanel();
  },
  totals() {
    const subtotal = readCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = +(subtotal * 0.05).toFixed(2);
    const deliveryFee = subtotal >= 500 || subtotal === 0 ? 0 : 40;
    return { subtotal, tax, deliveryFee, total: +(subtotal + tax + deliveryFee).toFixed(2) };
  },
  updateCount() {
    const count = readCart().reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('#cart-count').forEach((el) => { el.textContent = count; });
  },
  render(containerId = 'cart-items', summaryId = 'cart-summary') {
    const list = document.getElementById(containerId);
    const summary = document.getElementById(summaryId);
    if (!list) return;

    const cart = readCart();
    if (cart.length) {
      list.innerHTML = cart.map((item) => {
        const safeId = BombayLane.escapeAttr(item.id);
        const safeName = BombayLane.escapeHtml(item.name);
        const safePrice = Number(item.price || 0);
        const safeQty = Number(item.quantity || 1);
        return `
          <li class="card row fade-in" style="padding:.85rem 1rem">
            <div style="flex:1;min-width:0">
              <strong style="display:block;font-size:.95rem">${safeName}</strong>
              <p class="muted" style="margin:.2rem 0 0;font-size:.85rem">₹${safePrice} × ${safeQty} = ₹${(safePrice * safeQty).toFixed(0)}</p>
            </div>
            <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0">
              <div class="qty-control">
                <button onclick="BombayLane.cart.updateQuantity('${safeId}', ${safeQty - 1}); BombayLane.cart.render();" aria-label="Decrease">−</button>
                <span>${safeQty}</span>
                <button onclick="BombayLane.cart.updateQuantity('${safeId}', ${safeQty + 1}); BombayLane.cart.render();" aria-label="Increase">+</button>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="BombayLane.cart.remove('${safeId}'); BombayLane.cart.render();" aria-label="Remove">✕</button>
            </div>
          </li>`;
      }).join('');
    } else {
      list.innerHTML = `
        <li class="empty-state">
          <div style="font-size:3rem;margin-bottom:.5rem">🛒</div>
          <h3>Your cart is empty</h3>
          <p><a href="/pages/restaurants.html" style="color:var(--brand)">Browse our menu</a> to add items</p>
        </li>`;
    }

    if (summary) {
      const t = this.totals();
      const hasFree = t.deliveryFee === 0 && t.subtotal > 0;
      const remaining = t.subtotal > 0 ? Math.max(0, 500 - t.subtotal) : 0;
      summary.innerHTML = `
        <div class="order-summary">
          <div class="order-summary-row"><span>Subtotal</span><span>₹${t.subtotal.toFixed(2)}</span></div>
          <div class="order-summary-row"><span>Tax (5%)</span><span>₹${t.tax.toFixed(2)}</span></div>
          <div class="order-summary-row ${hasFree ? 'free-delivery' : ''}">
            <span>Delivery</span>
            <span>${hasFree ? '🎉 FREE' : '₹' + t.deliveryFee.toFixed(2)}</span>
          </div>
          ${remaining > 0 ? `<p class="muted" style="font-size:.8rem;margin:.25rem 0 0">Add ₹${remaining.toFixed(0)} more for free delivery</p>` : ''}
          <div class="order-summary-row total"><span>Total</span><span>₹${t.total.toFixed(2)}</span></div>
        </div>
        ${cart.length ? `<a class="btn btn-full" href="/pages/checkout.html" style="margin-top:1rem;text-align:center">Proceed to Checkout →</a>` : ''}`;
    }

    this.updateCount();
  },

  // Refresh the side cart panel on the restaurant detail page
  _refreshSidePanel() {
    const panel = document.getElementById('side-cart-body');
    if (!panel) return;
    const cart = readCart();
    if (!cart.length) {
      panel.innerHTML = '<p class="cart-panel-empty">No items yet.<br>Add something delicious!</p>';
      return;
    }
    const t = this.totals();
    panel.innerHTML = cart.map((item) => `
      <div class="cart-panel-item">
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${BombayLane.escapeHtml(item.name)}</span>
        <span style="flex-shrink:0;color:var(--muted)">×${item.quantity}</span>
        <span style="flex-shrink:0;font-weight:700">₹${(item.price * item.quantity).toFixed(0)}</span>
      </div>
    `).join('') + `
      <div class="cart-panel-total"><span>Total</span><span>₹${t.total.toFixed(2)}</span></div>
      <a class="btn btn-full" href="/pages/checkout.html" style="margin-top:.75rem">Checkout →</a>
    `;
  }
};
