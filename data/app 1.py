from flask import Flask, request, jsonify, render_template
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
import geopandas as gpd
from shapely.geometry import Point
import requests
import urllib3

# Suppress only the single InsecureRequestWarning from urllib3 needed for this script
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)

# Load the pre-trained model and tokenizer
model_name = "Hnabil/t5-address-standardizer"
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Load parcel data from GeoJSON
parcels = gpd.read_file(r'C:\Users\527336\AppData\Roaming\JetBrains\PyCharmCE2024.2\light-edit\Parcel_Map_-_October_2019.geojson')

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
    point = Point(lon, lat)
    parcel_match = parcels[parcels.geometry.contains(point)]
    return parcel_match

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
        elif input_st_num == int(st_num_range):
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

    return score, summary

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

    # Geocode the standardized address using Google Geocoding API
    lat_google, lon_google = geocode_with_google(standardized_address)

    # Validate the standardized address
    parcel_match = validate_with_parcels(lat_google, lon_google, parcels)

    # Determine the confidence score
    confidence_score, summary = determine_confidence_score(parcel_match, standardized_address)

    # If the standardized address is not found, use the centroid of the matching parcel
    parcel_centroid = None
    parcel_details = None
    if parcel_match.empty:
        if not parcels.empty:
            matching_parcel = parcels[parcels['FullAddres'].str.contains(input_address.split()[0], case=False, na=False)]
            if not matching_parcel.empty:
                matching_parcel = matching_parcel.to_crs(epsg=3857)  # Reproject to a projected CRS
                centroid = matching_parcel.geometry.centroid.iloc[0]
                parcel_centroid = {
                    'lat': centroid.y,
                    'lon': centroid.x
                }
                parcel_details = matching_parcel.iloc[0].to_dict()
                # Convert geometry to a serializable format
                parcel_details['geometry'] = matching_parcel.iloc[0].geometry.__geo_interface__

    return jsonify({
        'standardizedAddress': standardized_address,
        'lat': lat_google,
        'lon': lon_google,
        'confidenceScore': confidence_score,
        'summary': summary,
        'parcelCentroid': parcel_centroid,
        'parcelDetails': parcel_details
    })

if __name__ == '__main__':
    app.run(debug=True)