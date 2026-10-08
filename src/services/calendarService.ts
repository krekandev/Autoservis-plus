export const OWNER_CALENDAR_EMAIL = 'krekan.dev@gmail.com';

export interface BookingDataForCalendar {
  id?: string;
  serviceId: string;
  serviceName: string;
  servicePrice: string;
  duration?: string;
  date: string; // YYYY-MM-DD
  fullDateLabel: string;
  time: string; // HH:MM
  fullName: string;
  phone: string;
  licensePlate: string;
  carBrand: string;
  note?: string;
  createdAt?: string;
  calendarSynced?: boolean;
  calendarEventId?: string;
  calendarEventLink?: string;
}

export interface GoogleCalendarEventResult {
  id: string;
  htmlLink: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status: string;
}

/**
 * Extracts minutes from duration string (e.g. "30 min" -> 30, "60 min" -> 60)
 */
export function parseDurationMinutes(durationStr?: string): number {
  if (!durationStr) return 45;
  const match = durationStr.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 45;
}

/**
 * Constructs start and end RFC3339 strings for Google Calendar API
 */
export function buildStartAndEndTimes(dateStr: string, timeStr: string, durationMinutes: number) {
  // dateStr is YYYY-MM-DD, timeStr is HH:MM
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const [hourStr, minStr] = timeStr.split(':');

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);

  const startDate = new Date(year, month, day, hour, minute, 0);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const toRfc3339 = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const dateNum = pad(d.getDate());
    const h = pad(d.getHours());
    const min = pad(d.getMinutes());
    const s = pad(d.getSeconds());

    // Slovakia timezone offset calculation (+02:00 in CEST, +01:00 in CET)
    const offsetMin = -d.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const offHours = pad(Math.floor(Math.abs(offsetMin) / 60));
    const offMins = pad(Math.abs(offsetMin) % 60);

    return `${y}-${m}-${dateNum}T${h}:${min}:${s}${sign}${offHours}:${offMins}`;
  };

  return {
    startDateTime: toRfc3339(startDate),
    endDateTime: toRfc3339(endDate),
    startDate,
    endDate,
  };
}

/**
 * Creates formatted summary and description for the calendar event
 */
export function formatCalendarEventContent(booking: BookingDataForCalendar) {
  const summary = `Auto Life Plus: ${booking.serviceName} - ${booking.carBrand} (${booking.licensePlate})`;

  const description = [
    '📅 REZERVÁCIA V AUTOSERVISE AUTO LIFE PLUS',
    '==========================================',
    `Úkon: ${booking.serviceName}`,
    `Cena s DPH: ${booking.servicePrice}`,
    `Dohodnutý čas: ${booking.fullDateLabel} o ${booking.time}`,
    booking.duration ? `Odhadované trvanie: ${booking.duration}` : '',
    '',
    '👤 ÚDAJE ZÁKAZNÍKA:',
    `• Meno: ${booking.fullName}`,
    `• Telefón: ${booking.phone}`,
    booking.note ? `• Poznámka zákazníka: ${booking.note}` : '',
    '',
    '🚗 ÚDAJE VOZIDLA:',
    `• Vozidlo: ${booking.carBrand}`,
    `• ŠPZ / EČV: ${booking.licensePlate}`,
    '',
    '📍 ADRESA SERVISU:',
    'Autoservis & Pneuservis Auto Life Plus',
    'Myslenická 3, 902 03 Pezinok - Grinava',
    'Telefón: 0903 301 789',
    'Navigácia: https://maps.google.com/?q=Myslenick%C3%A1+3%2C+Pezinok',
    '',
    `📌 Kalendár majiteľa: ${OWNER_CALENDAR_EMAIL}`,
  ].filter(Boolean).join('\n');

  const location = 'Autoservis Auto Life Plus, Myslenická 3, 902 03 Pezinok - Grinava';

  return { summary, description, location };
}

/**
 * Inserts the reservation event into the owner's Google Calendar
 */
export async function createGoogleCalendarEvent(
  booking: BookingDataForCalendar,
  accessToken: string
): Promise<GoogleCalendarEventResult> {
  const duration = parseDurationMinutes(booking.duration);
  const { startDateTime, endDateTime } = buildStartAndEndTimes(booking.date, booking.time, duration);
  const { summary, description, location } = formatCalendarEventContent(booking);

  const payload = {
    summary,
    description,
    location,
    start: {
      dateTime: startDateTime,
      timeZone: 'Europe/Bratislava',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'Europe/Bratislava',
    },
    colorId: '11', // Red color in Google Calendar
    attendees: [
      {
        email: OWNER_CALENDAR_EMAIL,
        displayName: 'Auto Life Plus - Majiteľ',
        responseStatus: 'accepted',
      },
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 120 }, // 2 hours before
        { method: 'popup', minutes: 1440 }, // 1 day before
      ],
    },
  };

  // Insert to primary calendar of authenticated owner
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Chyba pri vytváraní udalosti (${response.status})`;
    throw new Error(message);
  }

  const result = (await response.json()) as GoogleCalendarEventResult;
  return result;
}

/**
 * Helper to build an offline / direct Google Calendar web template URL targeted at the owner
 */
export function buildGoogleCalendarWebUrl(booking: BookingDataForCalendar): string {
  const duration = parseDurationMinutes(booking.duration);
  const { startDate, endDate } = buildStartAndEndTimes(booking.date, booking.time, duration);
  const { summary, description, location } = formatCalendarEventContent(booking);

  const formatUtcCompact = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const datesParam = `${formatUtcCompact(startDate)}/${formatUtcCompact(endDate)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: summary,
    dates: datesParam,
    details: description,
    location,
    add: OWNER_CALENDAR_EMAIL,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
