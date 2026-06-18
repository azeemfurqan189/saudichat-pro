import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

const biz = (req: AuthRequest) => req.params.businessId;

// ─── Real Estate: Properties ──────────────────────────────────────────────

export async function getProperties(req: AuthRequest, res: Response): Promise<void> {
  const properties = await prisma.property.findMany({
    where: { businessId: biz(req) },
    include: { customer: true, viewings: { take: 3, orderBy: { scheduledAt: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: properties });
}

export async function createProperty(req: AuthRequest, res: Response): Promise<void> {
  const b = req.body as Record<string, unknown>;
  const property = await prisma.property.create({
    data: {
      businessId: biz(req),
      title: String(b.title || 'Property'),
      titleAr: b.titleAr ? String(b.titleAr) : undefined,
      listingType: String(b.listingType || 'SALE'),
      price: Number(b.price) || 0,
      currency: String(b.currency || 'SAR'),
      bedrooms: b.bedrooms != null ? Number(b.bedrooms) : undefined,
      bathrooms: b.bathrooms != null ? Number(b.bathrooms) : undefined,
      areaSqm: b.areaSqm != null ? Number(b.areaSqm) : undefined,
      location: b.location ? String(b.location) : undefined,
      city: b.city ? String(b.city) : undefined,
      status: String(b.status || 'AVAILABLE'),
      description: b.description ? String(b.description) : undefined,
      customerId: b.customerId ? String(b.customerId) : undefined,
    },
    include: { customer: true },
  });
  res.status(201).json({ success: true, data: property });
}

export async function updateProperty(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.property.updateMany({
    where: { id: req.params.propertyId, businessId: biz(req) },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Property not found' });
    return;
  }
  const property = await prisma.property.findUnique({
    where: { id: req.params.propertyId },
    include: { customer: true },
  });
  res.json({ success: true, data: property });
}

export async function getPropertyViewings(req: AuthRequest, res: Response): Promise<void> {
  const viewings = await prisma.propertyViewing.findMany({
    where: { businessId: biz(req) },
    include: { property: true, customer: true },
    orderBy: { scheduledAt: 'asc' },
  });
  res.json({ success: true, data: viewings });
}

export async function createPropertyViewing(req: AuthRequest, res: Response): Promise<void> {
  const b = req.body as Record<string, unknown>;
  const viewing = await prisma.propertyViewing.create({
    data: {
      businessId: biz(req),
      propertyId: String(b.propertyId),
      clientName: String(b.clientName || 'Client'),
      clientPhone: b.clientPhone ? String(b.clientPhone) : undefined,
      customerId: b.customerId ? String(b.customerId) : undefined,
      scheduledAt: new Date(String(b.scheduledAt)),
      status: String(b.status || 'SCHEDULED'),
      notes: b.notes ? String(b.notes) : undefined,
    },
    include: { property: true, customer: true },
  });
  res.status(201).json({ success: true, data: viewing });
}

export async function updatePropertyViewing(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.propertyViewing.updateMany({
    where: { id: req.params.viewingId, businessId: biz(req) },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Viewing not found' });
    return;
  }
  const viewing = await prisma.propertyViewing.findUnique({
    where: { id: req.params.viewingId },
    include: { property: true },
  });
  res.json({ success: true, data: viewing });
}

// ─── Hotel ────────────────────────────────────────────────────────────────

export async function getHotelRooms(req: AuthRequest, res: Response): Promise<void> {
  const rooms = await prisma.hotelRoom.findMany({
    where: { businessId: biz(req) },
    include: { reservations: { where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } } } },
    orderBy: { roomNumber: 'asc' },
  });
  res.json({ success: true, data: rooms });
}

export async function createHotelRoom(req: AuthRequest, res: Response): Promise<void> {
  const b = req.body as Record<string, unknown>;
  const room = await prisma.hotelRoom.create({
    data: {
      businessId: biz(req),
      roomNumber: String(b.roomNumber),
      roomType: String(b.roomType || 'STANDARD'),
      pricePerNight: Number(b.pricePerNight) || 0,
      maxGuests: Number(b.maxGuests) || 2,
      isAvailable: b.isAvailable !== false,
    },
  });
  res.status(201).json({ success: true, data: room });
}

export async function updateHotelRoom(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.hotelRoom.updateMany({
    where: { id: req.params.roomId, businessId: biz(req) },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }
  const room = await prisma.hotelRoom.findUnique({ where: { id: req.params.roomId } });
  res.json({ success: true, data: room });
}

export async function getHotelReservations(req: AuthRequest, res: Response): Promise<void> {
  const reservations = await prisma.hotelReservation.findMany({
    where: { businessId: biz(req) },
    include: { room: true, customer: true },
    orderBy: { checkIn: 'asc' },
  });
  res.json({ success: true, data: reservations });
}

export async function createHotelReservation(req: AuthRequest, res: Response): Promise<void> {
  const b = req.body as Record<string, unknown>;
  const reservation = await prisma.hotelReservation.create({
    data: {
      businessId: biz(req),
      roomId: String(b.roomId),
      guestName: String(b.guestName || 'Guest'),
      guestPhone: b.guestPhone ? String(b.guestPhone) : undefined,
      customerId: b.customerId ? String(b.customerId) : undefined,
      checkIn: new Date(String(b.checkIn)),
      checkOut: new Date(String(b.checkOut)),
      guests: Number(b.guests) || 1,
      status: String(b.status || 'PENDING'),
      totalAmount: b.totalAmount != null ? Number(b.totalAmount) : undefined,
      notes: b.notes ? String(b.notes) : undefined,
    },
    include: { room: true, customer: true },
  });
  res.status(201).json({ success: true, data: reservation });
}

export async function updateHotelReservation(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.hotelReservation.updateMany({
    where: { id: req.params.reservationId, businessId: biz(req) },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Reservation not found' });
    return;
  }
  const reservation = await prisma.hotelReservation.findUnique({
    where: { id: req.params.reservationId },
    include: { room: true },
  });
  res.json({ success: true, data: reservation });
}

// ─── Logistics ────────────────────────────────────────────────────────────

export async function getShipments(req: AuthRequest, res: Response): Promise<void> {
  const shipments = await prisma.shipment.findMany({
    where: { businessId: biz(req) },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: shipments });
}

export async function createShipment(req: AuthRequest, res: Response): Promise<void> {
  const b = req.body as Record<string, unknown>;
  const trackingNumber = String(b.trackingNumber || `SHP-${Date.now().toString(36).toUpperCase()}`);
  const shipment = await prisma.shipment.create({
    data: {
      businessId: biz(req),
      trackingNumber,
      senderName: String(b.senderName || 'Sender'),
      senderPhone: b.senderPhone ? String(b.senderPhone) : undefined,
      recipientName: String(b.recipientName || 'Recipient'),
      recipientPhone: b.recipientPhone ? String(b.recipientPhone) : undefined,
      origin: String(b.origin || ''),
      destination: String(b.destination || ''),
      weightKg: b.weightKg != null ? Number(b.weightKg) : undefined,
      status: String(b.status || 'PENDING'),
      carrier: b.carrier ? String(b.carrier) : undefined,
      estimatedDelivery: b.estimatedDelivery ? new Date(String(b.estimatedDelivery)) : undefined,
      notes: b.notes ? String(b.notes) : undefined,
    },
  });
  res.status(201).json({ success: true, data: shipment });
}

export async function updateShipment(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.shipment.updateMany({
    where: { id: req.params.shipmentId, businessId: biz(req) },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Shipment not found' });
    return;
  }
  const shipment = await prisma.shipment.findUnique({ where: { id: req.params.shipmentId } });
  res.json({ success: true, data: shipment });
}

export async function getFleetVehicles(req: AuthRequest, res: Response): Promise<void> {
  const vehicles = await prisma.fleetVehicle.findMany({
    where: { businessId: biz(req) },
    orderBy: { plateNumber: 'asc' },
  });
  res.json({ success: true, data: vehicles });
}

export async function createFleetVehicle(req: AuthRequest, res: Response): Promise<void> {
  const b = req.body as Record<string, unknown>;
  const vehicle = await prisma.fleetVehicle.create({
    data: {
      businessId: biz(req),
      plateNumber: String(b.plateNumber),
      driverName: b.driverName ? String(b.driverName) : undefined,
      driverPhone: b.driverPhone ? String(b.driverPhone) : undefined,
      vehicleType: String(b.vehicleType || 'VAN'),
      status: String(b.status || 'AVAILABLE'),
    },
  });
  res.status(201).json({ success: true, data: vehicle });
}

export async function updateFleetVehicle(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.fleetVehicle.updateMany({
    where: { id: req.params.vehicleId, businessId: biz(req) },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Vehicle not found' });
    return;
  }
  const vehicle = await prisma.fleetVehicle.findUnique({ where: { id: req.params.vehicleId } });
  res.json({ success: true, data: vehicle });
}

// ─── Education ────────────────────────────────────────────────────────────

export async function getCourses(req: AuthRequest, res: Response): Promise<void> {
  const courses = await prisma.course.findMany({
    where: { businessId: biz(req) },
    include: { enrollments: { take: 5 } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: courses });
}

export async function createCourse(req: AuthRequest, res: Response): Promise<void> {
  const b = req.body as Record<string, unknown>;
  const course = await prisma.course.create({
    data: {
      businessId: biz(req),
      name: String(b.name || 'Course'),
      nameAr: b.nameAr ? String(b.nameAr) : undefined,
      instructor: b.instructor ? String(b.instructor) : undefined,
      schedule: b.schedule ? String(b.schedule) : undefined,
      duration: b.duration ? String(b.duration) : undefined,
      price: b.price != null ? Number(b.price) : undefined,
      maxStudents: b.maxStudents != null ? Number(b.maxStudents) : undefined,
      status: String(b.status || 'ACTIVE'),
    },
  });
  res.status(201).json({ success: true, data: course });
}

export async function updateCourse(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.course.updateMany({
    where: { id: req.params.courseId, businessId: biz(req) },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Course not found' });
    return;
  }
  const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
  res.json({ success: true, data: course });
}

export async function getEnrollments(req: AuthRequest, res: Response): Promise<void> {
  const enrollments = await prisma.enrollment.findMany({
    where: { businessId: biz(req) },
    include: { course: true },
    orderBy: { enrolledAt: 'desc' },
  });
  res.json({ success: true, data: enrollments });
}

export async function createEnrollment(req: AuthRequest, res: Response): Promise<void> {
  const b = req.body as Record<string, unknown>;
  const enrollment = await prisma.enrollment.create({
    data: {
      businessId: biz(req),
      courseId: String(b.courseId),
      studentName: String(b.studentName || 'Student'),
      studentPhone: b.studentPhone ? String(b.studentPhone) : undefined,
      studentEmail: b.studentEmail ? String(b.studentEmail) : undefined,
      status: String(b.status || 'ENROLLED'),
    },
    include: { course: true },
  });
  await prisma.course.update({
    where: { id: String(b.courseId) },
    data: { enrolledCount: { increment: 1 } },
  });
  res.status(201).json({ success: true, data: enrollment });
}

// ─── Automotive ───────────────────────────────────────────────────────────

export async function getVehicleJobs(req: AuthRequest, res: Response): Promise<void> {
  const jobs = await prisma.vehicleJob.findMany({
    where: { businessId: biz(req) },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: jobs });
}

export async function createVehicleJob(req: AuthRequest, res: Response): Promise<void> {
  const b = req.body as Record<string, unknown>;
  const job = await prisma.vehicleJob.create({
    data: {
      businessId: biz(req),
      vehiclePlate: String(b.vehiclePlate),
      vehicleMake: b.vehicleMake ? String(b.vehicleMake) : undefined,
      vehicleModel: b.vehicleModel ? String(b.vehicleModel) : undefined,
      issueDescription: String(b.issueDescription || ''),
      status: String(b.status || 'RECEIVED'),
      laborCost: b.laborCost != null ? Number(b.laborCost) : undefined,
      partsCost: b.partsCost != null ? Number(b.partsCost) : undefined,
      totalCost: b.totalCost != null ? Number(b.totalCost) : undefined,
      customerId: b.customerId ? String(b.customerId) : undefined,
      notes: b.notes ? String(b.notes) : undefined,
    },
    include: { customer: true },
  });
  res.status(201).json({ success: true, data: job });
}

export async function updateVehicleJob(req: AuthRequest, res: Response): Promise<void> {
  const updated = await prisma.vehicleJob.updateMany({
    where: { id: req.params.jobId, businessId: biz(req) },
    data: req.body,
  });
  if (updated.count === 0) {
    res.status(404).json({ success: false, message: 'Job not found' });
    return;
  }
  const job = await prisma.vehicleJob.findUnique({
    where: { id: req.params.jobId },
    include: { customer: true },
  });
  res.json({ success: true, data: job });
}

// ─── Industry Dashboard Stats ─────────────────────────────────────────────

export async function getIndustryStats(req: AuthRequest, res: Response): Promise<void> {
  const businessId = biz(req);
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { type: true } });
  const type = business?.type || 'CUSTOM';

  const stats: Record<string, unknown> = { businessType: type };

  if (type === 'REAL_ESTATE') {
    const [available, viewings, sold] = await Promise.all([
      prisma.property.count({ where: { businessId, status: 'AVAILABLE' } }),
      prisma.propertyViewing.count({ where: { businessId, status: 'SCHEDULED' } }),
      prisma.property.count({ where: { businessId, status: { in: ['SOLD', 'RENTED'] } } }),
    ]);
    stats.availableListings = available;
    stats.upcomingViewings = viewings;
    stats.closedDeals = sold;
  } else if (type === 'HOTEL') {
    const [rooms, occupied, reservations] = await Promise.all([
      prisma.hotelRoom.count({ where: { businessId } }),
      prisma.hotelReservation.count({ where: { businessId, status: 'CHECKED_IN' } }),
      prisma.hotelReservation.count({ where: { businessId, status: { in: ['PENDING', 'CONFIRMED'] } } }),
    ]);
    stats.totalRooms = rooms;
    stats.occupiedRooms = occupied;
    stats.upcomingReservations = reservations;
  } else if (type === 'LOGISTICS') {
    const [active, delivered, fleet] = await Promise.all([
      prisma.shipment.count({ where: { businessId, status: { in: ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } } }),
      prisma.shipment.count({ where: { businessId, status: 'DELIVERED' } }),
      prisma.fleetVehicle.count({ where: { businessId, status: 'AVAILABLE' } }),
    ]);
    stats.activeShipments = active;
    stats.deliveredShipments = delivered;
    stats.availableVehicles = fleet;
  } else if (type === 'EDUCATION') {
    const [courses, students, active] = await Promise.all([
      prisma.course.count({ where: { businessId } }),
      prisma.enrollment.count({ where: { businessId, status: 'ENROLLED' } }),
      prisma.course.count({ where: { businessId, status: 'ACTIVE' } }),
    ]);
    stats.totalCourses = courses;
    stats.enrolledStudents = students;
    stats.activeCourses = active;
  } else if (type === 'CAR_WORKSHOP') {
    const [open, ready, revenue] = await Promise.all([
      prisma.vehicleJob.count({ where: { businessId, status: { in: ['RECEIVED', 'DIAGNOSING', 'IN_REPAIR'] } } }),
      prisma.vehicleJob.count({ where: { businessId, status: 'READY' } }),
      prisma.vehicleJob.aggregate({ where: { businessId }, _sum: { totalCost: true } }),
    ]);
    stats.openJobs = open;
    stats.readyForPickup = ready;
    stats.totalRevenue = revenue._sum.totalCost || 0;
  }

  res.json({ success: true, data: stats });
}
