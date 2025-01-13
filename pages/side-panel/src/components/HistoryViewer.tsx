import { useCallback, useEffect, useState } from 'react';

interface HistoryViewerProps {
  whitelist: string[];
}

const TIME_RANGES = [
  { label: '30 mins', hours: 0.5 },
  { label: '1 hour', hours: 1 },
  { label: '2 hours', hours: 2 },
  { label: '3 hours', hours: 3 },
  { label: '5 hours', hours: 5 },
  { label: '8 hours', hours: 8 },
  { label: '12 hours', hours: 12 },
  { label: '16 hours', hours: 16 },
  { label: '20 hours', hours: 20 },
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
  { label: '72 hours', hours: 72 },
  { label: '96 hours', hours: 96 },
  { label: '120 hours', hours: 120 },
];

export const HistoryViewer: React.FC<HistoryViewerProps> = ({ whitelist }) => {
  const [selectedHours, setSelectedHours] = useState<number>(24);
  const [history, setHistory] = useState<chrome.history.HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const startTime = new Date(Date.now() - selectedHours * 60 * 60 * 1000).getTime();
      const items = await chrome.history.search({
        text: '',
        startTime,
        maxResults: 10000,
      });

      // Filter items by whitelist
      const filteredItems = items.filter(item =>
        item.url ? whitelist.some(domain => item.url!.includes(domain)) : false,
      );

      setHistory(filteredItems);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedHours, whitelist]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
        <select
          className="w-full rounded border border-gray-300 p-2"
          value={selectedHours}
          onChange={e => setSelectedHours(Number(e.target.value))}>
          {TIME_RANGES.map(({ label, hours }) => (
            <option key={hours} value={hours}>
              Last {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading history...</div>
      ) : (
        <div className="space-y-2">
          {history.map((item, index) => (
            <div key={index} className="rounded bg-white p-3 shadow-sm hover:bg-gray-50">
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                <div className="text-sm font-medium text-blue-600 hover:underline">{item.title || item.url}</div>
                <div className="text-xs text-gray-500">{new Date(item.lastVisitTime!).toLocaleString()}</div>
              </a>
            </div>
          ))}
          {history.length === 0 && <div className="text-gray-600">No history found for the selected domains</div>}
        </div>
      )}
    </div>
  );
};
