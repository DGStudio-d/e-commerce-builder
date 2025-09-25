import React, { useEffect, useMemo, useState } from 'react';
import RenderComponent from './RenderComponent';
import type { JsonNode } from './RenderComponent';
import pages from '../data/pages.json';
import pageSchema from '../../schemas/pages.schema.json';
import componentSchema from '../../schemas/components.schema.json';

export interface PageRendererProps {
  slug: string;
  pagesOverride?: any[];
}

const PageRenderer: React.FC<PageRendererProps> = ({ slug, pagesOverride }) => {
  const [errors, setErrors] = useState<string[]>([]);
  const [ajvReady, setAjvReady] = useState<boolean>(false);
  const [ajvMissing, setAjvMissing] = useState<boolean>(false);

  const page: any = useMemo(() => {
    const src = (pagesOverride && Array.isArray(pagesOverride) ? pagesOverride : (pages as any[]));
    return src.find((p: any) => p.slug === slug);
  }, [slug, pagesOverride]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setErrors([]);
      try {
        const mod: any = await import('ajv');
        const Ajv = mod.default || mod;
        const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
        const validatePage = ajv.compile(pageSchema as any);
        const validateComponent = ajv.compile((componentSchema as any));

        const errs: string[] = [];
        if (!validatePage(page)) {
          (validatePage.errors || []).forEach((e: any) => errs.push(`page: ${e.instancePath ?? ''} ${e.message ?? ''}`));
        }

        const validateNode = (node: any, path: string) => {
          if (!validateComponent(node)) {
            (validateComponent.errors || []).forEach((e: any) => errs.push(`${path}${e.instancePath ?? ''} ${e.message ?? ''}`));
          }
          const children = node.children || node.props?.children || [];
          if (Array.isArray(children)) {
            children.forEach((c: any, i: number) => validateNode(c, `${path}/children[${i}]`));
          }
        };

        (page?.components || []).forEach((n: any, i: number) => validateNode(n, `/components[${i}]`));

        if (mounted) {
          setErrors(errs);
          setAjvReady(true);
          setAjvMissing(false);
        }
      } catch (e) {
        if (mounted) {
          setAjvMissing(true);
          setAjvReady(false);
          setErrors([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, [page]);

  if (!page) {
    return <div className="p-6 text-red-600">Page not found: {slug}</div>;
  }

  const nodes: JsonNode[] = page.components || [];

  return (
    <div>
      {ajvMissing && (
        <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-3 text-yellow-800 text-sm">
          AJV not installed. Skipping validation. To enable JSON schema validation, install ajv:
          <pre className="mt-2 bg-yellow-100 p-2 rounded">npm install ajv</pre>
        </div>
      )}
      {ajvReady && errors.length > 0 && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-700 text-sm">
          <div className="font-semibold mb-1">Validation errors</div>
          <ul className="list-disc pl-5">
            {errors.map((e, i) => (<li key={i}>{e}</li>))}
          </ul>
        </div>
      )}
      {nodes.map((n, i) => (
        <RenderComponent key={n.id || i} node={n as JsonNode} />
      ))}
    </div>
  );
};

export default PageRenderer;
