/* eslint-disable @typescript-eslint/no-explicit-any */
export interface AmadeusApiResponse {
  data: any[];
  meta: any;
}

export interface AmadeusFlightDetails {
  offerId: string;
  price: string;
  currency: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string | null;
}

export interface AmadeusHotelDetails {
  hotelId: string;
  name: string;
  rating: string;
  price: string;
  currency: string;
}

export interface AmadeusTourDetails {
  tourId: string;
  name: string;
  price: string;
  currency: string;
}

export interface AmadeusRestaurantDetails {
  name: string;
  price: string;
  currency: string;
}

export interface PineconeVector {
  id: string;
  values: number[];
  metadata: any;
}

export interface PineconeQueryResponse {
  matches: Array<{
    id: string;
    score: number;
    metadata: any;
  }>;
}
