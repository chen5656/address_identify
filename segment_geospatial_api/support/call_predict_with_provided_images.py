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

async def process_all_images(images_folder, text_prompts):
    """Process all images in the specified folder"""
    image_files = glob.glob(os.path.join(images_folder, "*.jpg")) + \
                 glob.glob(os.path.join(images_folder, "*.jpeg")) + \
                 glob.glob(os.path.join(images_folder, "*.png"))
    
    results = []
    for image_file in image_files:
        print(f"Processing image: {os.path.basename(image_file)}")
        try:
            result = await call_predict_with_image(image_file, text_prompts)
            image_name = os.path.basename(image_file)
            save_geojson(result, prefix=f"result_{os.path.splitext(image_name)[0]}")
            results.append({"image": image_file, "result": result})
        except Exception as e:
            print(f"Error processing {image_file}: {str(e)}")
    
    return results

if __name__ == "__main__":
    # Path to your images folder
    images_folder = os.path.join(project_root, "support/test_images")
            
    # Define text prompts
    text_prompts = [
        PromptConfig(value="poles", box_threshold=0.38, text_threshold=0.80),
    ]
    
    # Run the async function to process all images
    results = asyncio.run(process_all_images(images_folder, text_prompts))
    print(f"Processed {len(results)} images successfully")
