import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Eye, RotateCcw, Printer } from 'lucide-react';
import { useAuth } from '../Auth';
import { api, money, dateTime, message } from '../api';
import {
  PageTitle,
  useTable,
  useLoad,
  SearchInput,
  Pager,
  Alert,
  Loading,
  Empty,
  Badge,
  Modal,
  Form,
  Field,
  DateFilter,
  initialRange,
  rangeQuery,
} from '../components/UI';
import Receipt from '../components/Receipt';
export default function Orders({ reports = false }) {
  const { user } = useAuth(),
    t = useTable(),
    [params] = useSearchParams(),
    [range, setRange] = useState(() =>
      params.has('from')
        ? { from: params.get('from') || '', to: params.get('to') || '' }
        : initialRange(),
    ),
    [status, setStatus] = useState(''),
    [receipt, setReceipt] = useState(null),
    [voiding, setVoiding] = useState(null),
    [error, setError] = useState(''),
    [preview, setPreview] = useState(false);
  const query = `${t.query}&${rangeQuery(range)}&status=${status}`;
  const result = useLoad('/orders?' + query, t.version);
  const stats = useLoad('/dashboard?' + rangeQuery(range), t.version);
  const manager = user.role === 'manager';
  const download = async () => {
    try {
      const r = await api.get('/reports/export?' + query, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Coffee-Spot-Sales.csv';
      a.click();
      URL.revokeObjectURL(url);
      setPreview(false);
    } catch (e) {
      setError(message(e));
    }
  };
  return (
    <>
      <PageTitle
        title={reports ? 'Sales & reports' : 'Transactions'}
        subtitle={
          reports
            ? 'A clear picture of your shop’s performance.'
            : manager
              ? 'Every order, with a history you can trace.'
              : 'Your transactions and receipts.'
        }
      >
        {manager && (
          <button className="btn btn-light" onClick={() => setPreview(true)}>
            <Download size={16} />
            Export CSV
          </button>
        )}
      </PageTitle>
      <div className="filter-line">
        <span>Business dates · Asia/Manila</span>
        <DateFilter
          range={range}
          setRange={(r) => {
            setRange(r);
            t.setPage(1);
          }}
        />
      </div>
      {reports && stats.data && (
        <div className="report-stats">
          <div>
            <small>Sales revenue</small>
            <strong>{money(stats.data.sales)}</strong>
          </div>
          <div>
            <small>Paid transactions</small>
            <strong>{stats.data.transactions}</strong>
          </div>
          <div>
            <small>Average order value</small>
            <strong>
              {money(
                stats.data.transactions
                  ? Math.round(stats.data.sales / stats.data.transactions)
                  : 0,
              )}
            </strong>
          </div>
        </div>
      )}
      <Alert>{error || result.error || (reports ? stats.error : '')}</Alert>
      <section className="panel">
        <div className="toolbar">
          <SearchInput value={t.q} onChange={t.setQ} placeholder="Search order number…" />
          <select
            aria-label="Order status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              t.setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {['Queued', 'Preparing', 'Ready', 'Completed', 'Voided'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {result.loading ? (
          <Loading />
        ) : result.data?.items.length ? (
          <div className="table-responsive">
            <table className="table spot-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date & time</th>
                  <th>Cashier</th>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <b>{o.number}</b>
                      <small>{o.items.reduce((a, i) => a + i.quantity, 0)} items</small>
                    </td>
                    <td>{dateTime(o.createdAt)}</td>
                    <td>{o.cashierName}</td>
                    <td>{o.service}</td>
                    <td>
                      <b>{money(o.total)}</b>
                      {o.status === 'Voided' && <small className="danger-text">Refunded</small>}
                    </td>
                    <td>
                      <Badge>{o.status}</Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={`View ${o.number}`}
                          onClick={() => setReceipt(o)}
                        >
                          <Eye size={18} />
                        </button>
                        {manager && o.status !== 'Voided' && (
                          <button
                            className="icon-button danger-text"
                            aria-label={`Void ${o.number}`}
                            onClick={() => setVoiding(o)}
                          >
                            <RotateCcw size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No transactions in this view"
            text="Adjust the date range or complete a new order."
          />
        )}
        <Pager data={result.data} page={t.page} setPage={t.setPage} />
      </section>
      {reports && stats.data?.top.length > 0 && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Top-selling products</h2>
              <p>Paid, non-voided sales in the selected period</p>
            </div>
          </div>
          <div className="favorites">
            {stats.data.top.map((i, n) => (
              <div key={i._id}>
                <span className="rank">{n + 1}</span>
                <span>
                  <b>{i.name}</b>
                  <small>{i.quantity} sold</small>
                </span>
                <strong>{money(i.sales)}</strong>
              </div>
            ))}
          </div>
        </section>
      )}
      {receipt && <Receipt order={receipt} onClose={() => setReceipt(null)} />}{' '}
      {voiding && (
        <Modal title="Void order & record refund" onClose={() => setVoiding(null)}>
          <p>
            <b>{voiding.number}</b> · Cash refund: <b>{money(voiding.total)}</b>
          </p>
          <p>
            {voiding.status === 'Queued'
              ? 'This order has not started preparation. Its ingredients will be restored once.'
              : 'Preparation has started. Consumed ingredients will be kept as waste; stock will not be restored.'}
          </p>
          <Form
            submit="Confirm void and cash refund"
            onSubmit={async (f) => {
              await api.post(`/orders/${voiding._id}/void`, {
                reason: f.get('reason'),
              });
              setVoiding(null);
              t.refresh();
            }}
          >
            <Field label="Reason for void">
              <textarea name="reason" required minLength={5} maxLength={300} rows={3} />
            </Field>
            <label className="check-field">
              <input type="checkbox" required />I have returned the cash to the customer.
            </label>
          </Form>
        </Modal>
      )}
      {preview && (
        <Modal title="Sales export preview" onClose={() => setPreview(false)}>
          <p>
            Export all <b>{result.data?.total || 0}</b> matching transactions for{' '}
            <b>
              {range.from || 'the beginning'} to {range.to || 'today and later'}
            </b>
            .
          </p>
          <p>
            Columns: order number, Manila date and time, status, service type, cashier, sales in
            PHP, and refund in PHP.
          </p>
          <p>
            Voided orders have zero sales and show their refund separately. The export includes all
            matching pages.
          </p>
          <div className="modal-actions">
            <button className="btn btn-light" onClick={() => setPreview(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={download}>
              <Download size={16} />
              Download CSV
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
