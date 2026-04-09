import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { initSocket, disconnectSocket } from '../../services/socket';

export function SocketInit(): null {
  const { getToken } = useAuth();

  useEffect(() => {
    let mounted = true;

    const connect = async (): Promise<void> => {
      try {
        await initSocket(async () => {
          if (!mounted) return null;
          return getToken();
        });
      } catch {
        // Socket failure is non-fatal — app works without real-time updates
      }
    };

    void connect();

    return () => {
      mounted = false;
      disconnectSocket();
    };
  }, [getToken]);

  return null;
}
