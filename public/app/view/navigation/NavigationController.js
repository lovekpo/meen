'use strict';

Ext.define('PortalBO.view.navigation.NavigationController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.navigation',

    createTab: function (prefix, rec, cfg) {
        //var tabs = this.lookupReference('main'),
        var tabs = Ext.getCmp('app-tab-panel'),
            id = prefix + '_' + rec,
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
        var record = records[0],
            xtype = record.get('id');

        this.createTab('original', xtype, {
            xtype: 'originalsearch',
            listeners: {
                viewticket: 'onViewTicket'
            },
            viewModel: {
                data: {
                    theProject: 'User'
                }
            }
        });
/*
        var record = records[0],
            text = record.get('text'),
            xtype = record.get('id'),
            alias = 'widget.' + xtype,
            contentPanel = this.getContentPanel(),
            themeName = Ext.themeName,
            cmp;

        if (xtype) { // only leaf nodes have ids

            // Bracket removal, adding, title setting, and description update within one layout.
            Ext.suspendLayouts();

            contentPanel.removeAll(true);

            var className = Ext.ClassManager.getNameByAlias(alias),
                ViewClass = Ext.ClassManager.get(className),
                clsProto = ViewClass.prototype;
            if (clsProto.themes) {
                clsProto.themeInfo = clsProto.themes[themeName];
                if (themeName === 'gray') {
                    clsProto.themeInfo = Ext.applyIf(clsProto.themeInfo || {}, clsProto.themes.classic);
                }
            }

            cmp = new ViewClass();
            contentPanel.add(cmp);

            contentPanel.setTitle(record.parentNode.get('text') + ' - ' + text);

            document.title = document.title.split(' - ')[0] + ' - ' + text;
            location.hash = xtype;

            this.updateDescription(clsProto);

            if (clsProto.exampleCode) {
                this.updateCodePreview(clsProto.exampleCode);
            } else {
                this.updateCodePreviewAsync(clsProto, xtype);
            }

            Ext.resumeLayouts(true);

            if (cmp.floating) {
                cmp.show();
            }
        }
*/
    }
});
