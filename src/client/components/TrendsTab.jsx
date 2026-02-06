import React, { useState, useEffect } from 'react';
import { display } from '../utils/fields.js';
import { groupByTimeInterval } from '../utils/chartUtils.js';
import { logTabLoad } from '../utils/logger.js';
import {
  Ticket,
  RefreshCw,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Timer,
  AlertTriangle
} from 'lucide-react';
import './TrendsTab.css';

export default function TrendsTab({ filters, lastUpdated, services, onLoadingChange }) {
  const [trendsData, setTrendsData] = useState({
    incidentTrends: [],
    changeTrends: [],
    slaTrends: [],
    mttrTrends: []
  });
  const [selectedTrend, setSelectedTrend] = useState('incidents');
  const [timeInterval, setTimeInterval] = useState('day');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTrendsData();
  }, [filters, lastUpdated, services, timeInterval]);

  const loadTrendsData = async () => {
    const t0 = performance.now();
    try {
      onLoadingChange(true);
      setError(null);

      const [incidentTimeSeries, changeTimeSeries, slaData, resolvedIncidents] = await Promise.all([
        services.incident.getIncidentTimeSeries(filters),
        services.change.getChangeTimeSeries(filters),
        services.sla.getSLAPerformance(filters),
        services.incident.getResolvedIncidents(filters)
      ]);

      // Process incident trends
      const incidentGroups = groupByTimeInterval(
        incidentTimeSeries.map(i => ({ sys_created_on: display(i.sys_created_on) })), 
        'sys_created_on', 
        timeInterval
      );

      const incidentTrends = Object.entries(incidentGroups)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .map(([date, incidents]) => ({
          date: formatDateLabel(date, timeInterval),
          count: incidents.length,
          type: 'incidents'
        }));

      // Process change trends
      const changeGroups = groupByTimeInterval(
        changeTimeSeries.map(c => ({ sys_created_on: display(c.sys_created_on) })), 
        'sys_created_on', 
        timeInterval
      );

      const changeTrends = Object.entries(changeGroups)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .map(([date, changes]) => ({
          date: formatDateLabel(date, timeInterval),
          count: changes.length,
          type: 'changes'
        }));

      // Process SLA trends (compliance over time)
      const slaGroups = groupByTimeInterval(
        slaData.map(s => ({ 
          sys_created_on: display(s.sys_created_on),
          has_breached: display(s.has_breached)
        })), 
        'sys_created_on', 
        timeInterval
      );

      const slaTrends = Object.entries(slaGroups)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .map(([date, slas]) => {
          const total = slas.length;
          const breached = slas.filter(s => s.has_breached === 'true').length;
          const compliance = total > 0 ? Math.round(((total - breached) / total) * 100) : 100;
          
          return {
            date: formatDateLabel(date, timeInterval),
            count: compliance,
            type: 'sla_compliance'
          };
        });

      // Process MTTR trends
      const mttrGroups = groupByTimeInterval(
        resolvedIncidents
          .filter(i => display(i.resolved_at) && display(i.sys_created_on))
          .map(i => {
            const created = new Date(display(i.sys_created_on));
            const resolved = new Date(display(i.resolved_at));
            const mttr = (resolved - created) / (1000 * 60 * 60); // hours
            
            return {
              sys_created_on: display(i.sys_created_on),
              mttr: mttr > 0 ? mttr : 0
            };
          }), 
        'sys_created_on', 
        timeInterval
      );

      const mttrTrends = Object.entries(mttrGroups)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .map(([date, incidents]) => {
          const mttrValues = incidents.map(i => i.mttr).filter(m => m > 0);
          const avgMttr = mttrValues.length > 0 ? 
            Math.round((mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length) * 10) / 10 : 0;
          
          return {
            date: formatDateLabel(date, timeInterval),
            count: avgMttr,
            type: 'mttr'
          };
        });

      setTrendsData({
        incidentTrends,
        changeTrends,
        slaTrends,
        mttrTrends
      });

      logTabLoad('Trends', {
        durationMs: Math.round(performance.now() - t0),
        dataSummary: {
          'incident time series': `${incidentTimeSeries.length} raw → ${incidentTrends.length} data points`,
          'change time series': `${changeTimeSeries.length} raw → ${changeTrends.length} data points`,
          'sla records': `${slaData.length} raw → ${slaTrends.length} data points`,
          'resolved (mttr)': `${resolvedIncidents.length} raw → ${mttrTrends.length} data points`,
          'interval': timeInterval
        }
      });

    } catch (err) {
      console.error('Failed to load trends data:', err);
      setError(err.message);
    } finally {
      onLoadingChange(false);
    }
  };

  const getCurrentTrendData = () => {
    switch (selectedTrend) {
      case 'incidents':
        return trendsData.incidentTrends;
      case 'changes':
        return trendsData.changeTrends;
      case 'sla':
        return trendsData.slaTrends;
      case 'mttr':
        return trendsData.mttrTrends;
      default:
        return [];
    }
  };

  const getTrendConfig = () => {
    const configs = {
      incidents: {
        title: 'Incident Volume Trends',
        yLabel: 'Number of Incidents',
        color: '#F44336',
        icon: Ticket
      },
      changes: {
        title: 'Change Request Trends',
        yLabel: 'Number of Changes',
        color: '#2196F3',
        icon: RefreshCw
      },
      sla: {
        title: 'SLA Compliance Trends',
        yLabel: 'Compliance %',
        color: '#4CAF50',
        icon: Clock
      },
      mttr: {
        title: 'MTTR Trends',
        yLabel: 'Average Hours',
        color: '#FF9800',
        icon: Zap
      }
    };
    return configs[selectedTrend] || configs.incidents;
  };

  if (error) {
    return (
      <div className="trends-tab error-state">
        <h2><AlertTriangle size={20} style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}} />Error Loading Trends Data</h2>
        <p>{error}</p>
        <button onClick={loadTrendsData} className="retry-btn">Retry</button>
      </div>
    );
  }

  const trendConfig = getTrendConfig();
  const currentData = getCurrentTrendData();

  return (
    <div className="trends-tab">
      <div className="trends-header">
        <h2><TrendingUp size={24} style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}} />Trends Analysis</h2>
        <p>Time series analysis and historical performance trends</p>
      </div>

      <div className="trends-controls">
        <div className="trend-type-selector">
          <button
            className={selectedTrend === 'incidents' ? 'active' : ''}
            onClick={() => setSelectedTrend('incidents')}
          >
            <Ticket size={16} style={{display: 'inline', marginRight: '6px', verticalAlign: 'middle'}} />Incidents
          </button>
          <button
            className={selectedTrend === 'changes' ? 'active' : ''}
            onClick={() => setSelectedTrend('changes')}
          >
            <RefreshCw size={16} style={{display: 'inline', marginRight: '6px', verticalAlign: 'middle'}} />Changes
          </button>
          <button
            className={selectedTrend === 'sla' ? 'active' : ''}
            onClick={() => setSelectedTrend('sla')}
          >
            <Clock size={16} style={{display: 'inline', marginRight: '6px', verticalAlign: 'middle'}} />SLA Compliance
          </button>
          <button
            className={selectedTrend === 'mttr' ? 'active' : ''}
            onClick={() => setSelectedTrend('mttr')}
          >
            <Zap size={16} style={{display: 'inline', marginRight: '6px', verticalAlign: 'middle'}} />MTTR
          </button>
        </div>

        <div className="time-interval-selector">
          <label>Time Interval:</label>
          <select value={timeInterval} onChange={(e) => setTimeInterval(e.target.value)}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      <div className="trends-chart-container">
        <h3>
          {trendConfig.icon && React.createElement(trendConfig.icon, { size: 20, style: {display: 'inline', marginRight: '8px', verticalAlign: 'middle'} })}
          {trendConfig.title}
        </h3>
        <div className="trends-chart">
          <TrendChart 
            data={currentData}
            color={trendConfig.color}
            yLabel={trendConfig.yLabel}
          />
        </div>
      </div>

      <div className="trends-insights">
        <h3><BarChart3 size={20} style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}} />Trend Insights</h3>
        <div className="insights-grid">
          {generateTrendInsights(trendsData, selectedTrend).map((insight, index) => (
            <div key={index} className={`insight-card ${insight.type}`}>
              <span className="insight-icon">{React.createElement(insight.icon, { size: 24 })}</span>
              <div className="insight-content">
                <h4>{insight.title}</h4>
                <p>{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="trends-summary">
        <h3><TrendingUp size={20} style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}} />Trend Summary</h3>
        <div className="summary-cards">
          <div className="summary-card">
            <h4><Ticket size={16} style={{display: 'inline', marginRight: '6px', verticalAlign: 'middle'}} />Incidents</h4>
            <p>Trend: {calculateTrend(trendsData.incidentTrends)}</p>
            <p>Total: {trendsData.incidentTrends.reduce((sum, d) => sum + d.count, 0)}</p>
          </div>
          <div className="summary-card">
            <h4><RefreshCw size={16} style={{display: 'inline', marginRight: '6px', verticalAlign: 'middle'}} />Changes</h4>
            <p>Trend: {calculateTrend(trendsData.changeTrends)}</p>
            <p>Total: {trendsData.changeTrends.reduce((sum, d) => sum + d.count, 0)}</p>
          </div>
          <div className="summary-card">
            <h4><Clock size={16} style={{display: 'inline', marginRight: '6px', verticalAlign: 'middle'}} />SLA Compliance</h4>
            <p>Average: {calculateAverage(trendsData.slaTrends.map(d => d.count)).toFixed(1)}%</p>
            <p>Trend: {calculateTrend(trendsData.slaTrends)}</p>
          </div>
          <div className="summary-card">
            <h4><Zap size={16} style={{display: 'inline', marginRight: '6px', verticalAlign: 'middle'}} />MTTR</h4>
            <p>Average: {calculateAverage(trendsData.mttrTrends.map(d => d.count)).toFixed(1)}h</p>
            <p>Trend: {calculateTrend(trendsData.mttrTrends)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Trend Chart Component
function TrendChart({ data, color, yLabel }) {
  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No trend data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d.count));
  const minValue = Math.min(...data.map(d => d.count));

  return (
    <div className="trend-chart">
      <div className="chart-y-axis">
        <div className="y-axis-label">{yLabel}</div>
        <div className="y-axis-scale">
          <span>{maxValue}</span>
          <span>{Math.round((maxValue + minValue) / 2)}</span>
          <span>{minValue}</span>
        </div>
      </div>
      <div className="chart-content">
        <svg viewBox="0 0 800 300" className="trend-svg">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line 
              key={i}
              x1="0" 
              y1={i * 60} 
              x2="800" 
              y2={i * 60}
              stroke="var(--border-color, #e0e0e0)"
              strokeWidth="1"
            />
          ))}
          
          {/* Trend line */}
          <polyline
            points={data.map((d, i) => {
              const x = (i / Math.max(data.length - 1, 1)) * 800;
              const y = maxValue > 0 ? 240 - ((d.count - minValue) / (maxValue - minValue)) * 240 : 120;
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="3"
          />
          
          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / Math.max(data.length - 1, 1)) * 800;
            const y = maxValue > 0 ? 240 - ((d.count - minValue) / (maxValue - minValue)) * 240 : 120;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill={color}
                className="data-point"
              />
            );
          })}
        </svg>
        <div className="chart-x-axis">
          {data.map((d, i) => (
            <span key={i} className="x-axis-label">
              {d.date}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatDateLabel(dateString, interval) {
  const date = new Date(dateString);
  
  switch (interval) {
    case 'hour':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
             ' ' + date.getHours() + 'h';
    case 'day':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'week':
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    default:
      return date.toLocaleDateString();
  }
}

function calculateTrend(data) {
  if (!data || data.length < 2) return 'No trend';

  const recent = data.slice(-5);
  const older = data.slice(-10, -5);

  if (recent.length === 0 || older.length === 0) return 'Insufficient data';

  const recentAvg = recent.reduce((sum, d) => sum + d.count, 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + d.count, 0) / older.length;

  if (recentAvg > olderAvg * 1.1) return 'Increasing';
  if (recentAvg < olderAvg * 0.9) return 'Decreasing';
  return 'Stable';
}

function calculateAverage(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function generateTrendInsights(trendsData, selectedTrend) {
  const insights = [];
  const { incidentTrends, changeTrends, slaTrends, mttrTrends } = trendsData;

  if (selectedTrend === 'incidents' && incidentTrends.length > 0) {
    const trend = calculateTrend(incidentTrends);
    if (trend.includes('Increasing')) {
      insights.push({
        type: 'warning',
        icon: TrendingUp,
        title: 'Rising Incident Volume',
        description: 'Incident rate trending upward'
      });
    } else if (trend.includes('Decreasing')) {
      insights.push({
        type: 'positive',
        icon: TrendingDown,
        title: 'Improving Stability',
        description: 'Incident rate declining'
      });
    }
  }

  if (selectedTrend === 'sla' && slaTrends.length > 0) {
    const avgCompliance = calculateAverage(slaTrends.map(d => d.count));
    if (avgCompliance >= 95) {
      insights.push({
        type: 'positive',
        icon: Target,
        title: 'Excellent SLA Performance',
        description: `${avgCompliance.toFixed(1)}% average compliance`
      });
    } else if (avgCompliance < 85) {
      insights.push({
        type: 'critical',
        icon: AlertTriangle,
        title: 'SLA Below Target',
        description: `${avgCompliance.toFixed(1)}% average compliance`
      });
    }
  }

  if (selectedTrend === 'mttr' && mttrTrends.length > 0) {
    const trend = calculateTrend(mttrTrends);
    if (trend.includes('Decreasing')) {
      insights.push({
        type: 'positive',
        icon: Zap,
        title: 'Improving Resolution Times',
        description: 'MTTR trending downward'
      });
    } else if (trend.includes('Increasing')) {
      insights.push({
        type: 'warning',
        icon: Timer,
        title: 'Rising Resolution Times',
        description: 'MTTR trending upward'
      });
    }
  }

  return insights;
}