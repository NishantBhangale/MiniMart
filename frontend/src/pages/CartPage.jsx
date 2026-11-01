import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useStore } from '../store.jsx';

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CartPage() {
  const { token, cartItems, removeFromCart, refreshCart, showToast, user } = useStore();
  const [placing, setPlacing] = useState(false);
  const navigate = useNavigate();

  const total = cartItems.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  async function handleCheckout() {
    setPlacing(true);
    try {
      await api.checkout(token);
      showToast('Order placed.');
      await refreshCart();
      navigate('/orders');
    } catch (err) {
      showToast(err.message, 'error');
      await refreshCart();
    } finally {
      setPlacing(false);
    }
  }

  if (!user) {
    return (
      <div className="empty-state">
        <h3>Sign in to see your cart</h3>
        <p>Your cart is tied to your account so it's there next time you visit.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Your cart</h1>
      {cartItems.length === 0 ? (
        <div className="empty-state">
          <h3>Your cart is empty</h3>
          <p>Carts clear automatically after 30 minutes of inactivity.</p>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {cartItems.map((item) => (
              <div className="cart-line" key={item.productId}>
                <img src={item.imageUrl} alt={item.name} />
                <div className="info">
                  <h4>{item.name}</h4>
                  <div className="qty-controls">
                    <span>Qty {item.quantity}</span>
                    <button className="remove-link" onClick={() => removeFromCart(item.productId)}>
                      Remove
                    </button>
                  </div>
                </div>
                <span className="price">{formatPrice(item.priceCents * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="summary-card">
            <div className="summary-row">
              <span>Items</span>
              <span>{cartItems.reduce((s, i) => s + i.quantity, 0)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button className="primary-btn" disabled={placing} onClick={handleCheckout}>
              {placing ? 'Placing order...' : 'Place order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
