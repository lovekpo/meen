/**
 * This view is the ticket search grid. It is created one instance per project and added
 * as a tab.
 */
Ext.define('PortalBO.view.original.Search', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.originalsearch',
    
    requires: [
        'PortalBO.view.original.SearchController',
        'PortalBO.view.original.SearchModel',
        'Ext.form.field.ComboBox',
        'PortalBO.override.grid.column.Date'
    ],

    controller: 'originalsearch',
    viewModel: {
        type: 'originalsearch'
    },

    bind: {
        title: 'Search',
        store: '{tickets}'
    },
    
    tbar: [{
        xtype: 'combobox',
        fieldLabel: 'User',
        forceSelection: true,
        queryMode: 'local',
        displayField: 'name',
        valueField: 'id',
        autoLoadOnValue: true,

        reference: 'assigneeField',
        publishes: ['value'],

        bind: {
            store: '{theProject.users}',
            value: '{defaultUser}'
        }
    }, {
        xtype: 'combobox',
        fieldLabel: 'Status',
        forceSelection: true,
        editable: false,
        displayField: 'name',
        valueField: 'id',

        // This field's selection ("value") is also needed in the grid's store filter.
        reference: 'statusField',
        publishes: ['value'],

        bind: {
            store: '{statuses}',
            value: '{defaultStatus}' // this is data in our ViewModel so twoway
        }
    }, {
        text: 'Refresh',
        handler: 'onRefreshClick'
    }],
    
    columns: [{
        text: 'ID',
        dataIndex: 'id'
    }, {
        text: 'Title',
        dataIndex: 'title',
        flex: 1
    }, {
        text: 'Status',
        dataIndex: 'status',
        renderer: 'renderStatus'
    }, {
        text: 'Assignee',
        renderer: 'renderAssignee'
    }, {
        text: 'Creator',
        renderer: 'renderCreator'
    }, {
        xtype: 'datecolumn',
        text: 'Created',
        dataIndex: 'created'
    }, {
        xtype: 'datecolumn',
        text: 'Modified',
        dataIndex: 'modified'
    }, {
        xtype: 'actioncolumn',
        width: 20,
        handler: 'onTicketClick',
        items: [{
            tooltip: 'View ticket',
            iconCls: 'ticket'
        }]
    }]
});
