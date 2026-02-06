import React from 'react';
import './MetricCard.css';

export default function MetricCard({ 
  title, 
  value, 
  icon: IconComponent,
  trend, 
  color = 'info', 
  subtitle,
  onClick 
}) {
  const getTrendIcon = () => {
    if (trend === undefined || trend === null) return null;
    if (trend > 0) return '↗';
    if (trend < 0) return '↙';
    return '→';
  };

  const getTrendClass = () => {
    if (trend === undefined || trend === null) return '';
    if (trend > 0) return 'trend-up';
    if (trend < 0) return 'trend-down';
    return 'trend-neutral';
  };

  return (
    <div 
      className={`metric-card ${color} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="metric-header">
        <div className="metric-title-section">
          <div className="metric-icon">
            {IconComponent && <IconComponent size={20} />}
          </div>
          <div className="metric-title">{title}</div>
        </div>
      </div>
      
      <div className="metric-value">
        {value}
      </div>
      
      {subtitle && (
        <div className="metric-subtitle">
          {subtitle}
        </div>
      )}
      
      {trend !== undefined && trend !== null && (
        <div className={`metric-trend ${getTrendClass()}`}>
          <span className="trend-icon">{getTrendIcon()}</span>
          <span className="trend-value">
            {Math.abs(trend).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}