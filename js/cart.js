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
  add(item) {
    const cart = readCart();
    const existing = cart.find((entry) => entry.id === item.id);
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      cart.push({ ...item, quantity: item.quantity || 1 });
    }
    writeCart(cart);
    this.updateCount();
    BombayLane.notify('Added to cart');
  },
  remove(id) {
    writeCart(readCart().filter((item) => item.id !== id));
    this.updateCount();
  },
  updateQuantity(id, quantity) {
    const cart = readCart();
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;
    item.quantity = Math.max(1, quantity);
    writeCart(cart);
    this.updateCount();
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
    document.querySelectorAll('#cart-count').forEach((el) => { el.textContent = count; });
  },
  render(containerId = 'cart-items', summaryId = 'cart-summary') {
    const list = document.getElementById(containerId);
    const summary = document.getElementById(summaryId);
    if (!list) return;

    const cart = readCart();
    list.innerHTML = cart.length
      ? cart.map((item) => `<li class="card row"><div><strong>${item.name}</strong><p class="muted">₹${item.price} x ${item.quantity}</p></div><div class="row"><button class="btn btn-secondary" onclick="BombayLane.cart.updateQuantity('${item.id}', ${item.quantity - 1})">-</button><button class="btn btn-secondary" onclick="BombayLane.cart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button><button class="btn" onclick="BombayLane.cart.remove('${item.id}')">Remove</button></div></li>`).join('')
      : '<li class="card">Your cart is empty.</li>';

    if (summary) {
      const totals = this.totals();
      summary.innerHTML = `
        <p>Subtotal: ₹${totals.subtotal.toFixed(2)}</p>
        <p>Tax: ₹${totals.tax.toFixed(2)}</p>
        <p>Delivery: ₹${totals.deliveryFee.toFixed(2)}</p>
        <h3>Total: ₹${totals.total.toFixed(2)}</h3>`;
    }

    this.updateCount();
  }
};
