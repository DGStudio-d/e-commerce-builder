import React, { useMemo } from 'react';
import type { ComponentDefinition, GlobalStyles } from '../types';
import pagesFile from '../data/pages.json';
import theme from '../data/general.json';

interface Props {
  components: ComponentDefinition[];
  globalStyles: GlobalStyles;
  onClose: () => void;
  pages?: any[];
}

const ExportModal: React.FC<Props> = ({ onClose, pages }) => {
  const exportPayload = useMemo(() => {
    return {
      theme,
      pages: pages && Array.isArray(pages) ? pages : (pagesFile as any[]),
      meta: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }, [pages]);

  const json = useMemo(() => JSON.stringify(exportPayload, null, 2), [exportPayload]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="text-lg font-semibold mb-2">Export</div>
        <p className="text-sm text-gray-600 mb-2">Copy the JSON below. It includes global theme (general.json) and all pages (pages.json).</p>
        <textarea
          readOnly
          className="w-full h-72 p-2 border rounded font-mono text-xs"
          value={json}
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className="text-right">
          <button className="px-4 py-2 border rounded" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
