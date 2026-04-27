window.BombayLane = window.BombayLane || {};

document.addEventListener('DOMContentLoaded', () => {
  BombayLane.cart?.updateCount?.();

  const cartRoot = document.getElementById('cart-items');
  if (cartRoot) BombayLane.cart.render();

  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('bl_theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  document.documentElement.dataset.theme = savedTheme;
  if (themeToggle) themeToggle.textContent = savedTheme === 'dark' ? '☀️ Light' : '🌙 Dark';

  themeToggle?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('bl_theme', next);
    themeToggle.textContent = next === 'dark' ? '☀️ Light' : '🌙 Dark';
  });

  // Lazy load images
  document.querySelectorAll('img[data-src]').forEach((img) => {
    img.loading = 'lazy';
    img.src = img.dataset.src;
  });
});
