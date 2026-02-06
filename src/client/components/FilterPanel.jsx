import React, { useState } from 'react';
import { Filter } from 'lucide-react';
import { getDateRange } from '../utils/dateUtils.js';
import './FilterPanel.css';

export default function FilterPanel({ filters, onFilterChange, loading }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const dateRangeOptions = [
    { value: 7, label: 'Last 7 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 90, label: 'Last 90 days' },
    { value: 120, label: 'Last 120 days' }
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: '1', label: 'P1 - Critical' },
    { value: '2', label: 'P2 - High' },
    { value: '3', label: 'P3 - Moderate' },
    { value: '4', label: 'P4 - Low' }
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'software', label: 'Software' },
    { value: 'network', label: 'Network' },
    { value: 'database', label: 'Database' },
    { value: 'inquiry', label: 'Inquiry' }
  ];

  const recordLimitOptions = [
    { value: 500, label: '500 records' },
    { value: 1000, label: '1,000 records' },
    { value: 2000, label: '2,000 records' },
    { value: 5000, label: '5,000 records' },
    { value: 10000, label: '10,000 records' }
  ];

  const handleDateRangeChange = (days) => {
    const dateRange = days ? getDateRange(days) : null;
    onFilterChange({ dateRange });
  };

  const handleFilterChange = (field, value) => {
    onFilterChange({ [field]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      dateRange: null,
      priority: '',
      category: '',
      assignmentGroup: '',
      slaType: ''
    });
  };

  const hasActiveFilters = filters.priority || filters.category || filters.assignmentGroup || filters.slaType;

  return (
    <div className={`filter-panel ${isExpanded ? 'expanded' : ''}`}>
      <div className="filter-header">
        <button
          className="filter-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={loading}
        >
          <Filter size={16} style={{display: 'inline', marginRight: '6px', verticalAlign: 'middle'}} />Filters {hasActiveFilters && <span className="filter-indicator">●</span>}
          <span className={`arrow ${isExpanded ? 'up' : 'down'}`}>▼</span>
        </button>
        {hasActiveFilters && (
          <button 
            className="clear-filters"
            onClick={clearFilters}
            disabled={loading}
          >
            Clear All
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="filter-content">
          <div className="filter-group">
            <label>Date Range:</label>
            <select 
              value={filters.dateRange ? '' : '120'}
              onChange={(e) => handleDateRangeChange(e.target.value ? parseInt(e.target.value) : null)}
              disabled={loading}
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Priority:</label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              disabled={loading}
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Category:</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              disabled={loading}
            >
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Assignment Group:</label>
            <input
              type="text"
              value={filters.assignmentGroup}
              onChange={(e) => handleFilterChange('assignmentGroup', e.target.value)}
              placeholder="Enter group name"
              disabled={loading}
            />
          </div>

          <div className="filter-group">
            <label>Record Limit:</label>
            <select
              value={filters.recordLimit || 2000}
              onChange={(e) => handleFilterChange('recordLimit', parseInt(e.target.value))}
              disabled={loading}
            >
              {recordLimitOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}