/**
 * This class describes a group of users.
 */
Ext.define('PortalBO.model.Group', {
    extend: 'PortalBO.model.Base',

    fields: [
        'name',
        { name: 'organizationId', reference: 'Organization' }
    ],

    manyToMany: 'User'
});
