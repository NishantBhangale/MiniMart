import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useStore } from '../store.jsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { persistAuth, refreshCart, showToast } = useStore();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      persistAuth(data.token, data.user);
      await refreshCart();
      showToast(`Welcome back, ${data.user.name.split(' ')[0]}.`);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>Sign in</h2>
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button className="primary-btn" type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
      <p className="form-note">
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </form>
  );
}
