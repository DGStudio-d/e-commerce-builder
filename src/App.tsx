import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ComponentLibrary from './components/ComponentLibrary';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import ExportModal from './components/ExportModal';
import type { ComponentDefinition, GlobalStyles } from './types';
import pagesData from './data/pages.json';
import PageRenderer from './render/PageRenderer';
import ComponentsTree from './components/ComponentsTree';
import { findPath, moveUp as treeMoveUp, moveDown as treeMoveDown, outdent as treeOutdent, insertAtPath, removeAtPath } from './utils/treeOps';
// No DnD at preview level; tree handles DnD internally
import libComponents from './data/components.json';

function App() {
  const [components, setComponents] = useState<ComponentDefinition[]>([]);
  const [currentSlug, setCurrentSlug] = useState<string>(() => {
    const savedSlug = localStorage.getItem('builder.slug');
    if (savedSlug) return savedSlug;
    const raw = window.location.hash.replace(/^#\/?/, '');
    const [maybeMode, maybeSlug] = raw.split('/');
    if (maybeMode === 'public' || maybeMode === 'builder') {
      return maybeSlug || 'home';
    }
    return raw || 'home';
  });
  const [mode, setMode] = useState<'builder' | 'public'>(() => {
    const savedMode = localStorage.getItem('builder.mode') as 'builder' | 'public' | null;
    if (savedMode === 'builder' || savedMode === 'public') return savedMode;
    const raw = window.location.hash.replace(/^#\/?/, '');
    const [maybeMode] = raw.split('/');
    return (maybeMode === 'public') ? 'public' : 'builder';
  });
  const [selectedComponent, setSelectedComponent] = useState<ComponentDefinition | null>(null);
  const [leftTab, setLeftTab] = useState<'library' | 'tree'>('library');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [globalStyles] = useState<GlobalStyles>({});
  const [customComponents, setCustomComponents] = useState<any[]>(() => {
    try { const s = localStorage.getItem('builder.customComponents'); if (s) return JSON.parse(s); } catch {}
    return [];
  });
  const [cart, setCart] = useState<any[]>([]);
  const cartRef = useRef<any[]>([]);
  const [pages, setPages] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('builder.pages');
      if (saved) return JSON.parse(saved);
    } catch {}
    return pagesData as any[];
  });

  // keep a ref of the latest cart for global getters
  useEffect(() => { cartRef.current = cart; }, [cart]);
  useEffect(() => { try { localStorage.setItem('builder.customComponents', JSON.stringify(customComponents)); } catch {} }, [customComponents]);

  // Expose global event dispatcher and Cart API for builder events
  useEffect(() => {
    const anyWindow: any = window as any;
    anyWindow.CartAPI = {
      setCart,
      getCart: () => cartRef.current,
    };

    const handlers: Record<string, (payload?: any) => void> = {
      removeFromCart: (payload?: any) => {
        const id = payload?.props?.id ?? payload?.props?.productId;
        if (!id) return;
        setCart((prev) => prev.filter((item: any) => item.id !== id));
      },
      goToCheckout: () => {
        window.location.href = '/checkout';
      },
      addToCart: (payload?: any) => {
        // minimal add using productId when present
        const productId = payload?.props?.bindings?.productId || payload?.props?.productId || payload?.props?.id;
        if (!productId) return;
        setCart((prev) => [...prev, { id: productId }]);
      },
      navigateTo: (payload?: any) => {
        const href: string | undefined = payload?.props?.href;
        if (!href) return;
        try {
          if (href.startsWith('#/')) {
            window.location.hash = href.replace(/^#\/?/, '#/');
            return;
          }
          if (/^https?:\/\//i.test(href)) {
            window.location.assign(href);
            return;
          }
          // treat as page slug
          const slug = href.replace(/^\/+/, '');
          const prefix = (window as any).BuilderMode === 'public' ? 'public' : 'builder';
          window.location.hash = `#/${prefix}/${slug}`;
        } catch {}
      }
    };

    anyWindow.BuilderEvents = {
      invoke(action: string, payload?: any) {
        const fn = handlers[action];
        if (typeof fn === 'function') {
          fn(payload);
        } else {
          console.log('[BuilderEvents] Unhandled action:', action, payload);
        }
      }
    };
  }, []);

  // Tree operations: move up/down, outdent, and add container inside a node
  const findPathById = useCallback((id: string) => {
    const ref = findPath(components as any, (n: any) => n.uniqueId === id);
    return ref?.ancestry || null;
  }, [components]);

  // (preview reordering removed; DnD is in the tree)

  // Reorder within the tree by dragging: supports '-before'/'-after' zones and plain target rows
  const handleTreeReorder = useCallback((fromId: string, toId: string) => {
    setComponents((prev) => {
      const fromPath = findPathById(fromId);
      if (!fromPath) return prev as any;
      // Interpret target: may be '<id>-before', '<id>-after', or '<id>'
      const isBefore = toId.endsWith('-before');
      const isAfter = toId.endsWith('-after');
      const baseId = isBefore || isAfter ? toId.replace(/-(before|after)$/,'') : toId;
      const toPathRaw = findPathById(baseId);
      if (!toPathRaw) return prev as any;

      // Remove the source node first (so indices for insertion are calculated on the updated tree)
      const removedResult = removeAtPath(prev as any, fromPath) as any;
      const removed = removedResult?.removed;
      let roots = removedResult?.roots as any[];
      if (!removed || !Array.isArray(roots)) return prev as any;

      // Recompute the target path on the updated roots after removal
      const toPathRef = findPath(roots as any, (n: any) => n.uniqueId === baseId);
      const toPath = toPathRef?.ancestry as number[] | null;
      if (!toPath) return prev as any;

      // If dropping on row center (no before/after), we treat elsewhere (merge path), but here we only handle before/after
      // Compute insert index relative to target's parent
      const parentPath = toPath.slice(0, -1);
      let insertIndex = toPath[toPath.length - 1];
      if (isAfter) insertIndex += 1;

      // When moving within the same parent and original index was before the target, adjust for the removal shift
      const sameParent = fromPath.slice(0, -1).join(',') === parentPath.join(',');
      if (sameParent) {
        const originalIndex = fromPath[fromPath.length - 1];
        if (originalIndex < insertIndex) insertIndex -= 1;
      }

      const insertPath = [...parentPath, insertIndex];
      return insertAtPath(roots as any, insertPath, removed) as any;
    });
  }, [findPathById]);

  // Helper: normalize a library def into a ComponentDefinition with uniqueId and normalized children
  const normalizeDef = useCallback((def: Omit<ComponentDefinition,'uniqueId'>): ComponentDefinition => {
    const normalizeChildren = (children: any[]): any[] => {
      if (!Array.isArray(children)) return [];
      return children.map((n: any, i: number) => normalizeNode(n, i));
    };
    const newChildren = normalizeChildren((def as any)?.props?.children || []);
    return {
      ...(def as any),
      uniqueId: `${(def as any).id}_${Date.now()}`,
      props: { ...((def as any)?.props || {}), children: newChildren },
    } as any;
  }, []);

  // Tree actions
  const handleTreeDelete = useCallback((id: string) => {
    const path = findPathById(id);
    if (!path) return;
    setComponents(prev => (removeAtPath(prev as any, path) as any).roots || prev);
  }, [findPathById]);

  const handleTreeAddChild = useCallback((parentId: string, def: Omit<ComponentDefinition,'uniqueId'>) => {
    const path = findPathById(parentId);
    if (!path) return;
    setComponents(prev => {
      // compute append index
      let node: any = (prev as any[])[path[0]];
      for (let i = 1; i < path.length; i++) node = (node?.props?.children || [])[path[i]];
      const childCount = Array.isArray(node?.props?.children) ? node.props.children.length : 0;
      const insertPath = [...path, childCount];
      const newNode = normalizeDef(def);
      return insertAtPath(prev as any, insertPath, newNode) as any;
    });
  }, [findPathById, normalizeDef]);

  const handleTreeAddRoot = useCallback(() => {
    const container: any = {
      id: 'container',
      name: 'Container',
      category: 'Layout',
      type: 'div',
      uniqueId: `container_${Date.now()}`,
      props: { children: [] },
      styles: { display: 'flex', direction: 'flex-col', gap: 'gap-4', padding: 'p-4', rounded: 'rounded-md', bg: 'bg-white' },
    };
    setComponents(prev => [...(prev as any), container]);
  }, []);

  const handleTreeMerge = useCallback((fromId: string, targetId: string) => {
    const fromPath = findPathById(fromId);
    const targetPath = findPathById(targetId);
    if (!fromPath || !targetPath) return;
    setComponents(prev => {
      const { removed, roots } = removeAtPath(prev as any, fromPath) || ({} as any);
      if (!removed) return prev as any;
      // append into target
      let node: any = (roots as any[])[targetPath[0]];
      for (let i = 1; i < targetPath.length; i++) node = (node?.props?.children || [])[targetPath[i]];
      const count = Array.isArray(node?.props?.children) ? node.props.children.length : 0;
      const insertPath = [...targetPath, count];
      return insertAtPath(roots as any, insertPath, removed) as any;
    });
  }, [findPathById]);

  const handleMoveUp = useCallback((id: string) => {
    const path = findPathById(id);
    if (!path) return;
    setComponents(prev => treeMoveUp(prev as any, path) as any);
  }, [findPathById]);

  const handleMoveDown = useCallback((id: string) => {
    const path = findPathById(id);
    if (!path) return;
    setComponents(prev => treeMoveDown(prev as any, path) as any);
  }, [findPathById]);

  const handleOutdent = useCallback((id: string) => {
    const path = findPathById(id);
    if (!path) return;
    setComponents(prev => treeOutdent(prev as any, path) as any);
  }, [findPathById]);

  const handleAddContainer = useCallback((id: string) => {
    const path = findPathById(id);
    if (!path) return;
    // insert a new container as the last child of the target node
    setComponents(prev => {
      // traverse to node to compute current children length
      let node: any = (prev as any[])[path[0]];
      for (let i = 1; i < path.length; i++) {
        node = (node?.props?.children || [])[path[i]];
      }
      const childCount = Array.isArray(node?.props?.children) ? node.props.children.length : 0;
      const insertPath = [...path, childCount];
      const container: any = {
        id: 'container',
        name: 'Container',
        category: 'Layout',
        type: 'div',
        uniqueId: `container_${Date.now()}`,
        props: { children: [] },
        styles: { display: 'flex', direction: 'flex-col', gap: 'gap-4', padding: 'p-4', rounded: 'rounded-md', bg: 'bg-white' },
      };
      return insertAtPath(prev as any, insertPath, container) as any;
    });
  }, [findPathById]);

  // Denormalize builder component into page JSON node
  const denormalizeNode = useCallback((c: ComponentDefinition): any => {
    const node: any = {
      id: c.id,
      tag: c.type,
      style: c.styles || {},
      props: { ...(c.props || {}) },
    };
    // Convenience fields for simple renderers
    if (c.props?.text) node.content = c.props.text;
    if (c.props?.src) node.src = c.props.src;
    // Children: move nested components from props.children -> node.children
    const kids = (c.props?.children || []) as any[];
    if (Array.isArray(kids) && kids.length > 0) {
      node.children = kids.map((k: any) => denormalizeNode(k));
    }
    if (node.props) delete node.props.children;
    return node;
  }, []);

  // Live preview override: replace current page's components with builder state without mutating pages
  const overridePages = useMemo(() => {
    try {
      const next = pages.map(p => ({ ...p }));
      const idx = next.findIndex(p => p.slug === currentSlug);
      if (idx >= 0) {
        next[idx] = {
          ...next[idx],
          components: components.map(c => denormalizeNode(c)),
        };
      }
      return next;
    } catch {
      return pages;
    }
  }, [pages, components, currentSlug, denormalizeNode]);

  // Persist pages to localStorage when changed (moved below state init)

  // Normalize page nodes into ComponentDefinition shape used by builder
  const normalizeNode = (node: any, idx = 0): ComponentDefinition => {
    const nType = node.type || node.tag || 'div';
    const nProps: any = { ...(node.props || {}) };
    if (node.content && !nProps.text) nProps.text = node.content;
    if (node.src && !nProps.src) nProps.src = node.src;
    const nStyles = node.style || node.styles || {};
    const nChildren = node.children || (node.props && node.props.children) || [];
    if (Array.isArray(nChildren)) {
      nProps.children = nChildren.map((c: any, i: number) => normalizeNode(c, i));
    }
    return {
      id: node.id || `${nType}_${idx}`,
      name: node.id || nType,
      category: 'Page',
      type: nType,
      uniqueId: `${nType}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      props: nProps,
      styles: nStyles,
    } as any;
  };

  

  // HMR: auto-reload pages.json in dev preview
  useEffect(() => {
    // Vite HMR accept for the pages.json module
    // @ts-ignore
    if (import.meta && (import.meta as any).hot) {
      // @ts-ignore
      (import.meta as any).hot.accept('./data/pages.json', (mod: any) => {
        if (mod?.default) setPages(mod.default as any[]);
      });
    }
  }, []);

  const loadPage = useCallback((slug: string) => {
    const page = pages.find(p => p.slug === slug) || pages[0];
    if (!page) return;
    const comps = (page.components || []).map((n: any, i: number) => normalizeNode(n, i));
    setComponents(comps);
  }, [pages]);

  // Initial load & hash sync
  useEffect(() => {
    // Initial
    loadPage(currentSlug);
    const onHash = () => {
      const raw = window.location.hash.replace(/^#\/?/, '');
      const parts = raw.split('/');
      if (parts[0] === 'public' || parts[0] === 'builder') {
        const nextMode = (parts[0] as 'public' | 'builder');
        const slug = parts[1] || 'home';
        setMode(nextMode);
        // Only reload components if slug changed
        setCurrentSlug(prev => {
          if (prev !== slug) {
            loadPage(slug);
          }
          return slug;
        });
      } else {
        const slug = parts[0] || 'home';
        setMode('builder');
        setCurrentSlug(prev => {
          if (prev !== slug) {
            loadPage(slug);
          }
          return slug;
        });
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loadPage]);

  // Persist mode and slug
  useEffect(() => {
    try { localStorage.setItem('builder.mode', mode); } catch {}
    // expose mode globally for components that adjust UX in builder
    try { (window as any).BuilderMode = mode; } catch {}
  }, [mode]);
  useEffect(() => {
    try { localStorage.setItem('builder.slug', currentSlug); } catch {}
  }, [currentSlug]);

  const addComponent = useCallback((componentDef: Omit<ComponentDefinition, 'uniqueId'>) => {
    // Deep-normalize children coming from the library (which may be raw tag/content nodes)
    const normalizeChildren = (children: any[]): any[] => {
      if (!Array.isArray(children)) return [];
      return children.map((n: any, i: number) => normalizeNode(n, i));
    };
    const newChildren = normalizeChildren((componentDef as any)?.props?.children || []);
    const newComponent: ComponentDefinition = {
      ...(componentDef as any),
      uniqueId: `${componentDef.id}_${Date.now()}`,
      props: {
        ...((componentDef as any)?.props || {}),
        children: newChildren,
      },
    } as any;
    setComponents(prev => [...prev, newComponent]);
  }, [normalizeNode]);

  const updateComponent = useCallback((id: string, updates: Partial<ComponentDefinition>) => {
    const mergeNode = (node: any): any => ({
      ...node,
      ...updates,
      props: updates.props ? { ...(node.props || {}), ...updates.props } : node.props,
      styles: updates.styles ? { ...(node.styles || {}), ...(updates.styles as any) } : node.styles,
    });

    const updateInTree = (node: any): any => {
      if (!node) return node;
      if (node.uniqueId === id) {
        return mergeNode(node);
      }
      const children = (node.props && node.props.children) || [];
      if (Array.isArray(children) && children.length > 0) {
        const newChildren = children.map(updateInTree);
        // only allocate new props if a child changed identity
        let changed = false;
        for (let i = 0; i < children.length; i++) {
          if (children[i] !== newChildren[i]) { changed = true; break; }
        }
        if (changed) {
          return { ...node, props: { ...(node.props || {}), children: newChildren } };
        }
      }
      return node;
    };

    setComponents(prev => prev.map(c => c.uniqueId === id ? mergeNode(c) : updateInTree(c)));
    setSelectedComponent(prevSel => {
      if (!prevSel || prevSel.uniqueId !== id) return prevSel;
      return {
        ...prevSel,
        ...updates,
        props: updates.props ? { ...(prevSel.props || {}), ...updates.props } : prevSel.props,
        styles: updates.styles ? { ...(prevSel.styles || {}), ...(updates.styles as any) } : prevSel.styles,
      } as ComponentDefinition;
    });
  }, []);

  const deleteComponent = useCallback((id: string) => {
    setComponents(prev => prev.filter(c => c.uniqueId !== id));
    if (selectedComponent?.uniqueId === id) setSelectedComponent(null);
  }, [selectedComponent]);

  // Persist pages whenever they change
  useEffect(() => {
    try { localStorage.setItem('builder.pages', JSON.stringify(pages)); } catch {}
  }, [pages]);

  const syncToPage = useCallback(() => {
    setPages(prev => {
      const next = [...prev];
      const idx = next.findIndex(p => p.slug === currentSlug);
      if (idx >= 0) {
        next[idx] = {
          ...next[idx],
          components: components.map(c => denormalizeNode(c)),
        };
      }
      return next;
    });
  }, [components, currentSlug, denormalizeNode]);

  const downloadJson = (filename: string, data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold">Visual Website Builder</div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Page:</label>
            <select
              className="px-2 py-1 border rounded"
              value={currentSlug}
              onChange={(e) => {
                const slug = e.target.value;
                const prefix = mode === 'public' ? 'public' : 'builder';
                window.location.hash = `#/${prefix}/${slug}`;
              }}
            >
              {pages.map(p => (
                <option key={p.id} value={p.slug}>{p.title}</option>
              ))}
            </select>
            <button
              className="px-2 py-1 border rounded text-sm"
              onClick={() => {
                const title = prompt('New page title?');
                if (!title) return;
                const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                const id = `page_${Date.now()}`;
                setPages(prev => {
                  if (prev.some(p => p.slug === slug)) return prev;
                  return [...prev, { id, title, slug, components: [] }];
                });
                const prefix = mode === 'public' ? 'public' : 'builder';
                setCurrentSlug(slug);
                window.location.hash = `#/${prefix}/${slug}`;
              }}
            >
              + Add Page
            </button>
            <button
              className="px-2 py-1 border rounded text-sm"
              onClick={() => {
                const title = 'Products';
                const baseSlug = 'products';
                let slug = baseSlug;
                const existing = new Set(pages.map(p=>p.slug));
                let n = 2;
                while (existing.has(slug)) { slug = `${baseSlug}-${n++}`; }
                const id = `page_${Date.now()}`;
                const hero: any = {
                  tag: 'section',
                  style: { bg: 'bg-gray-50', padding: 'py-16 px-4', text: 'text-center' },
                  children: [
                    { tag: 'h1', content: 'Our Products', style: { font: 'text-4xl font-bold', margin: 'mb-3' } },
                    { tag: 'p', content: 'Browse our latest collection', style: { color: 'text-gray-600' } }
                  ]
                };
                const productCard = (name: string, price: string, img: string) => ({
                  tag: 'div',
                  style: { bg: 'bg-white', rounded: 'rounded-xl', shadow: 'shadow', padding: 'p-4', border: 'border' },
                  children: [
                    { tag: 'img', src: img, style: { rounded: 'rounded-lg', object: 'object-cover', width: 'w-full', height: 'h-48' } },
                    { tag: 'h3', content: name, style: { font: 'text-lg font-semibold', margin: 'mt-3' } },
                    { tag: 'p', content: price, style: { color: 'text-green-600', font: 'font-medium', margin: 'mt-2' } },
                    { tag: 'button', content: 'Add to Cart', style: { bg: 'bg-blue-600 hover:bg-blue-700', color: 'text-white', rounded: 'rounded-md', padding: 'px-3 py-2', margin: 'mt-3 w-full' }, events: { onClick: 'addToCart' }, props: { bindings: { productId: name.toLowerCase().replace(/\s+/g,'-') } } }
                  ]
                });
                const grid: any = {
                  tag: 'div',
                  style: { display: 'grid', grid: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', gap: 'gap-6' },
                  children: [
                    productCard('Product A', '$29.99', 'https://via.placeholder.com/600x400'),
                    productCard('Product B', '$39.99', 'https://via.placeholder.com/600x400'),
                    productCard('Product C', '$49.99', 'https://via.placeholder.com/600x400')
                  ]
                };
                const componentsArr: any[] = [hero, grid];
                setPages(prev => ([...prev, { id, title, slug, components: componentsArr }]));
                const prefix = mode === 'public' ? 'public' : 'builder';
                setCurrentSlug(slug);
                window.location.hash = `#/${prefix}/${slug}`;
              }}
            >
              + Add Product Page
            </button>
            <button
              className="px-2 py-1 border rounded text-sm"
              onClick={() => {
                const title = 'Product Detail';
                const baseSlug = 'product-detail';
                let slug = baseSlug;
                const existing = new Set(pages.map(p=>p.slug));
                let n = 2;
                while (existing.has(slug)) { slug = `${baseSlug}-${n++}`; }
                const id = `page_${Date.now()}`;

                const gallery = {
                  tag: 'div',
                  style: { bg: 'bg-white', rounded: 'rounded-lg', border: 'border', padding: 'p-3', display: 'flex', direction: 'flex-col', gap: 'gap-3' },
                  children: [
                    { tag: 'img', src: 'https://via.placeholder.com/800x600', style: { width: 'w-full', height: 'h-96', object: 'object-cover', rounded: 'rounded' } },
                    {
                      tag: 'div',
                      style: { display: 'grid', grid: 'grid-cols-4', gap: 'gap-2' },
                      children: [
                        { tag: 'img', src: 'https://via.placeholder.com/120', style: { width: 'w-full', height: 'h-20', object: 'object-cover', rounded: 'rounded' } },
                        { tag: 'img', src: 'https://via.placeholder.com/120', style: { width: 'w-full', height: 'h-20', object: 'object-cover', rounded: 'rounded' } },
                        { tag: 'img', src: 'https://via.placeholder.com/120', style: { width: 'w-full', height: 'h-20', object: 'object-cover', rounded: 'rounded' } },
                        { tag: 'img', src: 'https://via.placeholder.com/120', style: { width: 'w-full', height: 'h-20', object: 'object-cover', rounded: 'rounded' } }
                      ]
                    }
                  ]
                } as any;

                const details = {
                  tag: 'div',
                  style: { bg: 'bg-white', rounded: 'rounded-lg', border: 'border', padding: 'p-4', space: 'space-y-3' },
                  children: [
                    { tag: 'h1', content: 'Product Title', style: { font: 'text-2xl font-semibold' } },
                    { tag: 'p', content: 'Brand • Model • Short tagline', style: { color: 'text-gray-600' } },
                    { tag: 'div', style: { display: 'flex', gap: 'gap-2' }, children: [
                      { tag: 'span', content: '4.6', style: { bg: 'bg-yellow-400', color: 'text-black', rounded: 'rounded px-2 py-0.5', text: 'text-xs' } },
                      { tag: 'span', content: '1,113 ratings', style: { color: 'text-blue-600', text: 'underline text-sm' } }
                    ]},
                    { tag: 'div', style: { margin: 'mt-2', space: 'space-y-1' }, children: [
                      { tag: 'p', content: 'Key features:', style: { font: 'font-medium' } },
                      { tag: 'ul', style: { list: 'list-disc', margin: 'ml-5 space-y-1 text-sm' }, children: [
                        { tag: 'li', content: 'Intel Core i7-14700F, 16GB DDR5' },
                        { tag: 'li', content: 'RTX 5060 Ti 16GB, 1TB PCIe 4.0 SSD' },
                        { tag: 'li', content: 'WiFi Ready, Windows 11 Home' }
                      ]}
                    ]},
                    { tag: 'div', style: { margin: 'mt-2' }, children: [
                      { tag: 'p', content: 'About this item', style: { font: 'font-medium' } },
                      { tag: 'p', content: 'Detailed description goes here. Lorem ipsum dolor sit amet, consectetur adipiscing elit.', style: { color: 'text-gray-700', text: 'text-sm' } }
                    ]}
                  ]
                } as any;

                const purchaseBox = {
                  tag: 'div',
                  style: { bg: 'bg-white', rounded: 'rounded-lg', border: 'border', padding: 'p-4', space: 'space-y-3' },
                  children: [
                    { tag: 'p', content: '$1,359.99', style: { font: 'text-2xl font-semibold', color: 'text-gray-900' } },
                    { tag: 'p', content: 'In Stock', style: { color: 'text-green-700', font: 'font-medium' } },
                    { tag: 'label', content: 'Quantity', style: { text: 'text-sm' } },
                    { tag: 'select', style: { border: 'border rounded', padding: 'px-2 py-1', width: 'w-24' }, children: [
                      { tag: 'option', content: '1' },
                      { tag: 'option', content: '2' },
                      { tag: 'option', content: '3' },
                      { tag: 'option', content: '4' }
                    ]},
                    { tag: 'button', content: 'Add to Cart', style: { bg: 'bg-yellow-400 hover:bg-yellow-500', color: 'text-black', rounded: 'rounded-full', padding: 'py-2', width: 'w-full' }, events: { onClick: 'addToCart' }, props: { bindings: { productId: 'prod_detail' } } },
                    { tag: 'button', content: 'Buy Now', style: { bg: 'bg-orange-500 hover:bg-orange-600', color: 'text-white', rounded: 'rounded-full', padding: 'py-2', width: 'w-full' } }
                  ]
                } as any;

                const layout = {
                  tag: 'div',
                  style: { display: 'grid', grid: 'grid-cols-1 lg:grid-cols-12', gap: 'gap-6', padding: 'p-4' },
                  children: [
                    { tag: 'div', style: { grid: 'lg:col-span-5' }, children: [gallery] },
                    { tag: 'div', style: { grid: 'lg:col-span-5' }, children: [details] },
                    { tag: 'div', style: { grid: 'lg:col-span-2' }, children: [purchaseBox] }
                  ]
                } as any;

                const hero = { tag: 'section', style: { padding: 'py-4 px-4' }, children: [ { tag: 'a', content: 'Back to Results', props: { href: '#/builder/home' }, style: { color: 'text-blue-600', text: 'underline text-sm' } } ] } as any;

                const componentsArr: any[] = [hero, layout];
                setPages(prev => ([...prev, { id, title, slug, components: componentsArr }]));
                const prefix = mode === 'public' ? 'public' : 'builder';
                setCurrentSlug(slug);
                window.location.hash = `#/${prefix}/${slug}`;
              }}
            >
              + Add Product Detail Page
            </button>
          </div>
        </div>
        <div className="space-x-2 flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm">
            <span className={mode === 'builder' ? 'font-semibold' : 'text-gray-500'}>Builder</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={mode === 'public'}
                onChange={(e) => {
                  const nextMode = e.target.checked ? 'public' : 'builder';
                  setMode(nextMode);
                  const slug = currentSlug || 'home';
                  window.location.hash = `#/${nextMode}/${slug}`;
                }}
              />
              <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 relative">
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
            <span className={mode === 'public' ? 'font-semibold' : 'text-gray-500'}>Preview</span>
          </div>
          <button className="px-3 py-2 rounded border" onClick={syncToPage}>Sync to Page</button>
          <button className="px-3 py-2 rounded border" onClick={() => downloadJson('pages.json', pages)}>Save pages.json</button>
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => setShowExportModal(true)}>Export</button>
        </div>
      </div>
      {mode === 'public' ? (
        // Preview: no extra wrappers that could alter layout; render exactly as built
        <div className="flex-1 overflow-auto">
          {/* Render the page content only; header/nav should come from pages.json */}
          <PageRenderer slug={currentSlug} pagesOverride={overridePages} />
        </div>
      ) : (
      <>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 bg-white flex flex-col border-r">
          <div className="px-3 pt-3">
            <div className="inline-flex rounded-md border overflow-hidden">
              <button
                className={`px-3 py-1 text-sm ${leftTab==='library' ? 'bg-gray-100 font-medium' : ''}`}
                onClick={() => setLeftTab('library')}
              >Library</button>
              <button
                className={`px-3 py-1 text-sm border-l ${leftTab==='tree' ? 'bg-gray-100 font-medium' : ''}`}
                onClick={() => setLeftTab('tree')}
              >Tree</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto mt-2">
            {leftTab === 'library' ? (
              <ComponentLibrary onAddComponent={addComponent} customComponents={customComponents} />
            ) : (
              <ComponentsTree
                roots={components}
                selectedId={selectedComponent?.uniqueId || null}
                onSelect={(c) => setSelectedComponent(c)}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onOutdent={handleOutdent}
                onAddContainer={handleAddContainer}
                onDelete={handleTreeDelete}
                onAddChild={handleTreeAddChild}
                onAddRoot={handleTreeAddRoot}
                onMerge={handleTreeMerge}
                onReorder={handleTreeReorder}
                libraryItems={[...((libComponents as any[]) || []), ...customComponents] as any}
              />
            )}
          </div>
        </div>
        <div className="flex-1">
          <Canvas
            components={components}
            selectedComponent={selectedComponent}
            onSelectComponent={setSelectedComponent}
            onDeleteComponent={deleteComponent}
            globalStyles={globalStyles}
          />
        </div>
        <div className="w-80 bg-white">
          <PropertiesPanel
            selectedComponent={selectedComponent}
            onUpdateComponent={updateComponent}
            pages={pages}
            onSaveCustom={(comp, name) => {
              const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const cloneDeep = (n: any): any => ({ ...n, uniqueId: undefined, props: { ...(n.props || {}), children: Array.isArray(n.props?.children) ? n.props.children.map(cloneDeep) : [] } });
              const def = {
                id,
                name,
                category: 'Custom',
                type: comp.type || 'div',
                props: cloneDeep(comp).props,
                styles: comp.styles || {},
                source: 'custom'
              } as any;
              setCustomComponents(prev => {
                const next = [...prev.filter((c:any)=>c.id!==id), def];
                return next;
              });
            }}
          />
        </div>
      </div>
      </>
      )}
      {showExportModal && (
        <ExportModal components={components} globalStyles={globalStyles} pages={pages} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}

export default App;
