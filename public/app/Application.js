Ext.define('PortalBO.Application', {
    extend: 'Ext.app.Application',

    requires: [
        'Ext.app.bindinspector.*'
    ],
    
    controllers: [
        'Root@PortalBO.controller'
    ],

    init: function() { }, 

    onBeforeLaunch: function () {
        //PortalBO.SimData.init();
        this.callParent();
    }
});
