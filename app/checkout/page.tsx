// Import necessary components and hooks
import React from 'react';
import { useBookingStatus } from './useBookingStatus';
import { ResendEmailButton, DownloadInvoiceButton, CancelRequestButton, ExtendValidityButton } from './Buttons';

const CheckoutPage = () => {
  const { status, handleResend, handleDownload, handleCancel, handleExtend } = useBookingStatus();

  return (
    <div>
      <h1>Booking Status: {status}</h1>
      <ResendEmailButton onClick={handleResend} disabled={!canSendEmail} />
      <DownloadInvoiceButton onClick={handleDownload} disabled={!invoiceAvailable} />
      <CancelRequestButton onClick={handleCancel} disabled={!cancelable} />
      <ExtendValidityButton onClick={handleExtend} disabled={!extendable} />
    </div>
  );
};

export default CheckoutPage;
