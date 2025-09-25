import React from 'react';
// Preview has no drag-and-drop; all structural editing occurs in the Tree
import DynamicComponent from './DynamicComponent';


import type { ComponentDefinition, GlobalStyles } from '../types';

interface Props {
  components: ComponentDefinition[];
  selectedComponent: ComponentDefinition | null;
  onSelectComponent: (c: ComponentDefinition | null) => void;
  onDeleteComponent: (id: string) => void;
  globalStyles: GlobalStyles;
}

function CanvasItem({ item, selected, onSelect, onDelete, globalStyles }: { item: ComponentDefinition; selected: boolean; onSelect: (c: ComponentDefinition)=>void; onDelete: (id: string)=>void; globalStyles: GlobalStyles; }) {
  return (
    <div
      className={`relative border rounded mb-3 ${selected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(item); }}
    >
      <DynamicComponent component={item} globalStyles={globalStyles} onSelectComponent={onSelect} selectedId={selected ? item.uniqueId : undefined} />
      <button
        className="absolute top-2 right-2 text-xs text-red-600"
        onClick={(e) => { e.stopPropagation(); onDelete(item.uniqueId); }}
      >
        Delete
      </button>
    </div>
  );
}

const Canvas: React.FC<Props> = ({ components, selectedComponent, onSelectComponent, onDeleteComponent, globalStyles }) => {
  return (
    <div className="h-full overflow-auto p-6 bg-gray-50">
      <div className="mx-auto max-w-5xl bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {components.length === 0 ? (
            <div className="text-center text-gray-500">Add components from the left</div>
          ) : (
              components.map((c) => (
                <CanvasItem key={c.uniqueId} item={c} selected={selectedComponent?.uniqueId === c.uniqueId} onSelect={(comp)=>onSelectComponent(comp)} onDelete={onDeleteComponent} globalStyles={globalStyles} />
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Canvas;
