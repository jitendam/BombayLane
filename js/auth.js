window.BombayLane = window.BombayLane || {};

const passwordStrong = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value);

const setAuth = (token, user) => {
  localStorage.setItem('bl_token', token);
  localStorage.setItem('bl_user', JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem('bl_token');
  localStorage.removeItem('bl_user');
};

BombayLane.auth = {
  clearAuth,
  init() {
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const loginPanel = document.getElementById('panel-login');
    const registerPanel = document.getElementById('panel-register');

    loginTab?.addEventListener('click', () => {
      loginTab.classList.add('active'); registerTab.classList.remove('active');
      loginPanel.classList.remove('hidden'); registerPanel.classList.add('hidden');
    });
    registerTab?.addEventListener('click', () => {
      registerTab.classList.add('active'); loginTab.classList.remove('active');
      registerPanel.classList.remove('hidden'); loginPanel.classList.add('hidden');
    });

    const loginForm = document.getElementById('login-form');
    loginForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const btn = loginForm.querySelector('[type="submit"]');
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;
      if (btn) { btn.disabled = true; btn.textContent = 'Logging in…'; }
      try {
        const result = await BombayLane.api.request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        setAuth(result.token, result.user);
        BombayLane.notify('Welcome back! 👋');
        setTimeout(() => { window.location.href = '/index.html'; }, 700);
      } catch (error) {
        BombayLane.notify(error.message);
        if (btn) { btn.disabled = false; btn.textContent = 'Login'; }
      }
    });

    const registerForm = document.getElementById('register-form');
    registerForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const btn = registerForm.querySelector('[type="submit"]');
      const payload = {
        name: registerForm.name.value.trim(),
        email: registerForm.email.value.trim(),
        password: registerForm.password.value,
        role: registerForm.role.value,
        phone: registerForm.phone?.value?.trim() || '',
        address: registerForm.address?.value?.trim() || ''
      };

      if (!passwordStrong(payload.password)) {
        BombayLane.notify('Password needs uppercase, lowercase, number & symbol (8+ chars)');
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }
      try {
        const result = await BombayLane.api.request('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setAuth(result.token, result.user);
        BombayLane.notify('Account created! 🎉');
        setTimeout(() => { window.location.href = '/index.html'; }, 700);
      } catch (error) {
        BombayLane.notify(error.message);
        if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
      }
    });
  }
};
