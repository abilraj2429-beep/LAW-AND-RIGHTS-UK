import type { AuthorProfile } from '../types';

export type NavView =
  | 'front-page'
  | 'daily-feed'
  | 'rules-index'
  | 'practice-areas'
  | 'article'
  | 'editorial-desk';

interface TopBarProps {
  activeView: NavView;
  author: AuthorProfile | null;
  onNavigate: (view: NavView) => void;
  onOpenAuth: () => void;
}

export function TopBar({ activeView, author, onNavigate, onOpenAuth }: TopBarProps) {
  const navItems: { id: NavView; label: string }[] = [
    { id: 'front-page', label: 'Front Page' },
    { id: 'daily-feed', label: 'Daily Feed' },
    { id: 'rules-index', label: 'Rules Index' },
    { id: 'practice-areas', label: 'Practice Areas' },
  ];

  const handlePrimaryAction = () => {
    if (author) {
      onNavigate('editorial-desk');
    } else {
      onOpenAuth();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('front-page')}
          className="font-editorial text-xl md:text-2xl font-semibold tracking-tight text-slate-900 hover:text-blue-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-900"
        >
          Chambers Gazette
        </button>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive =
              activeView === item.id ||
              (item.id === 'front-page' && activeView === 'article');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-900 ${
                  isActive
                    ? 'text-slate-900 border-blue-900'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
          >
            {author ? 'Editorial Desk' : 'Author Sign In'}
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium"
      >
        {navItems.map((item) => {
          const isActive =
            activeView === item.id ||
            (item.id === 'front-page' && activeView === 'article');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`py-1 whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                isActive
                  ? 'text-slate-900 border-blue-900 font-semibold'
                  : 'text-slate-600 border-transparent'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
