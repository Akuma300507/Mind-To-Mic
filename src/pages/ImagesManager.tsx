import React, { useState, useMemo } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { EventImage } from '../types';

export const ImagesManager: React.FC = () => {
  const { db, addImage, updateImage, deleteImage, resetImagesStatus } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'used'>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [imageName, setImageName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const images = db?.images || [];

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      const matchesSearch = img.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || img.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [images, searchTerm, statusFilter]);

  const handleSaveImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageName.trim() || !imageUrl.trim()) return;

    await addImage(imageName.trim(), imageUrl.trim());
    setImageName('');
    setImageUrl('');
    setShowAddModal(false);
  };

  const handleToggleStatus = async (img: EventImage) => {
    const nextStatus = img.status === 'available' ? 'used' : 'available';
    await updateImage(img.id, { status: nextStatus });
  };

  const total = images.length;
  const available = images.filter((i) => i.status === 'available').length;
  const used = total - available;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] flex items-center gap-3">
            <ImageIcon className="w-7 h-7 text-blue-400" />
            Image Prompt Repository
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Visual prompts presented to contestants in Round 1 (Image to Speech).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (confirm('Reset all image statuses back to Available?')) {
                resetImagesStatus();
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset All Statuses</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/50"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Image</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Total Images</div>
            <div className="text-2xl font-black text-white font-mono">{total}</div>
          </div>
          <span className="p-2 rounded-xl bg-blue-500/20 text-blue-300 font-bold text-xs">Gallery</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Available</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{available}</div>
          </div>
          <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs">Ready</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Used</div>
            <div className="text-2xl font-black text-rose-400 font-mono">{used}</div>
          </div>
          <span className="p-2 rounded-xl bg-rose-500/20 text-rose-300 font-bold text-xs">Used</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search image title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none"
          >
            <option value="all">All Images</option>
            <option value="available">Available Only</option>
            <option value="used">Used Only</option>
          </select>
        </div>
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredImages.map((img) => (
          <div
            key={img.id}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-purple-500/50 transition-all group"
          >
            <div className="relative aspect-video bg-slate-950 overflow-hidden">
              <img
                src={img.url}
                alt={img.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <span
                className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  img.status === 'available'
                    ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700'
                    : 'bg-rose-950/90 text-rose-300 border border-rose-700'
                }`}
              >
                {img.status}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <h4 className="font-bold text-white text-sm font-['Outfit'] truncate">{img.name}</h4>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <button
                  onClick={() => handleToggleStatus(img)}
                  className="text-purple-400 hover:text-purple-300 font-semibold"
                >
                  Mark as {img.status === 'available' ? 'Used' : 'Available'}
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Delete image "${img.name}"?`)) deleteImage(img.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                  title="Delete image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Image Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 font-['Outfit']">Add New Image Prompt</h3>
            <form onSubmit={handleSaveImage} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Image Title / Theme <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={imageName}
                  onChange={(e) => setImageName(e.target.value)}
                  placeholder="e.g. Solitary Climber on Glacier Peak"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Image URL (High Resolution) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {imageUrl && (
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as any).src = 'https://placehold.co/600x400?text=Invalid+Image+URL';
                    }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Add Image
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
