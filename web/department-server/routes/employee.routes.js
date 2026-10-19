const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');

const router = express.Router();

// Default maintenance tasks seed
const DEFAULT_TASKS = [
  {
    ticketId: "TK-101",
    title: "Software Lab 1 - Workstation GPU Drivers Update",
    category: "Software",
    location: "Room 301 (Software Lab 1)",
    priority: "High",
    status: "In Progress",
    assignedBy: "Chairman Office",
    description: "Install latest CUDA toolkit and proprietary GPU drivers on all 45 nodes for AI coursework.",
    createdAt: new Date(),
  },
  {
    ticketId: "TK-102",
    title: "Networking Lab - Cisco 2960 Switch Port 14 Re-cabling",
    category: "Network",
    location: "Room 303 (Hardware Lab)",
    priority: "Medium",
    status: "Resolved",
    assignedBy: "Course Teacher",
    description: "Re-terminate CAT6 patch cable for rack switch port 14 and verify 1Gbps uplink.",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000),
  },
  {
    ticketId: "TK-103",
    title: "Smart Classroom 402 - 4K Laser Projector Lens Calibration",
    category: "Hardware",
    location: "Academic Bldg 2, Room 402",
    priority: "Low",
    status: "Pending",
    assignedBy: "Dept Secretary",
    description: "Recalibrate throw ratio and Keystone distortion after ceiling mount adjustment.",
    createdAt: new Date(Date.now() - 48 * 3600 * 1000),
  },
  {
    ticketId: "TK-104",
    title: "Server Room - Central 10kVA UPS Battery Bank Load Test",
    category: "Power & Facility",
    location: "Server Room (Bldg 2, Rm 205)",
    priority: "High",
    status: "Resolved",
    assignedBy: "System Administrator",
    description: "Verify runtime and cell voltages under 60% departmental server load.",
    createdAt: new Date(Date.now() - 72 * 3600 * 1000),
  },
];

// Default lab facilities seed
const DEFAULT_LABS = [
  {
    name: "Software Lab 1",
    room: "Room 301",
    systems: "45 / 45 PCs Online",
    status: "100% Operational",
    badgeColor: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800",
    specs: "Intel Core i7 13th Gen, 32GB RAM, Gigabit LAN",
    inCharge: "Staff Officer",
  },
  {
    name: "Networking & Hardware Lab",
    room: "Room 303",
    systems: "38 / 40 PCs Online",
    status: "95% Operational",
    badgeColor: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800",
    specs: "Cisco Switches, Patch Panels, Logic Analyzers",
    inCharge: "Lab Assistant",
  },
  {
    name: "AI & High Performance Lab",
    room: "Room 405",
    systems: "24 / 24 GPU Nodes",
    status: "100% Operational",
    badgeColor: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 ring-purple-200 dark:ring-purple-800",
    specs: "RTX 4090 Workstations, Liquid Cooled, Linux Cluster",
    inCharge: "Technical Officer",
  },
  {
    name: "Multimedia & Seminar Hall",
    room: "Room 501",
    systems: "Audio / Projection Suite",
    status: "Operational",
    badgeColor: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 ring-sky-200 dark:ring-sky-800",
    specs: "4K Laser Projector, Smart Podium, Shure Wireless",
    inCharge: "Department Staff",
  },
];

// ── EMPLOYEE PROFILE MANAGEMENT ─────────────────────────────────

// GET all employees
router.get('/', async (req, res) => {
  try {
    const { employees } = getCollections();
    const { search, department, status } = req.query;
    const query = {};

    if (department) query.department = department;
    if (status) {
      if (status === 'approved') {
        query.status = { $ne: 'pending' };
      } else {
        query.status = status;
      }
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const employeeList = await employees.find(query).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: employeeList.length, employees: employeeList });
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// GET employee by email
router.get('/email/:email', async (req, res) => {
  try {
    const { employees } = getCollections();
    const employee = await employees.findOne({ email: req.params.email });
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

// PUT / PATCH employee profile
const handleEmployeeProfileUpdate = async (req, res) => {
  try {
    const { employees, users } = getCollections();
    const identifier = req.params.email || req.params.id;

    if (!identifier) {
      return res.status(400).json({ error: "Employee identifier is required" });
    }

    const query = {
      $or: [
        { email: identifier },
        { employeeId: identifier },
        { userId: identifier }
      ]
    };
    try {
      if (ObjectId.isValid(identifier)) {
        query.$or.push({ _id: new ObjectId(identifier) });
      }
    } catch (e) {}

    let employee = await employees.findOne(query);

    const {
      name,
      phone,
      employeeId,
      designation,
      department,
      section,
      officeRoom,
      joiningDate,
      bio,
      address,
      bloodGroup,
      image,
      avatar,
      photo
    } = req.body;

    const updateFields = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateFields.name = typeof name === 'string' ? name.trim() : name;
    if (phone !== undefined) updateFields.phone = typeof phone === 'string' ? phone.trim() : phone;
    if (employeeId !== undefined) updateFields.employeeId = typeof employeeId === 'string' ? employeeId.trim() : employeeId;
    if (designation !== undefined) updateFields.designation = typeof designation === 'string' ? designation.trim() : designation;
    if (department !== undefined) updateFields.department = typeof department === 'string' ? department.trim() : department;
    if (section !== undefined) updateFields.section = typeof section === 'string' ? section.trim() : section;
    if (officeRoom !== undefined) updateFields.officeRoom = typeof officeRoom === 'string' ? officeRoom.trim() : officeRoom;
    if (joiningDate !== undefined) updateFields.joiningDate = typeof joiningDate === 'string' ? joiningDate.trim() : joiningDate;
    if (bio !== undefined) updateFields.bio = typeof bio === 'string' ? bio.trim() : bio;
    if (address !== undefined) updateFields.address = typeof address === 'string' ? address.trim() : address;
    if (bloodGroup !== undefined) updateFields.bloodGroup = typeof bloodGroup === 'string' ? bloodGroup.trim() : bloodGroup;

    const profileImage = image !== undefined ? image : (avatar !== undefined ? avatar : photo);
    if (profileImage !== undefined) {
      updateFields.image = typeof profileImage === 'string' ? profileImage.trim() : profileImage;
    }

    if (employee) {
      await employees.updateOne({ _id: employee._id }, { $set: updateFields });
    } else {
      // Upsert record if not exists
      const newDoc = {
        ...updateFields,
        email: identifier.includes('@') ? identifier : undefined,
        employeeId: employeeId || identifier,
        status: 'approved',
        createdAt: new Date(),
      };
      const insertResult = await employees.insertOne(newDoc);
      employee = { _id: insertResult.insertedId, ...newDoc };
    }

    // Sync with users collection for Better Auth session
    const targetEmail = employee.email || (identifier.includes('@') ? identifier : null);
    if (targetEmail) {
      const userSyncFields = { updatedAt: new Date() };
      if (updateFields.name !== undefined) userSyncFields.name = updateFields.name;
      if (updateFields.phone !== undefined) userSyncFields.phone = updateFields.phone;
      if (updateFields.image !== undefined) userSyncFields.image = updateFields.image;
      if (updateFields.designation !== undefined) userSyncFields.designation = updateFields.designation;
      if (updateFields.department !== undefined) userSyncFields.department = updateFields.department;
      if (updateFields.officeRoom !== undefined) userSyncFields.officeRoom = updateFields.officeRoom;

      await users.updateOne(
        { email: targetEmail },
        { $set: userSyncFields }
      );
    }

    const updatedEmployee = await employees.findOne({ _id: employee._id });
    res.json({
      success: true,
      message: "Employee profile updated successfully!",
      employee: updatedEmployee
    });
  } catch (err) {
    console.error("Error updating employee profile:", err);
    res.status(500).json({ error: "Failed to update employee profile" });
  }
};

router.put('/profile/:email', handleEmployeeProfileUpdate);
router.patch('/profile/:email', handleEmployeeProfileUpdate);
router.put('/:id', handleEmployeeProfileUpdate);
router.patch('/:id', handleEmployeeProfileUpdate);

// ── SHIFT DUTY & CHECK-IN SYSTEM ───────────────────────────────

// GET today's shift status
router.get('/shift/status', async (req, res) => {
  try {
    const { employeeShifts } = getCollections();
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const shift = await employeeShifts.findOne({
      employeeEmail: email,
      date: todayStr
    });

    res.json({
      success: true,
      date: todayStr,
      isCheckedIn: Boolean(shift && shift.checkInTime),
      isCheckedOut: Boolean(shift && shift.checkOutTime),
      shift: shift || null
    });
  } catch (err) {
    console.error("Error fetching shift status:", err);
    res.status(500).json({ error: "Failed to check shift status" });
  }
});

// POST check-in or toggle check-out
router.post('/shift/check-in', async (req, res) => {
  try {
    const { employeeShifts } = getCollections();
    const { email, name, employeeId, shiftType = "Standard Day Duty (08:30 AM - 04:30 PM)" } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Employee email is required" });
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const existing = await employeeShifts.findOne({
      employeeEmail: email,
      date: todayStr
    });

    if (!existing) {
      // First check-in of the day
      const newShift = {
        employeeEmail: email,
        employeeName: name || "Staff Member",
        employeeId: employeeId || "EMP-STAFF",
        date: todayStr,
        shiftType,
        checkInTime: now,
        checkInFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "Present",
        createdAt: now
      };
      await employeeShifts.insertOne(newShift);
      return res.json({
        success: true,
        action: "check_in",
        message: "Duty check-in recorded successfully!",
        shift: newShift
      });
    }

    if (existing.checkInTime && !existing.checkOutTime) {
      // Log check-out
      const diffMs = now - new Date(existing.checkInTime);
      const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(1);

      await employeeShifts.updateOne(
        { _id: existing._id },
        {
          $set: {
            checkOutTime: now,
            checkOutFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            durationHours: `${diffHours} hrs`,
            updatedAt: now
          }
        }
      );

      const updated = await employeeShifts.findOne({ _id: existing._id });
      return res.json({
        success: true,
        action: "check_out",
        message: "Duty check-out recorded! Shift completed.",
        shift: updated
      });
    }

    return res.json({
      success: true,
      action: "already_completed",
      message: "Shift already completed for today.",
      shift: existing
    });
  } catch (err) {
    console.error("Error logging shift:", err);
    res.status(500).json({ error: "Failed to log shift" });
  }
});

// GET shift history for employee
router.get('/shift/history', async (req, res) => {
  try {
    const { employeeShifts } = getCollections();
    const { email } = req.query;

    const query = email ? { employeeEmail: email } : {};
    const shifts = await employeeShifts.find(query).sort({ date: -1, createdAt: -1 }).limit(30).toArray();

    res.json({
      success: true,
      count: shifts.length,
      shifts
    });
  } catch (err) {
    console.error("Error fetching shift history:", err);
    res.status(500).json({ error: "Failed to fetch shift history" });
  }
});

// ── MAINTENANCE TASKS / WORK ORDERS ─────────────────────────────

// GET maintenance tasks (auto-seed if empty)
router.get('/tasks', async (req, res) => {
  try {
    const { maintenanceTasks } = getCollections();
    const count = await maintenanceTasks.countDocuments();
    if (count === 0) {
      await maintenanceTasks.insertMany(DEFAULT_TASKS);
    }

    const { status, category, priority, search } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;
    if (priority && priority !== 'all') query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { ticketId: { $regex: search, $options: 'i' } },
        { assignedBy: { $regex: search, $options: 'i' } },
      ];
    }

    const tasks = await maintenanceTasks.find(query).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error("Error fetching maintenance tasks:", err);
    res.status(500).json({ error: "Failed to load tasks" });
  }
});

// POST create maintenance task
router.post('/tasks', async (req, res) => {
  try {
    const { maintenanceTasks } = getCollections();
    const {
      title,
      category = "Hardware",
      location = "Department Lab",
      priority = "Medium",
      description = "",
      assignedBy = "Staff Officer",
      reportedByEmail = ""
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const count = await maintenanceTasks.countDocuments();
    const ticketId = `TK-${101 + count}`;

    const newTask = {
      ticketId,
      title: title.trim(),
      category,
      location: location.trim(),
      priority,
      status: "Pending",
      description: description.trim(),
      assignedBy: assignedBy.trim(),
      reportedByEmail,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await maintenanceTasks.insertOne(newTask);
    newTask._id = result.insertedId;

    res.json({ success: true, message: "Maintenance ticket created successfully!", task: newTask });
  } catch (err) {
    console.error("Error creating maintenance task:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// PATCH toggle task status (Pending -> In Progress -> Resolved -> Pending)
router.patch('/tasks/:id/status', async (req, res) => {
  try {
    const { maintenanceTasks } = getCollections();
    const { id } = req.params;
    const { status } = req.body;

    const query = { $or: [{ ticketId: id }] };
    try {
      if (ObjectId.isValid(id)) query.$or.push({ _id: new ObjectId(id) });
    } catch (e) {}

    const task = await maintenanceTasks.findOne(query);
    if (!task) return res.status(404).json({ error: "Task ticket not found" });

    let nextStatus = status;
    if (!nextStatus) {
      if (task.status === "Pending") nextStatus = "In Progress";
      else if (task.status === "In Progress") nextStatus = "Resolved";
      else nextStatus = "Pending";
    }

    await maintenanceTasks.updateOne(query, {
      $set: { status: nextStatus, updatedAt: new Date() }
    });

    res.json({
      success: true,
      message: `Ticket status updated to ${nextStatus}`,
      task: { ...task, status: nextStatus }
    });
  } catch (err) {
    console.error("Error updating task status:", err);
    res.status(500).json({ error: "Failed to update task status" });
  }
});

// DELETE maintenance task
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { maintenanceTasks } = getCollections();
    const { id } = req.params;
    const query = { $or: [{ ticketId: id }] };
    try {
      if (ObjectId.isValid(id)) query.$or.push({ _id: new ObjectId(id) });
    } catch (e) {}

    await maintenanceTasks.deleteOne(query);
    res.json({ success: true, message: "Task ticket deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// ── LAB FACILITIES & INFRASTRUCTURE ─────────────────────────────

// GET lab facilities (auto-seed if empty)
router.get('/labs', async (req, res) => {
  try {
    const { labFacilities } = getCollections();
    const count = await labFacilities.countDocuments();
    if (count === 0) {
      await labFacilities.insertMany(DEFAULT_LABS);
    }

    const labs = await labFacilities.find({}).toArray();
    res.json({ success: true, count: labs.length, labs });
  } catch (err) {
    console.error("Error fetching lab facilities:", err);
    res.status(500).json({ error: "Failed to load lab facilities" });
  }
});

// PATCH lab facility status
router.patch('/labs/:id', async (req, res) => {
  try {
    const { labFacilities } = getCollections();
    const { id } = req.params;
    const { status, systems, specs } = req.body;

    const query = {};
    if (ObjectId.isValid(id)) {
      query._id = new ObjectId(id);
    } else {
      query.name = id;
    }

    const updateFields = { updatedAt: new Date() };
    if (status !== undefined) updateFields.status = status;
    if (systems !== undefined) updateFields.systems = systems;
    if (specs !== undefined) updateFields.specs = specs;

    await labFacilities.updateOne(query, { $set: updateFields });
    const updated = await labFacilities.findOne(query);

    res.json({ success: true, message: "Lab status updated successfully", lab: updated });
  } catch (err) {
    console.error("Error updating lab facility:", err);
    res.status(500).json({ error: "Failed to update lab" });
  }
});

// ── ADMIN CONTROLS ──────────────────────────────────────────────

// PATCH employee status (approved / rejected / pending)
router.patch('/status/:id', async (req, res) => {
  try {
    const { employees, users } = getCollections();
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const query = {
      $or: [
        { userId: id },
        { employeeId: id },
        { email: id }
      ]
    };
    try {
      if (ObjectId.isValid(id)) {
        query.$or.push({ _id: new ObjectId(id) });
      }
    } catch (e) {}

    const employee = await employees.findOne(query);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    await employees.updateOne(query, {
      $set: { status, updatedAt: new Date() }
    });

    if (employee.email) {
      await users.updateOne(
        { email: employee.email },
        { $set: { status, updatedAt: new Date() } }
      );
    }

    res.json({ success: true, message: `Employee status updated to ${status}`, employee: { ...employee, status } });
  } catch (err) {
    console.error("Error updating employee status:", err);
    res.status(500).json({ error: "Failed to update employee status" });
  }
});

// POST bulk approve all pending employees
router.post('/approve-all', async (req, res) => {
  try {
    const { employees, users } = getCollections();
    const result = await employees.updateMany(
      { status: 'pending' },
      { $set: { status: 'approved', updatedAt: new Date() } }
    );
    await users.updateMany(
      { role: 'employee', status: 'pending' },
      { $set: { status: 'approved', updatedAt: new Date() } }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount, message: `Approved ${result.modifiedCount} pending employees.` });
  } catch (err) {
    console.error("Error bulk approving employees:", err);
    res.status(500).json({ error: "Failed to approve all employees" });
  }
});

// DELETE employee record
router.delete('/:id', async (req, res) => {
  try {
    const { employees, users } = getCollections();
    const { id } = req.params;
    const query = {
      $or: [
        { userId: id },
        { employeeId: id },
        { email: id }
      ]
    };
    try {
      if (ObjectId.isValid(id)) {
        query.$or.push({ _id: new ObjectId(id) });
      }
    } catch (e) {}

    const employee = await employees.findOne(query);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    await employees.deleteOne(query);
    if (employee.email) {
      await users.deleteOne({ email: employee.email });
    }
    res.json({ success: true, message: "Employee record deleted successfully" });
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

// GET employee by id
router.get('/:id', async (req, res) => {
  try {
    const { employees } = getCollections();
    const { id } = req.params;
    const query = { $or: [{ userId: id }, { employeeId: id }] };
    try { query.$or.push({ _id: new ObjectId(id) }); } catch (e) {}

    const employee = await employees.findOne(query);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

module.exports = router;
