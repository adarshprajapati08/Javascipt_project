import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  Calendar,
  Clock,
  UserCheck,
  Search,
  PlusCircle,
  AlertCircle,
  CheckCircle,
  XCircle,
  CalendarDays,
  User,
  Filter,
  RefreshCw,
  X,
} from 'lucide-react';

const AppointmentsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'receptionist';
  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';

  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');

  // Modals state
  const [showBookModal, setShowBookModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Booking Form State
  const [bookForm, setBookForm] = useState({
    patientId: '',
    departmentId: '',
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    timeSlot: null,
    reason: '',
  });

  // Dynamic available slots loaded from server for the selected doctor & date
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotMessage, setSlotMessage] = useState('');

  // Reschedule Form State
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSlot, setRescheduleSlot] = useState(null);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [cancelReason, setCancelReason] = useState('Patient request');

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments', {
        params: {
          status: statusFilter,
          date: dateFilter,
          doctorId: doctorFilter,
          limit: 50,
        },
      });
      if (res.success) {
        setAppointments(res.appointments || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [docRes, deptRes] = await Promise.all([
        api.get('/doctors'),
        api.get('/departments'),
      ]);
      if (docRes.success) setDoctors(docRes.doctors || []);
      if (deptRes.success) setDepartments(deptRes.departments || []);

      if (isAdmin) {
        const ptRes = await api.get('/patients', { params: { limit: 100 } });
        if (ptRes.success) setPatients(ptRes.patients || []);
      }
    } catch (err) {
      console.error('Metadata load error:', err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter, doctorFilter]);

  // Load available time slots when doctor or date changes in booking modal
  useEffect(() => {
    if (!bookForm.doctorId || !bookForm.date) {
      setAvailableSlots([]);
      return;
    }

    const loadSlots = async () => {
      setLoadingSlots(true);
      setSlotMessage('');
      try {
        const res = await api.get(`/doctors/${bookForm.doctorId}/available-slots`, {
          params: { date: bookForm.date },
        });
        if (res.success) {
          setAvailableSlots(res.slots || []);
          if (!res.isDoctorAvailable) {
            setSlotMessage(res.message || 'Doctor not available on this day');
          }
        }
      } catch (err) {
        setSlotMessage('Could not load slots');
      } finally {
        setLoadingSlots(false);
      }
    };

    loadSlots();
  }, [bookForm.doctorId, bookForm.date]);

  // Load slots for reschedule modal
  useEffect(() => {
    if (!selectedApt || !rescheduleDate) return;

    const loadSlots = async () => {
      setLoadingRescheduleSlots(true);
      try {
        const docId = selectedApt.doctor?._id || selectedApt.doctor;
        const res = await api.get(`/doctors/${docId}/available-slots`, {
          params: { date: rescheduleDate },
        });
        if (res.success) {
          setRescheduleSlots(res.slots || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRescheduleSlots(false);
      }
    };

    loadSlots();
  }, [selectedApt, rescheduleDate]);

  const handleOpenBookModal = () => {
    setError('');
    setSuccessMsg('');
    const todayStr = new Date().toISOString().split('T')[0];
    setBookForm({
      patientId: isPatient ? (user?.patientProfile?._id || user?.patientProfile || '') : (patients[0]?._id || ''),
      departmentId: departments[0]?._id || '',
      doctorId: doctors[0]?._id || '',
      date: todayStr,
      timeSlot: null,
      reason: '',
    });
    setShowBookModal(true);
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!bookForm.timeSlot) {
      setError('Please select an available time slot.');
      return;
    }
    if (!bookForm.reason) {
      setError('Please provide a reason for the consultation.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/appointments', {
        patientId: bookForm.patientId,
        doctorId: bookForm.doctorId,
        departmentId: bookForm.departmentId,
        date: bookForm.date,
        timeSlot: bookForm.timeSlot,
        reason: bookForm.reason,
      });

      if (res.success) {
        setSuccessMsg(
          `${res.appointment?.appointmentId || 'Appointment'} requested. It will be confirmed after the doctor reviews it.`
        );
        setShowBookModal(false);
        fetchAppointments();
      }
    } catch (err) {
      setError(err.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (aptId, newStatus) => {
    try {
      if (newStatus === 'Checked-in') {
        await api.put(`/appointments/${aptId}/check-in`);
      } else {
        await api.put(`/appointments/${aptId}/status`, {
          status: newStatus,
          reason: newStatus === 'Declined' ? 'Declined by doctor' : undefined,
        });
      }
      setSuccessMsg(
        newStatus === 'Confirmed'
          ? 'Appointment request confirmed. The patient has been notified.'
          : newStatus === 'Declined'
            ? 'Appointment request declined. The patient has been notified.'
            : `Appointment status updated to ${newStatus}`
      );
      fetchAppointments();
    } catch (err) {
      setError(err.message || 'Status update failed');
    }
  };

  const handleOpenReschedule = (apt) => {
    setSelectedApt(apt);
    setRescheduleDate(apt.date || new Date().toISOString().split('T')[0]);
    setRescheduleSlot(null);
    setShowRescheduleModal(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleSlot) {
      setError('Please choose an available slot');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/appointments/${selectedApt._id}/reschedule`, {
        date: rescheduleDate,
        timeSlot: rescheduleSlot,
      });
      setSuccessMsg('Appointment rescheduled successfully');
      setShowRescheduleModal(false);
      fetchAppointments();
    } catch (err) {
      setError(err.message || 'Rescheduling failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCancel = (apt) => {
    setSelectedApt(apt);
    setCancelReason('Patient request');
    setShowCancelModal(true);
  };

  const handleCancelSubmit = async () => {
    setSubmitting(true);
    try {
      await api.put(`/appointments/${selectedApt._id}/cancel`, {
        cancellationReason: cancelReason,
      });
      setSuccessMsg('Appointment cancelled successfully');
      setShowCancelModal(false);
      fetchAppointments();
    } catch (err) {
      setError(err.message || 'Cancellation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (st) => {
    switch (st) {
      case 'Confirmed':
        return 'primary';
      case 'Pending':
        return 'warning';
      case 'Checked-in':
        return 'warning';
      case 'In consultation':
        return 'purple';
      case 'Completed':
        return 'success';
      case 'Cancelled':
      case 'Declined':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <Calendar className="h-6 w-6 text-brand-600" />
            <span>Appointment Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic scheduling, doctor availability conflict prevention, and live patient check-ins.
          </p>
        </div>
        <Button variant="primary" size="md" icon={PlusCircle} onClick={handleOpenBookModal}>
          Book New Appointment
        </Button>
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

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending Approval</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Checked-in">Checked-in</option>
            <option value="In consultation">In Consultation</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Declined">Declined</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">Date</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">Doctor</label>
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-brand-500"
          >
            <option value="all">All Doctors</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} ({d.specialization})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-3"></div>
            Loading scheduled appointments...
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No appointments found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the filters or schedule a new consultation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">ID & Date</th>
                  <th className="px-5 py-3.5">Patient</th>
                  <th className="px-5 py-3.5">Doctor & Dept</th>
                  <th className="px-5 py-3.5">Time Slot</th>
                  <th className="px-5 py-3.5">Reason</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {appointments.map((apt) => (
                  <tr key={apt._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-brand-700 block text-xs">{apt.appointmentId}</span>
                      <span className="text-slate-500 text-xs font-medium">{apt.date}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-900 block">{apt.patient?.name || 'Patient'}</span>
                      <span className="text-xs text-slate-400">{apt.patient?.phone || ''}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-800 block">{apt.doctor?.name || 'Doctor'}</span>
                      <span className="text-xs text-slate-500">{apt.department?.name || 'Specialty'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-800 px-2 py-1 rounded-md">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {apt.timeSlot?.startTime} - {apt.timeSlot?.endTime}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px] truncate text-xs text-slate-600" title={apt.reason}>
                      {apt.reason}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={getStatusBadgeVariant(apt.status)}>
                        {apt.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 text-xs">
                        {isDoctor && apt.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(apt._id, 'Confirmed')}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 font-medium"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleStatusChange(apt._id, 'Declined')}
                              className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200 font-medium"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {/* Check-in button (for staff) */}
                        {isAdmin && apt.status === 'Confirmed' && (
                          <button
                            onClick={() => handleStatusChange(apt._id, 'Checked-in')}
                            className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded border border-amber-200 font-medium"
                          >
                            Check-in
                          </button>
                        )}

                        {/* Complete consultation */}
                        {(isAdmin || isDoctor) && apt.status === 'Checked-in' && (
                          <button
                            onClick={() => handleStatusChange(apt._id, 'Completed')}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 font-medium"
                          >
                            Complete
                          </button>
                        )}

                        {/* Reschedule */}
                        {['Confirmed', 'Pending'].includes(apt.status) && (
                          <button
                            onClick={() => handleOpenReschedule(apt)}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded font-medium"
                          >
                            Reschedule
                          </button>
                        )}

                        {/* Cancel */}
                        {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                          <button
                            onClick={() => handleOpenCancel(apt)}
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded font-medium"
                          >
                            Cancel
                          </button>
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

      {/* Book Appointment Modal */}
      <Modal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        title="Schedule Doctor Appointment"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleBookSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Patient selection (if admin/staff) */}
            {isAdmin && (
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Select Patient *</label>
                <select
                  required
                  value={bookForm.patientId}
                  onChange={(e) => setBookForm({ ...bookForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Select a registered patient</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.patientId}) - {p.phone}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={bookForm.departmentId}
                onChange={(e) => setBookForm({ ...bookForm, departmentId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Doctor *</label>
              <select
                required
                value={bookForm.doctorId}
                onChange={(e) => setBookForm({ ...bookForm, doctorId: e.target.value, timeSlot: null })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">Choose Doctor</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.specialization}) - ₹{d.consultationFee}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={bookForm.date}
                onChange={(e) => setBookForm({ ...bookForm, date: e.target.value, timeSlot: null })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1.5">
                Available Time Slots (Real-time dynamic check) *
              </label>
              {loadingSlots ? (
                <div className="py-4 text-center text-slate-400">Loading available doctor slots...</div>
              ) : slotMessage ? (
                <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
                  {slotMessage}
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-3 bg-slate-50 text-slate-500 border border-slate-200 rounded-lg">
                  Please pick a doctor and date to view time slots.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                  {availableSlots.map((slot) => {
                    const isSelected =
                      bookForm.timeSlot?.startTime === slot.startTime &&
                      bookForm.timeSlot?.endTime === slot.endTime;

                    return (
                      <button
                        type="button"
                        key={slot.startTime}
                        disabled={!slot.isAvailable}
                        onClick={() => setBookForm({ ...bookForm, timeSlot: slot })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                            : slot.isAvailable
                            ? 'bg-white text-slate-800 border-slate-200 hover:border-brand-500 hover:bg-brand-50'
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                        }`}
                        title={slot.reason}
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Reason for Consultation *</label>
              <textarea
                required
                rows={2}
                value={bookForm.reason}
                onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })}
                placeholder="Describe symptoms or purpose of consultation..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="secondary" size="md" onClick={() => setShowBookModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              loading={submitting}
              disabled={!bookForm.timeSlot}
            >
              Confirm Booking
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        title="Reschedule Appointment"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Date *</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={rescheduleDate}
              onChange={(e) => {
                setRescheduleDate(e.target.value);
                setRescheduleSlot(null);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Choose New Slot *</label>
            {loadingRescheduleSlots ? (
              <div className="py-3 text-center text-slate-400">Loading available slots...</div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
                {rescheduleSlots.map((slot) => {
                  const isSelected = rescheduleSlot?.startTime === slot.startTime;
                  return (
                    <button
                      type="button"
                      key={slot.startTime}
                      disabled={!slot.isAvailable}
                      onClick={() => setRescheduleSlot(slot)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold border ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-600'
                          : slot.isAvailable
                          ? 'bg-white text-slate-800 border-slate-200 hover:bg-brand-50'
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      {slot.startTime}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="md" onClick={() => setShowRescheduleModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={submitting} disabled={!rescheduleSlot}>
              Save Reschedule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Appointment"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-sm text-slate-600">
            Are you sure you want to cancel appointment{' '}
            <strong className="text-slate-900">{selectedApt?.appointmentId}</strong>?
          </p>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason for Cancellation</label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="e.g. Patient schedule conflict"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" size="md" onClick={() => setShowCancelModal(false)}>
              Keep Appointment
            </Button>
            <Button variant="danger" size="md" loading={submitting} onClick={handleCancelSubmit}>
              Yes, Cancel It
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AppointmentsPage;
