import React from 'react';
import './LoadingSpinner.css';

export default function LoadingSpinner({ message = 'Loading dashboard data...' }) {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
}