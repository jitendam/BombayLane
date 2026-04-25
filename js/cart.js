window.BombayLane = window.BombayLane || {};

const CART_KEY = 'bl_cart';

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
    const items = readCart();
    return items.length ? (items[0].restaurantId || null) : null;
  },

  getRestaurantName() {
    const items = readCart();
    return items.length ? (items[0].restaurantName || '') : '';
  },

  add(item) {
    const cart = readCart();

    // Warn if the new item is from a different restaurant
    if (cart.length && item.restaurantId && cart[0].restaurantId &&
        cart[0].restaurantId !== item.restaurantId) {
      // eslint-disable-next-line no-alert
      if (!window.confirm(`Your cart already has items from "${cart[0].restaurantName || 'another restaurant'}". Adding this item will clear your cart. Continue?`)) {
        return;
      }
      writeCart([]);
    }

    const updated = readCart();
    const existing = updated.find((entry) => entry.id === item.id);
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      updated.push({ ...item, quantity: item.quantity || 1 });
    }
    writeCart(updated);
    this.updateCount();
    BombayLane.notify(`${item.name} added to cart`);
  },

  remove(id) {
    writeCart(readCart().filter((item) => item.id !== id));
    this.updateCount();
    // Re-render if cart page is open
    if (document.getElementById('cart-items')) this.render();
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
    if (document.getElementById('cart-items')) this.render();
  },

  clear() {
    writeCart([]);
    this.updateCount();
  },

  totals() {
    const subtotal = readCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = +(subtotal * 0.05).toFixed(2);
    const deliveryFee = subtotal >= 500 || subtotal === 0 ? 0 : 40;
    return { subtotal, tax, deliveryFee, total: subtotal + tax + deliveryFee };
  },

  updateCount() {
    const count = readCart().reduce((sum, item) => sum + item.quantity, 0);
    // Update all cart count elements — both by id="cart-count" and data-cart-count attribute
    document.querySelectorAll('#cart-count, [data-cart-count]').forEach((el) => { el.textContent = count; });
  },

  render(containerId = 'cart-items', summaryId = 'cart-summary') {
    const list = document.getElementById(containerId);
    const summary = document.getElementById(summaryId);
    if (!list) return;

    const cart = readCart();

    // Show restaurant name above items if available
    const restBanner = document.getElementById('cart-restaurant');
    if (restBanner) {
      const rName = this.getRestaurantName();
      restBanner.textContent = rName ? `From: ${rName}` : '';
      restBanner.style.display = rName ? '' : 'none';
    }

    list.innerHTML = cart.length
      ? cart.map((item) => {
        const safeId = BombayLane.escapeAttr(item.id);
        const safeName = BombayLane.escapeHtml(item.name);
        const safePrice = Number(item.price || 0);
        const safeQty = Number(item.quantity || 1);
        return `<li class="card row">
          <div>
            <strong>${safeName}</strong>
            <p class="muted">₹${safePrice} × ${safeQty} = ₹${(safePrice * safeQty).toFixed(0)}</p>
          </div>
          <div class="row">
            <button class="btn btn-secondary qty-btn" onclick="BombayLane.cart.updateQuantity('${safeId}', ${safeQty - 1})" aria-label="Decrease quantity">−</button>
            <span style="min-width:1.5rem;text-align:center;">${safeQty}</span>
            <button class="btn btn-secondary qty-btn" onclick="BombayLane.cart.updateQuantity('${safeId}', ${safeQty + 1})" aria-label="Increase quantity">+</button>
            <button class="btn remove-btn" onclick="BombayLane.cart.remove('${safeId}')" aria-label="Remove item">✕</button>
          </div>
        </li>`;
      }).join('')
      : '<li class="card muted" style="text-align:center;padding:2rem">Your cart is empty. <a href="/pages/restaurants.html">Browse restaurants →</a></li>';

    if (summary) {
      const totals = this.totals();
      summary.innerHTML = `
        <p class="row"><span>Subtotal</span><span>₹${totals.subtotal.toFixed(2)}</span></p>
        <p class="row"><span>Tax (5%)</span><span>₹${totals.tax.toFixed(2)}</span></p>
        <p class="row"><span>Delivery</span><span>${totals.deliveryFee === 0 ? 'Free' : '₹' + totals.deliveryFee.toFixed(2)}</span></p>
        <hr style="border:none;border-top:1px solid var(--border);margin:.5rem 0">
        <p class="row"><strong>Total</strong><strong>₹${totals.total.toFixed(2)}</strong></p>`;
    }

    this.updateCount();
  }
};
