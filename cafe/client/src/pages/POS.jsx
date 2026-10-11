import { useState, useRef } from 'react';
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight, RefreshCw } from 'lucide-react';
import { api, money, message } from '../api';
import {
  useLoad,
  useTable,
  PageTitle,
  SearchInput,
  Loading,
  Empty,
  Alert,
  CoffeeArt,
  Modal,
  Field,
  Pager,
} from '../components/UI';
import Receipt from '../components/Receipt';
export default function POS() {
  const table = useTable(),
    [category, setCategory] = useState(''),
    [cart, setCart] = useState([]),
    [service, setService] = useState('Dine-in'),
    [checkout, setCheckout] = useState(false),
    [mobileCart, setMobileCart] = useState(false),
    [cash, setCash] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [receipt, setReceipt] = useState(null);
  const request = useRef(null);
  const {
    data,
    error: loadError,
    loading,
  } = useLoad(
    `/menu?active=true&${table.query}&category=${encodeURIComponent(category)}`,
    table.version,
  );
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const changeCart = (next) => {
    setCart(next);
    request.current = null;
    setError('');
  };
  const add = (m) => {
    const old = cart.find((i) => i._id === m._id);
    if ((old?.quantity || 0) >= Math.min(m.available, 100)) return;
    changeCart(
      old
        ? cart.map((i) => (i._id === m._id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...cart, { ...m, quantity: 1 }],
    );
  };
  const adjust = (id, delta) =>
    changeCart(
      cart.map((i) =>
        i._id === id
          ? {
              ...i,
              quantity: Math.max(1, Math.min(100, i.available, i.quantity + delta)),
            }
          : i,
      ),
    );
  const pay = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const payload = {
      requestId: request.current?.requestId || crypto.randomUUID(),
      items: cart.map((i) => ({ menuId: i._id, quantity: i.quantity })),
      service,
      cash: Math.round(Number(cash) * 100),
    };
    request.current = payload;
    try {
      const { data } = await api.post('/orders', payload);
      setReceipt(data);
      setCheckout(false);
      setCart([]);
      setCash('');
      request.current = null;
      table.refresh();
    } catch (e) {
      setError(message(e));
      if (e.response?.status < 500) request.current = null;
    } finally {
      setBusy(false);
    }
  };
  const cartView = (
    <>
      <div className="cart-title">
        <h2>Current order</h2>
        <span>
          {count} item{count === 1 ? '' : 's'}
        </span>
      </div>
      <div className="service-tabs">
        {['Dine-in', 'Takeaway'].map((v) => (
          <button
            className={service === v ? 'selected' : ''}
            key={v}
            onClick={() => {
              setService(v);
              request.current = null;
            }}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="cart-items">
        {cart.length ? (
          cart.map((i) => (
            <div className="cart-item" key={i._id}>
              <div>
                <b>{i.name}</b>
                <button
                  aria-label={`Remove ${i.name}`}
                  className="icon-button"
                  onClick={() => changeCart(cart.filter((x) => x._id !== i._id))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <small>{money(i.price)} each</small>
              <div>
                <div className="quantity">
                  <button
                    aria-label={`Decrease ${i.name}`}
                    disabled={i.quantity <= 1}
                    onClick={() => adjust(i._id, -1)}
                  >
                    <Minus size={14} />
                  </button>
                  <span>{i.quantity}</span>
                  <button
                    aria-label={`Increase ${i.name}`}
                    disabled={i.quantity >= Math.min(100, i.available)}
                    onClick={() => adjust(i._id, 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <strong>{money(i.price * i.quantity)}</strong>
              </div>
            </div>
          ))
        ) : (
          <Empty title="Ready for something good?" text="Choose a menu item to start an order." />
        )}
      </div>
      <div className="cart-summary">
        <div>
          <span>Subtotal</span>
          <b>{money(total)}</b>
        </div>
        <div className="total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
        <p>Stock and final prices are checked at payment.</p>
        <button
          className="btn btn-primary checkout-button"
          disabled={!cart.length}
          onClick={() => {
            setMobileCart(false);
            setCheckout(true);
            setError('');
          }}
        >
          Checkout <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
  return (
    <>
      <PageTitle title="Point of Sale" subtitle="A good cup starts with a great order.">
        <button className="btn btn-light" onClick={table.refresh}>
          <RefreshCw size={16} />
          Refresh menu
        </button>
      </PageTitle>
      <div className="pos-layout">
        <section>
          <div className="pos-toolbar">
            <SearchInput
              value={table.q}
              onChange={table.setQ}
              placeholder="Find a drink or pastry…"
            />
            <div className="category-tabs">
              {['', 'Coffee', 'Non-coffee', 'Pastries'].map((c) => (
                <button
                  key={c}
                  className={category === c ? 'selected' : ''}
                  onClick={() => {
                    setCategory(c);
                    table.setPage(1);
                  }}
                >
                  {c || 'All items'}
                </button>
              ))}
            </div>
          </div>
          <Alert>{loadError}</Alert>
          {loading ? (
            <Loading />
          ) : data?.items.length ? (
            <div className="product-grid">
              {data.items.map((m) => (
                <button
                  className="product-card"
                  key={m._id}
                  onClick={() => add(m)}
                  disabled={m.available <= 0}
                >
                  <CoffeeArt variant={m.visual} />
                  <div className="product-copy">
                    <small>{m.category}</small>
                    <h3>{m.name}</h3>
                    <div>
                      <strong>{money(m.price)}</strong>
                      <span className="add-circle">
                        <Plus size={17} />
                      </span>
                    </div>
                    <span className={'availability ' + (!m.available ? 'danger-text' : '')}>
                      {m.available ? `${m.available} available` : 'Out of stock'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Empty title="No products found" text="Try another search or add menu items." />
          )}
          <Pager data={data} page={table.page} setPage={table.setPage} />
        </section>
        <aside className="cart-panel desktop-cart">{cartView}</aside>
      </div>
      <button className="mobile-cart-launch btn btn-primary" onClick={() => setMobileCart(true)}>
        <ShoppingBag size={18} />
        View cart ({count})<strong>{money(total)}</strong>
      </button>
      {mobileCart && (
        <Modal title="Your cart" onClose={() => setMobileCart(false)}>
          {cartView}
        </Modal>
      )}
      {checkout && (
        <Modal title="Complete payment" onClose={() => !busy && setCheckout(false)}>
          <form onSubmit={pay}>
            <Alert>{error}</Alert>
            <div className="payment-total">
              <small>AMOUNT DUE</small>
              <strong>{money(total)}</strong>
              <span>
                {count} items · {service} · Cash payment
              </span>
            </div>
            <Field label="Cash received (PHP)">
              <input
                type="number"
                min={total / 100}
                step="0.01"
                required
                value={cash}
                onChange={(e) => {
                  setCash(e.target.value);
                  request.current = null;
                }}
                placeholder="0.00"
                autoFocus
                disabled={busy}
              />
            </Field>
            <div className="change-line">
              <span>Change</span>
              <b>{money(Math.max(0, Math.round(Number(cash) * 100) - total))}</b>
            </div>
            <p className="muted">
              If a connection times out, retry with the same amount. The checkout reference prevents
              duplicate orders.
            </p>
            <button
              className="btn btn-primary form-submit"
              disabled={busy || Math.round(Number(cash) * 100) < total}
            >
              {busy ? 'Processing payment…' : 'Confirm payment'}
            </button>
          </form>
        </Modal>
      )}
      {receipt && <Receipt order={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}
