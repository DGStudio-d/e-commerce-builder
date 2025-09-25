import React, { useEffect, useMemo, useState } from 'react';
import type { ComponentDefinition, GlobalStyles } from '../types';

interface Props {
  selectedComponent: ComponentDefinition | null;
  onUpdateComponent: (id: string, updates: Partial<ComponentDefinition>) => void;
  globalStyles: GlobalStyles;
  onUpdateGlobalStyles: (styles: GlobalStyles) => void;
  onSaveCustom?: (comp: ComponentDefinition, name: string) => void;
  pages?: any[];
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

const PropertiesPanel: React.FC<Props> = ({ selectedComponent, onUpdateComponent, globalStyles, onUpdateGlobalStyles, onSaveCustom, pages = [] }) => {
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

  const applyArbitrary = (bucket: 'width'|'height', raw: string, unit: string) => {
    const v = (raw || '').trim();
    if (!v) return;
    const safe = v.replace(/[^0-9.]/g, '');
    if (!safe) return;
    const cls = bucket === 'width' ? `w-[${safe}${unit}]` : `h-[${safe}${unit}]`;
    updateStyleBucket(bucket, cls);
  };

  // Local state for numeric inputs (pre-populate from existing arbitrary classes)
  const [arbW, setArbW] = useState('');
  const [arbWUnit, setArbWUnit] = useState<'px'|'rem'|'%'|'vw'>('px');
  const [arbH, setArbH] = useState('');
  const [arbHUnit, setArbHUnit] = useState<'px'|'rem'|'%'|'vh'>('px');

  const parseArb = (cls?: string) => {
    // e.g., w-[320px], h-[50%], w-[20rem]
    if (!cls) return null;
    const m = cls.match(/^[wh]-\[(\d+(?:\.\d+)?)(px|rem|%|vw|vh)\]$/);
    if (!m) return null;
    return { value: m[1], unit: m[2] } as any;
  };

  useEffect(() => {
    const w = (selectedComponent.styles as any)?.width as string | undefined;
    const h = (selectedComponent.styles as any)?.height as string | undefined;
    const pw = parseArb(w);
    if (pw) { setArbW(pw.value); setArbWUnit(pw.unit as any); } else { setArbW(''); setArbWUnit('px'); }
    const ph = parseArb(h);
    if (ph) { setArbH(ph.value); setArbHUnit(ph.unit as any); } else { setArbH(''); setArbHUnit('px'); }
  }, [selectedComponent.uniqueId]);

  const currentText = useMemo(() => (selectedComponent.styles as any)?.color || '', [selectedComponent.styles]);
  const currentBg = useMemo(() => (selectedComponent.styles as any)?.bg || '', [selectedComponent.styles]);

  return (
    <div className="h-full border-l bg-white flex flex-col">
      <div className="p-3 border-b font-semibold shrink-0">Properties</div>
      <div className="p-3 space-y-4 text-sm overflow-auto flex-1">
        <div>
          <div className="text-xs text-gray-500 mb-1">Text</div>
          <input className="w-full px-2 py-1 border rounded" value={selectedComponent.props.text || ''} onChange={(e) => updateProp('text', e.target.value)} />
        </div>
        {/* Positioning */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Position</div>
            <select
              className="w-full px-2 py-1 border rounded"
              value={(selectedComponent.styles as any)?.position || ''}
              onChange={(e) => updateStyleBucket('position', e.target.value)}
            >
              <option value="">Default</option>
              <option value="relative">Relative</option>
              <option value="absolute">Absolute</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Z-Index</div>
            <select
              className="w-full px-2 py-1 border rounded"
              value={(selectedComponent.styles as any)?.z || ''}
              onChange={(e) => updateStyleBucket('z', e.target.value)}
            >
              <option value="">Default</option>
              <option value="z-0">0</option>
              <option value="z-10">10</option>
              <option value="z-20">20</option>
              <option value="z-30">30</option>
              <option value="z-40">40</option>
              <option value="z-50">50</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Top</div>
            <select className="w-full px-2 py-1 border rounded" value={(selectedComponent.styles as any)?.top || ''} onChange={(e) => updateStyleBucket('top', e.target.value)}>
              <option value="">Auto</option>
              <option value="top-0">0</option>
              <option value="top-2">2</option>
              <option value="top-4">4</option>
              <option value="top-8">8</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Left</div>
            <select className="w-full px-2 py-1 border rounded" value={(selectedComponent.styles as any)?.left || ''} onChange={(e) => updateStyleBucket('left', e.target.value)}>
              <option value="">Auto</option>
              <option value="left-0">0</option>
              <option value="left-2">2</option>
              <option value="left-4">4</option>
              <option value="left-8">8</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Right</div>
            <select className="w-full px-2 py-1 border rounded" value={(selectedComponent.styles as any)?.right || ''} onChange={(e) => updateStyleBucket('right', e.target.value)}>
              <option value="">Auto</option>
              <option value="right-0">0</option>
              <option value="right-2">2</option>
              <option value="right-4">4</option>
              <option value="right-8">8</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Bottom</div>
            <select className="w-full px-2 py-1 border rounded" value={(selectedComponent.styles as any)?.bottom || ''} onChange={(e) => updateStyleBucket('bottom', e.target.value)}>
              <option value="">Auto</option>
              <option value="bottom-0">0</option>
              <option value="bottom-2">2</option>
              <option value="bottom-4">4</option>
              <option value="bottom-8">8</option>
            </select>
          </div>
        </div>

        {/* Save as Component */}
        {Array.isArray((selectedComponent.props as any)?.children) && (selectedComponent.props as any).children.length > 0 && (
          <div className="pt-2 border-t">
            <button
              className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
              onClick={() => {
                const name = prompt('Name for the new custom component?');
                if (!name) return;
                onSaveCustom && onSaveCustom(selectedComponent, name);
              }}
            >
              Save as Component
            </button>
          </div>
        )}
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
          <div className="space-y-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">Link Type</div>
              {(() => {
                const href: string = selectedComponent.props.href || '';
                const isInternal = href.startsWith('#/');
                const linkType = isInternal ? 'page' : 'external';
                return (
                  <select
                    className="w-full px-2 py-1 border rounded"
                    value={linkType}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'page') {
                        // Default to first page if available
                        const first = (pages && pages.length > 0) ? pages[0] : null;
                        if (first) updateProp('href', `#/builder/${first.slug}`);
                        else updateProp('href', '#/builder/home');
                      } else {
                        updateProp('href', 'https://');
                      }
                    }}
                  >
                    <option value="page">Page</option>
                    <option value="external">External URL</option>
                  </select>
                );
              })()}
            </div>
            {(() => {
              const href: string = selectedComponent.props.href || '';
              const isInternal = href.startsWith('#/');
              if (isInternal) {
                // Page picker
                const currentSlug = href.replace(/^#\/(public|builder)\//, '').replace(/^#\//,'');
                return (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Page</div>
                    <select
                      className="w-full px-2 py-1 border rounded"
                      value={currentSlug}
                      onChange={(e) => {
                        const slug = e.target.value;
                        updateProp('href', `#/builder/${slug}`);
                      }}
                    >
                      {(pages || []).map((p:any) => (
                        <option key={p.id} value={p.slug}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                );
              }
              // External URL input
              return (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Link URL (href)</div>
                  <input
                    className="w-full px-2 py-1 border rounded"
                    value={selectedComponent.props.href || ''}
                    onChange={(e) => updateProp('href', e.target.value)}
                    placeholder="https://example.com or /path"
                  />
                </div>
              );
            })()}
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
        {/* Container alignment (Flex) */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">Layout</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Display</div>
              <select
                className="w-full px-2 py-1 border rounded"
                value={(selectedComponent.styles as any)?.display || ''}
                onChange={(e) => updateStyleBucket('display', e.target.value)}
              >
                <option value="">Default</option>
                <option value="flex">Flex</option>
                <option value="inline-flex">Inline Flex</option>
                <option value="grid">Grid</option>
                <option value="inline-grid">Inline Grid</option>
                <option value="block">Block</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Direction</div>
              <select
                className="w-full px-2 py-1 border rounded"
                value={(selectedComponent.styles as any)?.direction || ''}
                onChange={(e) => updateStyleBucket('direction', e.target.value)}
              >
                <option value="">Default</option>
                <option value="flex-row">Row</option>
                <option value="flex-col">Column</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Justify</div>
              <select
                className="w-full px-2 py-1 border rounded"
                value={(selectedComponent.styles as any)?.justify || ''}
                onChange={(e) => updateStyleBucket('justify', e.target.value)}
              >
                <option value="">Default</option>
                <option value="justify-start">Start</option>
                <option value="justify-center">Center</option>
                <option value="justify-end">End</option>
                <option value="justify-between">Between</option>
                <option value="justify-around">Around</option>
                <option value="justify-evenly">Evenly</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Align Items</div>
              <select
                className="w-full px-2 py-1 border rounded"
                value={(selectedComponent.styles as any)?.items || ''}
                onChange={(e) => updateStyleBucket('items', e.target.value)}
              >
                <option value="">Default</option>
                <option value="items-start">Start</option>
                <option value="items-center">Center</option>
                <option value="items-end">End</option>
                <option value="items-stretch">Stretch</option>
              </select>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Gap</div>
            <select
              className="w-full px-2 py-1 border rounded"
              value={(selectedComponent.styles as any)?.gap || ''}
              onChange={(e) => updateStyleBucket('gap', e.target.value)}
            >
              <option value="">None</option>
              <option value="gap-2">Small</option>
              <option value="gap-4">Medium</option>
              <option value="gap-6">Large</option>
            </select>
          </div>
          {/* Width & Height */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Width</div>
              <select
                className="w-full px-2 py-1 border rounded"
                value={(selectedComponent.styles as any)?.width || ''}
                onChange={(e) => updateStyleBucket('width', e.target.value)}
              >
                <option value="">Auto</option>
                <option value="w-full">Full</option>
                <option value="w-1/2">1/2</option>
                <option value="w-1/3">1/3</option>
                <option value="w-2/3">2/3</option>
                <option value="w-1/4">1/4</option>
                <option value="w-3/4">3/4</option>
                <option value="w-screen">Screen</option>
              </select>
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="w-full px-2 py-1 border rounded"
                  placeholder="Custom e.g. 320"
                  value={arbW}
                  onChange={(e)=>setArbW(e.target.value)}
                  onBlur={()=>applyArbitrary('width', arbW, arbWUnit)}
                />
                <select
                  className="px-2 py-1 border rounded"
                  value={arbWUnit}
                  onChange={(e)=>{ const u = e.target.value as any; setArbWUnit(u); applyArbitrary('width', arbW, u); }}
                >
                  <option value="px">px</option>
                  <option value="rem">rem</option>
                  <option value="%">%</option>
                  <option value="vw">vw</option>
                </select>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Height</div>
              <select
                className="w-full px-2 py-1 border rounded"
                value={(selectedComponent.styles as any)?.height || ''}
                onChange={(e) => updateStyleBucket('height', e.target.value)}
              >
                <option value="">Auto</option>
                <option value="h-full">Full</option>
                <option value="h-64">Tall</option>
                <option value="h-96">Extra Tall</option>
                <option value="h-screen">Screen</option>
              </select>
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="w-full px-2 py-1 border rounded"
                  placeholder="Custom e.g. 480"
                  value={arbH}
                  onChange={(e)=>setArbH(e.target.value)}
                  onBlur={()=>applyArbitrary('height', arbH, arbHUnit)}
                />
                <select
                  className="px-2 py-1 border rounded"
                  value={arbHUnit}
                  onChange={(e)=>{ const u = e.target.value as any; setArbHUnit(u); applyArbitrary('height', arbH, u); }}
                >
                  <option value="px">px</option>
                  <option value="rem">rem</option>
                  <option value="%">%</option>
                  <option value="vh">vh</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Max Width</div>
              <select
                className="w-full px-2 py-1 border rounded"
                value={(selectedComponent.styles as any)?.maxW || ''}
                onChange={(e) => updateStyleBucket('maxW', e.target.value)}
              >
                <option value="">None</option>
                <option value="max-w-sm">sm</option>
                <option value="max-w-md">md</option>
                <option value="max-w-lg">lg</option>
                <option value="max-w-xl">xl</option>
                <option value="max-w-2xl">2xl</option>
                <option value="max-w-4xl">4xl</option>
                <option value="max-w-6xl">6xl</option>
                <option value="max-w-screen-xl">screen-xl</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Min Height</div>
              <select
                className="w-full px-2 py-1 border rounded"
                value={(selectedComponent.styles as any)?.minH || ''}
                onChange={(e) => updateStyleBucket('minH', e.target.value)}
              >
                <option value="">None</option>
                <option value="min-h-0">0</option>
                <option value="min-h-32">32</option>
                <option value="min-h-64">64</option>
                <option value="min-h-screen">screen</option>
              </select>
            </div>
          </div>
          {/* Flex advanced */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Flex Grow</div>
              <select className="w-full px-2 py-1 border rounded" value={(selectedComponent.styles as any)?.grow || ''} onChange={(e)=>updateStyleBucket('grow', e.target.value)}>
                <option value="">Default</option>
                <option value="flex-grow">Grow</option>
                <option value="flex-grow-0">No Grow</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Flex Shrink</div>
              <select className="w-full px-2 py-1 border rounded" value={(selectedComponent.styles as any)?.shrink || ''} onChange={(e)=>updateStyleBucket('shrink', e.target.value)}>
                <option value="">Default</option>
                <option value="flex-shrink">Shrink</option>
                <option value="flex-shrink-0">No Shrink</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Flex Basis</div>
              <select className="w-full px-2 py-1 border rounded" value={(selectedComponent.styles as any)?.basis || ''} onChange={(e)=>updateStyleBucket('basis', e.target.value)}>
                <option value="">Auto</option>
                <option value="basis-1/4">1/4</option>
                <option value="basis-1/3">1/3</option>
                <option value="basis-1/2">1/2</option>
                <option value="basis-2/3">2/3</option>
                <option value="basis-3/4">3/4</option>
                <option value="basis-full">Full</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Flex Wrap</div>
              <select className="w-full px-2 py-1 border rounded" value={(selectedComponent.styles as any)?.wrap || ''} onChange={(e)=>updateStyleBucket('wrap', e.target.value)}>
                <option value="">Default</option>
                <option value="flex-nowrap">No Wrap</option>
                <option value="flex-wrap">Wrap</option>
                <option value="flex-wrap-reverse">Wrap Reverse</option>
              </select>
            </div>
          </div>
          {/* Grid controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Grid Columns</div>
              <select className="w-full px-2 py-1 border rounded" value={(selectedComponent.styles as any)?.gridCols || ''} onChange={(e)=>updateStyleBucket('gridCols', e.target.value)}>
                <option value="">Auto</option>
                <option value="grid-cols-1">1</option>
                <option value="grid-cols-2">2</option>
                <option value="grid-cols-3">3</option>
                <option value="grid-cols-4">4</option>
                <option value="grid-cols-6">6</option>
                <option value="grid-cols-12">12</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Grid Rows</div>
              <select className="w-full px-2 py-1 border rounded" value={(selectedComponent.styles as any)?.gridRows || ''} onChange={(e)=>updateStyleBucket('gridRows', e.target.value)}>
                <option value="">Auto</option>
                <option value="grid-rows-1">1</option>
                <option value="grid-rows-2">2</option>
                <option value="grid-rows-3">3</option>
                <option value="grid-rows-4">4</option>
                <option value="grid-rows-6">6</option>
              </select>
            </div>
          </div>
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
