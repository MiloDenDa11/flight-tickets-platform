export function maskCitizenId(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 3
    ? "*".repeat(Math.max(3, value.length - 3)) + digits.slice(-3)
    : "***";
}
export function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  return domain
    ? `${name.slice(0, Math.min(2, name.length))}***@${domain}`
    : "***";
}
export function maskPhone(value: string) {
  return value.length > 3
    ? "*".repeat(value.length - 3) + value.slice(-3)
    : "***";
}
// No raw identity number leaves the server for ADMIN, including admin-owned bookings.
export function adminBookingDto<
  T extends {
    contactEmail: string;
    contactPhone: string;
    passengers?: {
      documentNumber: string;
      dateOfBirth?: unknown;
      id?: string | number;
      fullName: string;
      gender?: string;
      nationality?: string;
      tickets?: unknown[];
    }[];
    user?: {
      id?: number;
      fullName: string;
      email?: string;
      phone?: string | null;
    } | null;
  },
>(booking: T, detail = false) {
  const { passengers, user, ...rest } = booking;
  return {
    ...rest,
    contactEmail: detail
      ? booking.contactEmail
      : maskEmail(booking.contactEmail),
    contactPhone: detail
      ? booking.contactPhone
      : maskPhone(booking.contactPhone),
    ...(user
      ? {
          user: {
            ...user,
            email: user.email
              ? detail
                ? user.email
                : maskEmail(user.email)
              : undefined,
            phone: user.phone
              ? detail
                ? user.phone
                : maskPhone(user.phone)
              : user.phone,
          },
        }
      : {}),
    passengers:
      passengers?.map(({ documentNumber, dateOfBirth: _dob, ...person }) => ({
        ...person,
        maskedCitizenId: maskCitizenId(documentNumber),
      })) ?? [],
  };
}
export function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^\s*[=+@\-\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
