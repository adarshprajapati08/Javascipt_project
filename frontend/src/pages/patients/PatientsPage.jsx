import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  Heart,
  Activity,
  X,
} from 'lucide-react';

const PatientsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'receptionist';

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [bloodFilter, setBloodFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const initialFormState = {
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    bloodGroup: 'O+',
    allergies: '',
    chronicConditions: '',
    medicalHistoryNotes: '',
    address: { street: '', city: 'Bengaluru', state: 'Karnataka' },
    emergencyContact: { name: '', relationship: '', phone: '' },
  };
  const [formData, setFormData] = useState(initialFormState);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/patients', {
        params: { search, bloodGroup: bloodFilter, limit: 50 },
      });
      if (res.success) {
        setPatients(res.patients || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch patients list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [search, bloodFilter]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData(initialFormState);
    setShowAddModal(true);
  };

  const handleOpenEdit = (patient) => {
    setIsEditing(true);
    setSelectedPatient(patient);
    setFormData({
      name: patient.name || '',
      phone: patient.phone || '',
      email: patient.email || '',
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '1990-01-01',
      gender: patient.gender || 'male',
      bloodGroup: patient.bloodGroup || 'Unknown',
      allergies: (patient.allergies || []).join(', '),
      chronicConditions: (patient.chronicConditions || []).join(', '),
      medicalHistoryNotes: patient.medicalHistoryNotes || '',
      address: {
        street: patient.address?.street || '',
        city: patient.address?.city || '',
        state: patient.address?.state || '',
      },
      emergencyContact: {
        name: patient.emergencyContact?.name || '',
        relationship: patient.emergencyContact?.relationship || '',
        phone: patient.emergencyContact?.phone || '',
      },
    });
    setShowAddModal(true);
  };

  const handleOpenView = async (patient) => {
    setSelectedPatient(patient);
    setShowViewModal(true);
  };

  const handleOpenDelete = (patient) => {
    setSelectedPatient(patient);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      ...formData,
      allergies: formData.allergies ? formData.allergies.split(',').map((s) => s.trim()) : [],
      chronicConditions: formData.chronicConditions
        ? formData.chronicConditions.split(',').map((s) => s.trim())
        : [],
    };

    try {
      if (isEditing && selectedPatient) {
        await api.put(`/patients/${selectedPatient._id}`, payload);
      } else {
        await api.post('/patients', payload);
      }
      setShowAddModal(false);
      fetchPatients();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPatient) return;
    setSubmitting(true);
    try {
      await api.delete(`/patients/${selectedPatient._id}`);
      setShowDeleteModal(false);
      setSelectedPatient(null);
      fetchPatients();
    } catch (err) {
      setError(err.message || 'Failed to delete patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-brand-600" />
            <span>Patient Records Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Directory of registered patients, medical profiles, and emergency contacts.
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" size="md" icon={UserPlus} onClick={handleOpenAdd}>
            Register New Patient
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

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Patient Name, ID (PT-...), or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={bloodFilter}
            onChange={(e) => setBloodFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-brand-500 focus:border-brand-500"
          >
            <option value="all">All Blood Groups</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-3"></div>
            Loading patient records...
          </div>
        ) : patients.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No patients found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or register a new patient.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Patient ID</th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Gender / Age</th>
                  <th className="px-5 py-3.5">Blood Group</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {patients.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-brand-700">{p.patientId}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{p.name}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs">
                        <span className="block text-slate-800">{p.phone}</span>
                        <span className="block text-slate-400 truncate max-w-[160px]">{p.email || 'No email'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 capitalize text-xs">
                      {p.gender} {p.age ? `• ${p.age} yrs` : ''}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={p.bloodGroup !== 'Unknown' ? 'danger' : 'default'}>
                        {p.bloodGroup || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenView(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                              title="Edit Patient"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Delete Patient"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Patient Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={isEditing ? 'Edit Patient Record' : 'Register New Patient'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="Unknown">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Allergies (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. Penicillin, Peanuts"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Chronic Conditions (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. Hypertension, Type 2 Diabetes"
                value={formData.chronicConditions}
                onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Clinical Notes & Medical History</label>
              <textarea
                rows={2}
                value={formData.medicalHistoryNotes}
                onChange={(e) => setFormData({ ...formData, medicalHistoryNotes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Past surgeries, routine medication..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="secondary" size="md" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={submitting}>
              {isEditing ? 'Save Changes' : 'Register Patient'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Patient Details Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Patient Comprehensive Profile"
        maxWidth="max-w-2xl"
      >
        {selectedPatient && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-brand-50 border border-brand-100">
              <div className="h-12 w-12 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center text-lg">
                {selectedPatient.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedPatient.name}</h3>
                <p className="text-xs text-brand-700 font-semibold">{selectedPatient.patientId}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="primary">{selectedPatient.gender}</Badge>
                  <Badge variant="danger">Blood: {selectedPatient.bloodGroup}</Badge>
                  {selectedPatient.age && <Badge variant="default">{selectedPatient.age} yrs old</Badge>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <p className="font-semibold text-slate-500 mb-1">Contact Details</p>
                <p className="text-slate-800 font-medium">Phone: {selectedPatient.phone}</p>
                <p className="text-slate-800">Email: {selectedPatient.email || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <p className="font-semibold text-slate-500 mb-1">Emergency Contact</p>
                <p className="text-slate-800 font-medium">{selectedPatient.emergencyContact?.name || 'Not specified'}</p>
                <p className="text-slate-600">
                  {selectedPatient.emergencyContact?.relationship} • {selectedPatient.emergencyContact?.phone}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Known Allergies</p>
              <div className="flex flex-wrap gap-1.5">
                {(selectedPatient.allergies || []).length > 0 ? (
                  selectedPatient.allergies.map((a, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-700 border border-rose-200">
                      {a}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">None reported</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Chronic Conditions</p>
              <div className="flex flex-wrap gap-1.5">
                {(selectedPatient.chronicConditions || []).length > 0 ? (
                  selectedPatient.chronicConditions.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No chronic conditions listed</span>
                )}
              </div>
            </div>

            {selectedPatient.medicalHistoryNotes && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs">
                <p className="font-semibold text-slate-500 mb-1">Medical History Notes</p>
                <p className="text-slate-700 leading-relaxed">{selectedPatient.medicalHistoryNotes}</p>
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
        title="Confirm Patient Record Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete patient record{' '}
            <strong className="text-slate-900">{selectedPatient?.name}</strong> ({selectedPatient?.patientId})? This
            will also remove their associated appointments.
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="secondary" size="md" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" loading={submitting} onClick={handleDelete}>
              Yes, Delete Patient
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PatientsPage;
