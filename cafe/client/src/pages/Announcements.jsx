import { useState } from 'react';
import { Plus, Coffee, Trash2, Megaphone } from 'lucide-react';
import { api, dateTime } from '../api';
import { useAuth } from '../Auth';
import {
  PageTitle,
  useTable,
  useLoad,
  Pager,
  Modal,
  Form,
  Field,
  Alert,
  Loading,
  Empty,
} from '../components/UI';
export default function Announcements() {
  const { user } = useAuth(),
    t = useTable(),
    [writing, setWriting] = useState(false),
    [deleting, setDeleting] = useState(null);
  const { data, error, loading } = useLoad('/announcements?page=' + t.page, t.version);
  return (
    <>
      <PageTitle title="Announcements" subtitle="A shared space for your coffee shop team.">
        {user.role === 'manager' && (
          <button className="btn btn-primary" onClick={() => setWriting(true)}>
            <Plus size={17} />
            Write announcement
          </button>
        )}
      </PageTitle>
      <Alert>{error}</Alert>
      <div className="announcement-feed">
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          data.items.map((a) => (
            <article className="panel announcement" key={a._id}>
              <div className="announcement-author">
                <span className="avatar">
                  <Coffee size={21} />
                </span>
                <span>
                  <b>{a.author}</b>
                  <small>{dateTime(a.createdAt)}</small>
                </span>
                {user.role === 'manager' && (
                  <button
                    className="icon-button"
                    aria-label={`Delete ${a.title}`}
                    onClick={() => setDeleting(a)}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
              <h2>{a.title}</h2>
              <p>{a.body}</p>
            </article>
          ))
        ) : (
          <Empty title="No announcements yet" />
        )}
        <Pager data={data} page={t.page} setPage={t.setPage} />
      </div>
      {writing && (
        <Modal title="Write announcement" onClose={() => setWriting(false)}>
          <Form
            submit="Publish announcement"
            onSubmit={async (f) => {
              await api.post('/announcements', Object.fromEntries(f));
              setWriting(false);
              t.refresh();
            }}
          >
            <Field label="Title">
              <input name="title" required minLength={3} maxLength={100} />
            </Field>
            <Field label="Message">
              <textarea name="body" required minLength={5} maxLength={1500} rows={5} />
            </Field>
          </Form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete announcement" onClose={() => setDeleting(null)}>
          <p>
            Delete <b>{deleting.title}</b>?
          </p>
          <Form
            submit="Delete announcement"
            onSubmit={async () => {
              await api.delete('/announcements/' + deleting._id);
              setDeleting(null);
              t.refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}
