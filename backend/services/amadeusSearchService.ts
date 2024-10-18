/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import supabase from "../utils/supabaseClient";
import pineconeClient from "../utils/pineconeClient";
import OpenAI from "openai";
import {
  AmadeusFlightDetails,
  AmadeusHotelDetails,
  AmadeusTourDetails,
  AmadeusRestaurantDetails,
  PineconeVector,
  PineconeQueryResponse,
} from "../models/amadeusTypes";
import Amadeus from "amadeus";

// Replace with your Amadeus API credentials
const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;

// Replace with your OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const amadeus = new Amadeus({
  clientId: AMADEUS_CLIENT_ID,
  clientSecret: AMADEUS_CLIENT_SECRET,
});

class AmadeusService {
  private accessToken: string | null = null;
  private baseUrl = "https://test.api.amadeus.com/v2";

  constructor() {
    this.authenticateAmadeus();
  }

  // Authentication
  private async authenticateAmadeus(): Promise<void> {
    try {
      const url = "https://test.api.amadeus.com/v1/security/oauth2/token";
      const params = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: AMADEUS_CLIENT_ID || "",
        client_secret: AMADEUS_CLIENT_SECRET || "",
      });

      const response = await axios.post(url, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      this.accessToken = response.data.access_token;
      console.log("Authenticated with Amadeus API.");
    } catch (error) {
      console.error("Error authenticating with Amadeus:", error);
    }
  }

  // Helper method for API calls
  private async apiCall(endpoint: string, params: any = {}): Promise<any> {
    if (!this.accessToken) await this.authenticateAmadeus();
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        params,
      });
      return response.data;
    } catch (error) {
      console.error(`Error calling Amadeus API (${endpoint}):`, error);
      throw error;
    }
  }

  // Flight Offers Search
  async searchFlightOffers(params: {
    originLocationCode: string;
    destinationLocationCode: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    max?: number;
  }): Promise<AmadeusFlightDetails[]> {
    try {
      const response = await amadeus.shopping.flightOffersSearch.get(params);
      return response.data.map(this.mapFlightOffer);
    } catch (error) {
      console.error("Error searching flight offers:", error);
      throw error;
    }
  }

  // Flight Offers Price
  async priceFlightOffers(flightOffers: any[]): Promise<any> {
    try {
      const response = await amadeus.shopping.flightOffers.pricing.post(
        JSON.stringify({
          data: {
            type: "flight-offers-pricing",
            flightOffers: flightOffers,
          },
        })
      );
      return response.data;
    } catch (error) {
      console.error("Error pricing flight offers:", error);
      throw error;
    }
  }

  // Flight Create Orders
  async createFlightOrder(flightOffer: any, travelers: any[]): Promise<any> {
    try {
      const response = await amadeus.booking.flightOrders.post(
        JSON.stringify({
          data: {
            type: "flight-order",
            flightOffers: [flightOffer],
            travelers: travelers,
          },
        })
      );
      return response.data;
    } catch (error) {
      console.error("Error creating flight order:", error);
      throw error;
    }
  }

  // Flight Order Management
  async getFlightOrder(orderId: string): Promise<any> {
    try {
      const response = await amadeus.booking.flightOrder(orderId).get();
      return response.data;
    } catch (error) {
      console.error("Error retrieving flight order:", error);
      throw error;
    }
  }

  // SeatMap Display
  async getSeatMap(flightOffer: any): Promise<any> {
    try {
      const response = await amadeus.shopping.seatmaps.post(
        JSON.stringify({
          data: [flightOffer],
        })
      );
      return response.data;
    } catch (error) {
      console.error("Error retrieving seat map:", error);
      throw error;
    }
  }

  // Branded Fares Upsell
  async getBrandedFares(flightOffer: any): Promise<any> {
    try {
      const response = await amadeus.shopping.flightOffers.upselling.post(
        JSON.stringify({
          data: {
            type: "flight-offers-upselling",
            flightOffers: [flightOffer],
          },
        })
      );
      return response.data;
    } catch (error) {
      console.error("Error retrieving branded fares:", error);
      throw error;
    }
  }

  // Flight Price Analysis
  async analyzePrices(origin: string, destination: string): Promise<any> {
    try {
      const response = await amadeus.analytics.itineraryPriceMetrics.get({
        originIataCode: origin,
        destinationIataCode: destination,
        departureDate: "2023-08-01,2023-08-31",
      });
      return response.data;
    } catch (error) {
      console.error("Error analyzing flight prices:", error);
      throw error;
    }
  }

  // Flight Choice Prediction
  async predictFlightChoice(flightOffers: any[]): Promise<any> {
    try {
      const response = await amadeus.shopping.flightOffers.prediction.post(
        JSON.stringify({
          data: {
            type: "flight-offers-prediction",
            flightOffers: flightOffers,
          },
        })
      );
      return response.data;
    } catch (error) {
      console.error("Error predicting flight choice:", error);
      throw error;
    }
  }

  // Flight Inspiration Search
  async searchFlightInspiration(origin: string): Promise<any> {
    try {
      const response = await amadeus.shopping.flightDestinations.get({
        origin: origin,
      });
      return response.data;
    } catch (error) {
      console.error("Error searching flight inspiration:", error);
      throw error;
    }
  }

  // Flight Cheapest Date Search
  async searchCheapestDates(origin: string, destination: string): Promise<any> {
    try {
      const response = await amadeus.shopping.flightDates.get({
        origin: origin,
        destination: destination,
      });
      return response.data;
    } catch (error) {
      console.error("Error searching cheapest dates:", error);
      throw error;
    }
  }

  // Flight Availabilities Search
  async searchFlightAvailabilities(params: any): Promise<any> {
    try {
      const response =
        await amadeus.shopping.availability.flightAvailabilities.post(
          JSON.stringify(params)
        );
      return response.data;
    } catch (error) {
      console.error("Error searching flight availabilities:", error);
      throw error;
    }
  }

  // Travel Recommendations
  async getTravelRecommendations(cityCodes: string[]): Promise<any> {
    try {
      const response = await amadeus.referenceData.recommendedLocations.get({
        cityCodes: cityCodes.join(","),
      });
      return response.data;
    } catch (error) {
      console.error("Error getting travel recommendations:", error);
      throw error;
    }
  }

  // Points of Interest
  async getPointsOfInterest(latitude: number, longitude: number): Promise<any> {
    try {
      const response =
        await amadeus.referenceData.locations.pointsOfInterest.get({
          latitude: latitude,
          longitude: longitude,
        });
      return response.data;
    } catch (error) {
      console.error("Error getting points of interest:", error);
      throw error;
    }
  }

  // Tours and Activities
  async searchTours(params: {
    latitude: number;
    longitude: number;
    radius?: number;
  }): Promise<AmadeusTourDetails[]> {
    try {
      const response = await amadeus.shopping.activities.get(params);
      return response.data.map(this.mapTourOffer);
    } catch (error) {
      console.error("Error searching tours:", error);
      throw error;
    }
  }

  // City Search
  async searchCities(keyword: string): Promise<any> {
    try {
      const response = await amadeus.referenceData.locations.get({
        keyword: keyword,
        subType: Amadeus.location.city,
      });
      return response.data;
    } catch (error) {
      console.error("Error searching cities:", error);
      throw error;
    }
  }

  // On-Demand Flight Status
  async getFlightStatus(
    flightDate: string,
    flightNumber: string
  ): Promise<any> {
    try {
      const response = await amadeus.schedule.flights.get({
        flightDate: flightDate,
        flightNumber: flightNumber,
      });
      return response.data;
    } catch (error) {
      console.error("Error getting flight status:", error);
      throw error;
    }
  }

  // Flight Delay Prediction
  async predictFlightDelay(params: any): Promise<any> {
    try {
      const response = await amadeus.travel.predictions.flightDelay.get(params);
      return response.data;
    } catch (error) {
      console.error("Error predicting flight delay:", error);
      throw error;
    }
  }

  // Airport On-Time Performance
  async getAirportPerformance(airportCode: string, date: string): Promise<any> {
    try {
      const response = await amadeus.airport.predictions.onTime.get({
        airportCode: airportCode,
        date: date,
      });
      return response.data;
    } catch (error) {
      console.error("Error getting airport performance:", error);
      throw error;
    }
  }

  // Airport & City Search
  async searchAirportsAndCities(keyword: string): Promise<any> {
    try {
      const response = await amadeus.referenceData.locations.get({
        keyword: keyword,
        subType: Amadeus.location.any,
      });
      return response.data;
    } catch (error) {
      console.error("Error searching airports and cities:", error);
      throw error;
    }
  }

  // Airport Nearest Relevant
  async getNearestAirport(latitude: number, longitude: number): Promise<any> {
    try {
      const response = await amadeus.referenceData.locations.airports.get({
        latitude: latitude,
        longitude: longitude,
      });
      return response.data;
    } catch (error) {
      console.error("Error getting nearest airport:", error);
      throw error;
    }
  }

  // Airport Routes
  async getAirportRoutes(airportCode: string): Promise<any> {
    try {
      const response = await amadeus.airport.directDestinations.get({
        departureAirportCode: airportCode,
      });
      return response.data;
    } catch (error) {
      console.error("Error getting airport routes:", error);
      throw error;
    }
  }

  // Transfer Booking
  async bookTransfer(params: any): Promise<any> {
    try {
      const response = await amadeus.booking.transferOrders.post(
        JSON.stringify(params)
      );
      return response.data;
    } catch (error) {
      console.error("Error booking transfer:", error);
      throw error;
    }
  }

  // Transfer Management
  async getTransferOrder(orderId: string): Promise<any> {
    try {
      const response = await amadeus.booking.transferOrder(orderId).get();
      return response.data;
    } catch (error) {
      console.error("Error getting transfer order:", error);
      throw error;
    }
  }

  // Transfer Search
  async searchTransfers(params: any): Promise<any> {
    try {
      const response = await amadeus.shopping.transferOffers.post(
        JSON.stringify(params)
      );
      return response.data;
    } catch (error) {
      console.error("Error searching transfers:", error);
      throw error;
    }
  }

  // Flight Check-in Links
  async getFlightCheckInLinks(airlineCode: string): Promise<any> {
    try {
      const response = await amadeus.referenceData.urls.checkinLinks.get({
        airlineCode: airlineCode,
      });
      return response.data;
    } catch (error) {
      console.error("Error getting flight check-in links:", error);
      throw error;
    }
  }

  // Airline Code Lookup
  async lookupAirlineCode(airlineCodes: string[]): Promise<any> {
    try {
      const response = await amadeus.referenceData.airlines.get({
        airlineCodes: airlineCodes.join(","),
      });
      return response.data;
    } catch (error) {
      console.error("Error looking up airline code:", error);
      throw error;
    }
  }

  // Airline Routes
  async getAirlineRoutes(airlineCode: string): Promise<any> {
    try {
      const response = await amadeus.airline.destinations.get({
        airlineCode: airlineCode,
      });
      return response.data;
    } catch (error) {
      console.error("Error getting airline routes:", error);
      throw error;
    }
  }

  // Flight Most Traveled Destinations
  async getMostTraveledDestinations(originCityCode: string): Promise<any> {
    try {
      const response = await amadeus.travel.analytics.airTraffic.traveled.get({
        originCityCode: originCityCode,
        period: "2023-01",
      });
      return response.data;
    } catch (error) {
      console.error("Error getting most traveled destinations:", error);
      throw error;
    }
  }

  // Flight Most Booked Destinations
  async getMostBookedDestinations(originCityCode: string): Promise<any> {
    try {
      const response = await amadeus.travel.analytics.airTraffic.booked.get({
        originCityCode: originCityCode,
        period: "2023-01",
      });
      return response.data;
    } catch (error) {
      console.error("Error getting most booked destinations:", error);
      throw error;
    }
  }

  // Flight Busiest Traveling Period
  async getBusiestTravelPeriod(cityCode: string, period: string): Promise<any> {
    try {
      const response =
        await amadeus.travel.analytics.airTraffic.busiestPeriod.get({
          cityCode: cityCode,
          period: period,
          direction: Amadeus.direction.arriving,
        });
      return response.data;
    } catch (error) {
      console.error("Error getting busiest travel period:", error);
      throw error;
    }
  }

  // Location Score
  async getLocationScore(latitude: number, longitude: number): Promise<any> {
    try {
      const response = await amadeus.location.analytics.categoryRatedAreas.get({
        latitude: latitude,
        longitude: longitude,
      });
      return response.data;
    } catch (error) {
      console.error("Error getting location score:", error);
      throw error;
    }
  }

  // Hotel List
  async getHotelList(cityCode: string): Promise<any> {
    try {
      const response = await amadeus.referenceData.locations.hotels.byCity.get({
        cityCode: cityCode,
      });
      return response.data;
    } catch (error) {
      console.error("Error getting hotel list:", error);
      throw error;
    }
  }

  // Hotel Search
  async searchHotels(params: {
    cityCode: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    radius?: number;
    radiusUnit?: string;
    hotelName?: string;
  }): Promise<AmadeusHotelDetails[]> {
    try {
      const response = await amadeus.shopping.hotelOffers.get(params);
      return response.data.map(this.mapHotelOffer);
    } catch (error) {
      console.error("Error searching hotels:", error);
      throw error;
    }
  }

  // Hotel Booking
  async bookHotel(offerId: string, guests: any[]): Promise<any> {
    try {
      const response = await amadeus.booking.hotelBookings.post(
        JSON.stringify({
          data: {
            offerId: offerId,
            guests: guests,
          },
        })
      );
      return response.data;
    } catch (error) {
      console.error("Error booking hotel:", error);
      throw error;
    }
  }

  // Hotel Ratings
  async getHotelRatings(hotelIds: string[]): Promise<any> {
    try {
      const response = await amadeus.eReputation.hotelSentiments.get({
        hotelIds: hotelIds.join(","),
      });
      return response.data;
    } catch (error) {
      console.error("Error getting hotel ratings:", error);
      throw error;
    }
  }

  // Hotel Name Autocomplete
  async autocompleteHotelName(keyword: string): Promise<any> {
    try {
      const response =
        await amadeus.referenceData.locations.hotels.byKeyword.get({
          keyword: keyword,
        });
      return response.data;
    } catch (error) {
      console.error("Error autocompleting hotel name:", error);
      throw error;
    }
  }

  // Trip Parser
  async parseTrip(payload: any): Promise<any> {
    try {
      const response = await amadeus.travel.tripParser.post(
        JSON.stringify(payload)
      );
      return response.data;
    } catch (error) {
      console.error("Error parsing trip:", error);
      throw error;
    }
  }

  // Trip Purpose Prediction
  async predictTripPurpose(params: any): Promise<any> {
    try {
      const response = await amadeus.travel.predictions.tripPurpose.get(params);
      return response.data;
    } catch (error) {
      console.error("Error predicting trip purpose:", error);
      throw error;
    }
  }

  // Helper methods to map API responses to our types
  private mapFlightOffer(offer: any): AmadeusFlightDetails {
    return {
      offerId: offer.id,
      price: offer.price.total,
      currency: offer.price.currency,
      origin: offer.itineraries[0].segments[0].departure.iataCode,
      destination: offer.itineraries[0].segments[0].arrival.iataCode,
      departureDate: offer.itineraries[0].segments[0].departure.at,
      returnDate: offer.itineraries[1]?.segments[0].departure.at || null,
    };
  }

  private mapHotelOffer(offer: any): AmadeusHotelDetails {
    return {
      hotelId: offer.hotel.hotelId,
      name: offer.hotel.name,
      rating: offer.hotel.rating,
      price: offer.offers[0].price.total,
      currency: offer.offers[0].price.currency,
    };
  }

  private mapTourOffer(offer: any): AmadeusTourDetails {
    return {
      tourId: offer.id,
      name: offer.name,
      price: offer.price.amount,
      currency: offer.price.currencyCode,
    };
  }

  // Methods for Pinecone integration
  async processAndUpsertTravel(
    item:
      | AmadeusFlightDetails
      | AmadeusHotelDetails
      | AmadeusTourDetails
      | AmadeusRestaurantDetails
  ) {
    const summary = this.generateSummary(item);
    const embedding = await this.generateEmbedding(summary);
    if (!embedding) {
      console.error("Failed to generate embedding for travel item.");
      return;
    }

    const pineconeVector: PineconeVector = {
      id: ("id" in item
        ? item.id
        : "offerId" in item
        ? item.offerId
        : "hotelId" in item
        ? item.hotelId
        : "tourId" in item
        ? item.tourId
        : "restaurantId" in item
        ? item.restaurantId
        : "") as string,
      values: embedding,
      metadata: { ...item, summary },
    };

    await this.upsertToPinecone([pineconeVector]);
  }

  private generateSummary(
    item:
      | AmadeusFlightDetails
      | AmadeusHotelDetails
      | AmadeusTourDetails
      | AmadeusRestaurantDetails
  ): string {
    if ("origin" in item) {
      return `Flight from ${item.origin} to ${item.destination} on ${item.departureDate} costing ${item.price} ${item.currency}.`;
    } else if ("hotelId" in item) {
      return `Hotel ${item.name} with ${item.rating} stars, costing ${item.price} ${item.currency}.`;
    } else if ("tourId" in item) {
      return `Tour "${item.name}" costing ${item.price} ${item.currency}.`;
    } else {
      return `Restaurant "${item.name}" costing ${item.price} ${item.currency}.`;
    }
  }

  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await openai.embeddings.create({
        input: text,
        model: "text-embedding-ada-002",
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      return null;
    }
  }

  private async upsertToPinecone(vectors: PineconeVector[]): Promise<void> {
    try {
      const index = pineconeClient.Index("amadeus-travel-data");
      await index.upsert(vectors);
      console.log("Successfully upserted batch to Pinecone.");
    } catch (error) {
      console.error("Error upserting to Pinecone:", error);
    }
  }

  async searchPinecone(
    query: string,
    topK: number = 10
  ): Promise<PineconeQueryResponse["matches"]> {
    const embedding = await this.generateEmbedding(query);
    if (!embedding) {
      console.error("Failed to generate embedding for query.");
      return [];
    }

    try {
      const index = pineconeClient.Index("amadeus-travel-data");
      const searchResponse = await index.query({
        vector: embedding,
        topK,
        includeValues: false,
        includeMetadata: true,
      });

      return searchResponse.matches.map((match: any) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata,
      }));
    } catch (error) {
      console.error("Error searching Pinecone:", error);
      return [];
    }
  }

  async handleLLMQuery(prompt: string) {
    const matches = await this.searchPinecone(prompt);
    const contextTexts = matches
      .map((match) => match.metadata.summary)
      .join("\n");

    try {
      const chatResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are an informative assistant specializing in travel recommendations. Use the provided context to answer the user's query.",
          },
          { role: "user", content: `${prompt}\n\nContext:\n${contextTexts}` },
        ],
      });

      return chatResponse.choices[0].message.content?.trim();
    } catch (error) {
      console.error("Error handling LLM query:", error);
      return "Sorry, I couldn't process your request at the moment.";
    }
  }
}

const amadeusService = new AmadeusService();
export default amadeusService;
