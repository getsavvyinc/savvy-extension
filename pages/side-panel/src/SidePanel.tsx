import '@src/SidePanel.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect, useState } from 'react';
import { useLocalClient } from '@extension/shared/lib/hooks/useAPI';

const SidePanel = () => {
  const { client } = useLocalClient();
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [requestCount, setRequestCount] = useState(0);
  useEffect(() => {
    console.log('Client state:', client);
    if (!client) return;
    const pollHello = async () => {
      try {
        console.log('Making request with client:', client);
        setRequestCount(prevCount => prevCount + 1);
        const response = await client.get('/hello');
        console.log('Response:', response.data);
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
    <div className="w-64 p-4">
      <h2 className="font-medium mb-2">Local API Response:</h2>
      <div className="text-sm text-gray-600 mb-2">Requests made: {requestCount}</div>
      {error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">{response || 'Loading...'}</pre>
      )}
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
