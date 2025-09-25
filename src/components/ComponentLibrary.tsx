import React from 'react';
import components from '../data/components.json';
import type { ComponentDefinition } from '../types';

interface Props {
  onAddComponent: (def: Omit<ComponentDefinition, 'uniqueId'>) => void;
}

const ComponentLibrary: React.FC<Props> = ({ onAddComponent }) => {
  return (
    <div className="h-full overflow-auto border-r bg-white">
      <div className="p-3 border-b font-semibold">Components</div>
      <div className="p-3 space-y-2">
        {components.map((c) => (
          <button
            key={c.id}
            className="w-full text-left px-3 py-2 rounded-md border hover:bg-gray-50"
            onClick={() => onAddComponent(c as any)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-builder-component', JSON.stringify(c));
              e.dataTransfer.effectAllowed = 'copy';
            }}
          >
            <div className="text-sm font-medium">{c.name}</div>
            <div className="text-xs text-gray-500">{c.category}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ComponentLibrary;
