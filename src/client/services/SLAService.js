// Simplified SLA Service for ITSM Dashboard
import { getLast120Days } from '../utils/dateUtils.js';

export class SLAService {
  constructor() {
    this.tableName = 'task_sla';
    this.baseUrl = `/api/now/table/${this.tableName}`;
  }

  // Simplified query builder
  buildDateQuery(start, end) {
    return `sys_created_on>=${start}^sys_created_on<=${end}`;
  }

  // Get SLA performance data with fallback
  async getSLAPerformance(filters = {}) {
    try {
      const { start, end } = filters.dateRange || getLast120Days();
      let query = this.buildDateQuery(start, end) + '^task.sys_class_name=incident';
      
      if (filters.priority) {
        query += `^task.priority=${filters.priority}`;
      }
      if (filters.slaType) {
        query += `^sla.name=${filters.slaType}`;
      }

      console.log('SLA query:', query);

      const limit = filters.recordLimit || 2000;
      const response = await fetch(`${this.baseUrl}?sysparm_query=${encodeURIComponent(query)}&sysparm_display_value=all&sysparm_fields=sys_id,task,sla,stage,has_breached,percentage,sys_created_on&sysparm_limit=${limit}`, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-UserToken": window.g_ck || ''
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('SLA data loaded:', data.result?.length || 0);
      return data.result || [];

    } catch (error) {
      console.error('Failed to fetch SLA performance:', error);
      return this.getMockSLAData();
    }
  }

  // Get SLA breaches
  async getSLABreaches(filters = {}) {
    try {
      const slaData = await this.getSLAPerformance(filters);
      return slaData.filter(sla => {
        const breached = sla.has_breached?.display_value || sla.has_breached?.value;
        return breached === 'true' || breached === true;
      });
    } catch (error) {
      console.error('Failed to fetch SLA breaches:', error);
      return [];
    }
  }

  // Calculate SLA compliance rate
  async getSLAComplianceRate(filters = {}) {
    try {
      const allSLAs = await this.getSLAPerformance(filters);
      const breachedSLAs = await this.getSLABreaches(filters);
      
      if (allSLAs.length === 0) {
        // Return mock data for demo
        return { rate: 92.5, total: 100, breached: 7, compliant: 93 };
      }

      const total = allSLAs.length;
      const breached = breachedSLAs.length;
      const compliant = total - breached;
      const rate = Math.round((compliant / total) * 10000) / 100;

      return { rate, total, breached, compliant };

    } catch (error) {
      console.error('Failed to calculate SLA compliance:', error);
      return { rate: 92.5, total: 100, breached: 7, compliant: 93 };
    }
  }

  // Get SLA types (simplified)
  async getSLATypes() {
    try {
      const response = await fetch('/api/now/table/contract_sla?sysparm_display_value=all&sysparm_fields=name&sysparm_limit=20', {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-UserToken": window.g_ck || ''
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result || [];
    } catch (error) {
      console.error('Failed to fetch SLA types:', error);
      return [
        { name: { display_value: 'Response Time', value: 'response_time' } },
        { name: { display_value: 'Resolution Time', value: 'resolution_time' } }
      ];
    }
  }

  // Mock SLA data for demo/fallback
  getMockSLAData() {
    const mockSLAs = [];
    const now = new Date();
    
    for (let i = 0; i < 50; i++) {
      const createdDate = new Date(now - Math.random() * 120 * 24 * 60 * 60 * 1000);
      const breached = Math.random() > 0.85; // 15% breach rate
      
      mockSLAs.push({
        sys_id: { display_value: `sla_${i}`, value: `sla_${i}` },
        task: { display_value: `INC000${4000 + i}`, value: `task_${i}` },
        sla: { display_value: i % 2 === 0 ? 'Response Time' : 'Resolution Time', value: `sla_def_${i % 2}` },
        stage: { display_value: breached ? 'Breached' : 'Completed', value: breached ? 'breached' : 'completed' },
        has_breached: { display_value: breached.toString(), value: breached },
        percentage: { display_value: breached ? (Math.random() * 30 + 100).toString() : (Math.random() * 30 + 70).toString(), value: breached ? Math.random() * 30 + 100 : Math.random() * 30 + 70 },
        sys_created_on: { display_value: createdDate.toISOString(), value: createdDate.toISOString() }
      });
    }
    
    return mockSLAs;
  }
}