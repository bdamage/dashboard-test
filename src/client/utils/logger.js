// Diagnostic logger for ITSM Dashboard
// Usage: Open browser console → all API calls, data sources, and timing are logged
// Toggle verbose mode: window.__DASHBOARD_DEBUG = true

const LOG_PREFIX = '[ITSM]';

const colors = {
  api: 'color: #2196F3; font-weight: bold',
  mock: 'color: #FF9800; font-weight: bold',
  error: 'color: #f44336; font-weight: bold',
  success: 'color: #4CAF50; font-weight: bold',
  timing: 'color: #9C27B0; font-weight: bold',
  info: 'color: #607D8B; font-weight: bold',
};

let refreshCounter = 0;

export function logRefreshCycle(trigger) {
  refreshCounter++;
  console.group(`${LOG_PREFIX} Refresh #${refreshCounter} — triggered by: ${trigger}`);
  console.log(`%cTimestamp: ${new Date().toLocaleTimeString()}`, colors.info);
  console.groupEnd();
}

export function logApiCall(service, method, { url, query, filters }) {
  if (!window.__DASHBOARD_DEBUG) return;
  console.groupCollapsed(`${LOG_PREFIX} API → ${service}.${method}()`);
  console.log('URL:', url);
  if (query) console.log('Query:', query);
  if (filters) console.log('Filters:', filters);
  console.groupEnd();
}

export function logApiSuccess(service, method, { recordCount, durationMs, source }) {
  const isReal = source === 'api';
  const style = isReal ? colors.api : colors.mock;
  const sourceLabel = isReal ? 'ServiceNow API' : 'MOCK DATA';

  console.log(
    `%c${LOG_PREFIX} ${sourceLabel}%c ${service}.${method}() → ${recordCount} records in ${durationMs}ms`,
    style,
    'color: inherit'
  );
}

export function logApiError(service, method, error) {
  console.log(
    `%c${LOG_PREFIX} ERROR%c ${service}.${method}() failed: ${error.message}`,
    colors.error,
    'color: inherit'
  );
}

export function logConnectionCheck(status, durationMs, detail) {
  const style = status === 'connected' ? colors.success
    : status === 'demo' ? colors.mock
    : colors.error;

  console.log(
    `%c${LOG_PREFIX} Connection: ${status.toUpperCase()}%c (${durationMs}ms) ${detail || ''}`,
    style,
    'color: inherit'
  );
}

export function logTabLoad(tabName, { durationMs, dataSummary }) {
  console.groupCollapsed(
    `%c${LOG_PREFIX} Tab loaded: ${tabName}%c — ${durationMs}ms`,
    colors.timing,
    'color: inherit'
  );
  if (dataSummary) {
    Object.entries(dataSummary).forEach(([key, val]) => {
      console.log(`  ${key}: ${val}`);
    });
  }
  console.groupEnd();
}

// Print startup banner
export function logStartup() {
  console.log(
    `%c${LOG_PREFIX} ITSM Analytics Dashboard%c\n` +
    `  Set window.__DASHBOARD_DEBUG = true for verbose API logging\n` +
    `  All data source indicators (API vs MOCK) are always shown`,
    'color: #667eea; font-weight: bold; font-size: 14px',
    'color: inherit; font-size: 12px'
  );
}
