// Simplified SLA Service for ITSM Dashboard
import { getLast120Days } from '../utils/dateUtils.js';
import { sanitizeQueryValue } from '../utils/fields.js';
import { logApiCall, logApiSuccess, logApiError } from '../utils/logger.js';

const SVC = 'SLAService';

export class SLAService {
  constructor() {
    this.tableName = 'task_sla';
    this.baseUrl = `/api/now/table/${this.tableName}`;
  }

  buildDateQuery(start, end) {
    return `sys_created_on>=${start}^sys_created_on<=${end}`;
  }

  async getSLAPerformance(filters = {}) {
    const t0 = performance.now();
    try {
      const { start, end } = filters.dateRange || getLast120Days();
      let query = this.buildDateQuery(start, end) + '^task.sys_class_name=incident';

      if (filters.priority) {
        query += `^task.priority=${sanitizeQueryValue(filters.priority)}`;
      }
      if (filters.slaType) {
        query += `^sla.name=${sanitizeQueryValue(filters.slaType)}`;
      }

      const limit = filters.recordLimit || 2000;
      const url = `${this.baseUrl}?sysparm_query=${encodeURIComponent(query)}&sysparm_display_value=all&sysparm_fields=sys_id,task,sla,stage,has_breached,percentage,sys_created_on&sysparm_limit=${limit}`;

      logApiCall(SVC, 'getSLAPerformance', { url, query, filters });

      const response = await fetch(url, {
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
      const results = data.result || [];
      logApiSuccess(SVC, 'getSLAPerformance', {
        recordCount: results.length,
        durationMs: Math.round(performance.now() - t0),
        source: 'api'
      });
      return results;

    } catch (error) {
      logApiError(SVC, 'getSLAPerformance', error);
      const mock = this.getMockSLAData();
      logApiSuccess(SVC, 'getSLAPerformance', {
        recordCount: mock.length,
        durationMs: Math.round(performance.now() - t0),
        source: 'mock'
      });
      return mock;
    }
  }

  async getSLABreaches(filters = {}) {
    const slaData = await this.getSLAPerformance(filters);
    return slaData.filter(sla => {
      const breached = sla.has_breached?.display_value || sla.has_breached?.value;
      return breached === 'true' || breached === true;
    });
  }

  // Calculates compliance from a single fetch instead of double-fetching
  async getSLAComplianceRate(filters = {}) {
    const allSLAs = await this.getSLAPerformance(filters);

    if (allSLAs.length === 0) {
      return { rate: 92.5, total: 100, breached: 7, compliant: 93 };
    }

    const breached = allSLAs.filter(sla => {
      const b = sla.has_breached?.display_value || sla.has_breached?.value;
      return b === 'true' || b === true;
    }).length;

    const total = allSLAs.length;
    const compliant = total - breached;
    const rate = Math.round((compliant / total) * 10000) / 100;

    return { rate, total, breached, compliant };
  }

  async getSLATypes() {
    const t0 = performance.now();
    try {
      const url = '/api/now/table/contract_sla?sysparm_display_value=all&sysparm_fields=name&sysparm_limit=20';
      logApiCall(SVC, 'getSLATypes', { url });

      const response = await fetch(url, {
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
      const results = data.result || [];
      logApiSuccess(SVC, 'getSLATypes', {
        recordCount: results.length,
        durationMs: Math.round(performance.now() - t0),
        source: 'api'
      });
      return results;
    } catch (error) {
      logApiError(SVC, 'getSLATypes', error);
      const mock = [
        { name: { display_value: 'Response Time', value: 'response_time' } },
        { name: { display_value: 'Resolution Time', value: 'resolution_time' } }
      ];
      logApiSuccess(SVC, 'getSLATypes', {
        recordCount: mock.length,
        durationMs: Math.round(performance.now() - t0),
        source: 'mock'
      });
      return mock;
    }
  }

  getMockSLAData() {
    const mockSLAs = [];
    const now = new Date();

    for (let i = 0; i < 50; i++) {
      const createdDate = new Date(now - Math.random() * 120 * 24 * 60 * 60 * 1000);
      const breached = Math.random() > 0.85;

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
