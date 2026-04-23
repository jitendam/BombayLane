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
        if (!container.children.length) container.innerHTML = '<p class="card">No restaurants found.</p>';
        return;
      }

      const cards = data.map((restaurant) => `
        <article class="card restaurant-card fade-in">
          <img src="https://picsum.photos/seed/${BombayLane.escapeAttr(restaurant._id)}/400/200" alt="${BombayLane.escapeAttr(restaurant.name)}" loading="lazy">
          <h3>${BombayLane.escapeHtml(restaurant.name)}</h3>
          <p class="muted">${BombayLane.escapeHtml(restaurant.location?.city || '')}</p>
          <p class="rating">★ ${Number(restaurant.averageRating || 0).toFixed(1)}</p>
          <a class="btn" href="/pages/restaurant-detail.html?id=${encodeURIComponent(restaurant._id)}">View Menu</a>
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

    try {
      const [restaurantRes, menuRes] = await Promise.all([
        BombayLane.api.request(`/api/restaurants/${id}`),
        BombayLane.api.request(`/api/restaurants/${id}/menu`)
      ]);

      document.getElementById('restaurant-name').textContent = restaurantRes.restaurant.name;
      document.getElementById('restaurant-meta').textContent = `${restaurantRes.restaurant.location.city} • ${restaurantRes.restaurant.deliveryTimeMinutes} mins`;

      const menu = document.getElementById('menu-list');
      menu.innerHTML = (menuRes.items || []).map((item) => `
        <li class="card row">
          <div>
            <strong>${BombayLane.escapeHtml(item.name)}</strong>
            <p class="muted">₹${Number(item.price || 0)} • ${BombayLane.escapeHtml(item.category || 'General')}</p>
          </div>
          <button class="btn" onclick="BombayLane.cart.add({ id: '${BombayLane.escapeAttr(item._id)}', name: '${BombayLane.escapeAttr(item.name)}', price: ${Number(item.price || 0)}, restaurantId: '${BombayLane.escapeAttr(id)}' })">Add</button>
        </li>
      `).join('');
    } catch (error) {
      BombayLane.notify(error.message);
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
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 120) {
          this.fetchList();
        }
      });
    }

    this.loadDetail();
  }
};
