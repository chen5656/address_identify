from typing import Union

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.segment_geospatial.predict import predictor
from loguru import logger

from app import __version__, schemas
from app.config import settings

api_router = APIRouter()

@api_router.get("/health", response_model=schemas.Health, status_code=200)
def health() -> dict:
    """
    Root Get
    """
    health = schemas.Health(
        name=settings.PROJECT_NAME, api_version=__version__
    )
    return health.dict()

@api_router.post("/predict", 
                response_model=Union[schemas.PredictionResults, schemas.ErrorResponse], 
                status_code=200)
async def predict(request: schemas.PredictionRequest):
    try:
        result = await predictor.make_prediction(
            bounding_box=request.bounding_box,
            text_prompt=request.text_prompt,
            zoom_level=request.zoom_level,
            box_threshold=request.box_threshold,
            text_threshold=request.text_threshold,
        )
        if result.get("errors") is not None:
            logger.warning(f"Prediction validation error: {result.get('errors')}")
            return JSONResponse(
                status_code=400,
                content={"error": str(result["errors"])}
            )

        logger.info(f"Prediction results: {result.get('predictions')}")
        
        return JSONResponse(
            status_code=200,
            content=result.get("geojson")
        )

    except Exception as e:
        logger.error(f"Error during prediction: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )
