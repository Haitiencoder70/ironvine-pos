import { useEffect } from 'react';
import { useOrganization, useUser } from '@clerk/clerk-react';

declare global {
  interface Window {
    Intercom?: (...args: unknown[]) => void;
    intercomSettings?: Record<string, unknown>;
  }
}

export function IntercomWidget(): null {
  const { user } = useUser();
  const { organization } = useOrganization();
  const appId = import.meta.env['VITE_INTERCOM_APP_ID'] as string | undefined;

  useEffect(() => {
    if (!import.meta.env.PROD || !appId || !user) return;

    // Inject Intercom script once
    if (!document.getElementById('intercom-script')) {
      const script = document.createElement('script');
      script.id = 'intercom-script';
      script.innerHTML = `
        (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/${appId}';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
      `;
      document.head.appendChild(script);
    }

    window.Intercom?.('boot', {
      app_id: appId,
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName ?? undefined,
      user_id: user.id,
      company: organization
        ? {
            id: organization.id,
            name: organization.name,
          }
        : undefined,
    });

    return () => {
      window.Intercom?.('shutdown');
    };
  }, [appId, user, organization]);

  return null;
}
