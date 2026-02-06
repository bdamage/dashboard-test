import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Circle, User, Clock } from 'lucide-react';
import { display, value } from '../utils/fields.js';
import { groupByTimeInterval } from '../utils/chartUtils.js';
import MetricCard from './MetricCard.jsx';
import { logTabLoad } from '../utils/logger.js';
import './IncidentTab.css';

export default function IncidentTab({ filters, lastUpdated, services, onLoadingChange }) {
  const [incidentData, setIncidentData] = useState({
    openIncidents: [],
    priorityCounts: {},
    categoryBreakdown: {},
    timeSeries: []
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadIncidentData();
  }, [filters, lastUpdated, services]);

  const loadIncidentData = async () => {
    const t0 = performance.now();
    try {
      onLoadingChange(true);
      setError(null);

      const [openIncidents, priorityCounts, categoryData, timeSeriesData] = await Promise.all([
        services.incident.getOpenIncidents(filters),
        services.incident.getIncidentCountsByPriority(filters),
        services.incident.getIncidentsByCategory(filters),
        services.incident.getIncidentTimeSeries(filters)
      ]);

      // Process category breakdown
      const categoryBreakdown = {};
      categoryData.forEach(incident => {
        const category = display(incident.category) || 'Unknown';
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      });

      setIncidentData({
        openIncidents,
        priorityCounts,
        categoryBreakdown,
        timeSeries: timeSeriesData
      });

      logTabLoad('Incidents', {
        durationMs: Math.round(performance.now() - t0),
        dataSummary: {
          'open incidents': `${openIncidents.length} records`,
          'priority counts': JSON.stringify(priorityCounts),
          'categories': `${Object.keys(categoryBreakdown).length} categories`,
          'time series': `${timeSeriesData.length} data points`
        }
      });

    } catch (err) {
      console.error('Failed to load incident data:', err);
      setError(err.message);
    } finally {
      onLoadingChange(false);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'P1': return AlertCircle;
      case 'P2': return AlertTriangle;
      case 'P3': return Circle;
      case 'P4': return CheckCircle;
      default: return Circle;
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'P1': 'critical',
      'P2': 'warning',
      'P3': 'info',
      'P4': 'success'
    };
    return colors[priority] || 'info';
  };

  const getIncidentUrl = (incidentNumber) => {
    // ServiceNow incident URL format
    return `/nav_to.do?uri=incident.do?sysparm_query=number=${incidentNumber}`;
  };

  if (error) {
    return (
      <div className="incident-tab error-state">
        <h2>Error Loading Incident Data</h2>
        <p>{error}</p>
        <button onClick={loadIncidentData} className="retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="incident-tab">
      <div className="incident-header">
        <h2>Incident Analytics</h2>
        <p>Detailed incident analysis and trends</p>
      </div>

      <div className="priority-metrics">
        <h3>Incidents by Priority</h3>
        <div className="priority-cards">
          {Object.entries(incidentData.priorityCounts).map(([priority, count]) => {
            const IconComponent = getPriorityIcon(priority);
            
            return (
              <MetricCard
                key={priority}
                title={`${priority} ${getPriorityLabel(priority)}`}
                value={count}
                icon={IconComponent}
                color={getPriorityColor(priority)}
              />
            );
          })}
        </div>
      </div>

      <div className="incident-content-grid">
        <div className="category-breakdown">
          <h3>Top Categories</h3>
          <div className="category-list">
            {Object.entries(incidentData.categoryBreakdown)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 8)
              .map(([category, count]) => (
                <div key={category} className="category-item">
                  <span className="category-name">{category}</span>
                  <span className="category-count">{count}</span>
                  <div className="category-bar">
                    <div 
                      className="category-progress"
                      style={{ 
                        width: `${(count / Math.max(...Object.values(incidentData.categoryBreakdown))) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="recent-incidents">
          <h3>Recent High Priority Incidents</h3>
          <div className="incidents-table">
            {incidentData.openIncidents
              .filter(incident => ['1', '2'].includes(display(incident.priority)))
              .sort((a, b) => new Date(display(b.sys_created_on)) - new Date(display(a.sys_created_on)))
              .slice(0, 10)
              .map(incident => {
                const priority = display(incident.priority);
                const PriorityIcon = getPriorityIcon(`P${priority}`);
                
                return (
                  <div key={value(incident.sys_id)} className="incident-row">
                    <div className="incident-number">
                      <span className={`priority-badge p${priority}`}>
                        <PriorityIcon size={12} />
                        P{priority}
                      </span>
                      <a
                        href={getIncidentUrl(display(incident.number))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="incident-link"
                        title="Click to open incident in ServiceNow"
                      >
                        {display(incident.number)}
                      </a>
                    </div>
                    <div className="incident-description">
                      {display(incident.short_description)}
                    </div>
                    <div className="incident-assignee">
                      <User size={12} style={{ marginRight: '4px' }} />
                      {display(incident.assigned_to) || 'Unassigned'}
                    </div>
                    <div className="incident-age">
                      <Clock size={12} style={{ marginRight: '4px' }} />
                      {calculateAge(display(incident.sys_created_on))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div className="incident-timeline">
        <h3>Incident Creation Timeline</h3>
        <SimpleChart data={getTimelineData(incidentData.timeSeries)} />
      </div>
    </div>
  );
}

// Simple chart component using HTML/CSS
function SimpleChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d.count));

  return (
    <div className="simple-chart">
      {data.map((point, index) => (
        <div key={index} className="chart-bar">
          <div 
            className="bar"
            style={{ height: `${(point.count / maxValue) * 100}%` }}
            title={`${point.date}: ${point.count} incidents`}
          ></div>
          <div className="bar-label">{point.date}</div>
        </div>
      ))}
    </div>
  );
}

// Helper functions
function getPriorityLabel(priority) {
  const labels = {
    'P1': 'Critical',
    'P2': 'High',
    'P3': 'Moderate', 
    'P4': 'Low'
  };
  return labels[priority] || '';
}

function calculateAge(createdDate) {
  const created = new Date(createdDate);
  const now = new Date();
  const diff = now - created;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function getTimelineData(timeSeries) {
  const grouped = groupByTimeInterval(timeSeries.map(incident => ({
    sys_created_on: display(incident.sys_created_on)
  })), 'sys_created_on', 'day');

  return Object.entries(grouped)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .slice(-14) // Last 14 days
    .map(([date, incidents]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: incidents.length
    }));
}