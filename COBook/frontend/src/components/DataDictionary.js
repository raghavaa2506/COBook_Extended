// frontend/src/components/DataDictionary.js
import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Info, Database } from 'lucide-react';
import PicDecoder from './PicDecoder';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const typeColors = {
  numeric: 'bg-blue-100 text-blue-800 border-blue-200',
  'numeric-decimal': 'bg-violet-100 text-violet-800 border-violet-200',
  alphanumeric: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  group: 'bg-amber-100 text-amber-800 border-amber-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200'
};

const levelColors = {
  1: 'bg-indigo-600 text-white',
  5: 'bg-indigo-400 text-white',
  10: 'bg-indigo-300 text-indigo-900',
  49: 'bg-gray-300 text-gray-700',
  66: 'bg-orange-200 text-orange-800',
  77: 'bg-red-200 text-red-800',
  88: 'bg-pink-200 text-pink-800',
};

function getLevelColor(level) {
  if (level === 1) return levelColors[1];
  if (level <= 5) return levelColors[5];
  if (level <= 10) return levelColors[10];
  if (level === 49) return levelColors[49];
  if (level === 66) return levelColors[66];
  if (level === 77) return levelColors[77];
  if (level === 88) return levelColors[88];
  return 'bg-indigo-100 text-indigo-700';
}

const DataDictionary = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('level');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedPic, setSelectedPic] = useState(null);
  const [decodedPic, setDecodedPic] = useState(null);
  const [decodingPic, setDecodingPic] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const filtered = useMemo(() => {
    if (!data) return [];
    return data
      .filter(entry => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
          entry.name.toLowerCase().includes(q) ||
          (entry.pic && entry.pic.toLowerCase().includes(q)) ||
          (entry.value && String(entry.value).toLowerCase().includes(q));
        const matchesType = filterType === 'all' || entry.type === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortDir === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
  }, [data, searchQuery, sortField, sortDir, filterType]);

  const types = useMemo(() => {
    if (!data) return [];
    return ['all', ...new Set(data.map(e => e.type).filter(Boolean))];
  }, [data]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handlePicClick = async (pic) => {
    if (!pic) return;
    setSelectedPic(pic);
    setDecodingPic(true);
    setDecodedPic(null);
    try {
      const resp = await fetch(`${BACKEND}/api/pic-decode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pic })
      });
      const data = await resp.json();
      if (data.success) setDecodedPic(data.decoded);
    } catch (e) {
      console.error('PIC decode error:', e);
    } finally {
      setDecodingPic(false);
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-indigo-500" />
      : <ChevronDown className="w-3 h-3 text-indigo-500" />;
  };

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Database className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">No data dictionary available</p>
        <p className="text-xs mt-1">Click the visualization button on a code cell to analyze</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Database className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">No variables found in DATA DIVISION</p>
        <p className="text-xs mt-1">Add a DATA DIVISION with WORKING-STORAGE variables</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search variables, PIC clauses..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {types.map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                filterType === type
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {filtered.length} / {data.length} vars
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-gray-200 shadow-sm flex-1">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {[
                { key: 'level', label: 'LVL' },
                { key: 'name', label: 'Name' },
                { key: 'pic', label: 'PIC Clause' },
                { key: 'type', label: 'Type' },
                { key: 'size', label: 'Size' },
                { key: 'value', label: 'VALUE' },
                { key: 'redefines', label: 'REDEFINES' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    {label}
                    <SortIcon field={key} />
                  </div>
                </th>
              ))}
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Decode
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((entry, idx) => (
              <tr
                key={`${entry.name}-${idx}`}
                className="hover:bg-indigo-50/40 transition-colors group"
              >
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${getLevelColor(entry.level)}`}>
                    {entry.level}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="font-mono text-sm font-semibold text-gray-900"
                    style={{ paddingLeft: `${Math.max(0, (entry.level - 1) * 8)}px` }}
                  >
                    {entry.name}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {entry.pic ? (
                    <button
                      onClick={() => handlePicClick(entry.pic)}
                      className="font-mono text-xs bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 px-2 py-1 rounded transition-colors border border-transparent hover:border-indigo-200"
                      title="Click to decode PIC clause"
                    >
                      {entry.pic}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 italic">group</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeColors[entry.type] || typeColors.unknown}`}>
                    {entry.type || '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-gray-600 font-mono">
                    {entry.size > 0 ? `${entry.size}B` : '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {entry.value ? (
                    <code className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                      {entry.value}
                    </code>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {entry.redefines ? (
                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-200 font-mono">
                      → {entry.redefines}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {entry.pic ? (
                    <button
                      onClick={() => handlePicClick(entry.pic)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-all"
                      title="Decode PIC clause"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-gray-400 text-sm">
            No variables match your search
          </div>
        )}
      </div>

      {/* PIC Decoder Panel */}
      {selectedPic && (
        <div className="mt-4">
          <PicDecoder
            pic={selectedPic}
            decoded={decodedPic}
            loading={decodingPic}
            onClose={() => { setSelectedPic(null); setDecodedPic(null); }}
          />
        </div>
      )}
    </div>
  );
};

export default DataDictionary;
