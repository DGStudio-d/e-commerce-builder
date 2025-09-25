import React from 'react';
import pages from '../data/pages.json';

interface NavBarProps {
  currentSlug: string;
  mode: 'builder' | 'public';
}

const NavBar: React.FC<NavBarProps> = ({ currentSlug, mode }) => {
  const setHash = (slug: string) => {
    const prefix = mode === 'public' ? 'public' : 'builder';
    window.location.hash = `#/${prefix}/${slug}`;
  };

  return (
    <nav className="flex items-center gap-4 mb-4 border-b pb-3">
      {(pages as any[]).map((p) => (
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
