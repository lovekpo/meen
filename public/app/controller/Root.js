Ext.define('PortalBO.controller.Root', {
    extend: 'Ext.app.Controller',
    
    requires: [
        'PortalBO.view.login.Login',
        'PortalBO.view.main.Main',
        'PortalBO.LoginManager'
    ],
    
    loadingText: 'Loading...',
    
    onLaunch: function () {
        if (Ext.isIE8) {
            Ext.Msg.alert('Not Supported', 'This app is not supported on Internet Explorer 8. Please use a different browser.');
            return;
        }
        
        this.session = new Ext.data.Session({
            autoDestroy: false
        });
        
        this.login = new PortalBO.view.login.Login({
            session: this.session,
            autoShow: true,
            listeners: {
                scope: this,
                login: 'onLogin'
            }
        });

        this.organization = 'Enswers';
        this.user = 'Don';
        
        //this.showUI();
    },

    /**
     * Called when the login controller fires the "login" event.
     *
     * @param loginController
     * @param user
     * @param organization
     * @param loginManager
     */
    onLogin: function (loginController, user, organization, loginManager) {
        this.login.destroy();

        this.loginManager = loginManager;
        this.organization = organization;
        this.user = user;
        
        this.showUI();
    },
    
    showUI: function() {
        this.viewport = new PortalBO.view.main.Main({
            session: this.session,
            viewModel: {
                data: {
                    currentOrg: this.organization,
                    currentUser: this.user
                }
            }
        });
    },
    
    getSession: function() {
        return this.session;
    }
});
