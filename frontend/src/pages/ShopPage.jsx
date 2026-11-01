import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useStore } from '../store.jsx';

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const { addToCart } = useStore();

  useEffect(() => {
    api
      .products()
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  const visible = category === 'All' ? products : products.filter((p) => p.category === category);
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

  return (
    <div>
      <section className="hero">
        <div>
          <h1>Everyday goods, kept in good stock.</h1>
          <p>
            A small general store. What you see below is what's actually on the shelf right
            now — stock counts update the moment someone else checks out.
          </p>
        </div>
        <div className="hero-figure">
          <span className="tag-num">{loading ? '—' : totalStock}</span>
          <span className="tag-label">units in stock across the store</span>
          <div className="tag-row">
            <span>Products listed</span>
            <span>{products.length}</span>
          </div>
          <div className="tag-row">
            <span>Categories</span>
            <span>{Math.max(categories.length - 1, 0)}</span>
          </div>
        </div>
      </section>

      <div className="filter-row">
        {categories.map((c) => (
          <button
            key={c}
            className={`filter-chip ${category === c ? 'active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading shelf...</p>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing here yet</h3>
          <p>This category is empty for now.</p>
        </div>
      ) : (
        <div className="product-grid">
          {visible.map((p) => (
            <div className="product-card" key={p.id}>
              <div className="thumb">
                <img src={p.image_url} alt={p.name} loading="lazy" />
              </div>
              <div className="body">
                <span className="category">{p.category}</span>
                <h3>{p.name}</h3>
                <div className="price-row">
                  <span className="price">{formatPrice(p.price_cents)}</span>
                  <span className={`stock-note ${p.stock <= 5 ? 'low' : ''}`}>
                    {p.stock === 0 ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left` : `${p.stock} in stock`}
                  </span>
                </div>
                <button className="add-btn" disabled={p.stock === 0} onClick={() => addToCart(p.id)}>
                  {p.stock === 0 ? 'Out of stock' : 'Add to cart'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
