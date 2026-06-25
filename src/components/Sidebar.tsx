import React from 'react';
import { WPSite } from '../lib/sites';
import { Globe, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  sites: WPSite[];
  activeSiteId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (site: WPSite) => void;
  onDelete: (site: WPSite) => void;
}

export function Sidebar({ sites, activeSiteId, onSelect, onAdd, onEdit, onDelete }: Props) {
  return (
    <aside className="w-full lg:w-72 flex-shrink-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Sites</h2>
          <button
            onClick={onAdd}
            className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </button>
        </div>

        {sites.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No sites yet.</p>
            <button
              onClick={onAdd}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first site
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sites.map((site) => {
              const isActive = site.id === activeSiteId;
              return (
                <li
                  key={site.id}
                  className={cn(
                    "group relative flex items-center cursor-pointer transition-colors",
                    isActive ? "bg-blue-50" : "hover:bg-gray-50"
                  )}
                >
                  <button
                    onClick={() => onSelect(site.id)}
                    className="flex-1 min-w-0 text-left px-4 py-3 flex items-center space-x-3"
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        isActive ? "bg-blue-500" : "bg-gray-300"
                      )}
                    />
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm font-medium truncate",
                          isActive ? "text-blue-700" : "text-gray-900"
                        )}
                      >
                        {site.name}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">{site.url}</span>
                    </span>
                  </button>

                  <div className="flex items-center pr-3 space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(site)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      aria-label="Edit site"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(site)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                      aria-label="Delete site"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
