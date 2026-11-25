import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  UserCheck,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  Clock,
  Calendar,
  Building2,
  DollarSign,
  X,
} from 'lucide-react';

const DoctorsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isDoctor = user?.role === 'doctor';

  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const initialFormState = {
    name: '',
    email: '',
    department: '',
    specialization: '',
    qualifications: 'MBBS, MD',
    experience: 5,
    consultationFee: 700,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    bio: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  const fetchDoctorsAndDepartments = async () => {
    setLoading(true);
    try {
      const [docRes, deptRes] = await Promise.all([
        api.get('/doctors', {
          params: { search, department: departmentFilter },
        }),
        api.get('/departments'),
      ]);

      if (docRes.success) setDoctors(docRes.doctors || []);
      if (deptRes.success) setDepartments(deptRes.departments || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch doctors list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorsAndDepartments();
  }, [search, departmentFilter]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      ...initialFormState,
      department: departments[0]?._id || '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (doc) => {
    setIsEditing(true);
    setSelectedDoctor(doc);
    setFormData({
      name: doc.name || '',
      email: doc.user?.email || '',
      department: doc.department?._id || doc.department || '',
      specialization: doc.specialization || '',
      qualifications: (doc.qualifications || []).join(', '),
      experience: doc.experience || 1,
      consultationFee: doc.consultationFee || 500,
      availableDays: doc.availableDays || [],
      bio: doc.bio || '',
    });
    setShowAddModal(true);
  };

  const handleOpenView = (doc) => {
    setSelectedDoctor(doc);
    setShowViewModal(true);
  };

  const handleOpenDelete = (doc) => {
    setSelectedDoctor(doc);
    setShowDeleteModal(true);
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => {
      const days = prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day];
      return { ...prev, availableDays: days };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      ...formData,
      qualifications: formData.qualifications
        ? formData.qualifications.split(',').map((s) => s.trim())
        : ['MBBS'],
      experience: Number(formData.experience) || 1,
      consultationFee: Number(formData.consultationFee) || 500,
    };

    try {
      if (isEditing && selectedDoctor) {
        await api.put(`/doctors/${selectedDoctor._id}`, payload);
      } else {
        await api.post('/doctors', payload);
      }
      setShowAddModal(false);
      fetchDoctorsAndDepartments();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDoctor) return;
    setSubmitting(true);
    try {
      await api.delete(`/doctors/${selectedDoctor._id}`);
      setShowDeleteModal(false);
      setSelectedDoctor(null);
      fetchDoctorsAndDepartments();
    } catch (err) {
      setError(err.message || 'Failed to delete doctor');
    } finally {
      setSubmitting(false);
    }
  };

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <UserCheck className="h-6 w-6 text-brand-600" />
            <span>Doctor Directory & Availability</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Clinical staff specialists, department assignments, and consultation fees.
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" size="md" icon={UserPlus} onClick={handleOpenAdd}>
            Add Specialist Doctor
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by doctor name or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <div className="w-full sm:w-56">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-brand-500 focus:border-brand-500"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Doctors Grid Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-3"></div>
          Loading doctor profiles...
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-slate-500 border border-slate-200">
          <UserCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No doctors match your filter</p>
          <p className="text-xs text-slate-400 mt-1">Try another search term or department.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doc) => (
            <div
              key={doc._id}
              className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-lg border border-brand-200 shrink-0">
                      {doc.name.charAt(4) || 'D'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{doc.name}</h3>
                      <p className="text-xs text-brand-600 font-semibold">{doc.specialization}</p>
                    </div>
                  </div>
                  <Badge variant={doc.status === 'active' ? 'success' : 'warning'}>
                    {doc.status}
                  </Badge>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{doc.department?.name || 'General'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {(doc.availableDays || []).slice(0, 3).join(', ')}
                      {(doc.availableDays || []).length > 3 ? ` +${doc.availableDays.length - 3}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Consultation: ₹{doc.consultationFee}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Eye}
                  onClick={() => handleOpenView(doc)}
                >
                  View Details
                </Button>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(doc)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      title="Edit Doctor"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(doc)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete Doctor"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Doctor Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={isEditing ? 'Edit Doctor Profile' : 'Add Specialist Doctor'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Doctor Name *</label>
              <input
                type="text"
                required
                placeholder="Dr. Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {!isEditing && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Login Email *</label>
                <input
                  type="email"
                  required
                  placeholder="doctor@hospital.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department *</label>
              <select
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Specialization *</label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Interventional Cardiologist"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Consultation Fee (₹) *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.consultationFee}
                onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Experience (Years)</label>
              <input
                type="number"
                min="0"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Qualifications (comma separated)</label>
              <input
                type="text"
                placeholder="MBBS, MD (Cardiology), DM"
                value={formData.qualifications}
                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1.5">Available Days</label>
              <div className="flex flex-wrap gap-2">
                {allDays.map((day) => {
                  const isSelected = formData.availableDays.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => handleDayToggle(day)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Doctor Bio</label>
              <textarea
                rows={2}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Clinical background, career achievements..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="secondary" size="md" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={submitting}>
              {isEditing ? 'Save Changes' : 'Create Doctor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Doctor Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Doctor Profile & Availability"
        maxWidth="max-w-lg"
      >
        {selectedDoctor && (
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-brand-50 rounded-xl border border-brand-100 flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center text-lg">
                {selectedDoctor.name.charAt(4) || 'D'}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">{selectedDoctor.name}</h4>
                <p className="text-xs text-brand-700 font-medium">{selectedDoctor.specialization}</p>
                <p className="text-xs text-slate-500">{selectedDoctor.department?.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block">Consultation Fee</span>
                <span className="text-base font-bold text-emerald-600">₹{selectedDoctor.consultationFee}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block">Experience</span>
                <span className="text-base font-bold text-slate-800">{selectedDoctor.experience} Years</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Available Days</p>
              <div className="flex flex-wrap gap-1.5">
                {(selectedDoctor.availableDays || []).map((day) => (
                  <span key={day} className="px-2.5 py-1 rounded-md text-xs bg-brand-50 text-brand-700 font-medium border border-brand-200">
                    {day}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Qualifications</p>
              <p className="text-xs text-slate-800 font-medium">
                {(selectedDoctor.qualifications || []).join(', ')}
              </p>
            </div>

            {selectedDoctor.bio && (
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                <p className="font-semibold text-slate-700 mb-1">About Doctor</p>
                <p className="leading-relaxed">{selectedDoctor.bio}</p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="secondary" size="md" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Doctor Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete profile for{' '}
            <strong className="text-slate-900">{selectedDoctor?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="secondary" size="md" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" loading={submitting} onClick={handleDelete}>
              Yes, Delete Doctor
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DoctorsPage;
