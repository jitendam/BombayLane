window.BombayLane = window.BombayLane || {};

BombayLane.restaurants = {
  page: 1,
  done: false,
  async fetchList(reset = false) {
    if (this.done && !reset) return;
    if (reset) {
      this.page = 1;
      this.done = false;
      document.getElementById('restaurant-list').innerHTML = '';
    }

    const query = document.getElementById('search-input')?.value?.trim() || '';
    const cuisine = document.getElementById('cuisine-filter')?.value || '';

    try {
      const result = await BombayLane.api.request(`/api/search?q=${encodeURIComponent(query)}&cuisine=${encodeURIComponent(cuisine)}`);
      const container = document.getElementById('restaurant-list');
      const data = result.restaurants || [];

      if (!data.length) {
        this.done = true;
        if (!container.children.length) {
          container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
              <div style="font-size:3rem;margin-bottom:.75rem">🍽️</div>
              <h3>No restaurants found</h3>
              <p>Try a different search term</p>
            </div>`;
        }
        return;
      }

      const cards = data.map((r) => `
        <article class="restaurant-card fade-in">
          <img src="https://picsum.photos/seed/${BombayLane.escapeAttr(r._id)}/400/200" alt="${BombayLane.escapeAttr(r.name)}" loading="lazy">
          <div class="restaurant-card-body">
            <h3 class="restaurant-card-name">${BombayLane.escapeHtml(r.name)}</h3>
            <p class="restaurant-card-meta">
              ${BombayLane.escapeHtml((r.cuisine || []).join(' • '))} &nbsp;·&nbsp; ${BombayLane.escapeHtml(r.location?.city || '')}
            </p>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
              <span class="rating">★ ${Number(r.averageRating || 0).toFixed(1)}</span>
              <span class="muted" style="font-size:.85rem">🕐 ~${r.deliveryTimeMinutes || 30} min</span>
              <span class="badge badge-${r.isOpen ? 'delivered' : 'cancelled'}">${r.isOpen ? 'Open' : 'Closed'}</span>
            </div>
            <a class="btn btn-full" href="/pages/restaurant-detail.html?id=${encodeURIComponent(r._id)}">View Menu →</a>
          </div>
        </article>
      `).join('');

      container.insertAdjacentHTML('beforeend', cards);
      this.page += 1;
    } catch (error) {
      BombayLane.notify(error.message);
    }
  },

  async loadDetail() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (!id) return;

    const menuList = document.getElementById('menu-list');
    const catTabs = document.getElementById('cat-tabs');
    if (!menuList) return;

    menuList.innerHTML = '<div class="spinner" style="grid-column:1/-1"></div>';

    try {
      const [restaurantRes, menuRes] = await Promise.all([
        BombayLane.api.request(`/api/restaurants/${id}`),
        BombayLane.api.request(`/api/restaurants/${id}/menu`)
      ]);

      const r = restaurantRes.restaurant;
      document.getElementById('restaurant-name').textContent = r.name;
      document.getElementById('restaurant-meta').textContent =
        `${(r.cuisine || []).join(' • ')}  ·  ${r.location?.city || ''}  ·  ⭐ ${Number(r.averageRating || 0).toFixed(1)}  ·  🕐 ~${r.deliveryTimeMinutes || 30} min`;
      document.title = `${r.name} | BombayLane`;

      const items = menuRes.items || [];
      const categories = [...new Set(items.map(i => i.category))];

      // Build category tabs
      if (catTabs && categories.length) {
        catTabs.innerHTML = ['All', ...categories].map((cat) => `
          <button class="cat-tab ${cat === 'All' ? 'active' : ''}"
            data-cat="${BombayLane.escapeAttr(cat)}"
            onclick="BombayLane.restaurants._filterMenu('${BombayLane.escapeAttr(cat)}')"
            role="tab" aria-selected="${cat === 'All'}">
            ${BombayLane.escapeHtml(cat)}
          </button>
        `).join('');
      }

      // Store all items and restaurant ID for filtering
      this._allItems = items;
      this._restaurantId = id;

      this._renderMenuItems(items);
      BombayLane.cart._refreshSidePanel();
    } catch (error) {
      menuList.innerHTML = `<div class="card" style="grid-column:1/-1">${BombayLane.escapeHtml(error.message)}</div>`;
    }
  },

  _filterMenu(category) {
    // Update active tab
    document.querySelectorAll('.cat-tab').forEach((btn) => {
      const isActive = btn.dataset.cat === category;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });

    const filtered = category === 'All'
      ? this._allItems
      : (this._allItems || []).filter(i => i.category === category);

    this._renderMenuItems(filtered);
  },

  _renderMenuItems(items) {
    const menuList = document.getElementById('menu-list');
    if (!menuList) return;

    if (!items.length) {
      menuList.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>No items in this category</h3></div>';
      return;
    }

    menuList.innerHTML = items.map((item) => {
      const vegClass = item.isVegetarian ? 'badge-veg' : 'badge-nonveg';
      const vegLabel = item.isVegetarian ? 'Veg' : 'Non-Veg';
      return `
        <article class="menu-card fade-in"
          data-item-id="${BombayLane.escapeAttr(item._id)}"
          data-item-name="${BombayLane.escapeAttr(item.name)}"
          data-item-price="${Number(item.price || 0)}"
          data-restaurant-id="${BombayLane.escapeAttr(this._restaurantId || '')}">
          <img class="menu-card-img" src="https://picsum.photos/seed/${BombayLane.escapeAttr(item._id)}/400/200" alt="${BombayLane.escapeAttr(item.name)}" loading="lazy">
          <div class="menu-card-body">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem">
              <h4 class="menu-card-name">${BombayLane.escapeHtml(item.name)}</h4>
              <span class="badge ${vegClass}" style="flex-shrink:0">${vegLabel}</span>
            </div>
            <p class="menu-card-desc">${BombayLane.escapeHtml(item.description || '')}</p>
            <div class="menu-card-footer">
              <span class="menu-card-price">₹${Number(item.price || 0)}</span>
              <button class="btn btn-sm add-to-cart-btn">+ Add</button>
            </div>
          </div>
        </article>`;
    }).join('');

    // Use event delegation — no inline JS, no string-embedded data
    menuList.querySelectorAll('.add-to-cart-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('[data-item-id]');
        if (!card) return;
        BombayLane.cart.add({
          id: card.dataset.itemId,
          name: card.dataset.itemName,
          price: Number(card.dataset.itemPrice),
          restaurantId: card.dataset.restaurantId
        });
      });
    });
  },

  init() {
    const search = document.getElementById('search-input');
    const cuisine = document.getElementById('cuisine-filter');

    if (search || cuisine) {
      const run = BombayLane.debounce(() => this.fetchList(true), 300);
      search?.addEventListener('input', run);
      cuisine?.addEventListener('change', run);
      this.fetchList(true);

      window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 150) {
          this.fetchList();
        }
      });
    }

    this.loadDetail();
  }
};
