window.BombayLane = window.BombayLane || {};

BombayLane.restaurants = {
  page: 1,
  done: false,

  // ── Dedicated single-restaurant menu loader ───────────────────────────────
  // Fetches the only restaurant from the API, then renders its full menu.
  // Used by pages/menu.html — no ?id= param needed.
  async loadMenu() {
    const loadingEl = document.getElementById('restaurant-loading');

    try {
      // Discover the single Bombay Lanes restaurant
      const listRes = await BombayLane.api.request('/api/restaurants');
      const restaurant = (listRes.restaurants || [])[0];
      if (!restaurant) throw new Error('Menu unavailable — please try again later.');

      const id = restaurant._id;

      // Load menu and reviews in parallel
      const [menuRes, reviewsRes] = await Promise.all([
        BombayLane.api.request(`/api/restaurants/${id}/menu`),
        BombayLane.api.request(`/api/restaurants/${id}/reviews`)
      ]);

      if (loadingEl) loadingEl.style.display = 'none';

      const r = restaurant;
      const safeRestId = BombayLane.escapeAttr(r._id);
      const safeRestName = BombayLane.escapeAttr(r.name);

      document.title = `Menu | ${r.name}`;

      // Hero image
      const heroSection = document.getElementById('restaurant-hero');
      if (heroSection && r.image) {
        const heroImg = document.createElement('img');
        heroImg.src = r.image;
        heroImg.alt = r.name;
        heroImg.className = 'restaurant-hero-img';
        heroImg.loading = 'eager';
        heroSection.prepend(heroImg);
      }

      const show = (id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
      };

      document.getElementById('restaurant-name').textContent = r.name;
      show('restaurant-name');

      document.getElementById('restaurant-meta').innerHTML = `
        <span>${BombayLane.escapeHtml(r.location?.address || '')}, ${BombayLane.escapeHtml(r.location?.city || '')}</span>
        &nbsp;•&nbsp;
        <span class="rating">★ ${Number(r.averageRating || 0).toFixed(1)}</span>
        &nbsp;•&nbsp;
        <span>🕐 ${r.deliveryTimeMinutes || 40} min delivery</span>
        &nbsp;•&nbsp;
        <span class="${r.isOpen ? 'status-open' : 'status-closed'}">${r.isOpen ? 'Open now' : 'Closed'}</span>
      `;
      show('restaurant-meta');

      document.getElementById('restaurant-description').textContent = r.description || '';
      show('restaurant-description');

      if (r.openingHours) {
        document.getElementById('restaurant-hours').textContent =
          `Hours: ${r.openingHours.open} – ${r.openingHours.close}`;
        show('restaurant-hours');
      }

      // Group menu items by category
      const items = menuRes.items || [];
      const categories = [...new Set(items.map((item) => item.category))].sort();
      const menu = document.getElementById('menu-list');
      const catNav = document.getElementById('category-nav');

      if (!items.length) {
        menu.innerHTML = '<p class="card muted" style="text-align:center;padding:2rem">Menu coming soon.</p>';
      } else {
        // Category navigation tabs
        if (catNav) {
          catNav.innerHTML = categories.map((cat) =>
            `<a href="#cat-${BombayLane.escapeAttr(cat.replace(/\s+/g, '-'))}" class="cat-tab">${BombayLane.escapeHtml(cat)}</a>`
          ).join('');
        }

        menu.innerHTML = categories.map((cat) => {
          const catId = `cat-${cat.replace(/\s+/g, '-')}`;
          const catItems = items.filter((item) => item.category === cat);
          return `
            <section class="menu-category" id="${BombayLane.escapeAttr(catId)}">
              <h3 class="category-title">${BombayLane.escapeHtml(cat)}</h3>
              <ul class="menu-grid list">
                ${catItems.map((item) => {
                  const imgSrc = item.image
                    ? BombayLane.escapeAttr(item.image)
                    : `https://picsum.photos/seed/${BombayLane.escapeAttr(item._id)}/400/250`;
                  return `
                    <li class="card menu-item-card">
                      <img src="${imgSrc}" alt="${BombayLane.escapeAttr(item.name)}" class="menu-item-img" loading="lazy">
                      <div class="menu-item-body">
                        <div class="menu-item-info">
                          <span class="veg-dot ${item.isVegetarian ? 'veg' : 'non-veg'}" title="${item.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}"></span>
                          <div>
                            <strong>${BombayLane.escapeHtml(item.name)}</strong>
                            <p class="muted item-desc">${BombayLane.escapeHtml(item.description || '')}</p>
                          </div>
                        </div>
                        <div class="menu-item-footer row">
                          <span class="item-price">£${Number(item.price || 0).toFixed(2)}</span>
                          <button class="btn add-btn"
                            onclick="BombayLane.cart.add({ id: '${BombayLane.escapeAttr(item._id)}', name: '${BombayLane.escapeAttr(item.name)}', price: ${Number(item.price || 0)}, restaurantId: '${safeRestId}', restaurantName: '${safeRestName}' })">
                            Add to cart
                          </button>
                        </div>
                      </div>
                    </li>
                  `;
                }).join('')}
              </ul>
            </section>
          `;
        }).join('');
      }

      // Reviews
      const reviewsSection = document.getElementById('reviews-section');
      if (reviewsSection) reviewsSection.style.display = '';
      const reviewsList = document.getElementById('reviews-list');
      if (reviewsList) {
        const reviews = reviewsRes.reviews || [];
        reviewsList.innerHTML = reviews.length
          ? reviews.map((rv) => `
              <li class="card">
                <div class="row">
                  <strong>${BombayLane.escapeHtml(rv.user?.name || 'Anonymous')}</strong>
                  <span class="rating">★ ${rv.rating}</span>
                </div>
                ${rv.comment ? `<p class="muted">${BombayLane.escapeHtml(rv.comment)}</p>` : ''}
              </li>
            `).join('')
          : '<li class="card muted">No reviews yet. Be the first!</li>';

        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
          reviewForm.dataset.restaurantId = id;
          reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rating = Number(reviewForm.querySelector('[name="rating"]').value);
            const comment = reviewForm.querySelector('[name="comment"]').value.trim();
            try {
              await BombayLane.api.request(`/api/restaurants/${id}/reviews`, {
                method: 'POST',
                body: JSON.stringify({ rating, comment })
              });
              BombayLane.notify('Review submitted!');
              reviewForm.reset();
              BombayLane.restaurants.loadMenu();
            } catch (err) {
              BombayLane.notify(err.message);
            }
          });
        }
      }

      BombayLane.cart.updateCount();

    } catch (error) {
      if (loadingEl) loadingEl.style.display = 'none';
      BombayLane.notify(error.message);
    }
  },

  // ── Restaurant list (no longer used in the main flow; kept for admin) ─────
  async fetchList(reset = false) {
    if (this.done && !reset) return;
    if (reset) {
      this.page = 1;
      this.done = false;
      const c = document.getElementById('restaurant-list');
      if (c) c.innerHTML = '';
    }

    const query = document.getElementById('search-input')?.value?.trim() || '';
    const cuisine = document.getElementById('cuisine-filter')?.value || '';

    try {
      const result = await BombayLane.api.request(`/api/search?q=${encodeURIComponent(query)}&cuisine=${encodeURIComponent(cuisine)}`);
      const container = document.getElementById('restaurant-list');
      const data = result.restaurants || [];

      if (!data.length) {
        this.done = true;
        if (container && !container.children.length) container.innerHTML = '<p class="card muted" style="text-align:center;padding:2rem">No restaurants found.</p>';
        return;
      }

      const cards = data.map((restaurant) => {
        const cuisineList = (restaurant.cuisine || []).map((c) => BombayLane.escapeHtml(c)).join(', ');
        const statusClass = restaurant.isOpen ? 'status-open' : 'status-closed';
        const statusText = restaurant.isOpen ? 'Open' : 'Closed';
        const featuredBadge = restaurant.featured ? '<span class="featured-badge">★ Featured</span>' : '';
        const imgSrc = restaurant.image
          ? BombayLane.escapeAttr(restaurant.image)
          : `https://picsum.photos/seed/${BombayLane.escapeAttr(restaurant._id)}/400/200`;
        return `
          <article class="card restaurant-card fade-in">
            ${featuredBadge}
            <img src="${imgSrc}" alt="${BombayLane.escapeAttr(restaurant.name)}" loading="lazy">
            <div class="restaurant-card-body">
              <h3>${BombayLane.escapeHtml(restaurant.name)}</h3>
              <p class="muted cuisine-tags">${cuisineList}</p>
              <div class="restaurant-meta row">
                <span class="rating">★ ${Number(restaurant.averageRating || 0).toFixed(1)}</span>
                <span class="muted">🕐 ${restaurant.deliveryTimeMinutes || 30} min</span>
                <span class="${statusClass}">${statusText}</span>
              </div>
            </div>
            <a class="btn" href="/pages/menu.html">View Menu</a>
          </article>
        `;
      }).join('');

      if (container) container.insertAdjacentHTML('beforeend', cards);
      this.page += 1;
    } catch (error) {
      BombayLane.notify(error.message);
    }
  },

  // loadDetail kept for backward compatibility (restaurant-detail.html)
  async loadDetail() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (!id) return;

    const loadingEl = document.getElementById('restaurant-loading');
    if (loadingEl) loadingEl.style.display = '';

    try {
      const [restaurantRes, menuRes, reviewsRes] = await Promise.all([
        BombayLane.api.request(`/api/restaurants/${id}`),
        BombayLane.api.request(`/api/restaurants/${id}/menu`),
        BombayLane.api.request(`/api/restaurants/${id}/reviews`)
      ]);

      if (loadingEl) loadingEl.style.display = 'none';

      const r = restaurantRes.restaurant;
      const safeRestId = BombayLane.escapeAttr(r._id);
      const safeRestName = BombayLane.escapeAttr(r.name);

      document.title = `${r.name} | Bombay Lanes`;
      document.getElementById('restaurant-name').textContent = r.name;

      const heroSection = document.querySelector('.restaurant-hero');
      if (heroSection && r.image) {
        const heroImg = document.createElement('img');
        heroImg.src = r.image;
        heroImg.alt = r.name;
        heroImg.className = 'restaurant-hero-img';
        heroImg.loading = 'eager';
        heroSection.prepend(heroImg);
      }

      document.getElementById('restaurant-meta').innerHTML = `
        <span class="muted">${BombayLane.escapeHtml(r.location?.city || '')}</span>
        &nbsp;•&nbsp;
        <span class="rating">★ ${Number(r.averageRating || 0).toFixed(1)}</span>
        &nbsp;•&nbsp;
        <span class="muted">🕐 ${r.deliveryTimeMinutes || 30} min</span>
        &nbsp;•&nbsp;
        <span class="${r.isOpen ? 'status-open' : 'status-closed'}">${r.isOpen ? 'Open now' : 'Closed'}</span>
      `;
      document.getElementById('restaurant-description').textContent = r.description || '';
      document.getElementById('restaurant-hours').textContent =
        r.openingHours ? `Hours: ${r.openingHours.open} – ${r.openingHours.close}` : '';

      const items = menuRes.items || [];
      const categories = [...new Set(items.map((item) => item.category))].sort();
      const menu = document.getElementById('menu-list');

      if (!items.length) {
        menu.innerHTML = '<p class="card muted" style="text-align:center;padding:2rem">No menu items available.</p>';
      } else {
        menu.innerHTML = categories.map((cat) => {
          const catItems = items.filter((item) => item.category === cat);
          return `
            <section class="menu-category">
              <h3 class="category-title">${BombayLane.escapeHtml(cat)}</h3>
              <ul class="list">
                ${catItems.map((item) => {
                  const imgSrc = item.image
                    ? BombayLane.escapeAttr(item.image)
                    : `https://picsum.photos/seed/${BombayLane.escapeAttr(item._id)}/400/250`;
                  return `
                  <li class="card menu-item-card">
                    <img src="${imgSrc}" alt="${BombayLane.escapeAttr(item.name)}" class="menu-item-img" loading="lazy">
                    <div class="menu-item-body row">
                      <div class="menu-item-info">
                        <span class="veg-dot ${item.isVegetarian ? 'veg' : 'non-veg'}" title="${item.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}"></span>
                        <div>
                          <strong>${BombayLane.escapeHtml(item.name)}</strong>
                          <p class="muted item-desc">${BombayLane.escapeHtml(item.description || '')}</p>
                          <p class="item-price">£${Number(item.price || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      <button class="btn add-btn"
                        onclick="BombayLane.cart.add({ id: '${BombayLane.escapeAttr(item._id)}', name: '${BombayLane.escapeAttr(item.name)}', price: ${Number(item.price || 0)}, restaurantId: '${safeRestId}', restaurantName: '${safeRestName}' })">
                        Add
                      </button>
                    </div>
                  </li>
                `}).join('')}
              </ul>
            </section>
          `;
        }).join('');
      }

      const reviewsList = document.getElementById('reviews-list');
      if (reviewsList) {
        const reviews = reviewsRes.reviews || [];
        reviewsList.innerHTML = reviews.length
          ? reviews.map((rv) => `
              <li class="card">
                <div class="row">
                  <strong>${BombayLane.escapeHtml(rv.user?.name || 'Anonymous')}</strong>
                  <span class="rating">★ ${rv.rating}</span>
                </div>
                ${rv.comment ? `<p class="muted">${BombayLane.escapeHtml(rv.comment)}</p>` : ''}
              </li>
            `).join('')
          : '<li class="card muted">No reviews yet. Be the first!</li>';

        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
          reviewForm.dataset.restaurantId = id;
          reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rating = Number(reviewForm.querySelector('[name="rating"]').value);
            const comment = reviewForm.querySelector('[name="comment"]').value.trim();
            try {
              await BombayLane.api.request(`/api/restaurants/${id}/reviews`, {
                method: 'POST',
                body: JSON.stringify({ rating, comment })
              });
              BombayLane.notify('Review submitted!');
              reviewForm.reset();
              BombayLane.restaurants.loadDetail();
            } catch (err) {
              BombayLane.notify(err.message);
            }
          });
        }
      }

      const floatBtn = document.getElementById('view-cart-btn');
      if (floatBtn) BombayLane.cart.updateCount();

    } catch (error) {
      if (loadingEl) loadingEl.style.display = 'none';
      BombayLane.notify(error.message);
      const nameEl = document.getElementById('restaurant-name');
      if (nameEl) nameEl.textContent = 'Restaurant not found';
    }
  },

  init() {
    const search = document.getElementById('search-input');
    const cuisine = document.getElementById('cuisine-filter');

    if (search || cuisine) {
      const run = BombayLane.debounce(() => this.fetchList(true), 300);
      search?.addEventListener('input', run);
      cuisine?.addEventListener('change', run);
      this.fetchList(true);
    }

    this.loadDetail();
  }
};
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
        if (!container.children.length) container.innerHTML = '<p class="card muted" style="text-align:center;padding:2rem">No restaurants found.</p>';
        return;
      }

      const cards = data.map((restaurant) => {
        const cuisineList = (restaurant.cuisine || []).map((c) => BombayLane.escapeHtml(c)).join(', ');
        const statusClass = restaurant.isOpen ? 'status-open' : 'status-closed';
        const statusText = restaurant.isOpen ? 'Open' : 'Closed';
        const featuredBadge = restaurant.featured ? '<span class="featured-badge">★ Featured</span>' : '';
        const imgSrc = restaurant.image
          ? BombayLane.escapeAttr(restaurant.image)
          : `https://picsum.photos/seed/${BombayLane.escapeAttr(restaurant._id)}/400/200`;
        return `
          <article class="card restaurant-card fade-in">
            ${featuredBadge}
            <img src="${imgSrc}" alt="${BombayLane.escapeAttr(restaurant.name)}" loading="lazy">
            <div class="restaurant-card-body">
              <h3>${BombayLane.escapeHtml(restaurant.name)}</h3>
              <p class="muted cuisine-tags">${cuisineList}</p>
              <div class="restaurant-meta row">
                <span class="rating">★ ${Number(restaurant.averageRating || 0).toFixed(1)}</span>
                <span class="muted">🕐 ${restaurant.deliveryTimeMinutes || 30} min</span>
                <span class="${statusClass}">${statusText}</span>
              </div>
            </div>
            <a class="btn" href="/pages/restaurant-detail.html?id=${encodeURIComponent(restaurant._id)}">View Menu</a>
          </article>
        `;
      }).join('');

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

    const loadingEl = document.getElementById('restaurant-loading');
    if (loadingEl) loadingEl.style.display = '';

    try {
      const [restaurantRes, menuRes, reviewsRes] = await Promise.all([
        BombayLane.api.request(`/api/restaurants/${id}`),
        BombayLane.api.request(`/api/restaurants/${id}/menu`),
        BombayLane.api.request(`/api/restaurants/${id}/reviews`)
      ]);

      if (loadingEl) loadingEl.style.display = 'none';

      const r = restaurantRes.restaurant;
      const safeRestId = BombayLane.escapeAttr(r._id);
      const safeRestName = BombayLane.escapeAttr(r.name);

      document.title = `${r.name} | BombayLane`;
      document.getElementById('restaurant-name').textContent = r.name;

      // Show restaurant hero image if available
      const heroSection = document.querySelector('.restaurant-hero');
      if (heroSection && r.image) {
        const heroImg = document.createElement('img');
        heroImg.src = r.image;
        heroImg.alt = r.name;
        heroImg.className = 'restaurant-hero-img';
        heroImg.loading = 'eager';
        heroSection.prepend(heroImg);
      }

      document.getElementById('restaurant-meta').innerHTML = `
        <span class="muted">${BombayLane.escapeHtml(r.location?.city || '')}</span>
        &nbsp;•&nbsp;
        <span class="rating">★ ${Number(r.averageRating || 0).toFixed(1)}</span>
        &nbsp;•&nbsp;
        <span class="muted">🕐 ${r.deliveryTimeMinutes || 30} min</span>
        &nbsp;•&nbsp;
        <span class="${r.isOpen ? 'status-open' : 'status-closed'}">${r.isOpen ? 'Open now' : 'Closed'}</span>
      `;
      document.getElementById('restaurant-description').textContent = r.description || '';
      document.getElementById('restaurant-hours').textContent =
        r.openingHours ? `Hours: ${r.openingHours.open} – ${r.openingHours.close}` : '';

      // Group menu items by category
      const items = menuRes.items || [];
      const categories = [...new Set(items.map((item) => item.category))].sort();
      const menu = document.getElementById('menu-list');

      if (!items.length) {
        menu.innerHTML = '<p class="card muted" style="text-align:center;padding:2rem">No menu items available.</p>';
      } else {
        menu.innerHTML = categories.map((cat) => {
          const catItems = items.filter((item) => item.category === cat);
          return `
            <section class="menu-category">
              <h3 class="category-title">${BombayLane.escapeHtml(cat)}</h3>
              <ul class="list">
                ${catItems.map((item) => {
                  const imgSrc = item.image
                    ? BombayLane.escapeAttr(item.image)
                    : `https://picsum.photos/seed/${BombayLane.escapeAttr(item._id)}/400/250`;
                  return `
                  <li class="card menu-item-card">
                    <img src="${imgSrc}" alt="${BombayLane.escapeAttr(item.name)}" class="menu-item-img" loading="lazy">
                    <div class="menu-item-body row">
                      <div class="menu-item-info">
                        <span class="veg-dot ${item.isVegetarian ? 'veg' : 'non-veg'}" title="${item.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}"></span>
                        <div>
                          <strong>${BombayLane.escapeHtml(item.name)}</strong>
                          <p class="muted item-desc">${BombayLane.escapeHtml(item.description || '')}</p>
                          <p class="item-price">£${Number(item.price || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      <button class="btn add-btn"
                        onclick="BombayLane.cart.add({ id: '${BombayLane.escapeAttr(item._id)}', name: '${BombayLane.escapeAttr(item.name)}', price: ${Number(item.price || 0)}, restaurantId: '${safeRestId}', restaurantName: '${safeRestName}' })">
                        Add
                      </button>
                    </div>
                  </li>
                `}).join('')}
              </ul>
            </section>
          `;
        }).join('');
      }

      // Reviews section
      const reviewsList = document.getElementById('reviews-list');
      if (reviewsList) {
        const reviews = reviewsRes.reviews || [];
        reviewsList.innerHTML = reviews.length
          ? reviews.map((rv) => `
              <li class="card">
                <div class="row">
                  <strong>${BombayLane.escapeHtml(rv.user?.name || 'Anonymous')}</strong>
                  <span class="rating">★ ${rv.rating}</span>
                </div>
                ${rv.comment ? `<p class="muted">${BombayLane.escapeHtml(rv.comment)}</p>` : ''}
              </li>
            `).join('')
          : '<li class="card muted">No reviews yet. Be the first!</li>';

        // Review form
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
          reviewForm.dataset.restaurantId = id;
          reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rating = Number(reviewForm.querySelector('[name="rating"]').value);
            const comment = reviewForm.querySelector('[name="comment"]').value.trim();
            try {
              await BombayLane.api.request(`/api/restaurants/${id}/reviews`, {
                method: 'POST',
                body: JSON.stringify({ rating, comment })
              });
              BombayLane.notify('Review submitted!');
              reviewForm.reset();
              BombayLane.restaurants.loadDetail();
            } catch (err) {
              BombayLane.notify(err.message);
            }
          });
        }
      }

      // Floating cart button
      const floatBtn = document.getElementById('view-cart-btn');
      if (floatBtn) BombayLane.cart.updateCount();

    } catch (error) {
      if (loadingEl) loadingEl.style.display = 'none';
      BombayLane.notify(error.message);
      document.getElementById('restaurant-name').textContent = 'Restaurant not found';
    }
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
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
          this.fetchList();
        }
      });
    }

    this.loadDetail();
  }
};
