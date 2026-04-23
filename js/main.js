window.BombayLane = window.BombayLane || {};

document.addEventListener('DOMContentLoaded', () => {
  BombayLane.cart?.updateCount?.();

  const cartRoot = document.getElementById('cart-items');
  if (cartRoot) BombayLane.cart.render();

  const themeToggle = document.getElementById('theme-toggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('bl_theme');
  const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  document.documentElement.dataset.theme = currentTheme;
  if (themeToggle) themeToggle.textContent = currentTheme === 'dark' ? 'Light mode' : 'Dark mode';

  themeToggle?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('bl_theme', next);
    themeToggle.textContent = next === 'dark' ? 'Light mode' : 'Dark mode';
  });

  document.querySelectorAll('img[data-src]').forEach((img) => {
    img.loading = 'lazy';
    img.src = img.dataset.src;
  });
});
