import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('minimart_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('minimart_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [cartItems, setCartItems] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const refreshCart = useCallback(async () => {
    if (!token) return setCartItems([]);
    try {
      const data = await api.cart(token);
      setCartItems(data.items || []);
    } catch {
      setCartItems([]);
    }
  }, [token]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  function persistAuth(nextToken, nextUser) {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('minimart_token', nextToken);
    localStorage.setItem('minimart_user', JSON.stringify(nextUser));
  }

  function logout() {
    setToken(null);
    setUser(null);
    setCartItems([]);
    localStorage.removeItem('minimart_token');
    localStorage.removeItem('minimart_user');
  }

  async function addToCart(productId) {
    if (!token) {
      showToast('Sign in to add items to your cart.', 'error');
      return false;
    }
    try {
      const data = await api.addToCart(token, productId, 1);
      setCartItems(data.items || []);
      showToast('Added to cart.');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  }

  async function removeFromCart(productId) {
    if (!token) return;
    const data = await api.removeFromCart(token, productId);
    setCartItems(data.items || []);
  }

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const value = {
    token,
    user,
    cartItems,
    cartCount,
    toast,
    showToast,
    persistAuth,
    logout,
    addToCart,
    removeFromCart,
    refreshCart,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
