import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShoppingBag, Wallet, Package, Clock, Plus, TrendingUp } from 'lucide-react';
import { useAuth } from '../Auth';
import { money } from '../api';
import {
  useLoad,
  PageTitle,
  Loading,
  Alert,
  Empty,
  DateFilter,
  initialRange,
  rangeQuery,
  CoffeeArt,
} from '../components/UI';
export default function Dashboard() {
  const { user } = useAuth(),
    [range, setRange] = useState(initialRange);
  const { data, error, loading } = useLoad('/dashboard?' + rangeQuery(range));
  const manager = user.role === 'manager';
  return (
    <>
      <PageTitle
        title={`Good day, ${user.name.split(' ')[0]}.`}
        subtitle="Here's what's brewing at Coffee Spot today."
      >
        <Link className="btn btn-primary" to="/pos">
          <Plus size={17} />
          New order
        </Link>
      </PageTitle>
      {manager && (
        <div className="filter-line">
          <span>
            Main Branch <b>•</b> Business overview
          </span>
          <DateFilter range={range} setRange={setRange} />
        </div>
      )}
      <Alert>{error}</Alert>
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <section className="welcome-banner">
              <div>
                <span className="banner-tag">YOUR DAILY BREW, AT A GLANCE</span>
                <h2>
                  More time for coffee.
                  <br />
                  Less time counting.
                </h2>
                <p>Keep your team in sync and every order on track.</p>
                <Link to="/board">
                  Open preparation board <ArrowUpRight size={17} />
                </Link>
              </div>
              <CoffeeArt variant="latte" />
            </section>
            <div className="stats-grid">
              {(manager
                ? [
                    [
                      Wallet,
                      'Sales revenue',
                      money(data.sales),
                      '/reports',
                      'Paid, non-voided orders',
                    ],
                    [
                      ShoppingBag,
                      'Total transactions',
                      data.transactions,
                      '/orders',
                      'Within the selected period',
                    ],
                  ]
                : [
                    [
                      ShoppingBag,
                      'Active products',
                      data.products,
                      '/menu',
                      'Ready for your daily service',
                    ],
                  ]
              )
                .concat([
                  [
                    Clock,
                    'In preparation',
                    data.preparing,
                    '/board',
                    'Live orders waiting to be served',
                  ],
                  [
                    Package,
                    'Stock alerts',
                    data.low.length,
                    '/inventory?low=true',
                    'Ingredients at reorder level',
                  ],
                ])
                .map(([Icon, label, value, path, hint]) => (
                  <Link
                    className="stat-card"
                    key={label}
                    to={
                      path +
                      (path.includes('?')
                        ? ''
                        : manager && ['/reports', '/orders'].includes(path)
                          ? '?' + rangeQuery(range)
                          : '')
                    }
                  >
                    <div>
                      <span className="stat-icon">
                        <Icon size={20} />
                      </span>
                      <ArrowUpRight size={17} />
                    </div>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <small>{hint}</small>
                  </Link>
                ))}
            </div>
            <div className="dashboard-grid">
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>{manager ? 'Sales overview' : 'Your next order starts here'}</h2>
                    <p>
                      {manager
                        ? 'Daily sales for your selected period'
                        : 'Everything you need for a smooth shift'}
                    </p>
                  </div>
                  <TrendingUp size={19} />
                </div>
                {manager ? (
                  data.trend.length ? (
                    <div className="bar-chart">
                      {data.trend.map((day) => (
                        <div
                          className="chart-column"
                          key={day._id}
                          title={`${day._id}: ${money(day.sales)}`}
                        >
                          <span>{money(day.sales)}</span>
                          <div
                            style={{
                              height: Math.max(
                                6,
                                (day.sales / Math.max(...data.trend.map((d) => d.sales))) * 150,
                              ),
                            }}
                          />
                          <small>{day._id.slice(5)}</small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="Your sales story starts here"
                      text="Complete a paid order to see your sales trend."
                    />
                  )
                ) : (
                  <div className="quick-links">
                    <Link to="/pos">
                      Create a customer order <ArrowUpRight size={18} />
                    </Link>
                    <Link to="/board">
                      Check drink preparation <ArrowUpRight size={18} />
                    </Link>
                    <Link to="/announcements">
                      Read team announcements <ArrowUpRight size={18} />
                    </Link>
                  </div>
                )}
              </section>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Stock needs attention</h2>
                    <p>Stay one step ahead of your next rush</p>
                  </div>
                  <Link to="/inventory?low=true" className="text-button">
                    View all
                  </Link>
                </div>
                {data.low.length ? (
                  data.low.slice(0, 4).map((i) => (
                    <Link to="/inventory?low=true" className="stock-alert-row" key={i._id}>
                      <span className="mini-icon">
                        <Package size={19} />
                      </span>
                      <span>
                        <b>{i.name}</b>
                        <small>
                          Reorder at {i.reorderLevel} {i.unit}
                        </small>
                      </span>
                      <strong className={i.stock === 0 ? 'danger-text' : ''}>
                        {i.stock} <small>{i.unit}</small>
                      </strong>
                    </Link>
                  ))
                ) : (
                  <Empty
                    title="All stocked up"
                    text="No ingredients are below their reorder level."
                  />
                )}
              </section>
            </div>
            {manager && (
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Customer favorites</h2>
                    <p>Top products by quantity sold</p>
                  </div>
                  <Link to="/reports" className="text-button">
                    View reports <ArrowUpRight size={16} />
                  </Link>
                </div>
                {data.top.length ? (
                  <div className="favorites">
                    {data.top.map((x, i) => (
                      <div key={x._id}>
                        <span className="rank">0{i + 1}</span>
                        <span>
                          <b>{x.name}</b>
                          <small>{x.quantity} sold</small>
                        </span>
                        <strong>{money(x.sales)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="Favorites are still brewing"
                    text="Top-selling items will appear after your first paid order."
                  />
                )}
              </section>
            )}
          </>
        )
      )}
    </>
  );
}
