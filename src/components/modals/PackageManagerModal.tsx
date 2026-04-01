import React, { useState } from 'react';
import { X, Search, Package, Trash2, Plus, Loader2, Check } from 'lucide-react';

interface PackageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dependencies: Record<string, string>;
  onAddPackage: (pkg: string) => void;
  onRemovePackage: (pkg: string) => void;
}

export function PackageManagerModal({
  isOpen,
  onClose,
  dependencies,
  onAddPackage,
  onRemovePackage,
}: PackageManagerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(searchQuery)}&size=10`);
      const data = await res.json();
      setSearchResults(data.objects || []);
    } catch (error) {
      console.error('Failed to search NPM:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            NPM Package Manager
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Installed Packages */}
          <div className="w-full md:w-1/2 border-r border-zinc-800 flex flex-col">
            <div className="p-3 bg-zinc-800/50 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
              Installed Dependencies
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {Object.entries(dependencies).map(([pkg, version]) => (
                <div key={pkg} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50 group">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-zinc-200 truncate">{pkg}</span>
                    <span className="text-xs text-zinc-500">{version}</span>
                  </div>
                  <button
                    onClick={() => onRemovePackage(pkg)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove Package"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {Object.keys(dependencies).length === 0 && (
                <div className="text-center text-zinc-500 text-sm p-4">
                  No dependencies installed
                </div>
              )}
            </div>
          </div>

          {/* Search & Add */}
          <div className="w-full md:w-1/2 flex flex-col bg-zinc-900/50">
            <div className="p-3 border-b border-zinc-800">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search NPM packages..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </form>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {isSearching ? (
                <div className="flex items-center justify-center p-8 text-zinc-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result: any) => {
                  const pkg = result.package;
                  const isInstalled = !!dependencies[pkg.name];
                  return (
                    <div key={pkg.name} className="p-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <a href={pkg.links.npm} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-400 hover:underline truncate">
                            {pkg.name}
                          </a>
                          <span className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{pkg.description}</span>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">v{pkg.version}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onAddPackage(pkg.name)}
                          disabled={isInstalled}
                          className={`shrink-0 p-1.5 rounded-md transition-colors ${
                            isInstalled
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-500'
                          }`}
                          title={isInstalled ? 'Already installed' : 'Add Package'}
                        >
                          {isInstalled ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : searchQuery ? (
                <div className="text-center text-zinc-500 text-sm p-4">
                  No packages found
                </div>
              ) : (
                <div className="text-center text-zinc-600 text-sm p-8 flex flex-col items-center gap-2">
                  <Search className="w-8 h-8 opacity-20" />
                  <p>Search for packages to add</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
