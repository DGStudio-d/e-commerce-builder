import React, { useMemo } from 'react';
import type { ComponentDefinition, GlobalStyles } from '../types';

interface Props {
  selectedComponent: ComponentDefinition | null;
  onUpdateComponent: (id: string, updates: Partial<ComponentDefinition>) => void;
  globalStyles: GlobalStyles;
  onUpdateGlobalStyles: (gs: GlobalStyles) => void;
}

const tailwindColors = {
  text: [
    'text-gray-700','text-gray-900','text-black','text-white',
    'text-red-500','text-red-600','text-orange-500','text-amber-500','text-yellow-500',
    'text-green-500','text-emerald-500','text-teal-500','text-cyan-500',
    'text-blue-500','text-blue-600','text-indigo-500','text-violet-500','text-purple-500','text-pink-500','text-rose-500'
  ],
  bg: [
    'bg-white','bg-gray-100','bg-gray-200','bg-gray-800','bg-black',
    'bg-red-500','bg-orange-500','bg-amber-500','bg-yellow-500',
    'bg-green-500','bg-emerald-500','bg-teal-500','bg-cyan-500',
    'bg-blue-500','bg-blue-600','bg-indigo-500','bg-violet-500','bg-purple-500','bg-pink-500','bg-rose-500'
  ]
};

const PropertiesPanel: React.FC<Props> = ({ selectedComponent, onUpdateComponent }) => {
  if (!selectedComponent) {
    return (
      <div className="h-full border-l bg-white">
        <div className="p-3 border-b font-semibold">Properties</div>
        <div className="p-3 text-sm text-gray-500">Select a component</div>
      </div>
    );
  }

  const updateProp = (key: string, value: any) => {
    onUpdateComponent(selectedComponent.uniqueId, {
      props: { ...selectedComponent.props, [key]: value },
    });
  };

  const updateStyleBucket = (bucket: string, value: string) => {
    const styles = { ...(selectedComponent.styles || {}) } as Record<string, string>;
    styles[bucket] = value;
    onUpdateComponent(selectedComponent.uniqueId, { styles: styles as any });
  };

  const currentText = useMemo(() => (selectedComponent.styles as any)?.color || '', [selectedComponent.styles]);
  const currentBg = useMemo(() => (selectedComponent.styles as any)?.bg || '', [selectedComponent.styles]);

  return (
    <div className="h-full border-l bg-white">
      <div className="p-3 border-b font-semibold">Properties</div>
      <div className="p-3 space-y-4 text-sm">
        <div>
          <div className="text-xs text-gray-500 mb-1">Text</div>
          <input className="w-full px-2 py-1 border rounded" value={selectedComponent.props.text || ''} onChange={(e) => updateProp('text', e.target.value)} />
        </div>
        {/* Common props editors */}
        {selectedComponent.type === 'img' && (
          <div className="grid grid-cols-1 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Image URL (src)</div>
              <input
                className="w-full px-2 py-1 border rounded"
                value={selectedComponent.props.src || ''}
                onChange={(e) => updateProp('src', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Alt Text</div>
              <input
                className="w-full px-2 py-1 border rounded"
                value={selectedComponent.props.alt || ''}
                onChange={(e) => updateProp('alt', e.target.value)}
                placeholder="Describe the image"
              />
            </div>
          </div>
        )}
        {selectedComponent.type === 'a' && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Link URL (href)</div>
            <input
              className="w-full px-2 py-1 border rounded"
              value={selectedComponent.props.href || ''}
              onChange={(e) => updateProp('href', e.target.value)}
              placeholder="/path or https://..."
            />
          </div>
        )}
        {selectedComponent.type === 'button' && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Button Label</div>
            <input
              className="w-full px-2 py-1 border rounded"
              value={selectedComponent.props.text || ''}
              onChange={(e) => updateProp('text', e.target.value)}
              placeholder="Button text"
            />
          </div>
        )}
        {/* Typography */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Font Size</div>
            <select
              className="w-full px-2 py-1 border rounded"
              value={(selectedComponent.styles as any)?.font || ''}
              onChange={(e) => updateStyleBucket('font', e.target.value)}
            >
              <option value="">Default</option>
              <option value="text-sm">Small</option>
              <option value="text-base">Base</option>
              <option value="text-lg">Large</option>
              <option value="text-xl">XL</option>
              <option value="text-2xl">2XL</option>
              <option value="text-3xl">3XL</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Font Weight</div>
            <select
              className="w-full px-2 py-1 border rounded"
              value={(selectedComponent.styles as any)?.weight || ''}
              onChange={(e) => updateStyleBucket('weight', e.target.value)}
            >
              <option value="">Default</option>
              <option value="font-light">Light</option>
              <option value="font-normal">Normal</option>
              <option value="font-medium">Medium</option>
              <option value="font-semibold">Semibold</option>
              <option value="font-bold">Bold</option>
            </select>
          </div>
        </div>
        {/* Alignment */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Text Align</div>
          <select
            className="w-full px-2 py-1 border rounded"
            value={(selectedComponent.styles as any)?.text || ''}
            onChange={(e) => updateStyleBucket('text', e.target.value)}
          >
            <option value="">Default</option>
            <option value="text-left">Left</option>
            <option value="text-center">Center</option>
            <option value="text-right">Right</option>
            <option value="text-justify">Justify</option>
          </select>
        </div>
        {/* Color pickers */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Text Color</div>
          <div className="grid grid-cols-6 gap-1">
            {tailwindColors.text.map((c) => (
              <button
                key={c}
                className={`h-7 rounded border text-xs ${c} ${currentText===c ? 'ring-2 ring-blue-500' : ''}`}
                title={c}
                onClick={() => updateStyleBucket('color', c)}
              >A</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Background</div>
          <div className="grid grid-cols-6 gap-1">
            {tailwindColors.bg.map((c) => (
              <button
                key={c}
                className={`h-7 rounded border ${c} ${currentBg===c ? 'ring-2 ring-blue-500' : ''}`}
                title={c}
                onClick={() => updateStyleBucket('bg', c)}
              />
            ))}
          </div>
        </div>
        {/* Spacing */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Padding</div>
            <select
              className="w-full px-2 py-1 border rounded"
              value={(selectedComponent.styles as any)?.padding || ''}
              onChange={(e) => updateStyleBucket('padding', e.target.value)}
            >
              <option value="">None</option>
              <option value="p-2">Small</option>
              <option value="p-4">Medium</option>
              <option value="p-6">Large</option>
              <option value="px-4 py-2">Horizontal MD / Vertical SM</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Margin Bottom</div>
            <select
              className="w-full px-2 py-1 border rounded"
              value={(selectedComponent.styles as any)?.margin || ''}
              onChange={(e) => updateStyleBucket('margin', e.target.value)}
            >
              <option value="">None</option>
              <option value="mb-2">Small</option>
              <option value="mb-4">Medium</option>
              <option value="mb-6">Large</option>
            </select>
          </div>
        </div>
        {/* Corners & Elevation */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Border Radius</div>
            <select
              className="w-full px-2 py-1 border rounded"
              value={(selectedComponent.styles as any)?.rounded || ''}
              onChange={(e) => updateStyleBucket('rounded', e.target.value)}
            >
              <option value="">None</option>
              <option value="rounded">Small</option>
              <option value="rounded-md">Medium</option>
              <option value="rounded-lg">Large</option>
              <option value="rounded-xl">XL</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Shadow</div>
            <select
              className="w-full px-2 py-1 border rounded"
              value={(selectedComponent.styles as any)?.shadow || ''}
              onChange={(e) => updateStyleBucket('shadow', e.target.value)}
            >
              <option value="">None</option>
              <option value="shadow-sm">Small</option>
              <option value="shadow">Default</option>
              <option value="shadow-md">Medium</option>
              <option value="shadow-lg">Large</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
