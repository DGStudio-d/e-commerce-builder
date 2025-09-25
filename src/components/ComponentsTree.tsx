import React, { useMemo, useState } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragStartEvent, type DragOverEvent, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ComponentDefinition } from '../types';
import { Trash2, Plus, ArrowUp, ArrowDown, GripVertical, ChevronRight, ChevronDown, CornerUpLeft, Box, Image as ImageIcon, Type as TypeIcon, LayoutPanelLeft, Square } from 'lucide-react';

interface ComponentsTreeProps {
  roots: ComponentDefinition[];
  selectedId?: string | null;
  onSelect: (c: ComponentDefinition) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onOutdent?: (id: string) => void;
  onAddContainer?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddChild?: (parentId: string, def: Omit<ComponentDefinition, 'uniqueId'>) => void;
  onAddRoot?: () => void;
  onMerge?: (fromId: string, targetId: string) => void;
  libraryItems?: Array<Omit<ComponentDefinition, 'uniqueId'>>;
  onReorder?: (fromId: string, toId: string) => void;
}

const Row: React.FC<{ node: ComponentDefinition; depth: number; selectedId?: string | null; onSelect: (c: ComponentDefinition) => void; onMoveUp?: (id: string) => void; onMoveDown?: (id: string) => void; onOutdent?: (id: string) => void; onAddContainer?: (id: string) => void; onDelete?: (id: string) => void; onAddChild?: (parentId: string, def: Omit<ComponentDefinition,'uniqueId'>) => void; libraryItems?: Array<Omit<ComponentDefinition,'uniqueId'>>; expanded: Set<string>; onToggle: (id: string) => void; overId?: string | null; }> = ({ node, depth, selectedId, onSelect, onMoveUp, onMoveDown, onOutdent, onAddContainer, onDelete, onAddChild, libraryItems = [], expanded, onToggle, overId }) => {
  const children = (node.props?.children || []) as ComponentDefinition[];
  const isSelected = selectedId === node.uniqueId;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.uniqueId, data: { type: 'tree-node' } });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return libraryItems;
    return libraryItems.filter((c:any) => (c.name || c.id || c.type).toLowerCase().includes(q));
  }, [query, libraryItems]);

  const typeIcon = (() => {
    const t = (node.type || '').toLowerCase();
    if (['div','section','article','main','aside','header','footer','nav'].includes(t)) return <Box className="w-4 h-4 text-gray-500" />;
    if (t === 'img' || t === 'image') return <ImageIcon className="w-4 h-4 text-gray-500" />;
    if (t === 'p' || t.startsWith('h')) return <TypeIcon className="w-4 h-4 text-gray-500" />;
    if (t === 'button') return <Square className="w-4 h-4 text-gray-500" />;
    return <LayoutPanelLeft className="w-4 h-4 text-gray-500" />;
  })();
  // Before/after drop zones for precise reordering
  const { setNodeRef: setBeforeDrop } = useDroppable({ id: `${node.uniqueId}-before` });
  const { setNodeRef: setAfterDrop } = useDroppable({ id: `${node.uniqueId}-after` });

  return (
    <div ref={setNodeRef} style={style}>
      <div ref={setBeforeDrop} className={`h-1 ${overId === `${node.uniqueId}-before` ? 'bg-blue-400' : 'bg-transparent'}`} />
      <div
        className={`w-full px-2 py-1 rounded ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'} ${overId===node.uniqueId ? 'ring-1 ring-blue-300' : ''} flex items-center justify-between gap-2 transition-colors`}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={() => onSelect(node)}
        role="button"
        tabIndex={0}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center px-1 text-gray-400 cursor-grab active:cursor-grabbing" title="Drag" {...attributes} {...listeners}>
            <GripVertical className="w-4 h-4" />
          </span>
          <button
            type="button"
            className="inline-flex items-center p-0.5 rounded hover:bg-gray-100"
            onClick={(e) => { e.stopPropagation(); onToggle(node.uniqueId); }}
            title={expanded.has(node.uniqueId) ? 'Collapse' : 'Expand'}
          >
            {expanded.has(node.uniqueId) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {typeIcon}
          <span className="text-sm truncate">{node.name || node.type}</span>
          <span className="text-[10px] text-gray-400 flex-shrink-0">({node.type})</span>
        </span>
        <span className="inline-flex items-center gap-1 text-gray-500">
          <button className="p-1 rounded hover:text-blue-600" title="Move up" onClick={(e) => { e.stopPropagation(); onMoveUp && onMoveUp(node.uniqueId); }}>
            <ArrowUp className="w-4 h-4" />
          </button>
          <button className="p-1 rounded hover:text-blue-600" title="Move down" onClick={(e) => { e.stopPropagation(); onMoveDown && onMoveDown(node.uniqueId); }}>
            <ArrowDown className="w-4 h-4" />
          </button>
          <button className="p-1 rounded hover:text-blue-600" title="Outdent" onClick={(e) => { e.stopPropagation(); onOutdent && onOutdent(node.uniqueId); }}>
            <CornerUpLeft className="w-4 h-4" />
          </button>
          <div className="relative">
            <button className="p-1 rounded hover:text-blue-600" title="Add child" onClick={(e) => { e.stopPropagation(); setShowAdd(v=>!v); }}>
              <Plus className="w-4 h-4" />
            </button>
            {showAdd && (
              <div className="absolute right-0 z-50 mt-1 w-56 bg-white border rounded shadow p-2">
                <input className="w-full border rounded px-2 py-1 text-sm mb-2" placeholder="Search components..." value={query} onChange={(e)=>setQuery(e.target.value)} />
                <div className="max-h-48 overflow-auto">
                  {filtered.length === 0 && (
                    <div className="text-xs text-gray-500 px-1 py-1">No matches</div>
                  )}
                  {filtered.map((c:any) => (
                    <button key={(c as any).id} className="w-full text-left px-2 py-1 rounded hover:bg-gray-50 text-sm" onClick={(e) => { e.stopPropagation(); setShowAdd(false); setQuery(''); onAddChild && onAddChild(node.uniqueId, c as any); }}>
                      {(c as any).name || (c as any).id}
                      <span className="text-[10px] text-gray-400 ml-1">{(c as any).type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className="p-1 rounded hover:text-red-600" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete && onDelete(node.uniqueId); }}>
            <Trash2 className="w-4 h-4" />
          </button>
        </span>
      </div>
      {expanded.has(node.uniqueId) && Array.isArray(children) && children.length > 0 && (
          <SortableContext items={children.map(c=>c.uniqueId)} strategy={verticalListSortingStrategy}>
            <div>
              {children.map((c, i) => (
                <Row key={c.uniqueId || i} node={c as any} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onOutdent={onOutdent} onAddContainer={onAddContainer} onDelete={onDelete} onAddChild={onAddChild} libraryItems={libraryItems} expanded={expanded} onToggle={onToggle} />
              ))}
            </div>
          </SortableContext>
      )}
    </div>
  );
};

const ComponentsTree: React.FC<ComponentsTreeProps> = ({ roots, selectedId, onSelect, onMoveUp, onMoveDown, onOutdent, onAddContainer, onDelete, onAddChild, onAddRoot, onMerge, libraryItems = [], onReorder }) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const toggleExpanded = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };
  const handleDragOver = (event: DragOverEvent) => {
    const id = event.over ? String(event.over.id) : null;
    setOverId(id);
    if (id && !expanded.has(id)) {
      // Auto-expand target to ease nesting
      setExpanded(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;
    const fromId = String(active.id);
    const toId = String(over.id);
    if (fromId === toId) return;
    const isBefore = toId.endsWith('-before');
    const isAfter = toId.endsWith('-after');
    if (isBefore || isAfter) {
      onReorder && onReorder(fromId, toId);
    } else {
      onMerge && onMerge(fromId, toId);
    }
    setDraggingId(null);
    setOverId(null);
  };
  return (
    <div className="h-full overflow-auto border-r bg-white">
      <div className="p-3 border-b font-semibold flex items-center justify-between">
        <span>Tree</span>
        <button className="px-2 py-1 text-xs border rounded inline-flex items-center gap-1" title="Add Container at root" onClick={() => onAddRoot && onAddRoot()}>
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      <div className="p-2">
        {roots.length === 0 ? (
          <div className="text-sm text-gray-500">No components</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <SortableContext items={roots.map(r => r.uniqueId)} strategy={verticalListSortingStrategy}>
              {roots.map((n, i) => (
                <Row key={n.uniqueId || i} node={n} depth={0} selectedId={selectedId} onSelect={onSelect} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onOutdent={onOutdent} onAddContainer={onAddContainer} onDelete={onDelete} onAddChild={onAddChild} libraryItems={libraryItems} expanded={expanded} onToggle={toggleExpanded} overId={overId} />
              ))}
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {draggingId ? (
                <div className="px-2 py-1 bg-white/90 border rounded shadow-sm inline-flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Dragging</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default ComponentsTree;
