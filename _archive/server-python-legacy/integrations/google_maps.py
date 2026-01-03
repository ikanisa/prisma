"""
Google Maps & Places API Integration for Agent Tools
"""
import os
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
import googlemaps
from datetime import datetime


@dataclass
class PlaceResult:
    """Result from a place search"""
    place_id: str
    name: str
    address: str
    location: Dict[str, float]
    rating: Optional[float]
    types: List[str]
    phone: Optional[str]
    website: Optional[str]
    hours: Optional[Dict[str, Any]]


@dataclass
class DirectionsResult:
    """Result from a directions query"""
    distance: str
    duration: str
    steps: List[Dict[str, Any]]
    polyline: str


class GoogleMapsService:
    """Google Maps/Places API service for agent tools"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_MAPS_API_KEY or GOOGLE_API_KEY must be set")
        self.client = googlemaps.Client(key=self.api_key)

    async def search_places(
        self,
        query: str,
        location: Optional[Dict[str, float]] = None,
        radius: int = 5000,
        place_type: Optional[str] = None
    ) -> List[PlaceResult]:
        """Search for places using Places API"""
        params = {"query": query}

        if location:
            params["location"] = (location["lat"], location["lng"])
            params["radius"] = radius

        if place_type:
            params["type"] = place_type

        results = self.client.places(**params)

        places = []
        for p in results.get("results", []):
            places.append(PlaceResult(
                place_id=p["place_id"],
                name=p["name"],
                address=p.get("formatted_address", ""),
                location=p["geometry"]["location"],
                rating=p.get("rating"),
                types=p.get("types", []),
                phone=p.get("formatted_phone_number"),
                website=p.get("website"),
                hours=p.get("opening_hours")
            ))

        return places

    async def get_place_details(self, place_id: str) -> PlaceResult:
        """Get detailed information about a place"""
        result = self.client.place(place_id=place_id)["result"]

        return PlaceResult(
            place_id=place_id,
            name=result["name"],
            address=result.get("formatted_address", ""),
            location=result["geometry"]["location"],
            rating=result.get("rating"),
            types=result.get("types", []),
            phone=result.get("formatted_phone_number"),
            website=result.get("website"),
            hours=result.get("opening_hours")
        )

    async def get_directions(
        self,
        origin: str,
        destination: str,
        mode: str = "driving",
        departure_time: Optional[datetime] = None
    ) -> DirectionsResult:
        """Get directions between two locations"""
        result = self.client.directions(
            origin=origin,
            destination=destination,
            mode=mode,
            departure_time=departure_time or datetime.now()
        )[0]

        leg = result["legs"][0]

        return DirectionsResult(
            distance=leg["distance"]["text"],
            duration=leg["duration"]["text"],
            steps=[
                {
                    "instruction": step["html_instructions"],
                    "distance": step["distance"]["text"],
                    "duration": step["duration"]["text"]
                }
                for step in leg["steps"]
            ],
            polyline=result["overview_polyline"]["points"]
        )

    async def geocode(self, address: str) -> Optional[Dict[str, float]]:
        """Convert address to coordinates"""
        results = self.client.geocode(address)
        if results:
            location = results[0]["geometry"]["location"]
            return {"lat": location["lat"], "lng": location["lng"]}
        return None

    async def reverse_geocode(self, lat: float, lng: float) -> Optional[str]:
        """Convert coordinates to address"""
        results = self.client.reverse_geocode((lat, lng))
        if results:
            return results[0]["formatted_address"]
        return None

    def as_agent_tools(self) -> List[Dict[str, Any]]:
        """Export as agent tool definitions"""
        return [
            {
                "name": "search_places",
                "description": "Search for places, businesses, or points of interest near a location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query (e.g., 'coffee shops', 'restaurants')"
                        },
                        "location": {
                            "type": "object",
                            "properties": {
                                "lat": {"type": "number", "description": "Latitude"},
                                "lng": {"type": "number", "description": "Longitude"}
                            },
                            "description": "Center point for search"
                        },
                        "radius": {
                            "type": "integer",
                            "default": 5000,
                            "description": "Search radius in meters"
                        },
                        "place_type": {
                            "type": "string",
                            "description": "Type of place (e.g., 'restaurant', 'cafe', 'hotel')"
                        }
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "get_directions",
                "description": "Get directions and route between two locations",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "origin": {
                            "type": "string",
                            "description": "Starting location (address or place name)"
                        },
                        "destination": {
                            "type": "string",
                            "description": "Destination location (address or place name)"
                        },
                        "mode": {
                            "type": "string",
                            "enum": ["driving", "walking", "bicycling", "transit"],
                            "default": "driving",
                            "description": "Transportation mode"
                        }
                    },
                    "required": ["origin", "destination"]
                }
            },
            {
                "name": "geocode",
                "description": "Convert an address to geographic coordinates",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "address": {
                            "type": "string",
                            "description": "Address to geocode"
                        }
                    },
                    "required": ["address"]
                }
            },
            {
                "name": "reverse_geocode",
                "description": "Convert coordinates to a human-readable address",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "lat": {
                            "type": "number",
                            "description": "Latitude"
                        },
                        "lng": {
                            "type": "number",
                            "description": "Longitude"
                        }
                    },
                    "required": ["lat", "lng"]
                }
            }
        ]
