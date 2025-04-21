import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app
from app.schemas.predict import PredictionRequest

client = TestClient(app)

# Mock response data
MOCK_GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-96.81040, 32.97140],
                    [-96.81000, 32.97140],
                    [-96.81000, 32.97180],
                    [-96.81040, 32.97180],
                    [-96.81040, 32.97140]
                ]]
            },
            "properties": {}
        }
    ]
}

MOCK_PREDICTION_RESPONSE = {
    "errors": None,
    "version": "1.0",
    "predictions": None,
    "geojson": MOCK_GEOJSON
}

# Test data
VALID_REQUEST_DATA = {
    "bounding_box": [-96.81040, 32.97140, -96.81000, 32.97180],
    "text_prompt": "trees",
    "zoom_level": 19,
    "box_threshold": 0.24,
    "text_threshold": 0.24
}

INVALID_BOUNDING_BOX_DATA = {
    "bounding_box": [-96.81040, 32.97140],  # Missing coordinates
    "text_prompt": "trees",
    "zoom_level": 19,
    "box_threshold": 0.24,
    "text_threshold": 0.24
}

INVALID_ZOOM_LEVEL_DATA = {
    "bounding_box": [-96.81040, 32.97140, -96.81000, 32.97180],
    "text_prompt": "trees",
    "zoom_level": 23,  # Invalid zoom level
    "box_threshold": 0.24,
    "text_threshold": 0.24
}

@pytest.mark.asyncio
@patch('app.segment_geospatial.predict.predictor.make_prediction')
async def test_predict_valid_request(mock_make_prediction):
    """Test successful prediction with valid request data."""
    # Setup mock
    mock_make_prediction.return_value = MOCK_PREDICTION_RESPONSE
    
    # Make request
    response = client.post("/api/v1/predict", json=VALID_REQUEST_DATA)
    
    # Assert response
    assert response.status_code == 200
    assert response.json() == MOCK_PREDICTION_RESPONSE
    
    # Verify mock was called with correct arguments
    mock_make_prediction.assert_called_once_with(
        bounding_box=VALID_REQUEST_DATA["bounding_box"],
        text_prompt=VALID_REQUEST_DATA["text_prompt"],
        zoom_level=VALID_REQUEST_DATA["zoom_level"],
        box_threshold=VALID_REQUEST_DATA["box_threshold"],
        text_threshold=VALID_REQUEST_DATA["text_threshold"]
    )

@pytest.mark.asyncio
async def test_predict_invalid_bounding_box():
    """Test prediction with invalid bounding box."""
    response = client.post("/api/v1/predict", json=INVALID_BOUNDING_BOX_DATA)
    assert response.status_code == 422  # Validation error

@pytest.mark.asyncio
async def test_predict_invalid_zoom_level():
    """Test prediction with invalid zoom level."""
    response = client.post("/api/v1/predict", json=INVALID_ZOOM_LEVEL_DATA)
    assert response.status_code == 422  # Validation error

@pytest.mark.asyncio
@patch('app.segment_geospatial.predict.predictor.make_prediction')
async def test_predict_error_response(mock_make_prediction):
    """Test prediction with error response from predictor."""
    # Setup mock to return error
    error_response = {"error": "Failed to process prediction"}
    mock_make_prediction.return_value = {"errors": error_response}
    
    # Make request
    response = client.post("/api/v1/predict", json=VALID_REQUEST_DATA)
    
    # Assert response
    assert response.status_code == 400
    assert response.json() == {"error": str(error_response)}

@pytest.mark.asyncio
@patch('app.segment_geospatial.predict.predictor.make_prediction')
async def test_predict_exception_handling(mock_make_prediction):
    """Test prediction with exception in predictor."""
    # Setup mock to raise exception
    mock_make_prediction.side_effect = Exception("Internal server error")
    
    # Make request
    response = client.post("/api/v1/predict", json=VALID_REQUEST_DATA)
    
    # Assert response
    assert response.status_code == 500
    assert response.json() == {"error": "Internal server error"} 