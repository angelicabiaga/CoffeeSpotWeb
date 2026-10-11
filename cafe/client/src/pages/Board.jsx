import { useState, useEffect } from 'react';
import { RefreshCw, Clock, ArrowRight } from 'lucide-react';
import { api, message, dateTime, allRecords } from '../api';
import { PageTitle, Empty, Loading, Alert, Badge } from '../components/UI';
export default function Board() {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [version, setVersion] = useState(0),
    [busy, setBusy] = useState('');
  useEffect(() => {
    let live = true;
    const load = () =>
      allRecords('/orders?board=true')
        .then((rows) => {
          if (live) {
            setData(rows.reverse());
            setError('');
          }
        })
        .catch((e) => live && setError(message(e)));
    load();
    const timer = setInterval(load, 10000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [version]);
  const advance = async (o) => {
    setBusy(o._id);
    try {
      await api.patch(`/orders/${o._id}/status`, {
        status: { Queued: 'Preparing', Preparing: 'Ready', Ready: 'Completed' }[o.status],
      });
      setVersion((v) => v + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy('');
    }
  };
  return (
    <>
      <PageTitle
        title="Preparation board"
        subtitle="From the first shot to the final handoff. Updates every 10 seconds."
      >
        <button className="btn btn-light" onClick={() => setVersion((v) => v + 1)}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </PageTitle>
      <Alert>{error}</Alert>
      {!data ? (
        <Loading />
      ) : (
        <div className="board-grid">
          {['Queued', 'Preparing', 'Ready'].map((status) => (
            <section className="board-column" key={status}>
              <div className="board-title">
                <Badge>{status}</Badge>
                <b>{data.filter((o) => o.status === status).length}</b>
              </div>
              {data.filter((o) => o.status === status).length ? (
                data
                  .filter((o) => o.status === status)
                  .map((o) => (
                    <article className="order-ticket" key={o._id}>
                      <div>
                        <strong>{o.number}</strong>
                        <span>{o.service}</span>
                      </div>
                      <small>
                        <Clock size={13} />
                        {dateTime(o.createdAt)}
                      </small>
                      <ul>
                        {o.items.map((i, k) => (
                          <li key={k}>
                            <b>{i.quantity}×</b>
                            {i.name}
                          </li>
                        ))}
                      </ul>
                      <button
                        className="btn btn-light"
                        disabled={!!busy}
                        onClick={() => advance(o)}
                      >
                        {busy === o._id
                          ? 'Updating…'
                          : {
                              Queued: 'Start preparing',
                              Preparing: 'Mark as ready',
                              Ready: 'Complete order',
                            }[status]}
                        <ArrowRight size={16} />
                      </button>
                    </article>
                  ))
              ) : (
                <Empty title="All clear" text="Orders will appear here." />
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
