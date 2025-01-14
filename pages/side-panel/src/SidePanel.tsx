import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect, useState } from 'react';
import { useLocalClient } from '@extension/shared/lib/hooks/useAPI';
import { HistoryViewer } from './components/HistoryViewer';

const SidePanel = () => {
  const { client } = useLocalClient();
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [requestCount, setRequestCount] = useState(0);
  useEffect(() => {
    if (!client) return;
    const pollHello = async () => {
      try {
        setRequestCount(prevCount => prevCount + 1);
        const response = await client.get('/hello');
        setResponse(response.data);
        setError('');
      } catch (err) {
        console.error('Error details:', err);
        setError('Failed to fetch: ' + (err as Error).message);
      }
    };

    const interval = setInterval(pollHello, 5000);
    pollHello();

    return () => clearInterval(interval);
  }, [client]);

  return (
    <div className="w-full">
      <HistoryViewer />
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
