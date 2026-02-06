import React, { useCallback } from 'react';
import { BarChart3, AlertCircle, RefreshCw, Clock, TrendingUp, Zap } from 'lucide-react';
import OverviewTab from './OverviewTab.jsx';
import IncidentTab from './IncidentTab.jsx';
import ChangeTab from './ChangeTab.jsx';
import SLATab from './SLATab.jsx';
import TrendsTab from './TrendsTab.jsx';
import MTTRTab from './MTTRTab.jsx';
import './DashboardTabs.css';

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'incidents', label: 'Incidents', icon: AlertCircle },
  { id: 'changes', label: 'Changes', icon: RefreshCw },
  { id: 'sla', label: 'SLA Performance', icon: Clock },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'mttr', label: 'MTTR Analysis', icon: Zap }
];

export default function DashboardTabs({ 
  currentTab, 
  onTabChange, 
  filters, 
  lastUpdated, 
  services, 
  onLoadingChange,
  connectionStatus
}) {

  // Memoize the loading change callback to prevent unnecessary re-renders
  const handleLoadingChange = useCallback((loading) => {
    console.log('Loading state changed:', loading);
    onLoadingChange(loading);
  }, [onLoadingChange]);

  const renderTabContent = () => {
    const commonProps = {
      filters,
      lastUpdated,
      services,
      onLoadingChange: handleLoadingChange,
      connectionStatus
    };

    switch (currentTab) {
      case 'overview':
        return <OverviewTab {...commonProps} />;
      case 'incidents':
        return <IncidentTab {...commonProps} />;
      case 'changes':
        return <ChangeTab {...commonProps} />;
      case 'sla':
        return <SLATab {...commonProps} />;
      case 'trends':
        return <TrendsTab {...commonProps} />;
      case 'mttr':
        return <MTTRTab {...commonProps} />;
      default:
        return <OverviewTab {...commonProps} />;
    }
  };

  return (
    <div className="dashboard-tabs">
      <nav className="tab-navigation">
        {tabs.map(tab => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-button ${currentTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="tab-icon">
                <IconComponent size={18} />
              </span>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
}