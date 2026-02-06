// Performance Analytics Service for ITSM Dashboard
import { getLast120Days } from '../utils/dateUtils.js';

export class PerformanceAnalyticsService {
  constructor() {
    this.baseUrl = '/api/now/table';
  }

  // Get Performance Analytics data (fallback to calculated data if PA not configured)
  async getPerformanceData(metric, filters = {}) {
    try {
      // Try to get data from Performance Analytics first
      const paData = await this.getPAData(metric, filters);
      if (paData && paData.length > 0) {
        return paData;
      }
    } catch (error) {
      console.warn('Performance Analytics not available, calculating manually:', error.message);
    }

    // Fallback to manual calculation
    return await this.calculateMetrics(metric, filters);
  }

  // Attempt to fetch from Performance Analytics
  async getPAData(metric, filters = {}) {
    // This would query PA indicator snapshots or cube data
    // Implementation depends on specific PA setup
    const response = await fetch(`${this.baseUrl}/pa_indicator_values?sysparm_query=indicator.name=${metric}&sysparm_display_value=all&sysparm_limit=1000`, {
      headers: {
        "Accept": "application/json",
        "X-UserToken": window.g_ck
      }
    });

    if (!response.ok) {
      throw new Error(`PA data not available: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || [];
  }

  // Calculate metrics manually when PA is not available
  async calculateMetrics(metric, filters = {}) {
    const { start, end } = filters.dateRange || getLast120Days();
    
    switch (metric) {
      case 'incident_volume':
        return await this.calculateIncidentVolume(start, end, filters);
      case 'mttr':
        return await this.calculateMTTR(start, end, filters);
      case 'sla_compliance':
        return await this.calculateSLACompliance(start, end, filters);
      case 'change_success_rate':
        return await this.calculateChangeSuccessRate(start, end, filters);
      default:
        return [];
    }
  }

  async calculateIncidentVolume(start, end, filters = {}) {
    let query = `sys_created_on>=javascript:gs.dateGenerate('${start}','00:00:00')^sys_created_on<=javascript:gs.dateGenerate('${end}','23:59:59')`;
    
    if (filters.priority) {
      query += `^priority=${filters.priority}`;
    }

    const response = await fetch(`${this.baseUrl}/incident?sysparm_query=${encodeURIComponent(query)}&sysparm_display_value=all&sysparm_fields=sys_created_on,priority&sysparm_limit=5000`, {
      headers: {
        "Accept": "application/json",
        "X-UserToken": window.g_ck
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate incident volume: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || [];
  }

  async calculateMTTR(start, end, filters = {}) {
    let query = `sys_created_on>=javascript:gs.dateGenerate('${start}','00:00:00')^sys_created_on<=javascript:gs.dateGenerate('${end}','23:59:59')^state=6`;
    
    if (filters.priority) {
      query += `^priority=${filters.priority}`;
    }

    const response = await fetch(`${this.baseUrl}/incident?sysparm_query=${encodeURIComponent(query)}&sysparm_display_value=all&sysparm_fields=sys_created_on,resolved_at,priority&sysparm_limit=5000`, {
      headers: {
        "Accept": "application/json",
        "X-UserToken": window.g_ck
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate MTTR: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || [];
  }

  async calculateSLACompliance(start, end, filters = {}) {
    let query = `sys_created_on>=javascript:gs.dateGenerate('${start}','00:00:00')^sys_created_on<=javascript:gs.dateGenerate('${end}','23:59:59')^task.sys_class_name=incident`;

    if (filters.priority) {
      query += `^task.priority=${filters.priority}`;
    }

    const response = await fetch(`${this.baseUrl}/task_sla?sysparm_query=${encodeURIComponent(query)}&sysparm_display_value=all&sysparm_fields=has_breached,stage,percentage&sysparm_limit=5000`, {
      headers: {
        "Accept": "application/json",
        "X-UserToken": window.g_ck
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate SLA compliance: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || [];
  }

  async calculateChangeSuccessRate(start, end, filters = {}) {
    let query = `sys_created_on>=javascript:gs.dateGenerate('${start}','00:00:00')^sys_created_on<=javascript:gs.dateGenerate('${end}','23:59:59')`;

    if (filters.type) {
      query += `^type=${filters.type}`;
    }

    const response = await fetch(`${this.baseUrl}/change_request?sysparm_query=${encodeURIComponent(query)}&sysparm_display_value=all&sysparm_fields=state,type&sysparm_limit=5000`, {
      headers: {
        "Accept": "application/json",
        "X-UserToken": window.g_ck
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate change success rate: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || [];
  }
}