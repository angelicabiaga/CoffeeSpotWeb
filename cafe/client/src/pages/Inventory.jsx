import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, History, PackagePlus, Package } from 'lucide-react';
import { api, dateTime } from '../api';
import { useAuth } from '../Auth';
import {
  PageTitle,
  useLoad,
  useTable,
  SearchInput,
  Pager,
  Modal,
  Form,
  Field,
  Alert,
  Loading,
  Empty,
  Badge,
} from '../components/UI';
function HistoryModal({ item, onClose }) {
  const [page, setPage] = useState(1);
  const { data, error, loading } = useLoad(`/movements?ingredient=${item._id}&page=${page}`);
  return (
    <Modal title={`${item.name} · Stock history`} onClose={onClose} wide>
      <Alert>{error}</Alert>
      {loading ? (
        <Loading />
      ) : data?.items.length ? (
        <div className="table-responsive">
          <table className="table spot-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>Change</th>
                <th>Balance</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((m) => (
                <tr key={m._id}>
                  <td>
                    {dateTime(m.createdAt)}
                    <small>{m.actor}</small>
                  </td>
                  <td>{m.type}</td>
                  <td>
                    {m.quantity > 0 ? '+' : ''}
                    {m.quantity} {m.unit}
                  </td>
                  <td>
                    {m.balance} {m.unit}
                  </td>
                  <td>{m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty />
      )}
      <Pager data={data} page={page} setPage={setPage} />
    </Modal>
  );
}
export default function Inventory() {
  const { user } = useAuth(),
    t = useTable(),
    [params] = useSearchParams(),
    [low, setLow] = useState(params.get('low') === 'true'),
    [editing, setEditing] = useState(null),
    [receiving, setReceiving] = useState(null),
    [history, setHistory] = useState(null),
    [deleting, setDeleting] = useState(null),
    [success, setSuccess] = useState(''),
    [type, setType] = useState('Receipt');
  const { data, error, loading } = useLoad(`/ingredients?${t.query}&low=${low}`, t.version);
  const done = () => {
    setEditing(null);
    setReceiving(null);
    setDeleting(null);
    setSuccess('Inventory updated successfully.');
    t.refresh();
  };
  const manager = user.role === 'manager';
  return (
    <>
      <PageTitle title="Stock inventory" subtitle="Know what you have. Be ready for what's next.">
        {manager && (
          <button
            className="btn btn-primary"
            onClick={() =>
              setEditing({
                name: '',
                unit: 'g',
                reorderLevel: 0,
                supplier: 'San Juan Head Office',
                active: true,
              })
            }
          >
            <Plus size={17} />
            Add ingredient
          </button>
        )}
      </PageTitle>
      <Alert success>{success}</Alert>
      <section className="panel">
        <div className="toolbar">
          <SearchInput value={t.q} onChange={t.setQ} placeholder="Search ingredients…" />
          <label className="check-field">
            <input
              type="checkbox"
              checked={low}
              onChange={(e) => {
                setLow(e.target.checked);
                t.setPage(1);
              }}
            />
            Low stock only
          </label>
        </div>
        <Alert>{error}</Alert>
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          <div className="table-responsive">
            <table className="table spot-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Stock level</th>
                  <th>Reorder at</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  {manager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.items.map((i) => (
                  <tr key={i._id}>
                    <td>
                      <div className="ingredient-cell">
                        <span className="mini-icon">
                          <Package size={19} />
                        </span>
                        <b>{i.name}</b>
                      </div>
                    </td>
                    <td>
                      <div className="stock-level">
                        <b>
                          {i.stock} {i.unit}
                        </b>
                        <div className="stock-meter">
                          <span
                            className={
                              i.stock === 0 ? 'zero' : i.stock <= i.reorderLevel ? 'low' : ''
                            }
                            style={{
                              width:
                                Math.max(
                                  3,
                                  Math.min(100, (i.stock / Math.max(1, i.reorderLevel * 3)) * 100),
                                ) + '%',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      {i.reorderLevel} {i.unit}
                    </td>
                    <td>{i.supplier || '—'}</td>
                    <td>
                      <Badge
                        tone={
                          !i.active
                            ? 'gray'
                            : i.stock === 0
                              ? 'red'
                              : i.stock <= i.reorderLevel
                                ? 'yellow'
                                : 'green'
                        }
                      >
                        {!i.active
                          ? 'Archived'
                          : i.stock === 0
                            ? 'Out of stock'
                            : i.stock <= i.reorderLevel
                              ? 'Low stock'
                              : 'In stock'}
                      </Badge>
                    </td>
                    {manager && (
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            title="Receive or adjust stock"
                            aria-label={`Receive ${i.name}`}
                            disabled={!i.active}
                            onClick={() => {
                              setReceiving(i);
                              setType('Receipt');
                            }}
                          >
                            <PackagePlus size={18} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`History of ${i.name}`}
                            onClick={() => setHistory(i)}
                          >
                            <History size={18} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Edit ${i.name}`}
                            onClick={() => setEditing(i)}
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            className="icon-button danger-text"
                            aria-label={`Delete ${i.name}`}
                            onClick={() => setDeleting(i)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={low ? 'No low-stock ingredients' : 'No ingredients found'} />
        )}
        <Pager data={data} page={t.page} setPage={t.setPage} />
      </section>
      {editing && (
        <Modal
          title={editing._id ? 'Edit ingredient' : 'Add ingredient'}
          onClose={() => setEditing(null)}
        >
          <Form
            submit={editing._id ? 'Save ingredient' : 'Add ingredient'}
            onSubmit={async (f) => {
              const body = {
                name: f.get('name'),
                unit: editing._id ? editing.unit : f.get('unit'),
                reorderLevel: Number(f.get('reorderLevel')),
                supplier: f.get('supplier'),
                active: f.get('active') === 'on',
              };
              if (editing._id) await api.patch('/ingredients/' + editing._id, body);
              else await api.post('/ingredients', body);
              done();
            }}
          >
            <Field label="Ingredient name">
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={editing.name}
              />
            </Field>
            <div className="form-grid">
              <Field label="Base unit" hint="Base units stay fixed after creation.">
                <select name="unit" defaultValue={editing.unit} disabled={!!editing._id}>
                  <option value="g">Grams (g)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="piece">Pieces</option>
                </select>
              </Field>
              <Field label="Reorder level">
                <input
                  name="reorderLevel"
                  required
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={editing.reorderLevel}
                />
              </Field>
            </div>
            <Field label="Supplier">
              <input name="supplier" maxLength={120} defaultValue={editing.supplier} />
            </Field>
            <label className="check-field">
              <input type="checkbox" name="active" defaultChecked={editing.active} />
              Active ingredient
            </label>
            <p className="muted">
              New ingredients start at zero stock. Use Receive stock to record a delivery.
            </p>
          </Form>
        </Modal>
      )}
      {receiving && (
        <Modal title={`Stock update · ${receiving.name}`} onClose={() => setReceiving(null)}>
          <p>
            Available:{' '}
            <b>
              {receiving.stock} {receiving.unit}
            </b>{' '}
            · Supplier: {receiving.supplier || 'Not set'}
          </p>
          <Form
            submit="Record stock movement"
            onSubmit={async (f) => {
              await api.post('/stock', {
                ingredient: receiving._id,
                type,
                quantity: Number(f.get('quantity')),
                reason: f.get('reason'),
              });
              done();
            }}
          >
            <Field label="Movement type">
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option>Receipt</option>
                <option>Adjustment</option>
              </select>
            </Field>
            <Field
              label={`Quantity change (${receiving.unit})`}
              hint={
                type === 'Adjustment'
                  ? 'Use a negative number to remove stock, or a positive number to add it.'
                  : 'Use the base unit. For example, 1 liter of milk is 1,000 ml.'
              }
            >
              <input
                name="quantity"
                type="number"
                required
                step="1"
                min={type === 'Receipt' ? 1 : -receiving.stock}
              />
            </Field>
            <Field label="Reason or delivery reference">
              <textarea name="reason" required minLength={3} maxLength={250} rows={2} />
            </Field>
          </Form>
        </Modal>
      )}
      {history && <HistoryModal item={history} onClose={() => setHistory(null)} />}{' '}
      {deleting && (
        <Modal title="Delete ingredient" onClose={() => setDeleting(null)}>
          <p>
            Delete <b>{deleting.name}</b>? Ingredients used in recipes or stock history must be
            archived instead.
          </p>
          <Form
            submit="Delete ingredient"
            onSubmit={async () => {
              await api.delete('/ingredients/' + deleting._id);
              done();
            }}
          />
        </Modal>
      )}
    </>
  );
}
