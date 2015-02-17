/**
 * This entity represents a project which is a container for tickets.
 */
Ext.define('PortalBO.model.Project', {
    extend: 'PortalBO.model.Base',

    fields: [
        'name',
        { name: 'organizationId', reference: 'Organization' }, {
            name: 'leadId',
            unique: true,
            reference: 'User'
        }
    ]
});
