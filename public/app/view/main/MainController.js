Ext.define('PortalBO.view.main.MainController', {
    extend: 'Ext.app.ViewController',

    alias: 'controller.main',

    createTab: function (prefix, rec, cfg) {
        var tabs = this.lookupReference('main'),
            id = prefix + '_' + rec.getId(),
            tab = tabs.items.getByKey(id);

        if (!tab) {
            cfg.itemId = id;
            cfg.closable = true;
            tab = tabs.add(cfg);
        }

        tabs.setActiveTab(tab);
    },

    beforeNavSelectionChange: function(selModel, record, recIdx) {
        return record.isLeaf();
    },

    onNavSelectionChange: function(selModel, records) {
        this.createTab('project', 'User', {
            xtype: 'ticketsearch',
            listeners: {
                viewticket: 'onViewTicket'
            },
            viewModel: {
                data: {
                    theProject: 'User'
                }
            }
        });
    },

    editUser: function (userRecord) {
        var win = new PortalBO.view.user.User({
            viewModel: {
                data: {
                    theUser: userRecord
                }
            }
        });

        win.show();
    },

    onClickUserName: function () {
        var data = this.getViewModel().getData();
        this.editUser(data.currentUser);
    },

    onEditUser: function (ctrl, rec) {
        this.editUser(rec);
    },

    onProjectSelect: function () {
        var tabs = this.lookupReference('main');
        tabs.setActiveTab(0);
    },

    onProjectSearchClick: function (view, rowIdx, colIdx, item, e, rec) {
        this.createTab('project', rec, {
            xtype: 'ticketsearch',
            listeners: {
                viewticket: 'onViewTicket'
            },
            viewModel: {
                data: {
                    theProject: rec
                }
            }
        });
    },
    
    onViewTicket: function (view, rec) {
        this.createTab('ticket', rec, {
            xtype: 'ticketdetail',
            session: true,
            viewModel: {
                data: {
                    theTicket: rec
                }
            }
        });
    },

    showBindInspector: function () {
        var inspector = new Ext.app.bindinspector.Inspector();
    }
});
