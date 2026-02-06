// Simplified Incident Service for ITSM Dashboard
import { getLast120Days } from '../utils/dateUtils.js';

export class IncidentService {
  constructor() {
    this.tableName = 'incident';
    this.baseUrl = `/api/now/table/${this.tableName}`;
  }

  // Simplified query builder
  buildDateQuery(start, end) {
    // Use ISO date format instead of JavaScript functions
    return `sys_created_on>=${start}^sys_created_on<=${end}`;
  }

  // Get open incidents with simplified filtering
  async getOpenIncidents(filters = {}) {
    try {
      const { start, end } = filters.dateRange || getLast120Days();
      let query = this.buildDateQuery(start, end) + '^active=true';
      
      if (filters.priority) {
        query += `^priority=${filters.priority}`;
      }
      if (filters.category) {
        query += `^category=${filters.category}`;
      }
      if (filters.assignmentGroup) {
        query += `^assignment_group.name=${filters.assignmentGroup}`;
      }

      console.log('Incident query:', query);

      const response = await fetch(`${this.baseUrl}?sysparm_query=${encodeURIComponent(query)}&sysparm_display_value=all&sysparm_limit=500&sysparm_fields=sys_id,number,short_description,priority,state,category,assigned_to,sys_created_on`, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-UserToken": window.g_ck || ''
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Incident API Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Incidents loaded:', data.result?.length || 0);
      return data.result || [];

    } catch (error) {
      console.error('Failed to fetch incidents:', error);
      // Return mock data for demo purposes
      return this.getMockIncidents();
    }
  }

  // Get incident counts by priority
  async getIncidentCountsByPriority(filters = {}) {
    try {
      const incidents = await this.getOpenIncidents(filters);
      const counts = { P1: 0, P2: 0, P3: 0, P4: 0 };
      
      incidents.forEach(incident => {
        const priority = incident.priority?.display_value || incident.priority || '4';
        const key = `P${priority}`;
        if (counts.hasOwnProperty(key)) {
          counts[key]++;
        }
      });

      return counts;
    } catch (error) {
      console.error('Failed to get priority counts:', error);
      return { P1: 2, P2: 8, P3: 15, P4: 25 };
    }
  }

  // Get incidents for time series analysis
  async getIncidentTimeSeries(filters = {}) {
    try {
      const incidents = await this.getOpenIncidents(filters);
      return incidents.map(incident => ({
        sys_created_on: incident.sys_created_on,
        priority: incident.priority,
        state: incident.state
      }));
    } catch (error) {
      console.error('Failed to get incident time series:', error);
      return [];
    }
  }

  // Get incidents by category
  async getIncidentsByCategory(filters = {}) {
    try {
      const incidents = await this.getOpenIncidents(filters);
      return incidents;
    } catch (error) {
      console.error('Failed to get incidents by category:', error);
      return [];
    }
  }

  // Get resolved incidents for MTTR calculation
  async getResolvedIncidents(filters = {}) {
    try {
      const { start, end } = filters.dateRange || getLast120Days();
      let query = this.buildDateQuery(start, end) + '^state=6';
      
      if (filters.priority) {
        query += `^priority=${filters.priority}`;
      }
      if (filters.category) {
        query += `^category=${filters.category}`;
      }

      const response = await fetch(`${this.baseUrl}?sysparm_query=${encodeURIComponent(query)}&sysparm_display_value=all&sysparm_limit=500&sysparm_fields=sys_id,number,sys_created_on,resolved_at,priority,category`, {
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
      console.error('Failed to fetch resolved incidents:', error);
      return this.getMockResolvedIncidents();
    }
  }

  // Mock data for demo/fallback
  getMockIncidents() {
    const now = new Date();
    const mockIncidents = [];
    
    for (let i = 0; i < 35; i++) {
      const createdDate = new Date(now - Math.random() * 120 * 24 * 60 * 60 * 1000); // Random date within 120 days
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
      const resolvedDate = new Date(createdDate.getTime() + Math.random() * 72 * 60 * 60 * 1000); // Resolved within 72 hours
      
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