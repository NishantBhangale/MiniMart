const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  products: () => request('/products'),
  cart: (token) => request('/cart', { token }),
  addToCart: (token, productId, quantity = 1) =>
    request('/cart/items', { method: 'POST', body: { productId, quantity }, token }),
  removeFromCart: (token, productId) =>
    request(`/cart/items/${productId}`, { method: 'DELETE', token }),
  checkout: (token) => request('/checkout', { method: 'POST', token }),
  orders: (token) => request('/orders', { token }),
};
