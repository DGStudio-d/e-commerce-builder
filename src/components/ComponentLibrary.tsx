import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import components from '../data/components.json';
import type { ComponentDefinition } from '../types';

interface Props {
  onAddComponent: (def: Omit<ComponentDefinition, 'uniqueId'>) => void;
  customComponents?: any[];
}

const ComponentLibrary: React.FC<Props> = ({ onAddComponent, customComponents = [] }) => {
  return (
    <div className="h-full overflow-auto border-r bg-white">
      <div className="p-3 border-b font-semibold">Components</div>
      <div className="p-3 space-y-2">
        {Array.isArray(customComponents) && customComponents.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-gray-500">Custom</div>
            {customComponents.map((c: any) => {
              const id = `custom-${c.id}`;
              const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { type: 'library', def: c } });
              return (
                <button
                  key={c.id}
                  ref={setNodeRef}
                  className={`w-full text-left px-3 py-2 rounded-md border hover:bg-gray-50 ${isDragging ? 'opacity-50' : ''}`}
                  onClick={() => onAddComponent(c as any)}
                  {...attributes}
                  {...listeners}
                >
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">Custom</div>
                </button>
              );
            })}
            <div className="h-px bg-gray-200 my-2" />
          </div>
        )}
        {components.map((c) => {
          const id = `lib-${c.id}`;
          const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
            id,
            data: { type: 'library', def: c }
          });
          return (
            <button
              key={c.id}
              ref={setNodeRef}
              className={`w-full text-left px-3 py-2 rounded-md border hover:bg-gray-50 ${isDragging ? 'opacity-50' : ''}`}
              onClick={() => onAddComponent(c as any)}
              {...attributes}
              {...listeners}
            >
              <div className="text-sm font-medium">{c.name}</div>
              <div className="text-xs text-gray-500">{c.category}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ComponentLibrary;
