import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  Settings2,
  UserCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { excelService } from '../lib/excel';
import type { Participant, CustomFieldDefinition, CustomFieldType, RoundStatus } from '../types';

export const Participants: React.FC = () => {
  const {
    db,
    addParticipant,
    updateParticipant,
    deleteParticipant,
    importParticipants,
    addCustomField,
    updateCustomField,
    deleteCustomField,
    activeParticipant,
    setActiveParticipant,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'number' | 'name' | 'college' | 'status'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form State for Participant Add/Edit
  const [formData, setFormData] = useState<{
    name: string;
    participantNumber: string;
    college: string;
    department: string;
    status: Participant['status'];
    customData: Record<string, any>;
  }>({
    name: '',
    participantNumber: '',
    college: '',
    department: '',
    status: 'active',
    customData: {},
  });

  // Custom Field Creator Form
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

  const customFields = db?.customFields || [];

  // Filtered & Sorted participants
  const filteredParticipants = useMemo(() => {
    if (!db?.participants) return [];
    return db.participants
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.participantNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.college.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.department.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'number') cmp = a.participantNumber.localeCompare(b.participantNumber);
        else if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
        else if (sortBy === 'college') cmp = a.college.localeCompare(b.college);
        else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [db?.participants, searchTerm, statusFilter, sortBy, sortOrder]);

  const openAddModal = () => {
    setEditingParticipant(null);
    const nextNum = `M2M-${String((db?.participants.length || 0) + 1).padStart(3, '0')}`;
    setFormData({
      name: '',
      participantNumber: nextNum,
      college: '',
      department: '',
      status: 'active',
      customData: {},
    });
    setShowAddEditModal(true);
  };

  const openEditModal = (p: Participant) => {
    setEditingParticipant(p);
    setFormData({
      name: p.name,
      participantNumber: p.participantNumber,
      college: p.college,
      department: p.department,
      status: p.status,
      customData: { ...(p.customData || {}) },
    });
    setShowAddEditModal(true);
  };

  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingParticipant) {
      await updateParticipant(editingParticipant.id, {
        name: formData.name.trim(),
        participantNumber: formData.participantNumber.trim(),
        college: formData.college.trim(),
        department: formData.department.trim(),
        status: formData.status,
        customData: formData.customData,
      });
    } else {
      await addParticipant({
        name: formData.name.trim(),
        participantNumber: formData.participantNumber.trim(),
        college: formData.college.trim(),
        department: formData.department.trim(),
        status: formData.status,
        customData: formData.customData,
      });
    }

    setShowAddEditModal(false);
  };

  const handleDeleteParticipant = async (id: string) => {
    await deleteParticipant(id);
    setShowDeleteConfirm(null);
  };

  // Custom field handler
  const handleSaveCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    const options =
      newFieldType === 'dropdown'
        ? newFieldOptions.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

    if (editingField) {
      await updateCustomField(editingField.id, {
        name: newFieldName.trim(),
        type: newFieldType,
        options,
      });
      setEditingField(null);
    } else {
      await addCustomField({
        name: newFieldName.trim(),
        type: newFieldType,
        options,
      });
    }

    setNewFieldName('');
    setNewFieldOptions('');
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await excelService.parseParticipantsFile(file, customFields);
      const count = await importParticipants(parsed);
      alert(`Successfully imported ${count} participants from Excel!`);
    } catch (err: any) {
      alert(`Import error: ${err.message || err}`);
    } finally {
      e.target.value = '';
    }
  };

  const renderStatusBadge = (status: RoundStatus) => {
    if (status === 'completed' || status === 'completed_early') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
          <CheckCircle2 className="w-3 h-3" /> Done
        </span>
      );
    }
    if (status === 'time_up') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
          <Clock className="w-3 h-3" /> Time Up
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
        Pending
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] flex items-center gap-3">
            <Users className="w-7 h-7 text-purple-400" />
            Participant Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage contestant registry, dynamic custom fields, status updates, and Excel synchronization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Custom Fields Manager Button */}
          <button
            onClick={() => setShowFieldsModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-900/40 text-xs font-semibold transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            <span>Custom Fields ({customFields.length})</span>
          </button>

          {/* Import / Export */}
          <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import Excel</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="hidden" />
          </label>

          <button
            onClick={() => excelService.downloadParticipantTemplate(customFields)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
            title="Download Excel template for participants"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Template</span>
          </button>

          {/* Add Participant */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-950/50 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Participant</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, college..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Filters and sorting */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="registered">Registered</option>
              <option value="checked_in">Checked In</option>
              <option value="eliminated">Eliminated</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-purple-500"
            >
              <option value="number">Contestant Number</option>
              <option value="name">Name</option>
              <option value="college">College</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:text-white"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Contestant</th>
                <th className="py-3.5 px-4">College / Dept</th>
                <th className="py-3.5 px-4 text-center">Round 1</th>
                <th className="py-3.5 px-4 text-center">Round 2</th>
                <th className="py-3.5 px-4 text-center">Round 3</th>
                {customFields.map((cf) => (
                  <th key={cf.id} className="py-3.5 px-4">
                    {cf.name}
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6 + customFields.length} className="py-12 text-center text-slate-400">
                    <p className="font-semibold">No participants found matching your filter.</p>
                    <p className="text-[11px] mt-1 text-slate-500">Add a new contestant or clear the search query.</p>
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const isActive = activeParticipant?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isActive ? 'bg-purple-950/30 hover:bg-purple-950/40' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setActiveParticipant(p)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              isActive
                                ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                                : 'bg-slate-800 text-slate-400 hover:text-purple-300 hover:bg-slate-700'
                            }`}
                            title={isActive ? 'Currently Active Contestant' : 'Click to set as Active Contestant'}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            <div className="font-extrabold text-white text-sm flex items-center gap-2 font-['Outfit']">
                              {p.name}
                              {isActive && (
                                <span className="text-[9px] uppercase px-1.5 py-0.2 bg-purple-500/30 text-purple-300 border border-purple-400/40 rounded font-bold">
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-purple-400">{p.participantNumber}</span>
                          </div>
                        </div>
                      </td>

                      {/* College & Dept */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{p.college}</div>
                        <div className="text-[11px] text-slate-400">{p.department}</div>
                      </td>

                      {/* Round Statuses */}
                      <td className="py-3.5 px-4 text-center">{renderStatusBadge(p.round1Status)}</td>
                      <td className="py-3.5 px-4 text-center">{renderStatusBadge(p.round2Status)}</td>
                      <td className="py-3.5 px-4 text-center">{renderStatusBadge(p.round3Status)}</td>

                      {/* Custom Fields */}
                      {customFields.map((cf) => {
                        const val = p.customData?.[cf.key];
                        return (
                          <td key={cf.id} className="py-3.5 px-4 text-slate-300">
                            {cf.type === 'checkbox' ? (
                              val ? (
                                <span className="text-emerald-400 font-bold">✓</span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )
                            ) : val !== undefined && val !== '' ? (
                              String(val)
                            ) : (
                              <span className="text-slate-600 italic">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit participant"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(p.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 transition-colors"
                            title="Delete participant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Participant Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4 font-['Outfit'] flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              {editingParticipant ? 'Edit Contestant Profile' : 'Register New Contestant'}
            </h3>

            <form onSubmit={handleSaveParticipant} className="space-y-4 text-xs">
              {/* Core fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Contestant ID / Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.participantNumber}
                    onChange={(e) => setFormData({ ...formData, participantNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="e.g. Maya Chen"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">College / Institution</label>
                  <input
                    type="text"
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="e.g. Oxford University"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Department / Branch</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="e.g. Computer Science"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="active">Active (Ready for Rounds)</option>
                  <option value="registered">Registered</option>
                  <option value="checked_in">Checked In</option>
                  <option value="eliminated">Eliminated</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Dynamic Custom Fields Rendering */}
              {customFields.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                    Custom Fields ({customFields.length})
                  </span>
                  {customFields.map((cf) => (
                    <div key={cf.id}>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {cf.name} {cf.required && <span className="text-rose-400">*</span>}
                      </label>
                      {cf.type === 'dropdown' ? (
                        <select
                          value={formData.customData[cf.key] || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customData: { ...formData.customData, [cf.key]: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-purple-500 focus:outline-none"
                        >
                          <option value="">Select option</option>
                          {cf.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : cf.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            checked={!!formData.customData[cf.key]}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customData: { ...formData.customData, [cf.key]: e.target.checked },
                              })
                            }
                            className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-800"
                          />
                          <span className="text-slate-300 font-medium">Yes / Completed</span>
                        </label>
                      ) : (
                        <input
                          type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                          value={formData.customData[cf.key] || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customData: { ...formData.customData, [cf.key]: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-purple-500 focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-950/50"
                >
                  {editingParticipant ? 'Save Changes' : 'Register Contestant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Custom Fields Configuration Modal */}
      {showFieldsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-2 font-['Outfit'] flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-purple-400" />
              Dynamic Custom Fields
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Add or modify custom participant columns. Forms and tables will automatically adapt.
            </p>

            {/* List of existing fields */}
            <div className="space-y-2 mb-6">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Fields</span>
              <div className="divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 p-2">
                {/* Protected system fields */}
                <div className="p-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">Participant ID</span>
                    <span className="text-[10px] text-purple-400 ml-2">(System Field)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Protected</span>
                </div>
                <div className="p-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">Full Name</span>
                    <span className="text-[10px] text-purple-400 ml-2">(System Field)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Protected</span>
                </div>

                {/* Configurable custom fields */}
                {customFields.map((cf) => (
                  <div key={cf.id} className="p-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white">{cf.name}</span>
                      <span className="text-[10px] text-purple-300 ml-2 font-mono">[{cf.type}]</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingField(cf);
                          setNewFieldName(cf.name);
                          setNewFieldType(cf.type);
                          setNewFieldOptions(cf.options ? cf.options.join(', ') : '');
                        }}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Edit Field"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete custom field "${cf.name}"?`)) {
                            deleteCustomField(cf.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        title="Delete Field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Field Creator / Editor */}
            <form onSubmit={handleSaveCustomField} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-purple-300 block">
                {editingField ? `Edit Field: ${editingField.name}` : 'Add New Custom Field'}
              </span>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Field Display Name</label>
                <input
                  type="text"
                  required
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g. Registration Fee Paid, Slot Time, Phone"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Field Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="text">Text (Single line string)</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="dropdown">Dropdown Select</option>
                  <option value="checkbox">Checkbox (True / False)</option>
                </select>
              </div>

              {newFieldType === 'dropdown' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Dropdown Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    placeholder="Option A, Option B, Option C"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {editingField && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingField(null);
                      setNewFieldName('');
                      setNewFieldOptions('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  {editingField ? 'Save Field' : 'Create Field'}
                </button>
              </div>
            </form>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowFieldsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-white mb-1">Delete Participant?</h4>
            <p className="text-xs text-slate-300 mb-5">
              This action cannot be undone. Any recorded results for this contestant will remain in history logs.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteParticipant(showDeleteConfirm)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
