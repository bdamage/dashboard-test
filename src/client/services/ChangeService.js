// Simplified Change Service for ITSM Dashboard
import { getLast120Days } from '../utils/dateUtils.js';

export class ChangeService {
  constructor() {
    this.tableName = 'change_request';
    this.baseUrl = `/api/now/table/${this.tableName}`;
  }

  // Simplified query builder
  buildDateQuery(start, end) {
    return `sys_created_on>=${start}^sys_created_on<=${end}`;
  }

  // Get all changes with simplified filtering
  async getChanges(filters = {}) {
    try {
      const { start, end } = filters.dateRange || getLast120Days();
      let query = this.buildDateQuery(start, end);
      
      if (filters.state) {
        query += `^state=${filters.state}`;
      }
      if (filters.type) {
        query += `^type=${filters.type}`;
      }
      if (filters.assignmentGroup) {
        query += `^assignment_group.name=${filters.assignmentGroup}`;
      }

      console.log('Change query:', query);

      const response = await fetch(`${this.baseUrl}?sysparm_query=${encodeURIComponent(query)}&sysparm_display_value=all&sysparm_limit=500&sysparm_fields=sys_id,number,short_description,state,type,assigned_to,sys_created_on`, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-UserToken": window.g_ck || ''
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Change API Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Changes loaded:', data.result?.length || 0);
      return data.result || [];

    } catch (error) {
      console.error('Failed to fetch changes:', error);
      return this.getMockChanges();
    }
  }

  // Get change counts by state
  async getChangeCountsByState(filters = {}) {
    try {
      const changes = await this.getChanges(filters);
      const stateCounts = {};
      
      changes.forEach(change => {
        const state = change.state?.display_value || 'Unknown';
        stateCounts[state] = (stateCounts[state] || 0) + 1;
      });

      return stateCounts;
    } catch (error) {
      console.error('Failed to get change state counts:', error);
      return {
        'New': 5,
        'Assess': 8,
        'Scheduled': 12,
        'Completed': 25,
        'Failed': 3
      };
    }
  }

  // Get successful changes count
  async getSuccessfulChanges(filters = {}) {
    try {
      const changes = await this.getChanges(filters);
      return changes.filter(change => {
        const state = change.state?.display_value || change.state?.value;
        return state === 'Completed' || state === '3';
      });
    } catch (error) {
      console.error('Failed to get successful changes:', error);
      return this.getMockChanges().slice(0, 15);
    }
  }

  // Get changes time series
  async getChangeTimeSeries(filters = {}) {
    try {
      const changes = await this.getChanges(filters);
      return changes.map(change => ({
        sys_created_on: change.sys_created_on,
        state: change.state,
        type: change.type
      }));
    } catch (error) {
      console.error('Failed to get change time series:', error);
      return [];
    }
  }

  // Mock data for demo/fallback
  getMockChanges() {
    const now = new Date();
    const mockChanges = [];
    const states = [
      { name: 'New', value: '1' },
      { name: 'Assess', value: '2' }, 
      { name: 'Scheduled', value: '3' },
      { name: 'Completed', value: '4' },
      { name: 'Failed', value: '-1' }
    ];
    
    for (let i = 0; i < 25; i++) {
      const createdDate = new Date(now - Math.random() * 120 * 24 * 60 * 60 * 1000);
      const randomState = states[Math.floor(Math.random() * states.length)];
      
      mockChanges.push({
        sys_id: { display_value: `change_${i}`, value: `change_${i}` },
        number: { display_value: `CHG000${3000 + i}`, value: `CHG000${3000 + i}` },
        short_description: { display_value: `Change request ${i + 1} - System upgrade`, value: `Change request ${i + 1} - System upgrade` },
        state: { display_value: randomState.name, value: randomState.value },
        type: { display_value: ['Standard', 'Normal', 'Emergency'][Math.floor(Math.random() * 3)], value: ['standard', 'normal', 'emergency'][Math.floor(Math.random() * 3)] },
        assigned_to: { display_value: ['Alice Johnson', 'Bob Wilson', 'Carol Davis'][Math.floor(Math.random() * 3)], value: `user_${Math.floor(Math.random() * 3)}` },
        sys_created_on: { display_value: createdDate.toISOString(), value: createdDate.toISOString() }
      });
    }
    
    return mockChanges;
  }
}