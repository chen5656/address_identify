from flask import Flask, request, jsonify, render_template
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
import geopandas as gpd
from shapely.geometry import Point
import requests
import urllib3
import logging
import os
import json
# Suppress only the single InsecureRequestWarning from urllib3 needed for this script
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)

# Load the pre-trained model and tokenizer
model_name = "Hnabil/t5-address-standardizer"
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Get the current directory where app.py is located
current_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(current_dir, 'data', 'Parcel_Map_-_October_2019.geojson')

try:
    # Load parcel data from GeoJSON
    parcels = gpd.read_file(data_path)
except Exception as e:
    print(f"Error loading GeoJSON file: {e}")
    print(f"Attempted to load from path: {data_path}")
    # You might want to raise the error or handle it appropriately
    raise

# Configure logging
logging.basicConfig(level=logging.DEBUG)

def geocode_with_google(address):
    api_key = "AIzaSyDhhixURX0PrrAsVzodk5q5QuiIhg7dwu0"
    url = f"https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={api_key}"
    response = requests.get(url)
    data = response.json()
    if data['results']:
        location = data['results'][0]['geometry']['location']
        return location['lat'], location['lng']
    return None, None

def validate_with_parcels(lat, lon, parcels):
    if lat is not None and lon is not None:
        point = Point(lon, lat)
        parcel_match = parcels[parcels.geometry.contains(point)]
        return parcel_match
    return gpd.GeoDataFrame()  # Return an empty GeoDataFrame if lat or lon is None

def determine_confidence_score(parcel_match, standardized_address):
    score = 0
    summary = []
    if not parcel_match.empty:
        corrected_address = parcel_match.iloc[0]['FullAddres']
        st_num_range = parcel_match.iloc[0]['StNum']
        st_name = parcel_match.iloc[0]['StName']
        zip_code = parcel_match.iloc[0]['ZIP']

        # Base score for matching location
        score += 0.5
        summary.append("Base Score for Location Match: 0.5")

        # Check if the input address street number falls within the range
        input_st_num = int(standardized_address.split()[0])
        if '-' in st_num_range:
            start_num, end_num = map(int, st_num_range.split('-'))
            if start_num <= input_st_num <= end_num:
                score += 0.2
                summary.append("Street Number Range Match: 0.2")
        elif st_num_range.strip():  # Check if st_num_range is not empty
            if input_st_num == int(st_num_range):
                score += 0.2
                summary.append("Street Number Match: 0.2")

        # Check if the street name matches
        if st_name.lower() in standardized_address.lower():
            score += 0.1
            summary.append("Street Name Match: 0.1")

        # Check if the ZIP code matches
        if zip_code in standardized_address:
            score += 0.1
            summary.append("ZIP Code Match: 0.1")

        # Partial address match
        if corrected_address.lower() == standardized_address.lower():
            score += 0.1
            summary.append("Partial Address Match: 0.1")
    else:
        summary.append("No intersecting parcel polygon was found. The result doesn't have validation.")

    return score, summary

def correct_state_and_zip(standardized_address, original_address):
    # Dictionary mapping city names to state abbreviations
    city_to_state = {
        "Syracuse": "NY",
        # Add more city-state mappings as needed
    }

    # Extract city and state from the original address
    original_components = original_address.split(',')
    original_city = original_components[1].strip()
    original_state_zip = original_components[2].strip().split()
    original_state = original_state_zip[0]
    original_zip = original_state_zip[1] if len(original_state_zip) > 1 else ""

    # Split the standardized address into components
    address_components = standardized_address.split(',')
    city = address_components[1].strip() if len(address_components) > 1 else ""
    state_zip = address_components[2].strip().split() if len(address_components) > 2 else []

    # Extract state and ZIP code
    state_abbreviation = state_zip[0] if len(state_zip) > 0 else ""
    zip_code = state_zip[1] if len(state_zip) > 1 else ""

    # Correct the state abbreviation based on the city
    if city in city_to_state:
        correct_state_abbreviation = city_to_state[city]
    else:
        correct_state_abbreviation = original_state

    # Ensure the ZIP code is preserved
    if not zip_code:
        zip_code = original_zip

    # Reconstruct the standardized address
    corrected_address = f"{address_components[0].strip()}, {city}, {correct_state_abbreviation} {zip_code}"
    return corrected_address

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/standardize_and_validate', methods=['POST'])
def standardize_and_validate():
    data = request.json
    input_address = data['address']

    # Tokenize the input address
    inputs = tokenizer(input_address, return_tensors="pt")

    # Generate the standardized address
    outputs = model.generate(**inputs, max_length=100)

    # Decode the output
    standardized_address = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]

    # Correct the state abbreviation and ZIP code
    standardized_address = correct_state_and_zip(standardized_address, input_address)

    # Geocode the standardized address using Google Geocoding API
    lat_google, lon_google = geocode_with_google(standardized_address)

    # Log the geocoded coordinates
    logging.debug(f"Geocoded coordinates: lat={lat_google}, lon={lon_google}")

    # Validate the standardized address
    parcel_match = validate_with_parcels(lat_google, lon_google, parcels)

    # Log the parcel match details
    logging.debug(f"Parcel match: {parcel_match}")

    # Determine the confidence score
    confidence_score, summary = determine_confidence_score(parcel_match, standardized_address)

    # If no intersecting parcel polygon is found, show the geocoded point
    parcel_centroid = None
    parcel_details = None
    parcel_geojson = None
    if parcel_match.empty:
        summary.append("No intersecting parcel polygon was found. The result doesn't have validation.")
        parcel_centroid = {
            'lat': lat_google,
            'lon': lon_google
        }
    else:
        # Get first match as GeoJSON
        parcel_geojson = json.loads(parcel_match.iloc[0:1].to_json())

    return jsonify({
        'standardizedAddress': standardized_address,
        'lat': lat_google,
        'lon': lon_google,
        'confidenceScore': confidence_score,
        'summary': summary,
        'parcelCentroid': parcel_centroid,
        'parcelDetails': parcel_details,
        'parcel_match': parcel_geojson
    })

if __name__ == '__main__':
    app.run(debug=True)