# ITSM Analytics Dashboard

ServiceNow ITSM Analytics Dashboard built as a Fluent app with React 19 on ServiceNow SDK 4.2.0.

## Features

- **Overview** — Key metrics: open incidents, active changes, SLA compliance, MTTR
- **Incidents** — Priority breakdown, category analysis, recent high-priority incidents with links to ServiceNow
- **Changes** — Change request tracking, state breakdown, success rate metrics
- **SLA Performance** — Compliance rates, breach tracking, performance by SLA type
- **Trends** — Time series analysis for incidents, changes, SLA compliance, and MTTR
- **MTTR Analysis** — Resolution time metrics by priority and category, distribution histogram

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19.x, JSX |
| Icons | lucide-react 0.263.1 |
| Platform | ServiceNow SDK 4.2.0, Glide 26.0.1 |
| Build | now-sdk (Rollup-based) |
| Types | TypeScript 5.5.4 |

## Project Structure

```
src/
├── client/
│   ├── DashboardApp.jsx          # Root component, theme, filters, connection check
│   ├── dashboard.css             # Theme variables, global styles
│   ├── components/
│   │   ├── DashboardTabs.jsx     # Tab navigation and routing
│   │   ├── OverviewTab.jsx       # Summary metrics dashboard
│   │   ├── IncidentTab.jsx       # Incident analytics
│   │   ├── ChangeTab.jsx         # Change management
│   │   ├── SLATab.jsx            # SLA performance
│   │   ├── TrendsTab.jsx         # Time series charts
│   │   ├── MTTRTab.jsx           # Resolution time analysis
│   │   ├── FilterPanel.jsx       # Global filters (priority, category, date range)
│   │   ├── MetricCard.jsx        # Reusable metric display card
│   │   └── LoadingSpinner.jsx    # Inline loading indicator
│   ├── services/
│   │   ├── IncidentService.js    # /api/now/table/incident
│   │   ├── ChangeService.js      # /api/now/table/change_request
│   │   └── SLAService.js         # /api/now/table/task_sla
│   └── utils/
│       ├── fields.js             # ServiceNow field accessors, query sanitization
│       ├── chartUtils.js         # Statistics (avg, median, grouping, duration)
│       ├── dateUtils.js          # Date range helpers
│       └── logger.js             # Diagnostic logging for troubleshooting
├── fluent/
│   └── ui-pages/
│       └── itsm-dashboard.now.ts # Fluent UI page registration
└── server/
    └── tsconfig.json
```

## ServiceNow Configuration

| Property | Value |
|----------|-------|
| Scope | `x_snc_dashboardvib` |
| Scope ID | `26e59387937af250439e7f718bba10a3` |
| Config | `now.config.json` |

## Setup

Requires ServiceNow SDK CLI (`now-sdk`) and a connected ServiceNow instance.

```bash
# Build
now-sdk build

# Deploy to instance
now-sdk install
```

## Data Sources

The dashboard fetches live data from ServiceNow REST API tables:

| Service | Table | Endpoint |
|---------|-------|----------|
| Incidents | `incident` | `/api/now/table/incident` |
| Changes | `change_request` | `/api/now/table/change_request` |
| SLA | `task_sla` | `/api/now/table/task_sla` |

Authentication uses the ServiceNow session token (`window.g_ck`). When the API is unreachable (e.g., running outside an instance), services fall back to mock data and the header shows "Demo mode".

## Diagnostic Logging

Open the browser console to see data source indicators for every API call:

```
[ITSM] ServiceNow API  IncidentService.getOpenIncidents() → 847 records in 1203ms
[ITSM] MOCK DATA       SLAService.getSLAPerformance() → 50 records in 2ms
```

Enable verbose logging (full URLs and query strings):

```js
window.__DASHBOARD_DEBUG = true
```

## Theme

Supports light and dark mode via CSS custom properties. Toggle in the header persists to `localStorage`.

The theme system uses semantic color tokens (`--success`, `--warning`, `--critical`, `--info`) defined in `dashboard.css` with `[data-theme="dark"]` overrides.

## Configuration

| Setting | Default | Location |
|---------|---------|----------|
| Record limit | 2000 | Filter panel dropdown (500–5000) |
| Date range | Last 120 days | `dateUtils.js` |
| Auto-refresh | 5 minutes | `DashboardApp.jsx` |
| API timeout | 10 seconds | `OverviewTab.jsx` |
