import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    bom_json: {
                        table: 'sys_module'
                        id: '7d53b04bad8d4b33951c52c2f4836d32'
                    }
                    'incident-manager-page': {
                        table: 'sys_ui_page'
                        id: 'a8cf04ab7bef48d59ec037463aea5da0'
                    }
                    'itsm-dashboard-page': {
                        table: 'sys_ui_page'
                        id: '122e619051aa453e8fd5be6ffde890ba'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: '798973c7187348a9a82bf88fcdd20b91'
                    }
                    'x_snc_dashboardvib/____insertStyle': {
                        table: 'sys_ux_lib_asset'
                        id: '8d1006a9986f4730b1dd6462e94b74de'
                    }
                    'x_snc_dashboardvib/____insertStyle.js.map': {
                        table: 'sys_ux_lib_asset'
                        id: '3482514f87bd444da89b336557f2f171'
                    }
                    'x_snc_dashboardvib/dashboard-main': {
                        table: 'sys_ux_lib_asset'
                        id: '5af6320fd24c4233b38b06a65b9134e6'
                    }
                    'x_snc_dashboardvib/dashboard-main.js.map': {
                        table: 'sys_ux_lib_asset'
                        id: '998c03fd14fb4ff1abd9f57929d9f073'
                    }
                    'x_snc_dashboardvib/main': {
                        table: 'sys_ux_lib_asset'
                        id: '48b555e99cf94ac1b7569643bd837e48'
                    }
                    'x_snc_dashboardvib/main.js.map': {
                        table: 'sys_ux_lib_asset'
                        id: '07ab3ecbd67a47c0a08837789cc1b56e'
                    }
                }
            }
        }
    }
}
