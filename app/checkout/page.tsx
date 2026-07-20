// Import necessary modules and components
import React from 'react';
import { BookingStatusView } from './components/BookingStatusView';
import { ResendEmail } from './components/ResendEmail';
import { DownloadInvoice } from './components/DownloadInvoice';
import { CancelRequest } from './components/CancelRequest';
import { ExtendValidity } from './components/ExtendValidity';

// Main component for checkout page
const CheckoutPage = () => {
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
