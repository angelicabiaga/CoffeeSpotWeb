import { useState } from 'react';
import { Users, Check, UserX } from 'lucide-react';
import { api, dateTime } from '../api';
import { useAuth } from '../Auth';
import {
  PageTitle,
  useLoad,
  useTable,
  SearchInput,
  Pager,
  Loading,
  Alert,
  Empty,
  Badge,
  Modal,
  Form,
} from '../components/UI';
export default function Team() {
  const { user } = useAuth(),
    t = useTable(),
    [selected, setSelected] = useState(null);
  const { data, error, loading } = useLoad('/users?' + t.query, t.version);
  return (
    <>
      <PageTitle title="Team members" subtitle="The people behind every great cup." />
      <section className="panel">
        <div className="toolbar">
          <SearchInput value={t.q} onChange={t.setQ} placeholder="Search team members…" />
          <span className="muted">New staff register on the login page.</span>
        </div>
        <Alert>{error}</Alert>
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          <div className="table-responsive">
            <table className="table spot-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <b>{u.name}</b>
                    </td>
                    <td>{u.email}</td>
                    <td className="capitalize">{u.role}</td>
                    <td>
                      <Badge>{u.status}</Badge>
                    </td>
                    <td>{dateTime(u.createdAt)}</td>
                    <td>
                      {u._id === user._id ? (
                        <span className="muted">You</span>
                      ) : (
                        <button className="btn btn-light btn-sm" onClick={() => setSelected(u)}>
                          {u.status === 'active' ? <UserX size={15} /> : <Check size={15} />}
                          {u.status === 'active' ? 'Disable' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
        <Pager data={data} page={t.page} setPage={t.setPage} />
      </section>
      {selected && (
        <Modal
          title={selected.status === 'active' ? 'Disable account' : 'Activate account'}
          onClose={() => setSelected(null)}
        >
          <p>
            {selected.status === 'active'
              ? 'Disable access and revoke active sessions for'
              : 'Approve workspace access for'}{' '}
            <b>{selected.name}</b>?
          </p>
          <Form
            submit="Confirm account change"
            onSubmit={async () => {
              await api.patch('/users/' + selected._id, {
                status: selected.status === 'active' ? 'disabled' : 'active',
              });
              setSelected(null);
              t.refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}
