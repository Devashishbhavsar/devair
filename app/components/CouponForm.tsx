// CouponForm component
import React from 'react';

const CouponForm = () => {
  return (
    <form>
      <label htmlFor="couponCode">Coupon Code:</label>
      <input type="text" id="couponCode" name="couponCode" />
      <button type="submit">Apply Coupon</button>
    </form>
  );
};

export default CouponForm;
