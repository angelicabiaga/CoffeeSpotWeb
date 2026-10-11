import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Coffee, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../Auth';
import { api } from '../api';
import { Form, Field, Alert, CoffeeArt } from '../components/UI';
export default function Login() {
  const { user, login, demo } = useAuth(),
    [register, setRegister] = useState(false),
    [success, setSuccess] = useState('');
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <Coffee />
          </span>
          <span>
            Coffee Spot<small>SHOP MANAGEMENT</small>
          </span>
        </div>
        <div>
          <span className="story-tag">A BETTER WAY TO RUN YOUR DAY</span>
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
        <div className="login-art">
          <CoffeeArt variant="latte" />
          <span>
            Freshly brewed.
            <br />
            <b>Thoughtfully managed.</b>
          </span>
        </div>
        <small>YOUR DAILY OPERATIONS, SIMPLIFIED.</small>
      </section>
      <section className="login-form-wrap">
        <div className="login-form">
          <div className="eyebrow">WELCOME TO YOUR WORKSPACE</div>
          <h2>{register ? 'Join the team' : 'Welcome back.'}</h2>
          <p>
            {register
              ? 'Create a staff account for manager approval.'
              : 'A fresh start to another great day.'}
          </p>
          <Alert success>{success}</Alert>
          <Form
            key={String(register)}
            submit={register ? 'Create account' : 'Login to workspace'}
            onSubmit={async (f) => {
              const values = Object.fromEntries(f);
              if (register) {
                if (values.password !== values.confirm)
                  throw {
                    response: { data: { message: 'Passwords do not match.' } },
                  };
                delete values.confirm;
                const { data } = await api.post('/auth/register', values);
                setSuccess(data.message);
                setRegister(false);
              } else await login(values);
            }}
          >
            {register && (
              <Field label="Full name">
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Your full name"
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@coffeespot.com"
              />
            </Field>
            <Field
              label="Password"
              hint={register ? 'At least 10 characters, with letters and numbers.' : null}
            >
              <input
                name="password"
                type="password"
                required
                minLength={register ? 10 : 1}
                maxLength={72}
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder="Enter your password"
              />
            </Field>
            {register && (
              <Field label="Confirm password">
                <input name="confirm" type="password" required autoComplete="new-password" />
              </Field>
            )}
          </Form>
          <button
            className="text-button auth-switch"
            onClick={() => {
              setRegister(!register);
              setSuccess('');
            }}
          >
            {register ? 'Already registered? Login' : 'New team member? Create an account'}
            <ArrowRight size={15} />
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
            <ShieldCheck size={16} />
            Secure access for your coffee shop team
          </div>
        </div>
      </section>
    </div>
  );
}
