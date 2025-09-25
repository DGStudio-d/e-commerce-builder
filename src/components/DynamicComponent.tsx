import React from 'react';
import { combineStyles } from '../utils/styleUtils';
import type { ComponentDefinition, GlobalStyles, ComponentType } from '../types';

interface DynamicComponentProps {
  component: ComponentDefinition;
  globalStyles: GlobalStyles;
  children?: React.ReactNode;
  onSelectComponent?: (c: ComponentDefinition) => void;
  selectedId?: string | null;
}

const DynamicComponent: React.FC<DynamicComponentProps> = ({ component, globalStyles, children, onSelectComponent, selectedId }) => {
  const { type, props, styles } = component;
  const baseClass = Object.values(combineStyles(styles, globalStyles)).join(' ');
  const isSelected = selectedId && component.uniqueId === selectedId;
  const className = `${baseClass} ${isSelected ? 'ring-2 ring-blue-500' : ''}`.trim();

  const commonProps = {
    className,
    'data-component-id': component.uniqueId,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectComponent && onSelectComponent(component);
    }
  } as const;

  const normalizeNode = (node: any) => {
    const nType = node.type || node.tag || 'div';
    const nProps: any = { ...(node.props || {}) };
    if (node.content && !nProps.text) nProps.text = node.content;
    if (node.src && !nProps.src) nProps.src = node.src;
    const nStyles = node.style || node.styles || {};
    const nChildren = node.children || (node.props && node.props.children) || [];
    if (Array.isArray(nChildren)) {
      nProps.children = nChildren.map((c: any, idx: number) => {
        const child = normalizeNode(c);
        if (!child.uniqueId) child.uniqueId = `${child.type}_${idx}_${Date.now()}`;
        return child;
      });
    }
    return {
      type: nType,
      props: nProps,
      styles: nStyles,
      uniqueId: node.uniqueId || node.id || `${nType}_${Math.random().toString(36).slice(2)}`,
    } as any;
  };

  const buildEventHandlers = (events: any, ctx: { id: string; type: string; props?: any }) => {
    const handlers: Record<string, any> = {};
    if (!events || typeof events !== 'object') return handlers;
    const dispatch = (eventName: string, ev: any) => {
      const action = events[eventName];
      // If a global dispatcher exists, call it; otherwise, log
      const payload = { componentId: ctx.id, componentType: ctx.type, event: eventName, props: ctx.props };
      try {
        const anyWindow: any = window as any;
        if (anyWindow?.BuilderEvents?.invoke && typeof anyWindow.BuilderEvents.invoke === 'function') {
          anyWindow.BuilderEvents.invoke(action, payload, ev);
        } else {
          console.log('[Builder Event]', action, payload);
        }
      } catch (e) {
        console.warn('Event dispatch error:', e);
      }
    };
    // Map commonly used DOM events
    const map: Record<string, string> = {
      onClick: 'onClick',
      onMouseEnter: 'onMouseEnter',
      onMouseLeave: 'onMouseLeave',
      onFocus: 'onFocus',
      onBlur: 'onBlur'
    };
    Object.keys(events).forEach((evtKey) => {
      const domEvt = map[evtKey as keyof typeof map];
      if (domEvt) {
        handlers[domEvt] = (ev: any) => dispatch(evtKey, ev);
      }
    });
    return handlers;
  };

  switch (type as ComponentType) {
    case 'dropdown': {
      // Props shape: { trigger: { type, props, styles }, menu: [ { type: 'dropdownItem', props, styles } ] }
      const trigger = (props as any).trigger || { type: 'button', props: { text: 'Menu' } };
      const menuItems: any[] = (props as any).menu || [];
      const wrapClass = `${className} relative inline-block group`;

      const renderTrigger = () => {
        const t = normalizeNode(trigger);
        const TriggerTag = (t.type || 'button') as any;
        const icon = (trigger.props && trigger.props.icon) ? <span className="mr-2">{trigger.props.icon}</span> : null;
        const evt = buildEventHandlers((trigger as any).events, { id: component.uniqueId, type: 'dropdown.trigger', props: trigger.props });
        // Compute dynamic cart count if available
        let label: any = t.props?.text || 'Menu';
        try {
          const anyWindow: any = window as any;
          const count: number = anyWindow?.CartAPI?.getCart ? (anyWindow.CartAPI.getCart()?.length || 0) : 0;
          if (typeof label === 'string') {
            if (label.includes('{count}')) {
              label = label.replace('{count}', String(count));
            } else if ((trigger as any)?.props?.showCount === true) {
              label = `${label} (${count})`;
            }
          }
        } catch {}
        return React.createElement(
          TriggerTag,
          { className: Object.values(t.styles || {}).join(' '), ...evt },
          <>
            {icon}
            {label}
          </>
        );
      };

      const renderMenu = () => {
        return (
          <div className="hidden group-hover:block absolute right-0 mt-2 w-56 rounded-md border bg-white shadow-xl z-50">
            <div className="py-2">
              {menuItems.map((mi, idx) => {
                const item = normalizeNode({ ...mi, type: mi.type || 'dropdownItem' });
                return (
                  <DynamicComponent key={item.uniqueId || idx} component={item} globalStyles={globalStyles} />
                );
              })}
            </div>
          </div>
        );
      };

      return (
        <div className={wrapClass} data-component-id={component.uniqueId}>
          {renderTrigger()}
          {renderMenu()}
        </div>
      );
    }

    case 'dropdownItem': {
      const href = (props as any)?.href;
      const content = (props as any)?.text || 'Item';
      const itemClass = `${Object.values(styles || {}).join(' ')} block w-full text-left px-4 py-2 text-sm hover:bg-gray-100`;
      const evt = buildEventHandlers((component as any).events || (props as any)?.events, { id: component.uniqueId, type: 'dropdownItem', props });
      if (href) {
        return (
          <a {...(commonProps as any)} className={itemClass} href={href} {...evt}>
            {content}
          </a>
        );
      }
      return (
        <button {...(commonProps as any)} className={itemClass} {...evt}>
          {content}
        </button>
      );
    }
    case 'button': {
      const evt = buildEventHandlers((component as any).events || (props as any)?.events, { id: component.uniqueId, type: 'button', props });
      return <button {...commonProps} {...evt}>{props.text || 'Button'}</button>;
    }
    case 'p':
      return <p {...commonProps}>{props.text || 'Text'}</p>;
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const Tag = type as string;
      return React.createElement(Tag as any, commonProps, props.text || 'Heading');
    }
    case 'img':
      return <img {...commonProps} src={props.src || ''} alt={props.alt || ''} />;
    case 'input':
      return <input {...commonProps} placeholder={props.placeholder || ''} />;
    case 'textarea':
      return <textarea {...commonProps} rows={typeof props.rows === 'string' ? parseInt(props.rows) : props.rows || 3} />;
    case 'a': {
      const evt = buildEventHandlers((component as any).events || (props as any)?.events, { id: component.uniqueId, type: 'a', props });
      return <a {...commonProps} {...evt} href={props.href || '#'}>{props.text || 'Link'}</a>;
    }
    case 'form':
      return <form {...commonProps}>{children || 'Form'}</form>;
    case 'div':
    case 'section':
    case 'article':
    case 'header':
    case 'footer':
    case 'nav':
    case 'main':
    case 'aside': {
      const Container = type as string;
      return React.createElement(
        Container as any,
        commonProps,
        props.children && props.children.length > 0
          ? (props.children as any[]).map((rawChild: any, idx: number) => {
              const child = normalizeNode(rawChild);
              return (
                <DynamicComponent
                  key={child.uniqueId || idx}
                  component={child}
                  globalStyles={globalStyles}
                  onSelectComponent={onSelectComponent}
                  selectedId={selectedId}
                />
              );
            })
          : children || (
              <div className="p-4 border-2 border-dashed border-gray-300 text-gray-500 text-center">
                Drop components here
              </div>
            )
      );
    }
    default:
      return <div {...commonProps}>Unknown component: {String(type)}</div>;
  }
};

export default DynamicComponent;
