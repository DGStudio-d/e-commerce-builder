import React, { useMemo, useState } from 'react';
import type { ComponentDefinition, GlobalStyles } from '../types';
import pagesFile from '../data/pages.json';
import theme from '../data/general.json';

interface Props {
  components: ComponentDefinition[];
  globalStyles: GlobalStyles;
  onClose: () => void;
  pages?: any[];
  customComponents?: any[];
}

const ExportModal: React.FC<Props> = ({ onClose, pages, customComponents = [] }) => {
  const [mode, setMode] = useState<'json'|'react'>('json');
  const exportPayload = useMemo(() => {
    return {
      theme,
      pages: pages && Array.isArray(pages) ? pages : (pagesFile as any[]),
      customComponents: Array.isArray(customComponents) ? customComponents : [],
      meta: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }, [pages, customComponents]);

  const json = useMemo(() => JSON.stringify(exportPayload, null, 2), [exportPayload]);

  type FileEntry = { filename: string; content: string };
  const makeReactFiles = (): FileEntry[] => {
    const voidTags = new Set(['img','input','br','hr','meta','link','source']);
    const styleToClassName = (style?: Record<string,string>) => {
      if (!style) return '';
      const vals: string[] = [];
      for (const k of Object.keys(style)) {
        const v = (style as any)[k];
        if (typeof v === 'string' && v.trim()) vals.push(v.trim());
      }
      return vals.join(' ').trim();
    };
    const esc = (s: string) => s.replace(/`/g, '\\`');
    const propPairs = (props: any) => {
      if (!props) return '';
      const allow = ['href','src','alt','value','rows','target','rel','type','placeholder'];
      const out: string[] = [];
      for (const key of allow) {
        if (props[key] !== undefined) {
          const v = props[key];
          if (typeof v === 'number') out.push(`${key}={${v}}`);
          else out.push(`${key}="${String(v).replace(/"/g,'&quot;')}"`);
        }
      }
      return out.join(' ');
    };
    const toJSX = (node: any, depth = 2): string => {
      const pad = '  '.repeat(depth);
      const tag = node.tag || node.type || 'div';
      const cls = styleToClassName(node.style || node.styles);
      const classAttr = cls ? ` className=\"${esc(cls)}\"` : '';
      const propsAttr = propPairs(node.props || {});
      const propStr = [classAttr, propsAttr ? ' ' + propsAttr : ''].join('');
      if (voidTags.has(tag)) {
        const srcAttr = node.src ? ` src=\"${esc(node.src)}\"` : '';
        const altAttr = node.props?.alt ? ` alt=\"${esc(node.props.alt)}\"` : (tag==='img' ? ' alt=""' : '');
        return `${pad}<${tag}${srcAttr}${altAttr}${propStr} />`;
      }
      const content = node.content || node.props?.text || '';
      const kids = Array.isArray(node.children) ? node.children : [];
      if (kids.length === 0 && content) {
        return `${pad}<${tag}${propStr}>${esc(String(content))}</${tag}>`;
      }
      const lines: string[] = [];
      lines.push(`${pad}<${tag}${propStr}>`);
      if (content) lines.push(`${pad}  ${esc(String(content))}`);
      for (const child of kids) lines.push(toJSX(child, depth + 1));
      lines.push(`${pad}</${tag}>`);
      return lines.join('\n');
    };

    const files: FileEntry[] = [];
    // Create a component per page
    for (const p of exportPayload.pages as any[]) {
      const compName = (p.title || p.slug || 'Page').replace(/[^a-zA-Z0-9]/g, '_');
      const body = Array.isArray(p.components) ? p.components.map((n:any)=>toJSX(n, 2)).join('\n') : '';
      const pageTsx = `import React from 'react';\n\nexport default function ${compName}() {\n  return (\n${body}\n  );\n}`;
      files.push({ filename: `src/pages/${p.slug || compName}.tsx`, content: pageTsx });
    }
    // Simple router file using react-router-dom
    const routes = (exportPayload.pages as any[]).map((p:any)=>{
      const compName = (p.title || p.slug || 'Page').replace(/[^a-zA-Z0-9]/g, '_');
      return `        <Route path=\"/${p.slug}\" element={<${compName} />} />`;
    }).join('\n');
    const imports = (exportPayload.pages as any[]).map((p:any)=>{
      const compName = (p.title || p.slug || 'Page').replace(/[^a-zA-Z0-9]/g, '_');
      return `import ${compName} from './pages/${p.slug || compName}';`;
    }).join('\n');
    const navLinks = (exportPayload.pages as any[]).map((p:any)=>`  <Link className=\"px-3 py-2 rounded ${'${'}location.pathname==='/'+${JSON.stringify(p.slug)}?'bg-blue-600 text-white':'bg-gray-100 hover:bg-gray-200 text-gray-800'${'}'}\" to=\"/${p.slug}\">${p.title || p.slug}</Link>`).join('\n');
    const navTsx = `import React from 'react';\nimport { Link, useLocation } from 'react-router-dom';\nexport default function NavBar(){\n  const location = useLocation();\n  return (\n    <nav className=\"sticky top-0 z-40 bg-white border-b mb-4 px-4 py-3 flex gap-2\">\n${navLinks}\n    </nav>\n  );\n}`;
    files.push({ filename: 'src/components/NavBar.tsx', content: navTsx });
    // Layout wrapper
    const layoutTsx = `import React from 'react';\nimport { Outlet } from 'react-router-dom';\nimport NavBar from './NavBar';\nexport default function Layout(){\n  return (\n    <div className=\"min-h-screen bg-gray-50\">\n      <NavBar />\n      <main className=\"mx-auto max-w-6xl px-4\">\n        <Outlet />\n      </main>\n    </div>\n  );\n}`;
    files.push({ filename: 'src/components/Layout.tsx', content: layoutTsx });
    const appTsx = `import React from 'react';\nimport { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';\nimport Layout from './components/Layout';\n${imports}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <Routes>\n        <Route element={<Layout />}>\n${routes}\n          <Route path=\"*\" element={<Navigate to=\"/${(exportPayload.pages as any[])[0]?.slug || 'home'}\" />} />\n        </Route>\n      </Routes>\n    </BrowserRouter>\n  );\n}`;
    files.push({ filename: 'src/App.tsx', content: appTsx });

    // Boilerplate (Vite + TS + Tailwind)
    files.push({ filename: 'index.html', content: `<!doctype html>\n<html><head><meta charset=
"UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Exported Site</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>` });
    files.push({ filename: 'src/main.tsx', content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);` });
    files.push({ filename: 'src/index.css', content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;` });
    files.push({ filename: 'tailwind.config.js', content: `/** @type {import('tailwindcss').Config} */\nexport default { content: [\"./index.html\", \"./src/**/*.{ts,tsx}\"], theme: { extend: {} }, plugins: [] };` });
    files.push({ filename: 'postcss.config.js', content: `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };` });
    files.push({ filename: 'tsconfig.json', content: `{"compilerOptions":{"target":"ES2020","useDefineForClassFields":true,"lib":["ES2020","DOM","DOM.Iterable"],"module":"ESNext","skipLibCheck":true,"jsx":"react-jsx","moduleResolution":"Bundler","resolveJsonModule":true,"isolatedModules":true,"noEmit":true,"esModuleInterop":true,"strict":true,"noUnusedLocals":false,"noUnusedParameters":false},"include":["src"]}` });
    files.push({ filename: 'vite.config.ts', content: `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });` });
    files.push({ filename: 'package.json', content: `{"name":"exported-site","private":true,"version":"0.0.0","type":"module","scripts":{"dev":"vite","build":"vite build","preview":"vite preview"},"dependencies":{"react":"^18.2.0","react-dom":"^18.2.0","react-router-dom":"^6.22.0"},"devDependencies":{"@types/react":"^18.2.0","@types/react-dom":"^18.2.0","@vitejs/plugin-react":"^4.2.0","autoprefixer":"^10.4.0","postcss":"^8.4.0","tailwindcss":"^3.4.0","typescript":"^5.0.0","vite":"^5.0.0"}}` });
    // Public folder
    files.push({ filename: 'public/favicon.svg', content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#2563eb"/><text x="16" y="21" text-anchor="middle" font-size="14" fill="white" font-family="Arial, Helvetica, sans-serif">E</text></svg>` });
    files.push({ filename: 'public/robots.txt', content: `User-agent: *\nAllow: /` });
    files.push({ filename: 'public/manifest.webmanifest', content: `{"name":"Exported Site","short_name":"Site","start_url":"/","display":"standalone","icons":[{"src":"/favicon.svg","sizes":"any","type":"image/svg+xml"}]}` });
    return files;
  };

  const reactBundle = useMemo(() => {
    const files = makeReactFiles();
    const combined = files.map(f => `// FILE: ${f.filename}\n${f.content}`).join('\n\n');
    return combined;
  }, [exportPayload]);

  // Build a simple ZIP (store only) without external dependencies
  const downloadZip = async () => {
    let files = makeReactFiles();
    // Attempt to fetch remote images and place into public/assets, then rewrite URLs in page files
    const urlSet = new Set<string>();
    for (const p of (exportPayload.pages as any[])) {
      const walk = (n:any) => {
        if (n && typeof n==='object') {
          if (n.src && /^https?:\/\//i.test(n.src)) urlSet.add(n.src);
          const kids = Array.isArray(n.children)?n.children:[]; kids.forEach(walk);
          if (n.props && Array.isArray(n.props.children)) n.props.children.forEach(walk);
        }
      };
      (Array.isArray(p.components)?p.components:[]).forEach(walk);
    }
    const assetMap = new Map<string,string>();
    for (const url of urlSet) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const buf = new Uint8Array(await resp.arrayBuffer());
        const u = new URL(url);
        const base = u.pathname.split('/').filter(Boolean).pop() || 'asset';
        const safe = base.replace(/[^a-zA-Z0-9_.-]/g,'_');
        const outPath = `public/assets/${safe}`;
        files.push({ filename: outPath, content: new TextDecoder().decode(buf) });
        assetMap.set(url, `/assets/${safe}`);
      } catch {}
    }
    if (assetMap.size>0) {
      files = files.map(f=>{
        if (f.filename.endsWith('.tsx')) {
          let c = f.content;
          for (const [oldU,newU] of assetMap) { c = c.split(oldU).join(newU); }
          return { ...f, content: c };
        }
        return f;
      });
    }
    const enc = new TextEncoder();
    type Central = { name: string; crc: number; size: number; offset: number };
    const chunks: Uint8Array[] = [];
    const centrals: Central[] = [];
    let offset = 0;
    const crc32 = (buf: Uint8Array) => {
      let c = ~0; for (let i=0;i<buf.length;i++){ c = (c >>> 8) ^ table[(c ^ buf[i]) & 255]; } return ~c >>> 0;
    };
    const table = (()=>{ let c:number; const t:number[]=[]; for(let n=0;n<256;n++){ c=n; for(let k=0;k<8;k++){ c = c & 1 ? 0xEDB88320 ^ (c>>>1) : (c>>>1);} t[n]=c>>>0;} return t; })();
    const push = (arr: number[]) => { const u = new Uint8Array(arr); chunks.push(u); offset += u.length; };
    const pushBuf = (u: Uint8Array) => { chunks.push(u); offset += u.length; };
    const now = new Date();
    const dosTime = ((now.getHours() & 31) << 11) | ((now.getMinutes() & 63) << 5) | ((Math.floor(now.getSeconds()/2)) & 31);
    const dosDate = (((now.getFullYear()-1980) & 127) << 9) | (((now.getMonth()+1) & 15) << 5) | (now.getDate() & 31);
    for (const f of files) {
      const nameBytes = enc.encode(f.filename);
      const data = typeof f.content === 'string' ? enc.encode(f.content) : new Uint8Array([]);
      const crc = crc32(data);
      const size = data.length;
      // Local file header (with mod time/date)
      push([0x50,0x4b,0x03,0x04, 20,0, 0,0, 0,0,  dosTime & 255, (dosTime>>8)&255, dosDate & 255, (dosDate>>8)&255,  crc & 255, (crc>>8)&255, (crc>>16)&255, (crc>>24)&255,  size & 255, (size>>8)&255, (size>>16)&255, (size>>24)&255,  size & 255, (size>>8)&255, (size>>16)&255, (size>>24)&255,  nameBytes.length & 255, (nameBytes.length>>8)&255, 0,0 ]);
      const localHeaderOffset = offset; // position after header array? we added header then will add name+data; need start offset of header
      // But we need offset of the local header start: compute as current offset minus header length we just pushed
      const headerLen = 30 + nameBytes.length; // no extra field
      const startOfLocal = localHeaderOffset - headerLen;
      pushBuf(nameBytes);
      pushBuf(data);
      centrals.push({ name: f.filename, crc, size, offset: startOfLocal });
    }
    const startOfCentral = offset;
    for (const c of centrals) {
      const nameBytes = enc.encode(c.name);
      push([0x50,0x4b,0x01,0x02, 20,0, 20,0, 0,0, 0,0,  dosTime & 255, (dosTime>>8)&255, dosDate & 255, (dosDate>>8)&255,  c.crc & 255, (c.crc>>8)&255, (c.crc>>16)&255, (c.crc>>24)&255,  c.size & 255, (c.size>>8)&255, (c.size>>16)&255, (c.size>>24)&255,  c.size & 255, (c.size>>8)&255, (c.size>>16)&255, (c.size>>24)&255,  nameBytes.length & 255, (nameBytes.length>>8)&255, 0,0, 0,0, 0,0, 0,0,  c.offset & 255, (c.offset>>8)&255, (c.offset>>16)&255, (c.offset>>24)&255 ]);
      pushBuf(nameBytes);
    }
    const centralSize = offset - startOfCentral;
    const fileCount = centrals.length;
    // End of central directory
    push([0x50,0x4b,0x05,0x06, 0,0, 0,0,  fileCount & 255, (fileCount>>8)&255,  fileCount & 255, (fileCount>>8)&255,  centralSize & 255, (centralSize>>8)&255, (centralSize>>16)&255, (centralSize>>24)&255,  startOfCentral & 255, (startOfCentral>>8)&255, (startOfCentral>>16)&255, (startOfCentral>>24)&255,  0,0 ]);
    const blob = new Blob(chunks, { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'exported-react-site.zip'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Export</div>
          <div className="inline-flex border rounded overflow-hidden text-sm">
            <button className={`px-3 py-1 ${mode==='json' ? 'bg-gray-100 font-medium' : ''}`} onClick={()=>setMode('json')}>JSON</button>
            <button className={`px-3 py-1 border-l ${mode==='react' ? 'bg-gray-100 font-medium' : ''}`} onClick={()=>setMode('react')}>React (TSX)</button>
          </div>
        </div>
        {mode==='json' ? (
          <>
            <p className="text-sm text-gray-600 mb-2">Copy the JSON below. It includes global theme (general.json) and all pages (pages.json).</p>
            <textarea
              readOnly
              className="w-full h-96 p-2 border rounded font-mono text-xs"
              value={json}
              onFocus={(e) => e.currentTarget.select()}
            />
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-2">Copy the React code below. It contains page components and a simple router. Create files as indicated by the FILE headers.</p>
            <textarea
              readOnly
              className="w-full h-96 p-2 border rounded font-mono text-xs"
              value={reactBundle}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="mt-2 flex justify-end">
              <button className="px-3 py-2 border rounded" onClick={downloadZip}>Download .zip</button>
            </div>
          </>
        )}
        <div className="text-right mt-3">
          <button className="px-4 py-2 border rounded" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
