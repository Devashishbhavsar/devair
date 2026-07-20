// app/checkout/page.tsx
import React from 'react';
import { BookingStatusView } from './components/BookingStatusView';
import { ResendEmail } from './components/ResendEmail';
import { DownloadInvoice } from './components/DownloadInvoice';
import { CancelRequest } from './components/CancelRequest';
import { ExtendValidity } from './components/ExtendValidity';

const CheckoutPage: React.FC = () => {
  return (
    <div>
      <BookingStatusView />
      <ResendEmail />
      <DownloadInvoice />
      <CancelRequest />
      <ExtendValidity />
    </div>
  );
};

export default CheckoutPage;
