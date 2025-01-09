import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import type { ComponentPropsWithoutRef } from 'react';
import { useApiClient } from '@extension/shared/lib/hooks/useAPI';

const SidePanel = () => {
  const { isReady } = useApiClient();

  return (
    <div className="w-64 p-4">
      {isReady ? <div className="font-medium text-green-600">Logged in</div> : <span> Opening Savvy to login...</span>}
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
