from typing import Any, List, Optional, Union

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    error: str


class PredictionResults(BaseModel):
    errors: Optional[Any]
    version: str
    predictions: Optional[str]
    geojson: Optional[dict]

class PromptConfig(BaseModel):
    value: str = Field(..., description="Text prompt for detection")
    text_threshold: float = Field(default=0.25, description="Text threshold for this specific prompt")
    box_threshold: float = Field(default=0.3, description="Box threshold for this specific prompt")

    class Config:
        json_schema_extra = {
            "example": {
                "value": "trees",
                "text_threshold": 0.25,
                "box_threshold": 0.3
            }
        }

class PredictionRequest(BaseModel):
    bounding_box: List[float] = Field(..., description="Bounding box coordinates [min_lon, min_lat, max_lon, max_lat]")
    zoom_level: int = Field(..., description="Zoom level for the map")
    text_prompts: List[PromptConfig] = Field(..., description="List of prompts with their individual thresholds")

    class Config:
        json_schema_extra = {
            "example": {
                "bounding_box": [-96.81040, 32.97140, -96.81000, 32.97180],
                "zoom_level": 20,
                "text_prompts": [
                    {"value": "trees", "text_threshold": 0.25, "box_threshold": 0.3},
                    {"value": "buildings", "text_threshold": 0.25, "box_threshold": 0.3}
                ]
            }
        }