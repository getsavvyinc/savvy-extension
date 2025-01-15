import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@src/components/ui/button';
import { Checkbox } from '@src/components/ui/checkbox';
import { useToast } from '@src/hooks/use-toast';
import { Toaster } from '@src/components/ui/toaster';
import { ToastAction } from '@src/components/ui/toast';
import { Badge } from '@src/components/ui/badge';
import { ExternalLink, ChevronRight, ClipboardIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@src/components/ui/select';
import { useLocalClient } from '@extension/shared/lib/hooks/useAPI';
import { isAxiosError } from 'axios';

interface HistoryItem extends chrome.history.HistoryItem {
  isSelected?: boolean;
}

interface HistoryViewerProps {} // Empty interface since component takes no props

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

const ALLOWED_DOMAINS = [
  // Developer tools & documentation
  'getsavvy.so',
  'github', // Matches github.com, github.internal etc
  'stackoverflow',
  'gitlab',
  'bitbucket',

  // Error monitoring & logging
  'rollbar', // Matches rollbar.com, rollbar.internal etc
  'splunk',
  'datadog',
  'sentry',
  'bugsnag',
  'raygun',
  'signoz',
  'harness',
  'metabase',
  'mode',
  'posthog',
  'postman',

  // Cloud platforms
  'aws.', // Matches aws.amazon.com, aws.internal etc
  'amazon',
  'console.aws',
  'cloud.google',
  'gcp', // Common abbreviation for Google Cloud Platform
  'azure',
  'render',
  'railway',
  'vercel',
  'northflank',
  'fly.io',
  'jam.dev',
  'netlify',

  // ai tools
  'julius',
  'openai.com',
  'claude.ai',

  // Monitoring & APM
  'grafana',
  'newrelic',
  'prometheus',
  'kibana',
  'elasticsearch',
  'honeycomb.io',
  'elk', // Common abbreviation for Elasticsearch, Logstash, Kibana

  // CI/CD
  'jenkins',
  'circleci',
  'travis',
  'teamcity',
  'ci.', // The dot after ci is important to avoid false positives

  // Support tools
  'intercom',
  'zendesk',
  'salesforce',
  'sfdc',
  'freshdesk',
  'pylon',
  'front',

  //incident & status page tools
  'incident',
  'opsgenie',
  'atlassian',
  'pagerduty',
  'statuspage',
  'status.',

  // Common internal domains
  'monitoring',
  'logs',
  'metrics',
  'debug',
  'trace',
  'apm',
  'observability',
  'ops',
  'devops',
];

const getHostname = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

export const HistoryViewer: React.FC<HistoryViewerProps> = () => {
  const [selectedHours, setSelectedHours] = useState<number>(1);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const allowedDomains = ALLOWED_DOMAINS;
  const { client } = useLocalClient();
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const startTime = new Date(Date.now() - selectedHours * 60 * 60 * 1000).getTime();
      const items = await chrome.history.search({
        text: '',
        startTime,
        maxResults: 10000,
      });

      // Filter items by allowed domains
      const filteredItems = items.filter(item =>
        item.url ? allowedDomains.some(domain => item.url!.includes(domain)) : false,
      );

      setHistory(filteredItems);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedHours, allowedDomains, toast]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handleItemSelect = (index: number) => {
    setHistory(prevHistory =>
      prevHistory.map((item, i) => (i === index ? { ...item, isSelected: !item.isSelected } : item)),
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setHistory(prevHistory => prevHistory.map(item => ({ ...item, isSelected: checked })));
  };

  const handleSave = async () => {
    const selectedItems = history.filter(item => item.isSelected);
    try {
      await client.post('/history', selectedItems);
      setHistory(prevHistory => prevHistory.map(item => ({ ...item, isSelected: false })));
      toast({
        title: 'History saved',
        description: "Use Savvy's CLI to finish sharing your expertise",
        duration: 4000,
      });
    } catch (error: unknown) {
      const isConnectionError = isAxiosError(error) && (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED');
      if (isConnectionError) {
        toast({
          title: "Can't Connect to Savvy",
          variant: 'destructive',
          duration: Infinity,
          description: (
            <span className="text-pretty">
              {' '}
              Run <strong>savvy record history</strong> in your terminal and try again.
            </span>
          ),
          action: (
            <ToastAction altText="Copy Command" onClick={() => navigator.clipboard.writeText('savvy record history')}>
              <ClipboardIcon className="w-4 h-4 mr-1 inline" /> Copy Command
            </ToastAction>
          ),
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            'An error occurred while saving your history. Please try again or contact us at support@getsavvy.so',
          duration: 5000,
        });
      }
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center">
        <label htmlFor="time-range" className="text-sm font-medium text-gray-700 mr-2">
          Time Range:
        </label>
        <Select value={selectedHours.toString()} onValueChange={value => setSelectedHours(Number(value))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map(({ label, hours }) => (
              <SelectItem key={hours} value={hours.toString()} className="focus:text-primary">
                Last {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading history...</div>
      ) : (
        <div className="space-y-2 h-4/5 overflow-y-auto">
          {!loading && history.length >= 2 && (
            <div className="flex items-center rounded bg-white p-3 shadow-sm hover:bg-gray-50 mb-2">
              <Checkbox
                id="select-all"
                checked={history.every(item => item.isSelected)}
                onCheckedChange={handleSelectAll}
                className="mr-2"
              />
              <label htmlFor="select-all" className="flex-grow cursor-pointer">
                <div className="text-sm font-medium text-gray-700">Select All</div>
              </label>
            </div>
          )}
          {history.map((item, index) => (
            <div key={index} className="flex items-center rounded p-3 shadow-sm hover:bg-gray-50">
              <Checkbox
                id={`item-${index}`}
                checked={item.isSelected}
                onCheckedChange={() => handleItemSelect(index)}
                className="mr-2 data-[state=checked]:bg-primary/10"
              />
              <label htmlFor={`item-${index}`} className="flex-grow cursor-pointer">
                <div className="text-sm font-medium text-blue-600 hover:underline">
                  {item.title || getHostname(item.url || '')}
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:underline">
                  {item.url}
                </a>
                <div className="text-xs text-gray-500">{new Date(item.lastVisitTime!).toLocaleString()}</div>
              </label>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2"
                aria-label={`Visit ${getHostname(item.url || '')}`}>
                <Badge className="cursor-pointer bg-primary/10 text-black hover:bg-primary hover:text-white">
                  Visit <ExternalLink className="w-3 h-3 ml-1 inline" />
                </Badge>
              </a>
            </div>
          ))}
          {history.length === 0 && <div className="text-gray-600">No history found for the selected domains</div>}
        </div>
      )}

      <Button
        onClick={handleSave}
        className="mt-4 w-full bg-primary text-white"
        disabled={!history.some(item => item.isSelected)}>
        <ChevronRight className="w-4 h-4 mr-1 inline" />
        Save History
      </Button>
      <Toaster />
    </div>
  );
};
