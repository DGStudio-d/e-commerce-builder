import React from 'react';
import { useTheme } from '../theme/ThemeProvider';

export type JsonNode = {
  id?: string;
  type?: string; // custom types allowed, but we focus on html tags
  tag?: string;  // preferred for HTML tag
  content?: string; // for text-bearing nodes
  props?: Record<string, any>;
  style?: Record<string, string>;
  styles?: Record<string, string>;
  color?: string | Record<string, any>;
  src?: string;
  events?: Record<string, string>; // e.g., { onClick: 'actionName' }
  children?: JsonNode[];
};

function styleToClassName(style?: Record<string, string> | null): string {
  if (!style) return '';
  // Join all values of style buckets (Tailwind utility classes expected)
  return Object.values(style).filter(Boolean).join(' ').trim();
}

function buildHandlers(node: JsonNode) {
  const events = node.events || node.props?.events;
  const handlers: Record<string, any> = {};
  if (!events) return handlers;
  const map: Record<string, string> = {
    onClick: 'onClick',
    onMouseEnter: 'onMouseEnter',
    onMouseLeave: 'onMouseLeave',
    onFocus: 'onFocus',
    onBlur: 'onBlur',
  };
  const dispatch = (evtName: string, ev: any) => {
    const action = events[evtName];
    const payload = { node, event: evtName };
    try {
      const anyWindow: any = window as any;
      if (anyWindow?.BuilderEvents?.invoke) {
        anyWindow.BuilderEvents.invoke(action, payload, ev);
      } else {
        console.log('[RenderComponent Event]', action, payload);
      }
    } catch (e) {
      console.warn('Event dispatch error', e);
    }
  };
  Object.keys(events).forEach((k) => {
    const domEvt = map[k];
    if (domEvt) handlers[domEvt] = (ev: any) => dispatch(k, ev);
  });
  return handlers;
}

export const RenderComponent: React.FC<{ node: JsonNode }> = ({ node }) => {
  const { theme } = useTheme();

  const sanitize = (cls: string) => {
    // Allow letters, numbers, spaces, dashes, colons, slashes, underscores, brackets, parentheses, dots, percent, hash
    return (cls || '')
      .split(/\s+/)
      .map((c) => c.replace(/[^a-zA-Z0-9:_/\-\[\]().%#]/g, ''))
      .filter(Boolean)
      .join(' ')
      .trim();
  };

  const resolveColor = (value?: string | Record<string, any>) => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      // token name -> CSS var, hex/rgb -> direct
      const token = value.trim();
      if ((theme as any)?.colors && token in (theme as any).colors) {
        return `var(--color-${token})`;
      }
      if (/^#|^rgb\(|^hsl\(/.test(token)) return token;
      // fallback: treat as tailwind class added via styles
      return undefined;
    }
    if ((value as any).base) return (value as any).base;
    return undefined;
  };

  const tag = node.tag || node.type || 'div';
  const props = { ...(node.props || {}) } as Record<string, any>;
  const cls = sanitize([styleToClassName(node.style), styleToClassName(node.styles)]
    .filter(Boolean)
    .join(' '));
  const handlers = buildHandlers(node);
  // Layout debug: outline containers when window.LayoutDebug === true
  const isDebug = (() => { try { return (window as any).LayoutDebug === true; } catch { return false; } })();
  const debugClass = isDebug ? 'outline outline-1 outline-dashed outline-amber-400/60' : '';
  const debugTitle = isDebug ? `[${tag}]` : undefined;

  const common = {
    className: [cls, debugClass].filter(Boolean).join(' ').trim(),
    'data-tag': isDebug ? tag : undefined,
    title: debugTitle,
    ...handlers,
  } as const;

  const overrideColor = resolveColor((node as any).color);
  const computedStyle = overrideColor ? { color: overrideColor } : undefined;

  switch (tag) {
    case 'dropdown': {
      // Accept items from props.menu or from children so users can add via builder tree
      const trigger = (props as any)?.trigger || { type: 'button', props: { text: 'Menu' }, styles: {} };
      const childrenItems = Array.isArray(node.children)
        ? node.children
        : (Array.isArray((props as any)?.children) ? (props as any).children : []);
      const menuItems: any[] = Array.isArray((props as any)?.menu) && (props as any).menu.length > 0
        ? (props as any).menu
        : childrenItems;
      const wrapperCls = `${cls} relative inline-block group`;
      const triggerTag = (trigger.type || 'button') as string;
      let triggerCls = `${(trigger.styles ? Object.values(trigger.styles).join(' ') : '')}`.trim();
      if (!triggerCls) triggerCls = 'px-3 py-1 border rounded bg-white text-gray-700 hover:bg-gray-50';
      const triggerLabel = (trigger.props && (trigger.props.text || trigger.props.label)) || 'Menu';
      return (
        <div className={wrapperCls} style={computedStyle}>
          {React.createElement(triggerTag as any, { className: triggerCls }, triggerLabel)}
          <div className="hidden group-hover:block absolute right-0 mt-2 w-56 rounded-md border bg-white shadow-xl z-50">
            <div className="py-2">
              {menuItems.map((mi, idx) => (
                <RenderComponent key={mi.id || idx} node={{ ...(mi as any), type: (mi as any).type || 'dropdownItem' }} />
              ))}
            </div>
          </div>
        </div>
      );
    }
    case 'dropdownItem': {
      const href = (props as any)?.href;
      const label = (props as any)?.text || (props as any)?.label || 'Item';
      const itemClass = `${cls} block w-full text-left px-4 py-2 text-sm hover:bg-gray-100`;
      if (href) {
        return React.createElement('a', { className: itemClass, href }, label);
      }
      return React.createElement('button', { className: itemClass }, label);
    }
    case 'div':
    case 'section':
    case 'header':
    case 'footer':
    case 'nav':
    case 'main':
    case 'article':
    case 'aside': {
      const kids = Array.isArray(node.children) ? node.children : (Array.isArray(node.props?.children) ? node.props!.children : []);
      return (
        React.createElement(tag as any, { ...common, style: computedStyle },
          (kids as any[]).map((child: any, i: number) => (
            <RenderComponent key={child.id || i} node={child} />
          ))
        )
      );
    }
    case 'h1': {
      return React.createElement('h1', { ...common, style: computedStyle }, node.content || props.text || 'Heading');
    }
    case 'p': {
      return React.createElement('p', { ...common, style: computedStyle }, node.content || props.text || 'Text');
    }
    case 'img': {
      const src = node.src || props.src || '';
      return React.createElement('img', { ...common, src, alt: props.alt || '' });
    }
    case 'button': {
      const label = node.content || props.text || 'Button';
      return React.createElement('button', { ...common, style: computedStyle }, label);
    }
    case 'input': {
      // Void element: no children
      const inputProps = { ...props };
      return React.createElement('input', { ...common, ...inputProps, style: computedStyle });
    }
    case 'textarea': {
      const rows = typeof props.rows === 'string' ? parseInt(props.rows) : (props.rows || 3);
      const value = node.content || props.text || props.value;
      return React.createElement('textarea', { ...common, rows, style: computedStyle }, value);
    }
    default: {
      // Fallback: render container with children
      return (
        React.createElement(tag as any, { ...common, style: computedStyle },
          (node.children || []).map((child, i) => (
            <RenderComponent key={child.id || i} node={child} />
          ))
        )
      );
    }
  }
};

export default RenderComponent;
