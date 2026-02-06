// Simplified Incident Service for ITSM Dashboard
import { getLast120Days } from '../utils/dateUtils.js';
import { display, sanitizeQueryValue } from '../utils/fields.js';
import { logApiCall, logApiSuccess, logApiError } from '../utils/logger.js';

const SVC = 'IncidentService';

export class IncidentService {
  constructor() {
    this.tableName = 'incident';
    this.baseUrl = `/api/now/table/${this.tableName}`;
  }

  buildDateQuery(start, end) {
    return `sys_created_on>=${start}^sys_created_on<=${end}`;
  }

  async getOpenIncidents(filters = {}) {
    const t0 = performance.now();
    try {
      const { start, end } = filters.dateRange || getLast120Days();
      let query = this.buildDateQuery(start, end) + '^active=true';

      if (filters.priority) {
        query += `^priority=${sanitizeQueryValue(filters.priority)}`;
      }
      if (filters.category) {
        query += `^category=${sanitizeQueryValue(filters.category)}`;
      }
      if (filters.assignmentGroup) {
        query += `^assignment_group.name=${sanitizeQueryValue(filters.assignmentGroup)}`;
      }

      const limit = filters.recordLimit || 2000;
      const url = `${this.baseUrl}?sysparm_query=${encodeURIComponent(query)}&sysparm_display_value=all&sysparm_limit=${limit}&sysparm_fields=sys_id,number,short_description,priority,state,category,assigned_to,sys_created_on`;

      logApiCall(SVC, 'getOpenIncidents', { url, query, filters });

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

      // DIAGNOSTIC: Log first incident to inspect data structure
      if (results.length > 0) {
        console.log('[ITSM] Sample incident data structure:', {
          fullRecord: results[0],
          priority: results[0].priority,
          priorityType: typeof results[0].priority,
          hasPriority: !!results[0].priority
        });
      }

      logApiSuccess(SVC, 'getOpenIncidents', {
        recordCount: results.length,
        durationMs: Math.round(performance.now() - t0),
        source: 'api'
      });
      return results;

    } catch (error) {
      logApiError(SVC, 'getOpenIncidents', error);
      const mock = this.getMockIncidents();
      logApiSuccess(SVC, 'getOpenIncidents', {
        recordCount: mock.length,
        durationMs: Math.round(performance.now() - t0),
        source: 'mock'
      });
      return mock;
    }
  }

  async getIncidentCountsByPriority(filters = {}) {
    const incidents = await this.getOpenIncidents(filters);
    const counts = { P1: 0, P2: 0, P3: 0, P4: 0 };

    console.log(`[ITSM] Processing ${incidents.length} incidents for priority counting`);

    let invalidPriorities = 0;
    const priorityValues = [];

    incidents.forEach((incident, index) => {
      // Handle multiple priority field formats
      let priorityValue = null;

      // Case 1: priority is an object with display_value
      if (incident.priority && typeof incident.priority === 'object') {
        priorityValue = incident.priority.display_value || incident.priority.value;
      }
      // Case 2: priority is a plain string
      else if (typeof incident.priority === 'string') {
        priorityValue = incident.priority;
      }
      // Case 3: priority is missing or null
      else {
        console.warn(`[ITSM] Incident ${index} has no priority:`, {
          incident_number: display(incident.number),
          priority_field: incident.priority
        });
        invalidPriorities++;
        priorityValue = '4'; // Default to P4
      }

      // Normalize to string and trim
      priorityValue = String(priorityValue || '4').trim();
      priorityValues.push(priorityValue);

      const key = `P${priorityValue}`;
      if (counts.hasOwnProperty(key)) {
        counts[key]++;
      } else {
        console.warn(`[ITSM] Unexpected priority value: "${priorityValue}" for incident ${display(incident.number)}`);
      }
    });

    console.log('[ITSM] Priority count results:', {
      counts,
      totalIncidents: incidents.length,
      invalidPriorities,
      uniquePriorityValues: [...new Set(priorityValues)]
    });

    return counts;
  }

  async getIncidentTimeSeries(filters = {}) {
    const incidents = await this.getOpenIncidents(filters);
    return incidents.map(incident => ({
      sys_created_on: incident.sys_created_on,
      priority: incident.priority,
      state: incident.state
    }));
  }

  async getIncidentsByCategory(filters = {}) {
    return await this.getOpenIncidents(filters);
  }

  async getResolvedIncidents(filters = {}) {
    const t0 = performance.now();
    try {
      const { start, end } = filters.dateRange || getLast120Days();
      let query = this.buildDateQuery(start, end) + '^state=6';

      if (filters.priority) {
        query += `^priority=${sanitizeQueryValue(filters.priority)}`;
      }
      if (filters.category) {
        query += `^category=${sanitizeQueryValue(filters.category)}`;
      }

      const limit = filters.recordLimit || 2000;
      const url = `${this.baseUrl}?sysparm_query=${encodeURIComponent(query)}&sysparm_display_value=all&sysparm_limit=${limit}&sysparm_fields=sys_id,number,sys_created_on,resolved_at,priority,category`;

      logApiCall(SVC, 'getResolvedIncidents', { url, query, filters });

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
      logApiSuccess(SVC, 'getResolvedIncidents', {
        recordCount: results.length,
        durationMs: Math.round(performance.now() - t0),
        source: 'api'
      });
      return results;

    } catch (error) {
      logApiError(SVC, 'getResolvedIncidents', error);
      const mock = this.getMockResolvedIncidents();
      logApiSuccess(SVC, 'getResolvedIncidents', {
        recordCount: mock.length,
        durationMs: Math.round(performance.now() - t0),
        source: 'mock'
      });
      return mock;
    }
  }

  // Mock data for demo/fallback
  getMockIncidents() {
    const now = new Date();
    const mockIncidents = [];

    for (let i = 0; i < 35; i++) {
      const createdDate = new Date(now - Math.random() * 120 * 24 * 60 * 60 * 1000);
      const priority = Math.ceil(Math.random() * 4);

      mockIncidents.push({
        sys_id: { display_value: `mock_${i}`, value: `mock_${i}` },
        number: { display_value: `INC000${1000 + i}`, value: `INC000${1000 + i}` },
        short_description: { display_value: `Sample incident ${i + 1} - System issue`, value: `Sample incident ${i + 1} - System issue` },
        priority: { display_value: priority.toString(), value: priority.toString() },
        state: { display_value: Math.random() > 0.3 ? '2' : '6', value: Math.random() > 0.3 ? '2' : '6' },
        category: { display_value: ['Hardware', 'Software', 'Network', 'Database'][Math.floor(Math.random() * 4)], value: ['hardware', 'software', 'network', 'database'][Math.floor(Math.random() * 4)] },
        assigned_to: { display_value: ['John Doe', 'Jane Smith', 'Bob Johnson'][Math.floor(Math.random() * 3)], value: `user_${Math.floor(Math.random() * 3)}` },
        sys_created_on: { display_value: createdDate.toISOString(), value: createdDate.toISOString() }
      });
    }

    return mockIncidents;
  }

  getMockResolvedIncidents() {
    const now = new Date();
    const mockResolved = [];

    for (let i = 0; i < 25; i++) {
      const createdDate = new Date(now - Math.random() * 120 * 24 * 60 * 60 * 1000);
      const resolvedDate = new Date(createdDate.getTime() + Math.random() * 72 * 60 * 60 * 1000);

      mockResolved.push({
        sys_id: { display_value: `resolved_${i}`, value: `resolved_${i}` },
        number: { display_value: `INC000${2000 + i}`, value: `INC000${2000 + i}` },
        sys_created_on: { display_value: createdDate.toISOString(), value: createdDate.toISOString() },
        resolved_at: { display_value: resolvedDate.toISOString(), value: resolvedDate.toISOString() },
        priority: { display_value: Math.ceil(Math.random() * 4).toString(), value: Math.ceil(Math.random() * 4).toString() },
        category: { display_value: ['Hardware', 'Software', 'Network'][Math.floor(Math.random() * 3)], value: ['hardware', 'software', 'network'][Math.floor(Math.random() * 3)] }
      });
    }

    return mockResolved;
  }
}
