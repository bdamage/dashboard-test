import React, { useState, useEffect } from 'react';
import { GitBranch, CheckCircle, Clock, AlertTriangle, XCircle, Play, User, Calendar } from 'lucide-react';
import { display, value } from '../utils/fields.js';
import MetricCard from './MetricCard.jsx';
import { logTabLoad } from '../utils/logger.js';
import './ChangeTab.css';

export default function ChangeTab({ filters, lastUpdated, services, onLoadingChange }) {
  const [changeData, setChangeData] = useState({
    allChanges: [],
    stateCounts: {},
    successfulChanges: [],
    timeSeries: []
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadChangeData();
  }, [filters, lastUpdated, services]);

  const loadChangeData = async () => {
    const t0 = performance.now();
    try {
      onLoadingChange(true);
      setError(null);

      const [allChanges, stateCounts, successfulChanges, timeSeries] = await Promise.all([
        services.change.getChanges(filters),
        services.change.getChangeCountsByState(filters),
        services.change.getSuccessfulChanges(filters),
        services.change.getChangeTimeSeries(filters)
      ]);

      setChangeData({
        allChanges,
        stateCounts,
        successfulChanges,
        timeSeries
      });

      logTabLoad('Changes', {
        durationMs: Math.round(performance.now() - t0),
        dataSummary: {
          'total changes': `${allChanges.length} records`,
          'states': JSON.stringify(stateCounts),
          'successful': `${successfulChanges.length} records`,
          'time series': `${timeSeries.length} data points`
        }
      });

    } catch (err) {
      console.error('Failed to load change data:', err);
      setError(err.message);
    } finally {
      onLoadingChange(false);
    }
  };

  const calculateSuccessRate = () => {
    if (changeData.allChanges.length === 0) return 0;
    const completedChanges = changeData.allChanges.filter(change => 
      ['3', '4'].includes(display(change.state)) // Completed or Closed states
    );
    const successfulChanges = completedChanges.filter(change =>
      display(change.state) === '3' // Successfully completed
    );
    return Math.round((successfulChanges.length / completedChanges.length) * 100) || 0;
  };

  const getActiveChanges = () => {
    return changeData.allChanges.filter(change => 
      ['1', '2'].includes(display(change.state)) // In Progress or Scheduled
    ).length;
  };

  const getStateIcon = (state) => {
    const stateIcons = {
      'New': Play,
      'Assess': Clock,
      'Authorize': CheckCircle,
      'Scheduled': Calendar,
      'Completed': CheckCircle,
      'Failed': XCircle,
      'Cancelled': XCircle
    };
    return stateIcons[state] || Play;
  };

  if (error) {
    return (
      <div className="change-tab error-state">
        <h2>Error Loading Change Data</h2>
        <p>{error}</p>
        <button onClick={loadChangeData} className="retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="change-tab">
      <div className="change-header">
        <h2>Change Management Analytics</h2>
        <p>Change request tracking and success metrics</p>
      </div>

      <div className="change-metrics">
        <div className="metrics-row">
          <MetricCard
            title="Total Changes"
            value={changeData.allChanges.length}
            icon={GitBranch}
            color="info"
            subtitle="All change requests"
          />
          
          <MetricCard
            title="Active Changes"
            value={getActiveChanges()}
            icon={Play}
            color="warning"
            subtitle="In progress or scheduled"
          />
          
          <MetricCard
            title="Success Rate"
            value={`${calculateSuccessRate()}%`}
            icon={CheckCircle}
            color={calculateSuccessRate() >= 95 ? 'success' : calculateSuccessRate() >= 85 ? 'warning' : 'critical'}
            subtitle="Successful implementations"
          />
          
          <MetricCard
            title="Successful Changes"
            value={changeData.successfulChanges.length}
            icon={CheckCircle}
            color="success"
            subtitle="Successfully completed"
          />
        </div>
      </div>

      <div className="change-content-grid">
        <div className="state-breakdown">
          <h3>Changes by State</h3>
          <div className="state-chart">
            {Object.entries(changeData.stateCounts).map(([state, count]) => {
              const total = Object.values(changeData.stateCounts).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
              const StateIcon = getStateIcon(state);
              
              return (
                <div key={state} className="state-item">
                  <div className="state-info">
                    <span className="state-name">
                      <StateIcon size={16} style={{ marginRight: '8px' }} />
                      {state}
                    </span>
                    <span className="state-count">{count} ({percentage}%)</span>
                  </div>
                  <div className="state-bar">
                    <div 
                      className={`state-progress ${getStateColor(state)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="recent-changes">
          <h3>Recent Changes</h3>
          <div className="changes-table">
            {changeData.allChanges
              .sort((a, b) => new Date(display(b.sys_created_on)) - new Date(display(a.sys_created_on)))
              .slice(0, 10)
              .map(change => {
                const state = display(change.state);
                const StateIcon = getStateIcon(state);
                
                return (
                  <div key={value(change.sys_id)} className="change-row">
                    <div className="change-number">
                      <span className={`state-badge ${getStateColor(state)}`}>
                        <StateIcon size={12} />
                      </span>
                      {display(change.number)}
                    </div>
                    <div className="change-description">
                      {display(change.short_description)}
                    </div>
                    <div className="change-type">
                      {display(change.type) || 'Standard'}
                    </div>
                    <div className="change-assignee">
                      <User size={12} style={{ marginRight: '4px' }} />
                      {display(change.assigned_to) || 'Unassigned'}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div className="change-insights">
        <h3>Change Management Insights</h3>
        <div className="insights-grid">
          {generateChangeInsights(changeData).map((insight, index) => (
            <div key={index} className={`insight-card ${insight.type}`}>
              <div className="insight-content">
                <h4>{insight.title}</h4>
                <p>{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getStateColor(state) {
  const stateColors = {
    'New': 'info',
    'Assess': 'warning',
    'Authorize': 'warning', 
    'Scheduled': 'info',
    'Completed': 'success',
    'Failed': 'critical',
    'Cancelled': 'critical'
  };
  return stateColors[state] || 'info';
}

function generateChangeInsights(changeData) {
  const insights = [];
  const successRate = changeData.allChanges.length > 0 ? 
    (changeData.successfulChanges.length / changeData.allChanges.filter(c => 
      ['3', '4'].includes(display(c.state))
    ).length) * 100 : 0;

  if (successRate >= 95) {
    insights.push({
      type: 'success',
      title: 'Excellent Success Rate',
      description: `${successRate.toFixed(1)}% of changes completed successfully`
    });
  } else if (successRate < 80) {
    insights.push({
      type: 'warning',
      title: 'Low Success Rate',
      description: `${successRate.toFixed(1)}% success rate needs improvement`
    });
  }

  const activeChanges = changeData.allChanges.filter(c => 
    ['1', '2'].includes(display(c.state))
  ).length;

  if (activeChanges > 20) {
    insights.push({
      type: 'info',
      title: 'High Change Volume',
      description: `${activeChanges} changes currently in progress`
    });
  }

  const emergencyChanges = changeData.allChanges.filter(c => 
    display(c.type) === 'Emergency'
  ).length;

  if (emergencyChanges > 5) {
    insights.push({
      type: 'critical',
      title: 'High Emergency Changes',
      description: `${emergencyChanges} emergency changes may indicate systemic issues`
    });
  }

  return insights;
}