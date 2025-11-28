"""
Tests for Google Maps Service
"""
import pytest
from unittest.mock import MagicMock, patch
from server.integrations.google_maps import GoogleMapsService, PlaceResult, DirectionsResult


@pytest.fixture
def maps_service():
    """Create Google Maps service instance"""
    with patch.dict('os.environ', {'GOOGLE_API_KEY': 'test-key'}):
        with patch('googlemaps.Client'):
            return GoogleMapsService()


@pytest.mark.asyncio
async def test_search_places(maps_service):
    """Test place search"""
    # Mock response
    mock_results = {
        "results": [
            {
                "place_id": "test123",
                "name": "Test Coffee Shop",
                "formatted_address": "123 Main St",
                "geometry": {"location": {"lat": 40.7128, "lng": -74.0060}},
                "rating": 4.5,
                "types": ["cafe"],
            }
        ]
    }

    maps_service.client.places = MagicMock(return_value=mock_results)

    # Search
    places = await maps_service.search_places(
        query="coffee shops",
        location={"lat": 40.7128, "lng": -74.0060},
        radius=1000
    )

    assert len(places) == 1
    assert places[0].name == "Test Coffee Shop"
    assert places[0].rating == 4.5


@pytest.mark.asyncio
async def test_get_directions(maps_service):
    """Test directions"""
    mock_result = [{
        "legs": [{
            "distance": {"text": "2.5 km"},
            "duration": {"text": "10 mins"},
            "steps": [
                {
                    "html_instructions": "Turn left",
                    "distance": {"text": "500 m"},
                    "duration": {"text": "2 mins"}
                }
            ]
        }],
        "overview_polyline": {"points": "test_polyline"}
    }]

    maps_service.client.directions = MagicMock(return_value=mock_result)

    directions = await maps_service.get_directions(
        origin="Times Square",
        destination="Central Park",
        mode="walking"
    )

    assert directions.distance == "2.5 km"
    assert directions.duration == "10 mins"
    assert len(directions.steps) == 1


@pytest.mark.asyncio
async def test_geocode(maps_service):
    """Test geocoding"""
    mock_results = [{
        "geometry": {
            "location": {"lat": 40.7128, "lng": -74.0060}
        }
    }]

    maps_service.client.geocode = MagicMock(return_value=mock_results)

    location = await maps_service.geocode("Times Square, New York")

    assert location is not None
    assert location["lat"] == 40.7128
    assert location["lng"] == -74.0060


@pytest.mark.asyncio
async def test_reverse_geocode(maps_service):
    """Test reverse geocoding"""
    mock_results = [{
        "formatted_address": "Times Square, New York, NY"
    }]

    maps_service.client.reverse_geocode = MagicMock(return_value=mock_results)

    address = await maps_service.reverse_geocode(40.7128, -74.0060)

    assert address == "Times Square, New York, NY"


def test_as_agent_tools(maps_service):
    """Test tool definitions export"""
    tools = maps_service.as_agent_tools()

    assert len(tools) == 4
    tool_names = [t["name"] for t in tools]
    assert "search_places" in tool_names
    assert "get_directions" in tool_names
    assert "geocode" in tool_names
    assert "reverse_geocode" in tool_names
