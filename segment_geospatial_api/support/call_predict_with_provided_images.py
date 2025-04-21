import os
import sys
import asyncio
import glob
import json
from datetime import datetime

# Add the project root directory to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(project_root)

from app.segment_geospatial.predict import predictor
from app.schemas.predict import PromptConfig

def save_geojson(data, prefix="test_result"):
    """Save GeoJSON data to a file with timestamp"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{prefix}_{timestamp}.geojson"
    
    # Create results directory if it doesn't exist
    results_dir = os.path.join(project_root, "support/test_results")
    os.makedirs(results_dir, exist_ok=True)
    
    filepath = os.path.join(results_dir, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"GeoJSON saved to: {filepath}")
    return filepath

async def call_predict_with_image(input_image_path, text_prompts):
    try:
        _result = await predictor.make_prediction_with_input_image(
            input_image_path=input_image_path,
            text_prompts=text_prompts
        )
        return _result

    except Exception as e:
        print(f"Prediction error: {str(e)}")
        raise

if __name__ == "__main__":
    # Path to your input image
    input_image = os.path.join(project_root, "support/test_images/a1.jpg")
            
    # Define text prompts
    text_prompts = [
        PromptConfig(value="poles", box_threshold=0.4, text_threshold=0.54),
    ]
    
    # Run the async function
    result = asyncio.run(call_predict_with_image(input_image, text_prompts))
