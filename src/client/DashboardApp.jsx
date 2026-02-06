import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Moon, Sun } from 'lucide-react';
import { IncidentService } from './services/IncidentService.js';
import { ChangeService } from './services/ChangeService.js';
import { SLAService } from './services/SLAService.js';
import DashboardTabs from './components/DashboardTabs.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import { logStartup, logConnectionCheck, logRefreshCycle } from './utils/logger.js';
import './dashboard.css';

export default function DashboardApp() {
  // Services - memoized to prevent recreation
  const services = useMemo(() => ({
    incident: new IncidentService(),
    change: new ChangeService(),
    sla: new SLAService()
  }), []);

  // State
  const [currentTab, setCurrentTab] = useState('overview');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('dashboard-theme') || 'light';
  });
  const [filters, setFilters] = useState({
    dateRange: null,
    priority: '',
    category: '',
    assignmentGroup: '',
    slaType: '',
    recordLimit: 2000
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dashboard-theme', theme);
  }, [theme]);

  // Startup logging
  useEffect(() => {
    logStartup();
  }, []);

  // Check connection status on mount
  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      const t0 = performance.now();
      try {
        const response = await fetch('/api/now/table/sys_user?sysparm_limit=1', {
          headers: {
            "Accept": "application/json",
            "X-UserToken": window.g_ck || ''
          }
        });
        const ms = Math.round(performance.now() - t0);

        if (mounted) {
          if (response.ok) {
            setConnectionStatus('connected');
            logConnectionCheck('connected', ms, `g_ck=${window.g_ck ? 'present' : 'missing'}`);
          } else {
            setConnectionStatus('limited');
            logConnectionCheck('limited', ms, `HTTP ${response.status} — g_ck=${window.g_ck ? 'present' : 'missing'}`);
          }
        }
      } catch (error) {
        const ms = Math.round(performance.now() - t0);
        if (mounted) {
          setConnectionStatus('demo');
          logConnectionCheck('demo', ms, error.message);
        }
      }
    };

    checkConnection();

    return () => {
      mounted = false;
    };
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Memoized callbacks to prevent unnecessary re-renders
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    logRefreshCycle('filter change');
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
    setLastUpdated(new Date());
  }, []);

  const handleManualRefresh = useCallback(() => {
    logRefreshCycle('manual refresh');
    setLastUpdated(new Date());
  }, []);

  const handleLoadingChange = useCallback((isLoading) => {
    setLoading(isLoading);
  }, []);

  const formatLastUpdated = useCallback((date) => {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleTimeString();
  }, []);

  const getConnectionStatusMessage = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected to ServiceNow';
      case 'limited':
        return 'Limited API access - some data may be unavailable';
      case 'demo':
        return 'Demo mode - using sample data';
      default:
        return 'Checking connection...';
    }
  };

  return (
    <div className="dashboard-app">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>ITSM Analytics Dashboard</h1>
          <div className="header-actions">
            <div className={`connection-status connection-${connectionStatus}`}>
              <div className="status-indicator"></div>
              {getConnectionStatusMessage()}
            </div>
            <button 
              className="theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
            <span className="last-updated">
              Last updated: {formatLastUpdated(lastUpdated)}
            </span>
            <button 
              className="refresh-btn"
              onClick={handleManualRefresh}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <FilterPanel 
        filters={filters}
        onFilterChange={handleFilterChange}
        loading={loading}
      />

      {loading && <LoadingSpinner />}

      <DashboardTabs
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        filters={filters}
        lastUpdated={lastUpdated}
        services={services}
        onLoadingChange={handleLoadingChange}
      />
    </div>
  );
}