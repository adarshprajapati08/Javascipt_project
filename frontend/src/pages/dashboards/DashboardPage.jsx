import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Building2,
  CalendarPlus,
  ArrowRight,
  Stethoscope,
  BriefcaseMedical,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decisionMessage, setDecisionMessage] = useState('');
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'receptionist';
  const isPatient = user?.role === 'patient';
  const isDoctor = user?.role === 'doctor';

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const res = await api.get('/dashboard/admin');
        if (res.success) {
          setStats(res.data);
        }
      } else if (isPatient) {
        const res = await api.get('/dashboard/patient');
        if (res.success) {
          setStats(res.data);
        }
      } else {
        // Doctor
        const res = await api.get('/dashboard/doctor');
        if (res.success) {
          setStats(res.data);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleAppointmentDecision = async (appointmentId, status) => {
    setUpdatingAppointmentId(appointmentId);
    setDecisionMessage('');
    try {
      await api.put(`/appointments/${appointmentId}/status`, {
        status,
        reason: status === 'Declined' ? 'Declined by doctor' : undefined,
      });
      setDecisionMessage(`Appointment ${status.toLowerCase()}.`);
      await fetchDashboardData();
    } catch (err) {
      setDecisionMessage(err.message || 'Could not update the appointment.');
    } finally {
      setUpdatingAppointmentId('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-3 text-sm text-slate-500 font-medium">Loading hospital metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-500" />
          <span>{error}</span>
        </div>
        <Button size="sm" variant="secondary" onClick={fetchDashboardData}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-brand-900 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-brand-300 font-semibold">
            {isPatient ? 'Patient Portal' : isDoctor ? 'Doctor Portal' : 'Hospital Operations Overview'}
          </span>
          <h2 className="text-2xl font-bold mt-1">
            Welcome back, {user?.name}
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            {isPatient
              ? 'Manage your medical consultations, schedule appointments, and review doctors.'
              : isDoctor
                ? 'Review today’s schedule, patient queue, upcoming visits, and consultation performance.'
                : 'Real-time overview of patients, doctors on duty, and scheduled appointments.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {!isDoctor && (
            <Link to="/appointments">
              <Button
                variant="primary"
                size="md"
                icon={CalendarPlus}
                className="bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-950/20"
              >
                {isPatient ? 'Book Appointment' : 'Manage Appointments'}
              </Button>
            </Link>
          )}
          {isDoctor && (
            <Link to="/appointments">
              <Button
                variant="primary"
                size="md"
                icon={Calendar}
                className="bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-950/20"
              >
                View My Schedule
              </Button>
            </Link>
          )}
          {isAdmin && (
            <Link to="/patients">
              <Button
                variant="secondary"
                size="md"
                icon={PlusCircle}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                New Patient
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ADMIN / STAFF VIEW */}
      {isAdmin && stats && (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Patients"
              value={stats.summary?.totalPatients || 0}
              subtitle="Registered patient records"
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Active Doctors"
              value={stats.summary?.totalDoctors || 0}
              subtitle="Specialists on duty"
              icon={UserCheck}
              color="green"
            />
            <StatCard
              title="Today's Appointments"
              value={stats.summary?.todayAppointments || 0}
              subtitle={`${stats.summary?.completedToday || 0} completed • ${stats.summary?.checkedInToday || 0} checked-in`}
              icon={Calendar}
              color="purple"
            />
            <StatCard
              title="Departments"
              value={stats.summary?.totalDepartments || 8}
              subtitle="Specialized clinical units"
              icon={Building2}
              color="amber"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 7-day Appointment Trends */}
            <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Appointment Volume</h3>
                  <p className="text-xs text-slate-500">Scheduled appointments over the past 7 days</p>
                </div>
                <Badge variant="primary">Weekly Trend</Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="appointments" name="Total Booked" fill="#0070c7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Breakdown */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">Clinical Departments</h3>
                <p className="text-xs text-slate-500 mb-4">Doctor distribution across specialties</p>
                <div className="space-y-3">
                  {(stats.departmentStats || []).slice(0, 5).map((dept) => (
                    <div key={dept.code} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                        <span className="font-medium text-slate-700">{dept.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {dept.doctors} {dept.doctors === 1 ? 'Doctor' : 'Doctors'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <Link to="/doctors" className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-brand-600 hover:text-brand-700">
                <span>View all doctors</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </>
      )}

      {/* PATIENT VIEW */}
      {isPatient && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Next Upcoming Appointment */}
            <div className="md:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-brand-600" />
                  <span>Upcoming Consultation</span>
                </h3>
                {stats.nextAppointment && (
                  <Badge variant={stats.nextAppointment.status === 'Pending' ? 'warning' : 'primary'}>
                    {stats.nextAppointment.status}
                  </Badge>
                )}
              </div>

              {stats.nextAppointment ? (
                <div className="bg-brand-50/50 rounded-xl p-4 border border-brand-100 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-base">
                        {stats.nextAppointment.doctor?.name || 'Assigned Specialist'}
                      </h4>
                      <p className="text-xs text-slate-600">
                        {stats.nextAppointment.doctor?.specialization || 'Clinical Doctor'} • {stats.nextAppointment.department?.name || 'Department'}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="inline-flex items-center gap-1.5 text-brand-700 font-bold text-sm bg-white px-3 py-1 rounded-lg border border-brand-200">
                        <Clock className="h-4 w-4" />
                        <span>{stats.nextAppointment.date} at {stats.nextAppointment.timeSlot?.startTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-brand-100 text-xs text-slate-600">
                    <span className="font-medium text-slate-800">Reason:</span> {stats.nextAppointment.reason}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No upcoming appointments scheduled</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Book your consultation with one of our specialized doctors today.</p>
                  <Link to="/appointments">
                    <Button variant="primary" size="sm" icon={CalendarPlus}>
                      Schedule Now
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Patient Profile Card */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-3">Patient Information</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Patient ID:</span>
                  <span className="font-bold text-slate-800">{stats.patient?.patientId || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Blood Group:</span>
                  <span className="font-semibold text-rose-600">{stats.patient?.bloodGroup || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Gender:</span>
                  <span className="font-medium capitalize text-slate-700">{stats.patient?.gender || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-medium text-slate-700">{stats.patient?.phone || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCTOR VIEW */}
      {isDoctor && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Today's Appointments"
              value={stats.stats?.todayCount || 0}
              subtitle="Scheduled consultations"
              icon={Calendar}
              color="blue"
            />
            <StatCard
              title="Waiting Patients"
              value={stats.stats?.waitingInQueue || 0}
              subtitle="Checked-in and ready"
              icon={Users}
              color="amber"
            />
            <StatCard
              title="Completed Today"
              value={stats.stats?.completedToday || 0}
              subtitle="Finished consultations"
              icon={CheckCircle2}
              color="green"
            />
            <StatCard
              title="Total Consultations"
              value={stats.stats?.totalConsultations || 0}
              subtitle="All recorded consultations"
              icon={Stethoscope}
              color="purple"
            />
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Appointment Requests</h3>
                <p className="text-xs text-slate-500">Review and respond to requests assigned to you</p>
              </div>
              <Badge variant="warning">{stats.pendingApprovals?.length || 0} pending</Badge>
            </div>
            {decisionMessage && (
              <div className="mb-3 p-3 rounded-lg bg-brand-50 border border-brand-100 text-brand-800 text-sm">
                {decisionMessage}
              </div>
            )}
            {(stats.pendingApprovals || []).length > 0 ? (
              <div className="space-y-3">
                {stats.pendingApprovals.map((appointment) => (
                  <div key={appointment._id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl border border-amber-100 bg-amber-50/60">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {appointment.patient?.name || 'Patient'} · {appointment.appointmentId}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {appointment.date} · {appointment.timeSlot?.startTime} - {appointment.timeSlot?.endTime}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{appointment.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={CheckCircle2}
                        loading={updatingAppointmentId === appointment._id}
                        disabled={Boolean(updatingAppointmentId)}
                        onClick={() => handleAppointmentDecision(appointment._id, 'Confirmed')}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={XCircle}
                        disabled={Boolean(updatingAppointmentId)}
                        onClick={() => handleAppointmentDecision(appointment._id, 'Declined')}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-5 text-center">No appointment requests awaiting your decision.</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Today's Schedule</h3>
                  <p className="text-xs text-slate-500">Appointments assigned to you</p>
                </div>
                <Link to="/appointments">
                  <Button variant="secondary" size="sm">Open Schedule</Button>
                </Link>
              </div>

              {(stats.todaySchedule || []).length > 0 ? (
                <div className="space-y-2.5">
                  {stats.todaySchedule.map((appointment) => (
                    <div key={appointment._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {appointment.patient?.name || 'Patient'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {appointment.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                          <Clock className="h-3 w-3" />
                          {appointment.timeSlot?.startTime} - {appointment.timeSlot?.endTime}
                        </span>
                        <Badge variant={
                          appointment.status === 'Completed' ? 'success'
                            : appointment.status === 'Checked-in' ? 'warning'
                              : appointment.status === 'Cancelled' ? 'danger'
                                : 'primary'
                        }>
                          {appointment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <Calendar className="h-9 w-9 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No appointments scheduled today</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Doctor Profile</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <Stethoscope className="h-4 w-4 mt-0.5 text-brand-600 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Specialization</p>
                    <p className="font-medium text-slate-800">{stats.doctor?.specialization || user?.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Building2 className="h-4 w-4 mt-0.5 text-brand-600 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Department</p>
                    <p className="font-medium text-slate-800">{stats.doctor?.department?.name || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <BriefcaseMedical className="h-4 w-4 mt-0.5 text-brand-600 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Experience</p>
                    <p className="font-medium text-slate-800">{stats.doctor?.experience || 0} years</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Available Days</p>
                  <p className="text-xs font-medium text-slate-700">
                    {(stats.doctor?.availableDays || []).join(', ') || 'Not configured'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-800">Patient Queue</h3>
                <Badge variant="warning">{stats.patientQueue?.length || 0} waiting</Badge>
              </div>
              {(stats.patientQueue || []).length > 0 ? (
                <div className="space-y-2">
                  {stats.patientQueue.map((appointment) => (
                    <div key={appointment._id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{appointment.patient?.name}</p>
                        <p className="text-xs text-slate-500">{appointment.appointmentId}</p>
                      </div>
                      <Link to="/appointments">
                        <Button variant="secondary" size="sm">View</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-6 text-center">No checked-in patients waiting.</p>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-800">Upcoming Appointments</h3>
                <Calendar className="h-4 w-4 text-brand-600" />
              </div>
              {(stats.upcoming || []).length > 0 ? (
                <div className="space-y-2">
                  {stats.upcoming.map((appointment) => (
                    <div key={appointment._id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{appointment.patient?.name}</p>
                        <p className="text-xs text-slate-500">{appointment.reason}</p>
                      </div>
                      <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg">
                        {appointment.date} • {appointment.timeSlot?.startTime}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-6 text-center">No future appointments.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Link Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              {isDoctor ? 'Review your appointments' : 'Need to schedule a new visit?'}
            </h4>
            <p className="text-xs text-slate-500">
              {isDoctor
                ? 'View confirmed visits, update consultation progress, and manage your schedule.'
                : 'Browse specialist doctors, pick available dates and times in real-time.'}
            </p>
          </div>
        </div>
        <Link to="/appointments">
          <Button variant="primary" size="md">
            {isDoctor ? 'Open My Schedule' : 'Go to Appointments'}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
