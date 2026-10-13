
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Coffee,
  ArrowRight,
  ShieldCheck,
  UserRound,
  Mail,
  LockKeyhole,
} from 'lucide-react';
import { useAuth } from '../Auth';
import { api } from '../api';
import { Form, Field, Alert, CoffeeArt } from '../components/UI';

export default function Login() {
  const { user, login, demo } = useAuth();
  const [register, setRegister] = useState(false);
  const [success, setSuccess] = useState('');

  if (user) return <Navigate to="/" replace />;

  return (
    <div className={`login-page ${register ? 'register-mode' : 'login-mode'}`}>
      <section className="login-story">
        <div className="brand">
          <img
            src="/coffee-spot-logo.png"
            alt="Coffee Spot — Shop Management"
            className="brand-logo"
          />
        </div>

        <div className="story-copy">
          <span className="story-tag">
            <span className="story-line" />A BETTER WAY TO RUN YOUR DAY
          </span>

          <h1>
            Good coffee.
            <br />
            Great company.
            <br />
            <em>Smooth operations.</em>
          </h1>

          <p>
            Your orders, team, and inventory.
            <br />
            Together in one comfortable spot.
          </p>
        </div>

        <small className="story-footer">YOUR DAILY OPERATIONS, SIMPLIFIED.</small>
      </section>

      <section className="login-form-wrap">
        <div className="login-form">
          <div className="eyebrow">WELCOME TO YOUR WORKSPACE</div>

          <h2>{register ? 'Join the team' : 'Welcome back.'}</h2>

          <p className="form-intro">
            {register
              ? 'Create a staff account for manager approval.'
              : 'A fresh start to another great day.'}
          </p>

          <Alert success>{success}</Alert>

          <Form
            key={String(register)}
            className="coffee-auth-form"
            submit={register ? 'Create account' : 'Login to workspace'}
            onSubmit={async (f) => {
              const values = Object.fromEntries(f);

              if (register) {
                if (values.password !== values.confirm) {
                  throw {
                    response: {
                      data: { message: 'Passwords do not match.' },
                    },
                  };
                }

                delete values.confirm;
                const { data } = await api.post('/auth/register', values);
                setSuccess(data.message);
                setRegister(false);
              } else {
                await login(values);
              }
            }}
          >
            {register && (
              <Field label="Full name">
                <div className="coffee-input">
                  <UserRound aria-hidden="true" size={21} />
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    placeholder="Your full name"
                  />
                </div>
              </Field>
            )}

            <Field label="Email address">
              <div className="coffee-input">
                <Mail aria-hidden="true" size={21} />
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@coffeespot.com"
                />
              </div>
            </Field>

            <Field
              label="Password"
              hint={register ? 'At least 10 characters, with letters and numbers.' : null}
            >
              <div className="coffee-input">
                <LockKeyhole aria-hidden="true" size={21} />
                <input
                  name="password"
                  type="password"
                  required
                  minLength={register ? 10 : 1}
                  maxLength={72}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder="Enter your password"
                />
              </div>
            </Field>

            {register && (
              <Field label="Confirm password">
                <div className="coffee-input">
                  <LockKeyhole aria-hidden="true" size={21} />
                  <input
                    name="confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                  />
                </div>
              </Field>
            )}
          </Form>

          <button
            type="button"
            className="text-button auth-switch"
            onClick={() => {
              setRegister(!register);
              setSuccess('');
            }}
          >
            <span>
              {register ? 'Already registered? ' : 'New team member? '}
              <strong>{register ? 'Login' : 'Create an account'}</strong>
            </span>
            <ArrowRight size={17} />
          </button>

          {demo && (
            <div className="demo-login">
              <b>Explore the sample workspace</b>
              <span>Manager: manager@coffeespot.local</span>
              <span>Staff: staff@coffeespot.local</span>
              <span>Password: CoffeeSpot123!</span>
            </div>
          )}

          <div className="login-security">
            <ShieldCheck size={18} />
            <span>Secure access for your coffee shop team.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
