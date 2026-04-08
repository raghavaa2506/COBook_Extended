// frontend/src/components/PicDecoder.js
import React from 'react';
import { X, Loader2, Hash, AlignLeft, Info, Divide } from 'lucide-react';

const colorMap = {
  red: 'bg-red-100 text-red-800 border-red-300',
  blue: 'bg-blue-100 text-blue-800 border-blue-300',
  green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
  teal: 'bg-teal-100 text-teal-800 border-teal-300',
  purple: 'bg-purple-100 text-purple-800 border-purple-300',
  pink: 'bg-pink-100 text-pink-800 border-pink-300',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  gray: 'bg-gray-100 text-gray-700 border-gray-300',
};

const categoryIcons = {
  'Alphanumeric': <AlignLeft className="w-4 h-4" />,
  'Signed Integer': <Hash className="w-4 h-4" />,
  'Unsigned Integer': <Hash className="w-4 h-4" />,
  'Signed Decimal': <Divide className="w-4 h-4" />,
  'Unsigned Decimal': <Divide className="w-4 h-4" />,
};

const PicDecoder = ({ pic, decoded, loading, onClose }) => {
  return (
    <div className="bg-white border border-indigo-200 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-white" />
          <span className="text-sm font-semibold text-white">PIC Clause Decoder</span>
          <code className="ml-1 bg-white/20 text-white px-2 py-0.5 rounded text-xs font-mono">
            {pic}
          </code>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 py-4 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Decoding PIC clause...</span>
          </div>
        ) : decoded ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-lg px-4 py-3 border border-indigo-100">
              <div className="flex items-center gap-2 mb-1">
                {categoryIcons[decoded.details?.category] || <Info className="w-4 h-4 text-indigo-600" />}
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                  {decoded.details?.category || 'Field'}
                </span>
              </div>
              <p className="text-sm text-gray-800 font-medium">{decoded.summary}</p>
            </div>

            {/* Visual breakdown */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Character Breakdown
              </p>
              <div className="flex flex-wrap gap-2">
                {decoded.parts && decoded.parts.map((part, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center rounded-lg border px-3 py-2 min-w-[60px] ${colorMap[part.color] || colorMap.gray}`}
                  >
                    <code className="text-base font-bold font-mono leading-none mb-1">
                      {part.label}
                    </code>
                    <span className="text-xs text-center leading-tight opacity-80">
                      {part.meaning}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats grid */}
            {decoded.details && (
              <div className="grid grid-cols-3 gap-3">
                {decoded.details.intDigits > 0 && (
                  <StatCard label="Integer Digits" value={decoded.details.intDigits} color="blue" />
                )}
                {decoded.details.decDigits > 0 && (
                  <StatCard label="Decimal Digits" value={decoded.details.decDigits} color="violet" />
                )}
                {decoded.details.alphaChars > 0 && (
                  <StatCard label="Alphanumeric" value={decoded.details.alphaChars} color="emerald" />
                )}
                <StatCard label="Signed" value={decoded.details.signed ? 'Yes' : 'No'} color={decoded.details.signed ? 'red' : 'gray'} />
                <StatCard label="Storage" value={decoded.details.format || 'DISPLAY'} color="amber" />
                <StatCard label="Total Bytes" value={`${decoded.details.totalBytes || 0}B`} color="indigo" />
              </div>
            )}

            {/* Example */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Example Values
              </p>
              <div className="flex flex-wrap gap-2">
                {generateExamples(decoded).map((ex, i) => (
                  <code key={i} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-700">
                    {ex}
                  </code>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400 text-sm">
            Failed to decode PIC clause. Try again.
          </div>
        )}
      </div>
    </div>
  );
};

function StatCard({ label, value, color }) {
  const colorStyles = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  };

  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${colorStyles[color] || colorStyles.gray}`}>
      <div className="text-base font-bold font-mono">{value}</div>
      <div className="text-xs opacity-70 mt-0.5">{label}</div>
    </div>
  );
}

function generateExamples(decoded) {
  if (!decoded || !decoded.details) return ['N/A'];
  const d = decoded.details;
  const examples = [];

  if (d.alphaChars > 0 && d.intDigits === 0) {
    const len = d.alphaChars;
    examples.push(`"HELLO WORLD"`.substring(0, len + 2));
    examples.push(`"${'A'.repeat(Math.min(len, 8))}"`);
  } else if (d.intDigits > 0 && d.decDigits === 0) {
    const max = Math.pow(10, Math.min(d.intDigits, 6)) - 1;
    examples.push(String(max));
    examples.push('0'.repeat(d.intDigits));
    if (d.signed) examples.push(`-${Math.floor(max / 2)}`);
  } else if (d.intDigits > 0 && d.decDigits > 0) {
    const intPart = '9'.repeat(Math.min(d.intDigits, 4));
    const decPart = '9'.repeat(Math.min(d.decDigits, 4));
    examples.push(`${intPart}.${decPart}`);
    examples.push(`0.${'0'.repeat(d.decDigits)}`);
    if (d.signed) examples.push(`-${intPart}.${'5'.repeat(d.decDigits)}`);
  }

  return examples.length > 0 ? examples.slice(0, 3) : ['N/A'];
}

export default PicDecoder;
