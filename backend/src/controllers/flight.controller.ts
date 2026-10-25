import { Request, Response } from 'express';
import { flightService } from '../services/flight.service';
import { flightRepository } from '../repositories/flight.repository';
import { id, searchSchema } from '../validators';
import { z } from 'zod';
export const flightController = {
  async airports(req: Request, res: Response) { res.json({ success: true, data: await flightService.airports(z.string().max(100).parse(req.query.q ?? '')) }); },
  async search(req: Request, res: Response) { res.json({ success: true, data: await flightService.search(searchSchema.parse(req.query), req.auth?.id) }); },
  async detail(req: Request, res: Response) { res.json({ success: true, data: await flightRepository.byId(id.parse(req.params.id)) }); },
  async assistant(req: Request, res: Response) { const { query, search } = z.object({ query: z.string().trim().min(1).max(1000), search: searchSchema }).parse(req.body); res.json({ success: true, data: await flightService.assistant(search, query, req.auth!.id) }); },
};
