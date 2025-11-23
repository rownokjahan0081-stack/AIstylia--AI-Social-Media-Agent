
// Helper to access global FB object safely
const getFB = () => (window as any).FB;

export const getStoredAppId = () => {
  return localStorage.getItem('social-agent-fb-app-id') || 
         // @ts-ignore
         (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FB_APP_ID : '') || 
         '';
};

export const setStoredAppId = (appId: string) => {
  localStorage.setItem('social-agent-fb-app-id', appId);
};

export const initFacebookSdk = (): Promise<void> => {
  return new Promise((resolve) => {
    if ((window as any).FB) {
        resolve();
        return;
    }

    const appId = getStoredAppId();
    
    // @ts-ignore
    window.fbAsyncInit = function() {
      const FB = getFB();
      if (appId && FB) {
        FB.init({
          appId: appId,
          cookie: true,
          xfbml: true,
          version: 'v19.0'
        });
        console.log('Facebook SDK initialized with App ID:', appId);
      } else {
          console.warn('Facebook SDK loaded but no App ID found. Please configure it in Connections.');
      }
      resolve();
    };

    // Load SDK asynchronously
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as HTMLScriptElement; js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  });
};

export const loginToFacebook = (rerequest: boolean = false): Promise<any> => {
    return new Promise((resolve, reject) => {
        const FB = getFB();
        if (!FB) return reject(new Error("Facebook SDK not loaded"));
        
        // If SDK is loaded but not init (no App ID), throw specific error
        if (!getStoredAppId()) return reject(new Error("App ID not configured"));

        const params: any = {
            scope: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish'
        };

        if (rerequest) {
            params.auth_type = 'rerequest';
        }

        FB.login((response: any) => {
            resolve(response);
        }, params);
    });
}

export const getFacebookAccounts = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        const FB = getFB();
        if (!FB) return reject(new Error("Facebook SDK not loaded"));
        
        FB.api(
            '/me/accounts',
            'GET',
            { fields: 'name,id,access_token,instagram_business_account{name,id}' },
            (response: any) => {
                resolve(response);
            }
        );
    });
}

export const revokePermissions = (): Promise<any> => {
     return new Promise((resolve) => {
        const FB = getFB();
        if (!FB) { resolve(null); return; }
        
        FB.api('/me/permissions', 'DELETE', (response: any) => {
            resolve(response);
        });
     });
}
