/**
 * This entity represents an organization which is a container for projects, users and
 * groups.
 */
Ext.define('PortalBO.model.Organization', {
    extend: 'PortalBO.model.Base',

    fields: [ 'id', 'name' ]
});
