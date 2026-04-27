window.BombayLane = window.BombayLane || {};

BombayLane.restaurants = {
  page: 1,
  done: false,
  currentTab: 'all',

  async fetchList(reset = false) {
    if (this.done && !reset) return;
    if (reset) {
      this.page = 1;
      this.done = false;
      const container = document.getElementById('restaurant-list');
      if (container) container.innerHTML = '<div class="spinner"></div>';
    }

    const query = document.getElementById('search-input')?.value?.trim() || '';
    const cuisine = document.getElementById('cuisine-filter')?.value || '';
    const sort = document.getElementById('sort-filter')?.value || 'rating';

    try {
      const result = await BombayLane.api.request(
        `/api/search?q=${encodeURIComponent(query)}&cuisine=${encodeURIComponent(cuisine)}&sort=${encodeURIComponent(sort)}`
      );
      const container = document.getElementById('restaurant-list');
      const data = result.restaurants || [];

      if (reset && container) container.innerHTML = '';

      if (!data.length) {
        this.done = true;
        if (!container?.children.length) {
          container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
              <div class="icon">🍽️</div>
              <h3>No restaurants found</h3>
              <p>Try adjusting your filters</p>
            </div>`;
        }
        return;
      }

      const cards = data.map((r) => {
        const id = BombayLane.escapeAttr(r._id);
        const name = BombayLane.escapeHtml(r.name);
        const city = BombayLane.escapeHtml(r.location?.city || 'Mumbai');
        const rating = Number(r.averageRating || 0).toFixed(1);
        const time = r.deliveryTimeMinutes || 30;
        const cuisines = (r.cuisine || []).map((c) =>
          `<span class="tag">${BombayLane.escapeHtml(c)}</span>`
        ).join('');
        const openBadge = r.isOpen
          ? '<span class="badge badge-open">● Open</span>'
          : '<span class="badge badge-closed">● Closed</span>';

        return `
          <article class="restaurant-card fade-in">
            <img src="https://picsum.photos/seed/${id}/400/200" alt="${name}" loading="lazy">
            <div class="card-body">
              <div class="row" style="align-items:flex-start;gap:.5rem">
                <h3 style="margin:0">${name}</h3>
                ${openBadge}
              </div>
              <p class="muted" style="margin:.25rem 0">${city}</p>
              <div class="card-tags">${cuisines}</div>
              <div class="card-meta">
                <span class="rating">★ ${rating}</span>
                <span class="delivery-badge">🕐 ${time} min</span>
              </div>
              <div class="card-footer">
                <a class="btn" href="/pages/restaurant-detail.html?id=${id}">Order Now</a>
              </div>
            </div>
          </article>`;
      }).join('');

      if (container) container.insertAdjacentHTML('beforeend', cards);
      this.page += 1;
    } catch (error) {
      BombayLane.notify(error.message);
    }
  },

  async loadDetail() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (!id) return;

    try {
      const [restaurantRes, menuRes] = await Promise.all([
        BombayLane.api.request(`/api/restaurants/${id}`),
        BombayLane.api.request(`/api/restaurants/${id}/menu`)
      ]);

      const r = restaurantRes.restaurant;
      const items = menuRes.items || [];

      // Header
      const nameEl = document.getElementById('restaurant-name');
      const metaEl = document.getElementById('restaurant-meta');
      if (nameEl) nameEl.textContent = r.name;
      if (metaEl) {
        const cuisines = (r.cuisine || []).map((c) => `<span class="tag">${BombayLane.escapeHtml(c)}</span>`).join('');
        const openBadge = r.isOpen
          ? '<span class="badge badge-open">● Open</span>'
          : '<span class="badge badge-closed">● Closed</span>';
        metaEl.innerHTML = `
          <div class="flex-wrap" style="gap:.5rem;margin-bottom:.5rem">
            ${openBadge}
            <span class="rating">★ ${Number(r.averageRating || 0).toFixed(1)}</span>
            <span class="delivery-badge">🕐 ${r.deliveryTimeMinutes || 30} min delivery</span>
            <span class="muted">📍 ${BombayLane.escapeHtml(r.location?.address || '')} • ${BombayLane.escapeHtml(r.location?.city || '')}</span>
          </div>
          <div class="flex-wrap">${cuisines}</div>`;
      }

      // Build category tabs
      const categories = [...new Set(items.map((i) => i.category || 'General'))];
      const tabsEl = document.getElementById('category-tabs');
      if (tabsEl) {
        tabsEl.innerHTML = ['All', ...categories].map((cat, idx) => `
          <button class="tab-btn${idx === 0 ? ' active' : ''}" data-cat="${BombayLane.escapeAttr(cat)}">${BombayLane.escapeHtml(cat)}</button>
        `).join('');
        tabsEl.querySelectorAll('.tab-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            tabsEl.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            this.renderMenuItems(items, btn.dataset.cat, r);
          });
        });
      }

      this.renderMenuItems(items, 'All', r);
    } catch (error) {
      BombayLane.notify(error.message);
    }
  },

  renderMenuItems(items, activeCategory, restaurant) {
    const menu = document.getElementById('menu-list');
    if (!menu) return;

    const filtered = activeCategory === 'All'
      ? items
      : items.filter((i) => i.category === activeCategory);

    if (!filtered.length) {
      menu.innerHTML = '<p class="muted">No items in this category.</p>';
      return;
    }

    // Group by category
    const grouped = {};
    filtered.forEach((item) => {
      const cat = item.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    const restaurantId = restaurant._id;
    const restaurantName = restaurant.name;

    menu.innerHTML = Object.entries(grouped).map(([cat, catItems]) => `
      <div class="menu-section">
        <h3>${BombayLane.escapeHtml(cat)}</h3>
        ${catItems.map((item) => {
          const itemId = BombayLane.escapeAttr(item._id);
          const name = BombayLane.escapeHtml(item.name);
          const desc = BombayLane.escapeHtml(item.description || '');
          const vegBadge = item.isVegetarian
            ? '<span class="badge badge-veg">🟢 Veg</span>'
            : '<span class="badge badge-nonveg">🔴 Non-Veg</span>';
          return `
            <div class="menu-item-card" id="item-card-${itemId}">
              <img class="menu-item-img" src="https://picsum.photos/seed/${itemId}/80/80" alt="${name}" loading="lazy">
              <div class="menu-item-info">
                <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
                  <h4>${name}</h4>
                  ${vegBadge}
                </div>
                <p>${desc}</p>
                <span class="menu-item-price">₹${Number(item.price || 0)}</span>
                <div class="qty-controls" id="qty-${itemId}" data-id="${itemId}" data-name="${name}" data-price="${Number(item.price || 0)}" data-rid="${BombayLane.escapeAttr(restaurantId)}" data-rname="${BombayLane.escapeHtml(restaurantName)}">
                  <button class="btn btn-sm" data-add="${itemId}">+ Add</button>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>`
    ).join('');

    // Attach add-to-cart logic
    menu.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const qtyEl = btn.closest('.qty-controls');
        const { id: itemId, name, price, rid, rname } = qtyEl.dataset;
        BombayLane.cart.add({ id: itemId, name, price: Number(price), restaurantId: rid, restaurantName: rname });
        this.updateItemQtyUI(qtyEl, itemId, name, price, rid, rname);
        this.updateStickyPanel();
      });
    });

    this.updateStickyPanel();
  },

  updateItemQtyUI(qtyEl, itemId, name, price, rid, rname) {
    const existingQty = BombayLane.cart.getItems().find((i) => i.id === itemId)?.quantity || 0;
    if (existingQty > 0) {
      qtyEl.innerHTML = `
        <button class="qty-btn" data-dec="${itemId}">−</button>
        <span class="qty-display">${existingQty}</span>
        <button class="qty-btn" data-inc="${itemId}">+</button>`;
      qtyEl.querySelector(`[data-dec="${itemId}"]`)?.addEventListener('click', () => {
        BombayLane.cart.updateQuantity(itemId, existingQty - 1);
        this.updateItemQtyUI(qtyEl, itemId, name, price, rid, rname);
        this.updateStickyPanel();
      });
      qtyEl.querySelector(`[data-inc="${itemId}"]`)?.addEventListener('click', () => {
        BombayLane.cart.updateQuantity(itemId, existingQty + 1);
        this.updateItemQtyUI(qtyEl, itemId, name, price, rid, rname);
        this.updateStickyPanel();
      });
    } else {
      qtyEl.innerHTML = `<button class="btn btn-sm" data-add="${itemId}">+ Add</button>`;
      qtyEl.querySelector(`[data-add="${itemId}"]`)?.addEventListener('click', () => {
        BombayLane.cart.add({ id: itemId, name, price: Number(price), restaurantId: rid, restaurantName: rname });
        this.updateItemQtyUI(qtyEl, itemId, name, price, rid, rname);
        this.updateStickyPanel();
      });
    }
  },

  updateStickyPanel() {
    const panel = document.getElementById('sticky-cart-panel');
    if (!panel) return;
    const items = BombayLane.cart.getItems();
    const t = BombayLane.cart.totals();
    if (!items.length) {
      panel.innerHTML = `<h3 class="section-title">Your Order</h3><p class="muted" style="text-align:center;padding:1rem 0">No items yet</p>`;
      return;
    }
    panel.innerHTML = `
      <h3 class="section-title">Your Order</h3>
      <div style="max-height:280px;overflow-y:auto;margin-bottom:1rem">
        ${items.map((i) => `
          <div style="display:flex;justify-content:space-between;padding:.4rem 0;font-size:.9rem;border-bottom:1px solid var(--border)">
            <span>${BombayLane.escapeHtml(i.name)} ×${i.quantity}</span>
            <span>₹${(i.price * i.quantity).toFixed(2)}</span>
          </div>`).join('')}
      </div>
      <div class="summary-row total"><span>Total</span><span>₹${t.total.toFixed(2)}</span></div>
      <a class="btn btn-full" style="margin-top:.75rem" href="/pages/cart.html">View Cart & Checkout</a>`;
  },

  init() {
    const search = document.getElementById('search-input');
    const cuisine = document.getElementById('cuisine-filter');
    const sort = document.getElementById('sort-filter');

    if (search || cuisine || sort) {
      const run = BombayLane.debounce(() => this.fetchList(true), 300);
      search?.addEventListener('input', run);
      cuisine?.addEventListener('change', run);
      sort?.addEventListener('change', run);
      this.fetchList(true);

      window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
          this.fetchList();
        }
      });
    }

    if (document.getElementById('menu-list')) {
      this.loadDetail();
    }
  }
};
