window.BombayLane = window.BombayLane || {};

const CART_KEY = 'bl_cart';

const EMPTY_CART = () => ({ restaurantId: null, restaurantName: '', items: [] });

const readCart = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY));
    // Migrate old array-format carts
    if (Array.isArray(raw)) return { restaurantId: null, restaurantName: '', items: raw };
    if (raw && typeof raw === 'object' && Array.isArray(raw.items)) return raw;
    return EMPTY_CART();
  } catch {
    return EMPTY_CART();
  }
};

const writeCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));

BombayLane.cart = {
  getItems() { return readCart().items; },
  getRestaurantId() { return readCart().restaurantId; },
  getRestaurantName() { return readCart().restaurantName; },

  add(item) {
    const { id, name, price, restaurantId, restaurantName } = item;
    const cart = readCart();

    if (cart.items.length > 0 && cart.restaurantId && cart.restaurantId !== restaurantId) {
      const confirmed = confirm(
        `Your cart has items from "${cart.restaurantName}".\nClear cart and add from "${restaurantName}"?`
      );
      if (!confirmed) return;
      cart.items = [];
    }

    cart.restaurantId = restaurantId || cart.restaurantId;
    cart.restaurantName = restaurantName || cart.restaurantName;

    const existing = cart.items.find((e) => e.id === id);
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      cart.items.push({ id, name, price: Number(price), quantity: item.quantity || 1 });
    }

    writeCart(cart);
    this.updateCount();
    BombayLane.notify('Added to cart 🛒');
  },

  remove(id) {
    const cart = readCart();
    cart.items = cart.items.filter((item) => item.id !== id);
    if (!cart.items.length) { cart.restaurantId = null; cart.restaurantName = ''; }
    writeCart(cart);
    this.updateCount();
  },

  updateQuantity(id, quantity) {
    const cart = readCart();
    const item = cart.items.find((e) => e.id === id);
    if (!item) return;
    if (quantity < 1) { this.remove(id); return; }
    item.quantity = quantity;
    writeCart(cart);
    this.updateCount();
  },

  clear() {
    writeCart(EMPTY_CART());
    this.updateCount();
  },

  totals() {
    const subtotal = readCart().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = +(subtotal * 0.05).toFixed(2);
    const deliveryFee = subtotal >= 500 || subtotal === 0 ? 0 : 40;
    return { subtotal, tax, deliveryFee, total: +(subtotal + tax + deliveryFee).toFixed(2) };
  },

  updateCount() {
    const count = readCart().items.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach((el) => { el.textContent = count; });
  },

  render(containerId = 'cart-items', summaryId = 'cart-summary') {
    const list = document.getElementById(containerId);
    const summary = document.getElementById(summaryId);
    if (!list) return;

    const cart = readCart();

    // Show restaurant name if available
    const restaurantHeader = document.getElementById('cart-restaurant-name');
    if (restaurantHeader && cart.restaurantName) {
      restaurantHeader.innerHTML = `Ordering from: <strong>${BombayLane.escapeHtml(cart.restaurantName)}</strong>`;
      restaurantHeader.classList.remove('hidden');
    }

    list.innerHTML = cart.items.length
      ? cart.items.map((item) => {
        const safeId = BombayLane.escapeAttr(item.id);
        const safeName = BombayLane.escapeHtml(item.name);
        const price = Number(item.price || 0);
        const qty = Number(item.quantity || 1);
        return `
          <div class="cart-item fade-in">
            <div class="cart-item-info">
              <h4>${safeName}</h4>
              <span class="cart-item-price">₹${price} × ${qty} = ₹${(price * qty).toFixed(2)}</span>
            </div>
            <div class="qty-controls">
              <button class="qty-btn" aria-label="Decrease quantity" data-action="dec" data-id="${safeId}" data-qty="${qty}">−</button>
              <span class="qty-display">${qty}</span>
              <button class="qty-btn" aria-label="Increase quantity" data-action="inc" data-id="${safeId}" data-qty="${qty}">+</button>
              <button class="btn btn-icon btn-secondary btn-sm" aria-label="Remove" data-action="remove" data-id="${safeId}">🗑</button>
            </div>
          </div>`;
      }).join('')
      : `<div class="empty-state">
           <div class="icon">🛒</div>
           <h3>Your cart is empty</h3>
           <p>Browse our restaurants and add items</p>
           <a class="btn" href="/pages/restaurants.html">Explore Restaurants</a>
         </div>`;

    // Attach delegated events
    list.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const qty = parseInt(btn.dataset.qty, 10);
        if (btn.dataset.action === 'inc') this.updateQuantity(id, qty + 1);
        else if (btn.dataset.action === 'dec') this.updateQuantity(id, qty - 1);
        else if (btn.dataset.action === 'remove') this.remove(id);
        this.render(containerId, summaryId);
      });
    });

    if (summary) {
      const t = this.totals();
      const deliveryText = t.deliveryFee === 0 && t.subtotal > 0
        ? '<span class="summary-row free">🎉 Delivery: Free</span>'
        : `<div class="summary-row"><span>Delivery</span><span>₹${t.deliveryFee.toFixed(2)}</span></div>`;
      summary.innerHTML = `
        <div class="summary-row"><span>Subtotal</span><span>₹${t.subtotal.toFixed(2)}</span></div>
        <div class="summary-row"><span>GST (5%)</span><span>₹${t.tax.toFixed(2)}</span></div>
        ${deliveryText}
        <div class="summary-row total"><span>Total</span><span>₹${t.total.toFixed(2)}</span></div>`;
    }

    this.updateCount();
  }
};
