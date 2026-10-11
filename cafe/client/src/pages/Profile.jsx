import { useState } from 'react';
import { useAuth } from '../Auth';
import { api } from '../api';
import { PageTitle, Form, Field, Alert, Badge } from '../components/UI';
export default function Profile() {
  const { user, setUser, clear } = useAuth(),
    [success, setSuccess] = useState('');
  return (
    <>
      <PageTitle title="My profile" subtitle="Your details and account security." />
      <Alert success>{success}</Alert>
      <div className="profile-grid">
        <section className="panel">
          <div className="profile-identity">
            <div className="avatar large">{user.name.slice(0, 1)}</div>
            <h2>{user.name}</h2>
            <Badge>{user.role}</Badge>
          </div>
          <Form
            onSubmit={async (f) => {
              const { data } = await api.patch('/profile', {
                name: f.get('name'),
              });
              setUser(data.user);
              setSuccess('Your profile has been updated.');
            }}
          >
            <Field label="Full name">
              <input name="name" required minLength={2} maxLength={80} defaultValue={user.name} />
            </Field>
            <Field label="Email address" hint="Your login email is fixed for this account.">
              <input type="email" readOnly value={user.email} />
            </Field>
          </Form>
        </section>
        <section className="panel">
          <h2>Change password</h2>
          <p className="muted">
            Use at least 10 characters with letters and numbers. Changing your password ends all
            active sessions.
          </p>
          <Form
            submit="Update password"
            onSubmit={async (f) => {
              if (f.get('newPassword') !== f.get('confirm'))
                throw {
                  response: {
                    data: { message: 'New passwords do not match.' },
                  },
                };
              await api.post('/profile/password', {
                currentPassword: f.get('currentPassword'),
                newPassword: f.get('newPassword'),
              });
              clear();
            }}
          >
            <Field label="Current password">
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </Field>
            <Field label="New password">
              <input
                name="newPassword"
                type="password"
                required
                minLength={10}
                maxLength={72}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password">
              <input
                name="confirm"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </Field>
          </Form>
        </section>
      </div>
    </>
  );
}
