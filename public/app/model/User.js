/**
 * This view is used to present the details of a single Ticket.
 */
Ext.define('PortalBO.model.User', {
    extend: 'PortalBO.model.Base',

    fields: [
        'name',
        { name: 'organizationId', reference: 'Organization' },
        { name: 'projectId', reference: 'Project' }
    ],

    manyToMany: 'Group'
});
