import { PageTitle, useLoad, useTable, Pager, Loading, Alert, Empty } from '../components/UI';
import { dateTime } from '../api';
export default function Audit() {
  const t = useTable(),
    { data, error, loading } = useLoad('/audit?page=' + t.page);
  return (
    <>
      <PageTitle
        title="Activity history"
        subtitle="Important changes, with a clear record of who made them."
      />
      <section className="panel">
        <Alert>{error}</Alert>
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          <div className="table-responsive">
            <table className="table spot-table">
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>Team member</th>
                  <th>Action</th>
                  <th>Record</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a._id}>
                    <td>{dateTime(a.createdAt)}</td>
                    <td>{a.actor}</td>
                    <td>
                      <b>{a.action}</b>
                    </td>
                    <td>{a.target}</td>
                    <td className="audit-detail">{a.detail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No activity recorded yet" />
        )}
        <Pager data={data} page={t.page} setPage={t.setPage} />
      </section>
    </>
  );
}
