import React from 'react';

const AdminDashboard = () => {
  return (
    <div className='bg-zinc-100 p-4 rounded-lg shadow-md'>
      <h1 className='text-xl font-bold mb-4'>Admin Dashboard</h1>
      <div className='grid grid-cols-2 gap-4'>
        <div className='bg-white p-3 rounded-lg shadow-sm'>
          <h2 className='text-lg font-semibold'>Totals</h2>
          <ul>
            <li>Reservations: 0</li>
            <li>Paid: $0.00</li>
            <li>Expired: 0</li>
            <li>Revenue: $0.00</li>
          </ul>
        </div>
        <div className='bg-white p-3 rounded-lg shadow-sm'>
          <h2 className='text-lg font-semibold'>Daily Sales/Holds Breakdown</h2>
          <ul>
            <li>Today: $0.00</li>
            <li>Yesterday: $0.00</li>
            <li>Last 7 Days: $0.00</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
