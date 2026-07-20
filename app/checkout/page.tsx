// Import necessary libraries and components
import React from 'react';
import { BookingStatusView } from './components/BookingStatusView';
import { ResendEmailButton } from './components/ResendEmailButton';
import { DownloadInvoiceButton } from './components/DownloadInvoiceButton';
import { CancelRequestButton } from './components/CancelRequestButton';
import { ExtendValidityButton } from './components/ExtendValidityButton';

// Define the main component for the checkout page
const CheckoutPage: React.FC = () => {
  return (
    <div className="checkout-page">
      <BookingStatusView />
      <ResendEmailButton />
      <DownloadInvoiceButton />
      <CancelRequestButton />
      <ExtendValidityButton />
    </div>
  );
};

export default CheckoutPage;
