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
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    loginForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;
      try {
        const result = await BombayLane.api.request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        setAuth(result.token, result.user);
        BombayLane.notify('Logged in successfully');
      } catch (error) {
        BombayLane.notify(error.message);
      }
    });

    registerForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        name: registerForm.name.value.trim(),
        email: registerForm.email.value.trim(),
        password: registerForm.password.value,
        role: registerForm.role.value,
        phone: registerForm.phone.value.trim(),
        address: registerForm.address.value.trim()
      };

      if (!passwordStrong(payload.password)) {
        BombayLane.notify('Password must include uppercase, lowercase, number, and symbol.');
        return;
      }

      try {
        const result = await BombayLane.api.request('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setAuth(result.token, result.user);
        BombayLane.notify('Registration complete');
      } catch (error) {
        BombayLane.notify(error.message);
      }
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
      clearAuth();
      BombayLane.notify('Logged out');
    });
  }
};
