Ext.define('PortalBO.view.original.SearchController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.originalsearch',
    
    onTicketClick: function(view, rowIdx, colIdx, item, e, rec) {
        this.fireViewEvent('viewticket', this.getView(), rec);
    },
    
    onRefreshClick: function() {
        this.getView().getStore().load();
    },

    renderAssignee: function(v, meta, rec) {
        return rec.getAssignee().get('name');
    },

    renderCreator: function(v, meta, rec) {
        return rec.getCreator().get('name');
    },

    renderStatus: function(v) {
        return PortalBO.model.Ticket.getStatusName(v);
    }
});
