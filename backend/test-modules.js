const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

const request = (endpoint, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('====================================================');
  console.log('MEDITRACK END-TO-END QA TEST SUITE');
  console.log('Testing the 4 core modules on live server...');
  console.log('====================================================\n');

  let adminToken = '';
  let patientToken = '';
  let doctorToken = '';
  let testPatientId = '';
  let testDoctorId = '';
  let testAppointmentId = '';
  let doctorIdForBooking = '';
  let targetBookingDate = '';

  try {
    // ----------------------------------------------------
    // 1. AUTHENTICATION MODULE TESTS
    // ----------------------------------------------------
    console.log('[TEST 1.1] Admin Login...');
    const adminLoginRes = await request('/auth/login', 'POST', {
      email: 'admin@meditrack.com',
      password: 'AdminPassword123!',
    });
    if (adminLoginRes.status === 200 && adminLoginRes.data.token) {
      adminToken = adminLoginRes.data.token;
      console.log('  PASS: Admin login successful. Role:', adminLoginRes.data.user.role);
    } else {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes)}`);
    }

    console.log('[TEST 1.2] Patient Login...');
    const patientLoginRes = await request('/auth/login', 'POST', {
      email: 'patient@meditrack.com',
      password: 'PatientPassword123!',
    });
    if (patientLoginRes.status === 200 && patientLoginRes.data.token) {
      patientToken = patientLoginRes.data.token;
      console.log('  PASS: Patient login successful. Role:', patientLoginRes.data.user.role);
    } else {
      throw new Error(`Patient login failed: ${JSON.stringify(patientLoginRes)}`);
    }

    console.log('[TEST 1.3] Patient Self-Registration...');
    const uniqueEmail = `test.patient.${Date.now()}@example.com`;
    const regRes = await request('/auth/register', 'POST', {
      name: 'Samantha Ray',
      email: uniqueEmail,
      password: 'Password123!',
      phone: `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      gender: 'female',
      bloodGroup: 'A+',
      dateOfBirth: '1996-05-15',
    });
    if (regRes.status === 201 && regRes.data.token) {
      console.log('  PASS: Patient registration successful. Created Patient Profile:', regRes.data.user.patientProfile);
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(regRes)}`);
    }

    // ----------------------------------------------------
    // 2. DASHBOARD MODULE TESTS
    // ----------------------------------------------------
    console.log('\n[TEST 2.1] Fetch Admin Dashboard Metrics...');
    const adminDashRes = await request('/dashboard/admin', 'GET', null, adminToken);
    if (adminDashRes.status === 200 && adminDashRes.data.success) {
      const summary = adminDashRes.data.data.summary;
      console.log('  PASS: Admin metrics loaded.');
      console.log(`        Patients: ${summary.totalPatients}, Doctors: ${summary.totalDoctors}, Today Apt: ${summary.todayAppointments}`);
    } else {
      throw new Error(`Admin dashboard fetch failed: ${JSON.stringify(adminDashRes)}`);
    }

    console.log('[TEST 2.2] Fetch Patient Dashboard...');
    const patientDashRes = await request('/dashboard/patient', 'GET', null, patientToken);
    if (patientDashRes.status === 200 && patientDashRes.data.success) {
      console.log('  PASS: Patient dashboard loaded successfully.');
    } else {
      throw new Error(`Patient dashboard fetch failed: ${JSON.stringify(patientDashRes)}`);
    }

    // ----------------------------------------------------
    // 3. PATIENT AND DOCTOR MANAGEMENT TESTS
    // ----------------------------------------------------
    console.log('\n[TEST 3.1] Search and Filter Patients...');
    const searchPtRes = await request('/patients?search=John', 'GET', null, adminToken);
    if (searchPtRes.status === 200 && searchPtRes.data.patients.length > 0) {
      console.log('  PASS: Search found matching patient:', searchPtRes.data.patients[0].name);
    } else {
      throw new Error(`Search failed: ${JSON.stringify(searchPtRes)}`);
    }

    console.log('[TEST 3.2] Admin Register New Patient...');
    const createPtRes = await request('/patients', 'POST', {
      name: 'Oliver Twist',
      dateOfBirth: '1998-03-21',
      gender: 'male',
      bloodGroup: 'AB+',
      phone: `+91 99${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `oliver.${Date.now()}@example.com`,
      allergies: ['Dust', 'Pollen'],
      chronicConditions: [],
    }, adminToken);

    if (createPtRes.status === 201 && createPtRes.data.patient) {
      testPatientId = createPtRes.data.patient._id;
      console.log('  PASS: Patient created. ID:', createPtRes.data.patient.patientId);
    } else {
      throw new Error(`Create patient failed: ${JSON.stringify(createPtRes)}`);
    }

    console.log('[TEST 3.3] Edit Patient Information...');
    const updatePtRes = await request(`/patients/${testPatientId}`, 'PUT', {
      allergies: ['Dust', 'Pollen', 'Shellfish'],
      medicalHistoryNotes: 'Updated by attending physician during check-in.',
    }, adminToken);
    if (updatePtRes.status === 200 && updatePtRes.data.patient.allergies.includes('Shellfish')) {
      console.log('  PASS: Patient record updated successfully.');
    } else {
      throw new Error(`Update patient failed: ${JSON.stringify(updatePtRes)}`);
    }

    console.log('[TEST 3.4] Delete Test Patient...');
    const delPtRes = await request(`/patients/${testPatientId}`, 'DELETE', null, adminToken);
    if (delPtRes.status === 200) {
      console.log('  PASS: Patient deleted cleanly from database.');
    } else {
      throw new Error(`Delete patient failed: ${JSON.stringify(delPtRes)}`);
    }

    console.log('[TEST 3.5] Fetch Doctors List...');
    const docListRes = await request('/doctors', 'GET');
    if (docListRes.status === 200 && docListRes.data.doctors.length > 0) {
      doctorIdForBooking = docListRes.data.doctors[0]._id;
      console.log(`  PASS: Found ${docListRes.data.doctors.length} doctors. Primary: Dr. ${docListRes.data.doctors[0].name}`);
      const doctorLoginRes = await request('/auth/login', 'POST', {
        email: docListRes.data.doctors[0].user.email,
        password: 'DoctorPassword123!',
      });
      if (doctorLoginRes.status === 200 && doctorLoginRes.data.token) {
        doctorToken = doctorLoginRes.data.token;
      } else {
        throw new Error(`Doctor login failed: ${JSON.stringify(doctorLoginRes)}`);
      }
    } else {
      throw new Error(`Doctor list failed: ${JSON.stringify(docListRes)}`);
    }

    console.log('[TEST 3.6] Admin Create & Delete Doctor Profile...');
    const deptListRes = await request('/departments', 'GET');
    const firstDeptId = deptListRes.data.departments[0]._id;

    const createDocRes = await request('/doctors', 'POST', {
      name: 'Dr. Test Specialist',
      email: `temp.doctor.${Date.now()}@meditrack.com`,
      department: firstDeptId,
      specialization: 'Testing Specialist',
      consultationFee: 750,
      availableDays: ['Monday', 'Tuesday', 'Wednesday'],
    }, adminToken);

    if (createDocRes.status === 201 && createDocRes.data.doctor) {
      testDoctorId = createDocRes.data.doctor._id;
      console.log('  PASS: Doctor created successfully.');
      const delDocRes = await request(`/doctors/${testDoctorId}`, 'DELETE', null, adminToken);
      if (delDocRes.status === 200) {
        console.log('  PASS: Doctor deleted cleanly.');
      }
    } else {
      throw new Error(`Create doctor failed: ${JSON.stringify(createDocRes)}`);
    }

    // ----------------------------------------------------
    // 4. APPOINTMENT MANAGEMENT & CONFLICT PREVENTION TESTS
    // ----------------------------------------------------
    // Pick tomorrow's date for conflict testing
    const d = new Date();
    d.setDate(d.getDate() + 1);
    targetBookingDate = d.toISOString().split('T')[0];

    console.log(`\n[TEST 4.1] Query Dynamic Available Slots for Doctor on ${targetBookingDate}...`);
    const slotsRes = await request(`/doctors/${doctorIdForBooking}/available-slots?date=${targetBookingDate}`, 'GET');
    if (slotsRes.status === 200) {
      console.log(`  PASS: Dynamic slot calculation returned ${slotsRes.data.slots?.length || 0} slots (Available: ${slotsRes.data.availableSlotsCount}).`);
    } else {
      throw new Error(`Available slots query failed: ${JSON.stringify(slotsRes)}`);
    }

    const firstAvailableSlot = (slotsRes.data.slots || []).find((s) => s.isAvailable) || {
      startTime: '10:00',
      endTime: '10:30',
    };

    console.log(`[TEST 4.2] Book Appointment at slot ${firstAvailableSlot.startTime}...`);
    const bookRes = await request('/appointments', 'POST', {
      doctorId: doctorIdForBooking,
      date: targetBookingDate,
      timeSlot: firstAvailableSlot,
      reason: 'Automated integration test consultation',
    }, patientToken);

    if (bookRes.status === 201 && bookRes.data.appointment && bookRes.data.appointment.status === 'Pending') {
      testAppointmentId = bookRes.data.appointment._id;
      console.log('  PASS: Appointment created as pending doctor approval:', bookRes.data.appointment.appointmentId);
    } else {
      throw new Error(`Appointment booking failed: ${JSON.stringify(bookRes)}`);
    }

    console.log('[TEST 4.3] Test Conflict Prevention: Attempting Duplicate Booking on Same Slot...');
    const dupRes = await request('/appointments', 'POST', {
      doctorId: doctorIdForBooking,
      date: targetBookingDate,
      timeSlot: firstAvailableSlot,
      reason: 'Attempting to double book the same slot',
    }, patientToken);

    if (dupRes.status === 409) {
      console.log('  PASS: Conflict Prevention Verified! Double-booking was rejected with 409 Conflict:');
      console.log(`        "${dupRes.data.message}"`);
    } else {
      throw new Error(`Conflict check failed! Expected 409 but received ${dupRes.status}: ${JSON.stringify(dupRes)}`);
    }

    console.log('[TEST 4.4] Verify Doctor Approval Is Required...');
    const adminApprovalRes = await request(`/appointments/${testAppointmentId}/status`, 'PUT', {
      status: 'Confirmed',
    }, adminToken);
    if (adminApprovalRes.status === 403) {
      console.log('  PASS: Admin cannot approve a pending appointment.');
    } else {
      throw new Error(`Expected admin approval to be rejected: ${JSON.stringify(adminApprovalRes)}`);
    }

    const doctorDashboardRes = await request('/dashboard/doctor', 'GET', null, doctorToken);
    if (doctorDashboardRes.status === 200 && doctorDashboardRes.data.data.pendingApprovals.some((a) => a._id === testAppointmentId)) {
      console.log('  PASS: New appointment appears in the assigned doctor approval queue.');
    } else {
      throw new Error(`Pending appointment missing from doctor's dashboard: ${JSON.stringify(doctorDashboardRes)}`);
    }

    console.log('[TEST 4.5] Doctor Confirms Appointment...');
    const approvalRes = await request(`/appointments/${testAppointmentId}/status`, 'PUT', {
      status: 'Confirmed',
    }, doctorToken);
    if (approvalRes.status === 200 && approvalRes.data.appointment.status === 'Confirmed') {
      console.log('  PASS: Doctor confirmed the appointment.');
    } else {
      throw new Error(`Doctor approval failed: ${JSON.stringify(approvalRes)}`);
    }

    console.log('[TEST 4.6] Update Appointment Status to Checked-in...');
    const checkInRes = await request(`/appointments/${testAppointmentId}/check-in`, 'PUT', null, adminToken);
    if (checkInRes.status === 200 && checkInRes.data.appointment.status === 'Checked-in') {
      console.log('  PASS: Patient checked-in status confirmed.');
    } else {
      throw new Error(`Check-in failed: ${JSON.stringify(checkInRes)}`);
    }

    console.log('[TEST 4.7] Update Appointment Status to Completed...');
    const completeRes = await request(`/appointments/${testAppointmentId}/status`, 'PUT', {
      status: 'Completed',
    }, adminToken);
    if (completeRes.status === 200 && completeRes.data.appointment.status === 'Completed') {
      console.log('  PASS: Appointment status marked Completed.');
    } else {
      throw new Error(`Status update failed: ${JSON.stringify(completeRes)}`);
    }

    console.log('\n====================================================');
    console.log('ALL 4 MODULE TESTS PASSED WITH 100% SUCCESS!');
    console.log('1. Authentication Module:       PASSED');
    console.log('2. Dashboard & Statistics:      PASSED');
    console.log('3. Patient & Doctor Management: PASSED');
    console.log('4. Appointment & Conflict Prev: PASSED');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\nTEST SUITE FAILED:', err.message);
    process.exit(1);
  }
};

runTests();
