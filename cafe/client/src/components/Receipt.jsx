import { Coffee, Printer } from 'lucide-react';
import { money, dateTime } from '../api';
import { Modal, Badge } from './UI';
export default function Receipt({ order, onClose }) {
  return (
    <Modal title="Receipt preview" onClose={onClose}>
      <div className="receipt">
        <Coffee size={28} />
        <h2>Coffee Spot</h2>
        <p>Main Branch · Sales receipt</p>
        <div className="receipt-meta">
          <b>{order.number}</b>
          <span>{dateTime(order.createdAt)}</span>
          <span>
            {order.cashierName} · {order.service}
          </span>
          <Badge>{order.status}</Badge>
        </div>
        {order.items.map((i, index) => (
          <div className="receipt-line" key={index}>
            <span>
              {i.quantity} × {i.name}
              <small>{money(i.price)} each</small>
            </span>
            <b>{money(i.price * i.quantity)}</b>
          </div>
        ))}
        <div className="receipt-line receipt-total">
          <span>Total</span>
          <b>{money(order.total)}</b>
        </div>
        <div className="receipt-line">
          <span>Cash</span>
          <span>{money(order.cash)}</span>
        </div>
        <div className="receipt-line">
          <span>Change</span>
          <span>{money(order.change)}</span>
        </div>
        {order.status === 'Voided' && (
          <div className="notice">
            <span>
              Voided · Cash refund {money(order.refunded)}
              <br />
              {order.voidReason}
            </span>
          </div>
        )}
        <p className="receipt-thanks">
          Thank you for stopping by.
          <br />
          See you at your next coffee break.
        </p>
        <small>System-generated record · Not a tax invoice</small>
      </div>
      <div className="modal-actions no-print">
        <button className="btn btn-light" onClick={onClose}>
          Close
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={17} />
          Print
        </button>
      </div>
    </Modal>
  );
}
