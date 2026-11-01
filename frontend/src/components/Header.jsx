import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';

export default function Header() {
  const { user, cartCount, logout } = useStore();
  const navigate = useNavigate();

  return (
    <header className="site-header">
      <Link to="/" className="wordmark">
        Mini<span>Mart</span>
      </Link>
      <nav className="nav-links">
        <Link to="/">Shop</Link>
        {user && <Link to="/orders">Orders</Link>}
        <Link to="/cart" className="cart-pill">
          Cart {cartCount > 0 ? `· ${cartCount}` : ''}
        </Link>
        {user ? (
          <button
            className="link"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Sign out
          </button>
        ) : (
          <Link to="/login">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
