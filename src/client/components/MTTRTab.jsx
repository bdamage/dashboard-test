import React, { useState, useEffect } from 'react';
import { display, value } from '../utils/fields.js';
import { calculateAverage, calculateMedian, formatDuration } from '../utils/chartUtils.js';
import MetricCard from './MetricCard.jsx';
import './MTTRTab.css';

export default function MTTRTab({ filters, lastUpdated, services, onLoadingChange }) {
  const [mttrData, setMttrData] = useState({
    resolvedIncidents: [],
    avgMTTR: 0,
    medianMTTR: 0,
    mttrByPriority: {},
    mttrByCategory: {},
    mttrDistribution: []
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMTTRData();
  }, [filters, lastUpdated, services]);

  const loadMTTRData = async () => {
    try {
      onLoadingChange(true);
      setError(null);

      const resolvedIncidents = await services.incident.getResolvedIncidents(filters);
      
      // Calculate MTTR values in hours
      const mttrValues = resolvedIncidents
        .filter(incident => display(incident.resolved_at) && display(incident.sys_created_on))
        .map(incident => {
          const created = new Date(display(incident.sys_created_on));
          const resolved = new Date(display(incident.resolved_at));
          const hours = (resolved - created) / (1000 * 60 * 60);
          
          return {
            ...incident,
            mttr: hours > 0 ? hours : 0
          };
        })
        .filter(incident => incident.mttr > 0);

      const avgMTTR = calculateAverage(mttrValues.map(i => i.mttr));
      const medianMTTR = calculateMedian(mttrValues.map(i => i.mttr));

      // MTTR by priority
      const mttrByPriority = {};
      ['1', '2', '3', '4'].forEach(priority => {
        const priorityIncidents = mttrValues.filter(i => display(i.priority) === priority);
        if (priorityIncidents.length > 0) {
          mttrByPriority[`P${priority}`] = {
            avg: calculateAverage(priorityIncidents.map(i => i.mttr)),
            median: calculateMedian(priorityIncidents.map(i => i.mttr)),
            count: priorityIncidents.length
          };
        }
      });

      // MTTR by category
      const mttrByCategory = {};
      const categories = [...new Set(mttrValues.map(i => display(i.category) || 'Unknown'))];
      categories.forEach(category => {
        const categoryIncidents = mttrValues.filter(i => (display(i.category) || 'Unknown') === category);
        if (categoryIncidents.length > 0) {
          mttrByCategory[category] = {
            avg: calculateAverage(categoryIncidents.map(i => i.mttr)),
            median: calculateMedian(categoryIncidents.map(i => i.mttr)),
            count: categoryIncidents.length
          };
        }
      });

      // MTTR distribution (for histogram)
      const mttrDistribution = createMTTRDistribution(mttrValues.map(i => i.mttr));

      setMttrData({
        resolvedIncidents: mttrValues,
        avgMTTR,
        medianMTTR,
        mttrByPriority,
        mttrByCategory,
        mttrDistribution
      });

    } catch (err) {
      console.error('Failed to load MTTR data:', err);
      setError(err.message);
    } finally {
      onLoadingChange(false);
    }
  };

  const getTopPerformers = () => {
    return mttrData.resolvedIncidents
      .sort((a, b) => a.mttr - b.mttr)
      .slice(0, 5);
  };

  const getSlowResolvers = () => {
    return mttrData.resolvedIncidents
      .sort((a, b) => b.mttr - a.mttr)
      .slice(0, 5);
  };

  if (error) {
    return (
      <div className="mttr-tab error-state">
        <h2>⚠️ Error Loading MTTR Data</h2>
        <p>{error}</p>
        <button onClick={loadMTTRData} className="retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="mttr-tab">
      <div className="mttr-header">
        <h2>⚡ MTTR Analysis Dashboard</h2>
        <p>Mean Time to Resolution metrics and performance analysis</p>
      </div>

      <div className="mttr-metrics">
        <div className="metrics-row">
          <MetricCard
            title="Average MTTR"
            value={`${mttrData.avgMTTR.toFixed(1)}h`}
            icon="📊"
            color={mttrData.avgMTTR <= 8 ? 'green' : mttrData.avgMTTR <= 24 ? 'orange' : 'red'}
            subtitle="Mean resolution time"
          />
          
          <MetricCard
            title="Median MTTR"
            value={`${mttrData.medianMTTR.toFixed(1)}h`}
            icon="📈"
            color={mttrData.medianMTTR <= 8 ? 'green' : mttrData.medianMTTR <= 24 ? 'orange' : 'red'}
            subtitle="50th percentile"
          />
          
          <MetricCard
            title="Resolved Incidents"
            value={mttrData.resolvedIncidents.length}
            icon="✅"
            color="blue"
            subtitle="In selected period"
          />
          
          <MetricCard
            title="Performance Score"
            value={calculateMTTRScore(mttrData)}
            icon="🎯"
            color={getMTTRScoreColor(calculateMTTRScore(mttrData))}
            subtitle="Resolution efficiency"
          />
        </div>
      </div>

      <div className="mttr-content-grid">
        <div className="mttr-by-priority">
          <h3>MTTR by Priority</h3>
          <div className="priority-mttr-list">
            {Object.entries(mttrData.mttrByPriority).map(([priority, data]) => (
              <div key={priority} className="priority-mttr-item">
                <div className="priority-mttr-header">
                  <span className={`priority-badge ${priority.toLowerCase()}`}>
                    {getPriorityIcon(priority)} {priority}
                  </span>
                  <span className="mttr-value">
                    {data.avg.toFixed(1)}h avg
                  </span>
                </div>
                <div className="priority-mttr-details">
                  <span>Median: {data.median.toFixed(1)}h</span>
                  <span>Count: {data.count}</span>
                </div>
                <div className="mttr-bar">
                  <div 
                    className={`mttr-fill ${getMTTRColor(data.avg)}`}
                    style={{ width: `${Math.min((data.avg / 48) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mttr-by-category">
          <h3>MTTR by Category</h3>
          <div className="category-mttr-list">
            {Object.entries(mttrData.mttrByCategory)
              .sort(([,a], [,b]) => b.avg - a.avg)
              .slice(0, 8)
              .map(([category, data]) => (
              <div key={category} className="category-mttr-item">
                <div className="category-mttr-header">
                  <span className="category-name">{category}</span>
                  <span className="mttr-value">
                    {data.avg.toFixed(1)}h
                  </span>
                </div>
                <div className="category-mttr-bar">
                  <div 
                    className={`mttr-fill ${getMTTRColor(data.avg)}`}
                    style={{ width: `${Math.min((data.avg / 48) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mttr-distribution">
        <h3>MTTR Distribution</h3>
        <div className="distribution-chart">
          {mttrData.mttrDistribution.map((bucket, index) => (
            <div key={index} className="distribution-bar">
              <div 
                className="bar"
                style={{ height: `${bucket.percentage}%` }}
                title={`${bucket.range}: ${bucket.count} incidents (${bucket.percentage.toFixed(1)}%)`}
              />
              <div className="bar-label">{bucket.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mttr-extremes">
        <div className="top-performers">
          <h3>🏆 Fastest Resolutions</h3>
          {getTopPerformers().map(incident => (
            <div key={value(incident.sys_id)} className="performance-item">
              <span className="incident-number">{display(incident.number)}</span>
              <span className="incident-mttr">{formatDuration(incident.mttr)}</span>
              <span className={`priority-badge p${display(incident.priority)}`}>
                P{display(incident.priority)}
              </span>
            </div>
          ))}
        </div>

        <div className="slow-resolvers">
          <h3>🐌 Longest Resolutions</h3>
          {getSlowResolvers().map(incident => (
            <div key={value(incident.sys_id)} className="performance-item">
              <span className="incident-number">{display(incident.number)}</span>
              <span className="incident-mttr">{formatDuration(incident.mttr)}</span>
              <span className={`priority-badge p${display(incident.priority)}`}>
                P{display(incident.priority)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mttr-insights">
        <h3>💡 MTTR Insights</h3>
        <div className="insights-grid">
          {generateMTTRInsights(mttrData).map((insight, index) => (
            <div key={index} className={`insight-card ${insight.type}`}>
              <span className="insight-icon">{insight.icon}</span>
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
function createMTTRDistribution(mttrValues) {
  const buckets = [
    { min: 0, max: 4, label: '0-4h' },
    { min: 4, max: 8, label: '4-8h' },
    { min: 8, max: 16, label: '8-16h' },
    { min: 16, max: 24, label: '16-24h' },
    { min: 24, max: 48, label: '1-2d' },
    { min: 48, max: 168, label: '2-7d' },
    { min: 168, max: Infinity, label: '7d+' }
  ];

  const total = mttrValues.length;
  
  return buckets.map(bucket => {
    const count = mttrValues.filter(mttr => mttr >= bucket.min && mttr < bucket.max).length;
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return {
      ...bucket,
      count,
      percentage,
      range: `${bucket.min}-${bucket.max === Infinity ? '∞' : bucket.max}h`
    };
  });
}

function calculateMTTRScore(mttrData) {
  const { avgMTTR, medianMTTR } = mttrData;
  let score = 100;
  
  // Penalty for high average MTTR
  if (avgMTTR > 8) score -= (avgMTTR - 8) * 2;
  if (avgMTTR > 24) score -= (avgMTTR - 24) * 3;
  
  // Bonus for consistent performance (low difference between avg and median)
  const consistency = Math.abs(avgMTTR - medianMTTR);
  if (consistency < 2) score += 5;
  else if (consistency > 8) score -= 10;
  
  return Math.max(Math.round(score), 0);
}

function getMTTRScoreColor(score) {
  if (score >= 85) return 'green';
  if (score >= 65) return 'orange';
  return 'red';
}

function getMTTRColor(hours) {
  if (hours <= 8) return 'green';
  if (hours <= 24) return 'orange';
  return 'red';
}

function getPriorityIcon(priority) {
  const icons = {
    'P1': '🔴',
    'P2': '🟠',
    'P3': '🟡',
    'P4': '🟢'
  };
  return icons[priority] || '⚪';
}

function generateMTTRInsights(mttrData) {
  const insights = [];
  const { avgMTTR, medianMTTR, mttrByPriority } = mttrData;

  if (avgMTTR <= 8) {
    insights.push({
      type: 'positive',
      icon: '🚀',
      title: 'Excellent Response Time',
      description: `Average MTTR of ${avgMTTR.toFixed(1)} hours meets industry best practices`
    });
  } else if (avgMTTR > 24) {
    insights.push({
      type: 'critical',
      icon: '🚨',
      title: 'High Resolution Time',
      description: `Average MTTR of ${avgMTTR.toFixed(1)} hours exceeds acceptable limits`
    });
  }

  const consistency = Math.abs(avgMTTR - medianMTTR);
  if (consistency < 2) {
    insights.push({
      type: 'positive',
      icon: '🎯',
      title: 'Consistent Performance',
      description: 'Low variance between average and median indicates stable processes'
    });
  } else if (consistency > 8) {
    insights.push({
      type: 'warning',
      icon: '📊',
      title: 'Variable Performance',
      description: 'High variance suggests outlier incidents affecting averages'
    });
  }

  // Check P1 incidents
  if (mttrByPriority.P1 && mttrByPriority.P1.avg > 4) {
    insights.push({
      type: 'critical',
      icon: '⚠️',
      title: 'P1 Resolution Delays',
      description: `Critical incidents averaging ${mttrByPriority.P1.avg.toFixed(1)} hours to resolve`
    });
  }

  return insights;
}