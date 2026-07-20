// app/om/page.tsx
import React from 'react';
import { useBookingStatus, resendEmail, downloadInvoice, requestCancel, extendValidity } from '@/lib/api/om';

const OMPage: React.FC = () => {
  const bookingStatus = useBookingStatus(); // Custom hook to fetch booking status

  return (
    <div className="bg-zinc-100 p-4">
      <h1>OM Actions</h1>
      <p>Status: {bookingStatus}</p>
      <button onClick={() => resendEmail()}>Resend Email</button>
      <button onClick={() => downloadInvoice()}>Download Invoice</button>
      <button onClick={() => requestCancel()}>Request Cancel</button>
      <button onClick={() => extendValidity()}>Extend Validity</button>
    </div>
  );
};

export default OMPage;
