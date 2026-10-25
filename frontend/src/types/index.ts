export interface User { id: number; fullName: string; email: string; phone?: string | null; role: string; isActive?: boolean; createdAt?: string }
export interface Airport { id: number; code: string; name: string; city: string; country: string; timezone: string; latitude: string | number; longitude: string | number }
export interface Airline { id: number; code: string; name: string; color: string; isActive: boolean; country?:string;logoUrl?:string|null;website?:string|null;createdAt?:string;updatedAt?:string }
export interface Fare { id: number; flightId: number; cabinClass: string; basePrice: number; tax: number; baggageKg: number; cabinBaggageKg: number; refundable: boolean; totalSeats: number; availableSeats: number }
export interface Flight { id: number; flightNumber: string; aircraft: string; departureTime: string; arrivalTime: string; status: string; airline: Airline; origin: Airport; destination: Airport; fares: Fare[]; selectedFare?: Fare; price?: number; duration?: number; score?: number }
export interface Passenger { id?: number; fullName: string; dateOfBirth: string; documentNumber: string; nationality: string; tickets?: Ticket[] }
export interface Ticket { id: string; number: string; segmentId: number; status: string }
export interface Segment { id: number; sequence: number; unitPrice: number; cabinClass: string; baggageKg: number; cabinBaggageKg: number; refundable: boolean; fare: Fare & { flight: Flight }; tickets: Ticket[] }
export interface Booking { id: string; reference: string; status: string; contactEmail: string; contactPhone: string; totalAmount: number; expiresAt: string; createdAt: string; segments: Segment[]; passengers: Passenger[]; payment?: { provider: string; status: string; transactionId: string; amount: number } | null; user?: User }
export interface Preference { cabinClass: string; maxBudget: number; preferredAirlines: string[]; prioritize: string }
export interface Favorite { id: number; origin: Airport; destination: Airport }
export interface Review { id: number; rating: number; comment: string; isVisible: boolean; createdAt: string; user: User; airline: Airline }
export interface Search { origin: string; destination: string; date: string; returnDate?: string; passengers: string; cabinClass: string; sort?: string; airline?: string; maxPrice?: string }
