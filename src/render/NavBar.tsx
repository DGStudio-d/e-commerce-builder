import React from 'react';
import pagesData from '../data/pages.json';

interface NavBarProps {
  currentSlug: string;
  mode: 'builder' | 'public';
  pages?: any[];
}

const NavBar: React.FC<NavBarProps> = ({ currentSlug, mode, pages }) => {
  const setHash = (slug: string) => {
    const prefix = mode === 'public' ? 'public' : 'builder';
    window.location.hash = `#/${prefix}/${slug}`;
  };

  const stickyCls = mode === 'public' ? 'sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60' : '';
  return (
    <nav className={`${stickyCls} flex items-center gap-4 mb-4 border-b pb-3`}>
      {((pages && Array.isArray(pages)) ? pages : (pagesData as any[])).map((p) => (
        <button
          key={p.id}
          onClick={() => setHash(p.slug)}
          className={
            'text-sm px-3 py-1 rounded ' +
            (p.slug === currentSlug
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800')
          }
        >
          {p.title}
        </button>
      ))}
    </nav>
  );
};

export default NavBar;
