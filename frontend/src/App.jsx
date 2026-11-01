import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Toast from './components/Toast.jsx';
import ShopPage from './pages/ShopPage.jsx';
import CartPage from './pages/CartPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<ShopPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Routes>
      <footer className="site-footer">MiniMart — a demo storefront. Stock counts update live from Redis.</footer>
      <Toast />
    </div>
  );
}
