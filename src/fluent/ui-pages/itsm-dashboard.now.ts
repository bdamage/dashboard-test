import '@servicenow/sdk/global';
import { UiPage } from '@servicenow/sdk/core';
import dashboardPage from '../../client/itsm-dashboard.html';

UiPage({
  $id: Now.ID['itsm-dashboard-page'],
  endpoint: 'x_snc_dashboardvib_itsm_dashboard.do',
  description: 'ITSM Analytics Dashboard UI Page',
  category: 'general',
  html: dashboardPage,
  direct: true,
});