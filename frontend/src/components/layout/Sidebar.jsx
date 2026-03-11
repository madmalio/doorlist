import { useState } from 'react';
import { ChevronLeft, ChevronRight, FolderOpen, LayoutDashboard, Library, Search, Settings, WandSparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'quick-door', label: 'Quick Door', icon: <WandSparkles size={20} /> },
  { id: 'jobs', label: 'Jobs', icon: <FolderOpen size={20} /> },
  { id: 'catalog', label: 'Catalog', icon: <Library size={20} /> },
];

export function Sidebar({ activeView, onViewChange, onOpenSearch }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-zinc-200 bg-zinc-50 transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900',
        isCollapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="border-b border-zinc-200 px-3 py-4 dark:border-zinc-800">
        <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'justify-between')}>
          {!isCollapsed ? <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">CutLogic</h1> : null}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        <button
          type="button"
          onClick={onOpenSearch}
          title={isCollapsed ? 'Search (Ctrl+K)' : undefined}
          className={cn(
            'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isCollapsed ? 'justify-center' : 'gap-3',
            'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
          )}
        >
          <Search size={20} />
          {!isCollapsed ? (
            <span className="flex w-full items-center justify-between">
              <span>Search</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-500">Ctrl+K</span>
            </span>
          ) : null}
        </button>
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            title={isCollapsed ? item.label : undefined}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isCollapsed ? 'justify-center' : 'gap-3',
              activeView === item.id
                ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
            )}
          >
            {item.icon}
            {!isCollapsed ? item.label : null}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <button
          type="button"
          title={isCollapsed ? 'Settings' : undefined}
          onClick={() => onViewChange('settings')}
          className={cn(
            'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isCollapsed ? 'justify-center' : 'gap-3',
            activeView === 'settings'
              ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
              : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
          )}
        >
          <Settings size={20} />
          {!isCollapsed ? 'Settings' : null}
        </button>
      </div>

      <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <p className={cn('text-zinc-500 dark:text-zinc-500', isCollapsed ? 'text-center text-[10px]' : 'text-xs')}>v1.0.0</p>
      </div>
    </aside>
  );
}
