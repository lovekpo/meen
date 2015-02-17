Ext.define('PortalBO.view.main.Main', {
    extend: 'Ext.container.Viewport',
    requires: [
        'PortalBO.model.*',
        'PortalBO.view.dashboard.Dashboard',
        'PortalBO.view.navigation.Navigation',
        'PortalBO.view.ticket.Detail',
        'PortalBO.view.ticket.Search',
        'PortalBO.view.main.MainController',
        'PortalBO.view.main.MainModel',
        'Ext.layout.container.Border'
    ],

    controller: 'main',
    viewModel: {
        type: 'main'
    },

    layout: 'border',
    
    items: [{
        xtype: 'container',
        id: 'app-header',
        region: 'north',
        height: 52,
        layout: {
            type: 'hbox',
            align: 'middle'
        },

        items: [{
            xtype: 'component',
            id: 'app-header-logo',
            listeners: {
                click: 'showBindInspector',
                element: 'el'
            }
        },{
            xtype: 'component',
            cls: 'app-header-text',
            bind: '{currentOrg.name}',
            flex: 1
        },{
            xtype: 'component',
            id: 'app-header-username',
            cls: 'app-header-text',
            bind: '{currentUser.name}',
            listeners: {
                click: 'onClickUserName',
                element: 'el'
            },
            margin: '0 10 0 0'
        }]
    }, {
        region: 'west',
        width: 250,
        xtype: 'app-navigation',
        reference: 'navigation'
    }, {
        xtype: 'tabpanel',
        id: 'app-tab-panel',
        region: 'center',
        flex: 1,
        reference: 'main',
        items: [{
            xtype: 'app-dashboard',
            title: 'Dashboard',
            listeners: {
                viewticket: 'onViewTicket',
                edituser: 'onEditUser'
            }
        }]
    }]
});
