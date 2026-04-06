import { useState, useEffect } from 'react';
import api from '../services/api';

export default function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/messages/unread-count');
        setCount(res.data.count || 0);
      } catch (e) {
        // Silently fail - unread count is optional
      }
    };

    fetch();
    const interval = setInterval(fetch, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return count;
}
