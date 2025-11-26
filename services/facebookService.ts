
// Helper to access global FB object safely
const getFB = () => (window as any).FB;

// Updated with your provided App ID
const HARDCODED_APP_ID = 'APP ID'; 

const getAppId = () => {
    // 1. Check Vite Environment Variable (Optional override)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FB_APP_ID) {
        // @ts-ignore
        return import.meta.env.VITE_FB_APP_ID;
    }
    // 2. Use the hardcoded ID provided
    return HARDCODED_APP_ID;
};

export const initFacebookSdk = (): Promise<void> => {
  return new Promise((resolve) => {
    if ((window as any).FB) {
        resolve();
        return;
    }

    const appId = getAppId();
    
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
        console.log('Facebook SDK initialized');
      } else {
        console.log('Facebook SDK loaded (Waiting for App ID configuration)');
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

export const loginToFacebook = (rerequest: boolean = false, isWhatsApp: boolean = false): Promise<any> => {
    return new Promise((resolve, reject) => {
        const FB = getFB();
        const appId = getAppId();

        if (!FB) return reject(new Error("Facebook SDK not loaded"));
        if (!appId) return reject(new Error("App ID not configured"));

        let scope = 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish';
        
        if (isWhatsApp) {
            scope += ',whatsapp_business_management,whatsapp_business_messaging';
        }

        const params: any = {
            scope: scope
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

export const getWhatsAppBusinessAccounts = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        const FB = getFB();
        if (!FB) return reject(new Error("Facebook SDK not loaded"));
        
        FB.api(
            '/me/whatsapp_business_accounts',
            'GET',
            { fields: 'name,id,currency,timezone_id' },
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
