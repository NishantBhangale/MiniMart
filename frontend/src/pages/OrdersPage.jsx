import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useStore } from '../store.jsx';

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrdersPage() {
  const { token, user } = useStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .orders(token)
      .then((data) => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, [token]);

  if (!user) {
    return (
      <div className="empty-state">
        <h3>Sign in to see your orders</h3>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Order history</h1>
      {loading ? (
        <p>Loading...</p>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p>Orders you place will show up here.</p>
        </div>
      ) : (
        orders.map((order) => (
          <div className="order-card" key={order.id}>
            <div className="order-head">
              <span>Order #{order.id.slice(0, 8)}</span>
              <span>{new Date(order.created_at).toLocaleString()}</span>
            </div>
            {order.items.map((item) => (
              <div className="order-item-row" key={item.id}>
                <span>
                  {item.product_name} × {item.quantity}
                </span>
                <span>{formatPrice(item.unit_price_cents * item.quantity)}</span>
              </div>
            ))}
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPrice(order.total_cents)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
