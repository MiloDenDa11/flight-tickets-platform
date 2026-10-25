import { Request, Response } from 'express';
import { z } from 'zod';
import { bookingService, releaseExpired } from '../services/booking.service';
import { bookingRepository } from '../repositories/booking.repository';
import { bookingSchema } from '../validators';
const bookingId = (req: Request) => z.string().uuid().parse(req.params.id);
export const bookingController = {
  async list(req: Request, res: Response) { await releaseExpired(); res.json({ success: true, data: await bookingRepository.list(req.auth!.id) }); },
  async create(req: Request, res: Response) { res.status(201).json({ success: true, data: await bookingService.create(req.auth!.id, bookingSchema.parse(req.body)) }); },
  async detail(req: Request, res: Response) { res.json({ success: true, data: await bookingService.get(bookingId(req), req.auth!.id) }); },
  async pay(req: Request, res: Response) { res.json({ success: true, data: await bookingService.pay(bookingId(req), req.auth!.id) }); },
  async cancel(req: Request, res: Response) { res.json({ success: true, data: await bookingService.cancel(bookingId(req), req.auth!.id) }); },
  async tickets(req: Request, res: Response) {
    const b = await bookingService.get(bookingId(req), req.auth!.id);
    // A printable text artifact is intentionally free of HTML interpolation.
    const lines = ['FLIGHT TICKETS PLATFORM — E-TICKET (DEMO)', `Booking: ${b.reference}`, `Status: ${b.status}`, `Total: ${b.totalAmount} VND`, '',
      ...b.segments.flatMap(s => [`${s.fare.flight.flightNumber} | ${s.fare.flight.origin.code} -> ${s.fare.flight.destination.code}`, `Departure: ${s.fare.flight.departureTime.toISOString()} (UTC)`, `Cabin: ${s.cabinClass} | Baggage: ${s.baggageKg}kg`, ...b.passengers.map(p => `${p.fullName} | ${p.tickets.find(t => t.segmentId === s.id)?.number ?? 'NOT ISSUED'}`), '']),
      'Demonstration ticket. Not valid for airport check-in.'];
    res.type('text/plain; charset=utf-8').attachment(`ticket-${b.reference}.txt`).send(lines.join('\r\n'));
  },
};
