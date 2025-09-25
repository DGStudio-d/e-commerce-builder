import React from 'react';
import DynamicComponent from './DynamicComponent';
import type { ComponentDefinition, GlobalStyles } from '../types';

interface Props {
  components: ComponentDefinition[];
  selectedComponent: ComponentDefinition | null;
  onSelectComponent: (c: ComponentDefinition | null) => void;
  onUpdateComponent: (id: string, updates: Partial<ComponentDefinition>) => void;
  onDeleteComponent: (id: string) => void;
  globalStyles: GlobalStyles;
  onAddComponent?: (def: Omit<ComponentDefinition, 'uniqueId'>) => void;
}

const Canvas: React.FC<Props> = ({ components, selectedComponent, onSelectComponent, onDeleteComponent, globalStyles, onAddComponent }) => {
  return (
    <div
      className="h-full overflow-auto p-6 bg-gray-50"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-builder-component')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(e) => {
        if (!onAddComponent) return;
        const data = e.dataTransfer.getData('application/x-builder-component');
        if (!data) return;
        try {
          const def = JSON.parse(data);
          onAddComponent(def);
        } catch {}
      }}
    >
      <div className="mx-auto max-w-5xl bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {components.length === 0 ? (
            <div className="text-center text-gray-500">Add components from the left</div>
          ) : (
            components.map((c) => (
              <div
                key={c.uniqueId}
                className={`relative mb-4 rounded border ${selectedComponent?.uniqueId === c.uniqueId ? 'border-blue-500' : 'border-transparent'}`}
                onClick={() => onSelectComponent(c)}
              >
                <DynamicComponent
                  component={c}
                  globalStyles={globalStyles}
                  selectedId={selectedComponent?.uniqueId || null}
                  onSelectComponent={onSelectComponent}
                />
                <button
                  className="absolute top-2 right-2 text-xs text-red-600"
                  onClick={(e) => { e.stopPropagation(); onDeleteComponent(c.uniqueId); }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Canvas;
