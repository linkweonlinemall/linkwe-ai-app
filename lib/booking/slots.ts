import type {
  ProductAvailabilityOverride,
  ProductAvailabilitySchedule,
  ProductBookingSlot,
} from "@prisma/client";

export type TimeSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
};

function utcAnchorFromYmd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

function utcMidnightFromYmd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

// Generate time slots for a specific date based on schedule + overrides + existing bookings
export function generateSlotsForDate(
  dateStr: string,
  schedule: ProductAvailabilitySchedule[],
  overrides: ProductAvailabilityOverride[],
  existingSlots: ProductBookingSlot[],
  serviceDuration: number,
): TimeSlot[] {
  const anchor = utcAnchorFromYmd(dateStr);
  const dayOfWeek = anchor.getUTCDay();

  const override = overrides.find((o) => {
    const od = new Date(o.date);
    const oStr = `${od.getUTCFullYear()}-${String(od.getUTCMonth() + 1).padStart(2, "0")}-${String(od.getUTCDate()).padStart(2, "0")}`;
    return oStr === dateStr;
  });

  if (override?.isBlocked) return [];

  const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek && s.isActive);
  if (!daySchedule) return [];

  const startTime = override?.customStartTime ?? daySchedule.startTime;
  const endTime = override?.customEndTime ?? daySchedule.endTime;
  const slotDuration = serviceDuration;
  const buffer = daySchedule.slotBufferMins ?? 0;

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  const slots: TimeSlot[] = [];
  let current = startMins;

  while (current + slotDuration <= endMins) {
    const slotStart = minsToTime(current);
    const slotEnd = minsToTime(current + slotDuration);

    const existingSlot = existingSlots.find((s) => {
      const sd = new Date(s.date);
      const sStr = `${sd.getUTCFullYear()}-${String(sd.getUTCMonth() + 1).padStart(2, "0")}-${String(sd.getUTCDate()).padStart(2, "0")}`;
      return sStr === dateStr && s.startTime === slotStart;
    });

    const available =
      !existingSlot ||
      (existingSlot.isAvailable && existingSlot.currentBookings < existingSlot.maxBookings);

    slots.push({ startTime: slotStart, endTime: slotEnd, available });
    current += slotDuration + buffer;
  }

  return slots;
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Get available dates for the next N days
export function getAvailableDates(
  schedule: ProductAvailabilitySchedule[],
  overrides: ProductAvailabilityOverride[],
  advanceBookingDays: number,
): string[] {
  const dates: string[] = [];
  const now = new Date();
  const startUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  for (let i = 1; i <= advanceBookingDays; i++) {
    const dayMs = startUtc + i * 86400000;
    const date = new Date(dayMs);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const dayOfWeek = date.getUTCDay();

    const override = overrides.find((o) => {
      const od = new Date(o.date);
      const oStr = `${od.getUTCFullYear()}-${String(od.getUTCMonth() + 1).padStart(2, "0")}-${String(od.getUTCDate()).padStart(2, "0")}`;
      return oStr === dateStr;
    });
    if (override?.isBlocked) continue;

    const hasSchedule = schedule.some((s) => s.dayOfWeek === dayOfWeek && s.isActive);
    if (hasSchedule || override?.customStartTime) {
      dates.push(dateStr);
    }
  }

  return dates;
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export type StaffAvailabilityRow = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  slotBufferMins: number;
  isActive: boolean;
};

export type StaffOverrideRow = {
  id: string;
  date: Date | string;
  isBlocked: boolean;
  customStartTime: string | null;
  customEndTime: string | null;
  reason: string | null;
};

export type StaffWithAvailability = {
  id: string;
  name: string;
  photoUrl: string | null;
  availability: StaffAvailabilityRow[];
  overrides: StaffOverrideRow[];
};

// Check if a specific date has any available staff for a service duration
export function getAvailableDatesFromStaff(
  staff: StaffWithAvailability[],
  existingSlots: { date: Date | string; startTime: string; productId: string }[],
  advanceBookingDays: number,
  serviceDuration: number,
): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= advanceBookingDays; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const dayOfWeek = date.getDay();

    // Check if any staff member is available on this date
    const anyAvailable = staff.some((member) => {
      // Check override for this staff member on this date
      const override = member.overrides.find((o) => {
        const od = new Date(o.date);
        const oStr = `${od.getUTCFullYear()}-${String(od.getUTCMonth() + 1).padStart(2, "0")}-${String(od.getUTCDate()).padStart(2, "0")}`;
        return oStr === dateStr;
      });

      // If blocked, not available
      if (override?.isBlocked) return false;

      // Get schedule for this day
      const daySchedule = member.availability.find((a) => a.dayOfWeek === dayOfWeek && a.isActive);

      // If no schedule and no custom hours override, not available
      if (!daySchedule && !override?.customStartTime) return false;

      const startTime = override?.customStartTime ?? daySchedule!.startTime;
      const endTime = override?.customEndTime ?? daySchedule!.endTime;
      const duration = serviceDuration;

      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;

      // Check if there is at least one slot that fits
      if (endMins - startMins < duration) return false;

      // Check if all possible slots are already booked
      const buffer = daySchedule?.slotBufferMins ?? 0;
      let current = startMins;
      while (current + duration <= endMins) {
        const slotStart = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`;
        const alreadyBooked = existingSlots.some((s) => {
          const sd = new Date(s.date);
          const sStr = `${sd.getUTCFullYear()}-${String(sd.getUTCMonth() + 1).padStart(2, "0")}-${String(sd.getUTCDate()).padStart(2, "0")}`;
          return sStr === dateStr && s.startTime === slotStart;
        });
        if (!alreadyBooked) return true;
        current += duration + buffer;
      }
      return false;
    });

    if (anyAvailable) dates.push(dateStr);
  }

  return dates;
}

// Generate slots for a date from staff availability
export function generateSlotsFromStaff(
  date: Date,
  staff: StaffWithAvailability[],
  existingSlots: { date: Date | string; startTime: string; endTime: string }[],
  serviceDuration: number,
): { startTime: string; endTime: string; available: boolean; availableStaff: string[] }[] {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const dayOfWeek = date.getDay();

  // Collect all possible slot times across all staff
  const slotMap = new Map<string, string[]>(); // startTime -> available staff ids

  for (const member of staff) {
    const override = member.overrides.find((o) => {
      const od = new Date(o.date);
      const oStr = `${od.getUTCFullYear()}-${String(od.getUTCMonth() + 1).padStart(2, "0")}-${String(od.getUTCDate()).padStart(2, "0")}`;
      return oStr === dateStr;
    });

    if (override?.isBlocked) continue;

    const daySchedule = member.availability.find((a) => a.dayOfWeek === dayOfWeek && a.isActive);

    if (!daySchedule && !override?.customStartTime) continue;

    const startTime = override?.customStartTime ?? daySchedule!.startTime;
    const endTime = override?.customEndTime ?? daySchedule!.endTime;
    const buffer = daySchedule?.slotBufferMins ?? 0;

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    let current = sh * 60 + sm;
    const endMins = eh * 60 + em;

    while (current + serviceDuration <= endMins) {
      const slotStart = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`;

      // Check if this staff member is already booked at this time
      const alreadyBooked = existingSlots.some((s) => {
        const sd = new Date(s.date);
        const sStr = `${sd.getUTCFullYear()}-${String(sd.getUTCMonth() + 1).padStart(2, "0")}-${String(sd.getUTCDate()).padStart(2, "0")}`;
        return sStr === dateStr && s.startTime === slotStart;
      });

      if (!alreadyBooked) {
        if (!slotMap.has(slotStart)) slotMap.set(slotStart, []);
        slotMap.get(slotStart)!.push(member.id);
      }

      current += serviceDuration + buffer;
    }
  }

  // Convert to sorted slot list
  const slots: { startTime: string; endTime: string; available: boolean; availableStaff: string[] }[] = [];
  const sortedTimes = Array.from(slotMap.keys()).sort();

  for (const startTime of sortedTimes) {
    const [h, m] = startTime.split(":").map(Number);
    const endMins = h * 60 + m + serviceDuration;
    const endTime = `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;
    const availableStaff = slotMap.get(startTime) ?? [];
    slots.push({ startTime, endTime, available: availableStaff.length > 0, availableStaff });
  }

  return slots;
}

export { utcMidnightFromYmd };
