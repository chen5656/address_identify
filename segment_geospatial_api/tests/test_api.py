import os
import sys
import asyncio
import glob
import json
from datetime import datetime
import pytest, unittest

# Add the project root directory to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(project_root)

from app.api import predict

def test_predict():
    request = {
        "bounding_box":[-104.99396652573365,39.754255695479166,-104.9931796640963,39.75465374577297],
        "text_prompt":"car",
        "zoom_level":20,
        "box_threshold":0.24,
        "text_threshold":0.24
    } 
    response = predict(request)
    assert response.status_code == 200
    assert response.json() is not None
    assert response.json().get("geojson") is not None
    assert response.json().get("geojson").get("type") == "FeatureCollection"
    assert len(response.json().get("geojson").get("features")) > 0


def test_predict_large_bounding_box_error():
    request = {
        "bounding_box": [
            -96.8038170250879,
            32.776576647766674,
            -96.77342287481287,
            32.80009946186481
        ],
        "text_prompt": " ccar",
        "zoom_level": 22,
        "box_threshold": 0.24,
        "text_threshold": 0.24
    }
    response = predict(request)
    assert response.status_code == 400
    assert response.json() is not None
    assert response.json().get("error") is not None
    assert response.json().get("error") == "Failed to process GeoJSON output: [Errno 2] No such file or directory: 'output_image.png'"


if __name__ == "__main__":        
    unittest.main()
