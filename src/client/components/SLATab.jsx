import React, { useState, useEffect } from 'react';
import { Clock, Target, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { display, value } from '../utils/fields.js';
import MetricCard from './MetricCard.jsx';
import './SLATab.css';

export default function SLATab({ filters, lastUpdated, services, onLoadingChange }) {
  const [slaData, setSlaData] = useState({
    complianceRate: { rate: 0, total: 0, breached: 0, compliant: 0 },
    breaches: [],
    performance: [],
    slaTypes: []
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSLAData();
  }, [filters, lastUpdated, services]);

  const loadSLAData = async () => {
    try {
      onLoadingChange(true);
      setError(null);

      const [complianceRate, breaches, performance, slaTypes] = await Promise.all([
        services.sla.getSLAComplianceRate(filters),
        services.sla.getSLABreaches(filters),
        services.sla.getSLAPerformance(filters),
        services.sla.getSLATypes()
      ]);

      setSlaData({
        complianceRate,
        breaches,
        performance,
        slaTypes
      });

    } catch (err) {
      console.error('Failed to load SLA data:', err);
      setError(err.message);
    } finally {
      onLoadingChange(false);
    }
  };

  const getSLAsByType = () => {
    const slasByType = {};
    slaData.performance.forEach(sla => {
      const slaType = display(sla.sla) || 'Unknown';
      if (!slasByType[slaType]) {
        slasByType[slaType] = { total: 0, breached: 0 };
      }
      slasByType[slaType].total++;
      if (display(sla.has_breached) === 'true') {
        slasByType[slaType].breached++;
      }
    });

    return Object.entries(slasByType).map(([type, data]) => ({
      type,
      total: data.total,
      breached: data.breached,
      compliance: data.total > 0 ? Math.round(((data.total - data.breached) / data.total) * 100) : 0
    }));
  };

  const getRecentBreaches = () => {
    return slaData.breaches
      .sort((a, b) => new Date(display(b.sys_created_on)) - new Date(display(a.sys_created_on)))
      .slice(0, 10);
  };

  if (error) {
    return (
      <div className="sla-tab error-state">
        <h2>Error Loading SLA Data</h2>
        <p>{error}</p>
        <button onClick={loadSLAData} className="retry-btn">Retry</button>
      </div>
    );
  }

  const { complianceRate } = slaData;

  return (
    <div className="sla-tab">
      <div className="sla-header">
        <h2>SLA Performance Dashboard</h2>
        <p>Service Level Agreement tracking and breach analysis</p>
      </div>

      <div className="sla-metrics">
        <div className="metrics-row">
          <MetricCard
            title="Overall Compliance"
            value={`${complianceRate.rate}%`}
            icon={Target}
            color={complianceRate.rate >= 95 ? 'success' : complianceRate.rate >= 85 ? 'warning' : 'critical'}
            subtitle={`${complianceRate.compliant} of ${complianceRate.total} SLAs`}
          />
          
          <MetricCard
            title="Total SLAs"
            value={complianceRate.total}
            icon={Clock}
            color="info"
            subtitle="Active service level agreements"
          />
          
          <MetricCard
            title="Breached SLAs"
            value={complianceRate.breached}
            icon={AlertCircle}
            color="critical"
            subtitle="Require immediate attention"
          />
          
          <MetricCard
            title="Compliant SLAs"
            value={complianceRate.compliant}
            icon={CheckCircle}
            color="success"
            subtitle="Meeting service targets"
          />
        </div>
      </div>

      <div className="sla-content-grid">
        <div className="sla-types-breakdown">
          <h3>SLA Performance by Type</h3>
          <div className="sla-types-list">
            {getSLAsByType().map(slaTypeData => (
              <div key={slaTypeData.type} className="sla-type-item">
                <div className="sla-type-header">
                  <span className="sla-type-name">{slaTypeData.type}</span>
                  <span className={`sla-compliance ${
                    slaTypeData.compliance >= 95 ? 'excellent' : 
                    slaTypeData.compliance >= 85 ? 'good' : 'poor'
                  }`}>
                    {slaTypeData.compliance}%
                  </span>
                </div>
                <div className="sla-type-details">
                  <span className="sla-detail">
                    <CheckCircle size={12} style={{ marginRight: '4px' }} />
                    {slaTypeData.total - slaTypeData.breached} compliant
                  </span>
                  <span className="sla-detail breach">
                    <AlertCircle size={12} style={{ marginRight: '4px' }} />
                    {slaTypeData.breached} breached
                  </span>
                </div>
                <div className="sla-progress-bar">
                  <div 
                    className="sla-progress-fill"
                    style={{ width: `${slaTypeData.compliance}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="recent-breaches">
          <h3>Recent SLA Breaches</h3>
          <div className="breaches-list">
            {getRecentBreaches().map(breach => (
              <div key={value(breach.sys_id)} className="breach-item">
                <div className="breach-header">
                  <AlertTriangle size={16} className="breach-icon" />
                  <span className="breach-task">
                    {display(breach.task) || 'Unknown Task'}
                  </span>
                  <span className="breach-time">
                    {formatBreachTime(display(breach.sys_created_on))}
                  </span>
                </div>
                <div className="breach-details">
                  <span className="breach-sla">
                    SLA: {display(breach.sla) || 'Unknown'}
                  </span>
                  <span className="breach-percentage">
                    Performance: {display(breach.percentage)}%
                  </span>
                </div>
              </div>
            ))}
            {getRecentBreaches().length === 0 && (
              <div className="no-breaches">
                <CheckCircle size={48} className="success-icon" />
                <p>No recent SLA breaches - excellent performance!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sla-insights">
        <h3>SLA Performance Insights</h3>
        <div className="insights-grid">
          {generateSLAInsights(slaData).map((insight, index) => (
            <div key={index} className={`insight-card ${insight.type}`}>
              <div className="insight-content">
                <h4>{insight.title}</h4>
                <p>{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sla-gauge">
        <h3>SLA Compliance Gauge</h3>
        <div className="gauge-container">
          <SLAGauge percentage={complianceRate.rate} />
          <div className="gauge-label">
            <strong>{complianceRate.rate}%</strong>
            <br />
            Overall Compliance
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple SLA Gauge component
function SLAGauge({ percentage }) {
  const getColor = (pct) => {
    if (pct >= 95) return '#4CAF50';
    if (pct >= 85) return '#FF9800'; 
    return '#F44336';
  };

  const rotation = (percentage / 100) * 180 - 90;

  return (
    <div className="sla-gauge-wrapper">
      <div className="sla-gauge-arc">
        <div 
          className="sla-gauge-needle"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            borderTopColor: getColor(percentage)
          }}
        />
      </div>
      <div className="sla-gauge-labels">
        <span className="gauge-label-left">0%</span>
        <span className="gauge-label-right">100%</span>
      </div>
    </div>
  );
}

// Helper functions
function formatBreachTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Recent';
}

function generateSLAInsights(slaData) {
  const insights = [];
  const { complianceRate } = slaData;

  if (complianceRate.rate >= 99) {
    insights.push({
      type: 'success',
      title: 'Outstanding Performance',
      description: 'SLA compliance exceeds 99% - world-class service delivery'
    });
  } else if (complianceRate.rate >= 95) {
    insights.push({
      type: 'success',
      title: 'Excellent Compliance',
      description: 'SLA performance meets industry best practices'
    });
  } else if (complianceRate.rate < 85) {
    insights.push({
      type: 'critical',
      title: 'Critical SLA Issues',
      description: 'Compliance below 85% requires immediate action'
    });
  }

  if (slaData.breaches.length === 0) {
    insights.push({
      type: 'success',
      title: 'Zero Breaches',
      description: 'No SLA breaches in the current period'
    });
  } else if (slaData.breaches.length > 10) {
    insights.push({
      type: 'warning',
      title: 'High Breach Volume',
      description: `${slaData.breaches.length} breaches indicate systemic issues`
    });
  }

  return insights;
}