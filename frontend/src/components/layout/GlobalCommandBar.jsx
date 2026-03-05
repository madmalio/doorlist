import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, Library, Search, Settings } from 'lucide-react';
import { SearchGlobal } from '../../../wailsjs/go/main/App';

const navCommands = [
  { key: 'jobs', label: 'Go to Jobs', subtitle: 'View job list', view: 'jobs' },
  { key: 'catalog', label: 'Go to Catalog', subtitle: 'View door style catalog', view: 'catalog' },
  { key: 'settings', label: 'Go to Settings', subtitle: 'View app settings', view: 'settings' },
];

function iconForView(view) {
  if (view === 'jobs') return <FolderOpen size={16} className="text-zinc-300" />;
  if (view === 'catalog') return <Library size={16} className="text-zinc-300" />;
  if (view === 'settings') return <Settings size={16} className="text-zinc-300" />;
  return <Search size={16} className="text-zinc-300" />;
}

export function GlobalCommandBar({ isOpen, onOpenChange, activeView, onNavigate, onOpenResult }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const commands = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return navCommands.map((item) => ({ ...item, kind: 'nav', icon: iconForView(item.view) }));
    }

    return results.map((result) => ({
      key: `result-${result.type}-${result.id}`,
      kind: 'result',
      result,
      icon: iconForView(result.type === 'job' ? 'jobs' : 'jobs'),
    }));
  }, [query, results]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!isOpen);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const found = await SearchGlobal(trimmed);
        if (!cancelled) {
          setResults(found || []);
        }
      } catch (error) {
        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results, isOpen]);

  const close = () => {
    onOpenChange(false);
    setQuery('');
    setResults([]);
    setLoading(false);
    setSelectedIndex(0);
  };

  const runCommand = (item) => {
    if (item.kind === 'nav') {
      onNavigate(item.view);
      close();
      return;
    }

    onOpenResult(item.result);
    close();
  };

  const onInputKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(commands.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = commands[selectedIndex];
      if (selected) {
        runCommand(selected);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div className="absolute left-1/2 top-[12%] w-full max-w-2xl -translate-x-1/2 px-4">
        <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-zinc-700 px-3 py-2">
            <Search size={16} className="text-zinc-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search jobs or jump to a page..."
              className="h-9 w-full bg-transparent text-zinc-100 outline-none placeholder:text-zinc-500"
            />
            <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">Esc</span>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {!query.trim() ? <p className="px-2 py-1 text-xs text-zinc-500">Navigation</p> : null}
            {query.trim().length > 0 && query.trim().length < 2 ? (
              <p className="px-2 py-4 text-sm text-zinc-500">Type at least 2 characters to search records.</p>
            ) : null}
            {loading ? <p className="px-2 py-4 text-sm text-zinc-500">Searching...</p> : null}
            {!loading && query.trim().length >= 2 && commands.length === 0 ? (
              <p className="px-2 py-4 text-sm text-zinc-500">No matches found.</p>
            ) : null}

            {!loading &&
              commands.map((item, index) => {
                const selected = index === selectedIndex;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => runCommand(item)}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left ${selected ? 'bg-zinc-800' : 'hover:bg-zinc-800/80'}`}
                  >
                    <span className="mt-0.5">{item.icon}</span>
                    {item.kind === 'nav' ? (
                      <span>
                        <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
                        <span className="block text-xs text-zinc-400">
                          {item.subtitle}
                          {item.view === activeView ? ' (current)' : ''}
                        </span>
                      </span>
                    ) : (
                      <span>
                        <span className="block text-sm font-medium text-zinc-100">{item.result.title}</span>
                        <span className="block text-xs text-zinc-400">
                          {item.result.subtitle}
                          {item.result.meta ? ` - ${item.result.meta}` : ''}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
