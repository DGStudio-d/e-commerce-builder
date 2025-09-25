import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ComponentLibrary from './components/ComponentLibrary';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import ExportModal from './components/ExportModal';
import type { ComponentDefinition, GlobalStyles } from './types';
import pagesData from './data/pages.json';
import PageRenderer from './render/PageRenderer';
import NavBar from './render/NavBar';

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
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [globalStyles, setGlobalStyles] = useState<GlobalStyles>({});
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

  // Denormalize builder component into page JSON node
  const denormalizeNode = useCallback((c: ComponentDefinition): any => {
    const node: any = {
      id: c.id,
      tag: c.type,
      style: c.styles || {},
    };
    if (c.props?.text) node.content = c.props.text;
    if (c.props?.src) node.src = c.props.src;
    const kids = (c.props?.children || []) as any[];
    if (Array.isArray(kids) && kids.length > 0) {
      node.children = kids.map((k: any) => denormalizeNode(k));
    }
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
        <div className="flex-1 overflow-auto p-4">
          <div className="mx-auto max-w-6xl">
            {/* Auto-generated nav from pages.json */}
            <NavBar currentSlug={currentSlug} mode={mode} />
            <PageRenderer slug={currentSlug} pagesOverride={overridePages} />
          </div>
        </div>
      ) : (
      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 bg-white">
          <ComponentLibrary onAddComponent={addComponent} />
        </div>
        <div className="flex-1">
          <Canvas
            components={components}
            selectedComponent={selectedComponent}
            onSelectComponent={setSelectedComponent}
            onUpdateComponent={updateComponent}
            onDeleteComponent={deleteComponent}
            globalStyles={globalStyles}
            onAddComponent={addComponent}
          />
        </div>
        <div className="w-80 bg-white">
          <PropertiesPanel
            selectedComponent={selectedComponent}
            onUpdateComponent={updateComponent}
            globalStyles={globalStyles}
            onUpdateGlobalStyles={setGlobalStyles}
          />
        </div>
      </div>
      )}
      {showExportModal && (
        <ExportModal components={components} globalStyles={globalStyles} pages={pages} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}

export default App;
