// app/checkout/page.tsx
import React from 'react';
import { Status, resendEmail, downloadInvoice, requestCancel, extendValidity } from '../services/omService';

const CheckoutPage: React.FC = () => {
  return (
    <div>
      <h1>Booking Status</h1>
      <Status />
      <button onClick={resendEmail}>Resend Email</button>
      <button onClick={downloadInvoice}>Download Invoice</button>
      <button onClick={requestCancel}>Request Cancel</button>
      <button onClick={extendValidity}>Extend Validity</button>
    </div>
  );
};

export default CheckoutPage;
