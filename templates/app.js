const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    view: new ol.View({
        center: [0, 0],
        zoom: 2
    })
});

// Add ASCE 7-22 map services
const layers = [
    { id: 'layer1', title: 'CA Profile Service', url: 'https://gis.asce.org/arcgis/rest/services/ASCE722/ts2022_Tsunami_Tile/MapServer', type: 'tile' },
    { id: 'layer2', title: 'DEM Mosaic', url: 'https://services6.arcgis.com/bdPqSfflsdgFRVVM/ArcGIS/rest/services/UTC_Map_V4_WFL1/FeatureServer/0', type: 'tile' },
];

const olLayers = layers.map(layer => {
    let olLayer;
    if (layer.type === 'tile') {
        olLayer = new ol.layer.Tile({
            source: new ol.source.TileArcGISRest({
                url: layer.url
            })
        });
    } else if (layer.type === 'image') {
        olLayer = new ol.layer.Image({
            source: new ol.source.ImageArcGISRest({
                url: layer.url
            })
        });
    }
    map.addLayer(olLayer);
    return { id: layer.id, olLayer };
});

// Handle layer visibility
olLayers.forEach(layer => {
    document.getElementById(layer.id).addEventListener('change', function() {
        layer.olLayer.setVisible(this.checked);
    });
});

// Handle form submission
let currentAddressCoordinates = [-96, 37];

document.getElementById('addressForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const address = document.getElementById('address').value;
    document.getElementById('beforeAddress').textContent = address;
    
    try {
        const result = await standardizeAndValidateAddress(address);
        document.getElementById('afterAddress').textContent = result.standardizedAddress;
        document.getElementById('confidenceScore').textContent = result.confidenceScore;
        document.getElementById('summary').textContent = result.summary.join(', ');
        // Display parcel details if available
        if (result.parcelDetails) {
            document.getElementById('parcelDetails').textContent = JSON.stringify(result.parcelDetails, null, 2);
        } else {
            document.getElementById('parcelDetails').textContent = 'No parcel details available.';
        }
        // Clear existing layers
        map.getLayers().forEach(layer => {
            if (layer instanceof ol.layer.Vector && layer !== parcelLayer) {
                map.removeLayer(layer);
            }
        });
        // Add the address point to the map
        let addressPoint;
        if (result.lat && result.lon) {
            currentAddressCoordinates = [result.lon, result.lat];
            addressPoint = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([result.lon, result.lat]))
            });
        } else if (result.parcelCentroid) {
            currentAddressCoordinates = [result.parcelCentroid.lon, result.parcelCentroid.lat];
            addressPoint = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([result.parcelCentroid.lon, result.parcelCentroid.lat]))
            });
        }
        
        if (addressPoint) {
            addressPoint.setStyle(new ol.style.Style({
                image: new ol.style.Icon({
                    src: 'https://openlayers.org/en/v6.5.0/examples/data/icon.png'
                })
            }));
            const vectorSource = new ol.source.Vector({
                features: [addressPoint]
            });
            const vectorLayer = new ol.layer.Vector({
                source: vectorSource
            });
            map.addLayer(vectorLayer);
            map.getView().setCenter(ol.proj.fromLonLat([result.lon || result.parcelCentroid.lon, result.lat || result.parcelCentroid.lat]));
            map.getView().setZoom(15);
        }
        // Add pedestrian entrances to the map
        if (result.pedestrianEntrances) {
            const pedestrianFeatures = result.pedestrianEntrances.map(entrance => {
                return new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([entrance.lon, entrance.lat]))
                });
            });
            const pedestrianSource = new ol.source.Vector({
                features: pedestrianFeatures
            });
            const pedestrianLayer = new ol.layer.Vector({
                source: pedestrianSource,
                style: new ol.style.Style({
                    image: new ol.style.Icon({
                        src: 'https://openlayers.org/en/v6.5.0/examples/data/icon.png',
                        color: 'red'
                    })
                })
            });
            map.addLayer(pedestrianLayer);
        }
        // Display FEMA data as charts
        if (result.femaData) {
            displayFemaChart(result.femaData);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

// Function to standardize and validate the address
async function standardizeAndValidateAddress(address) {
    const response = await fetch('/api/standardize_and_validate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address })
    });
    const data = await response.json();
    return data;
}

// Function to display FEMA data as charts
function displayFemaChart(femaData) {
    const ctx = document.getElementById('femaChart').getContext('2d');
    const labels = Object.keys(femaData);
    const data = Object.values(femaData);
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Disaster Counts by Type',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// ASCE API
const ASCEApiUrls = {
    "Wind": "https://gis.asce.org/arcgis/rest/services/ASCE722/w2022_CONUS_Mosaic/ImageServer/identify",
    "Seismic": "https://ascehazardtool.org/proxy/proxy.ashx?https://earthquake.usgs.gov/ws/designmaps/nehrp-2020.json?latitude=28.093102&longitude=-82.405715&referenceDocument=ASCE7-22&riskCategory=I&siteClass=Default&title=ASCE",
    "Ice": "https://gis.asce.org/arcgis/rest/services/ASCE722/i2022_mri0250/ImageServer/identify?f=json&geometry=%7B%22x%22%3A-82.405715%2C%22y%22%3A28.093102%2C%22spatialReference%22%3A%7B%22wkid%22%3A4326%7D%7D&returnGeometry=false&returnCatalogItems=true&geometryType=esriGeometryPoint&returnPixelValues=true",
    "Snow": "https://gis.asce.org/arcgis/rest/services/ASCE722/s2022_AlaskaCaseStudy/MapServer/0/query?f=json&where=1%3D1&returnGeometry=false&spatialRel=esriSpatialRelIntersects&geometry=%7B%22x%22%3A-82.405715%2C%22y%22%3A28.093102%2C%22spatialReference%22%3A%7B%22wkid%22%3A4326%7D%7D&geometryType=esriGeometryPoint&inSR=4326&outFields=*&outSR=4326",
    "Rain": "https://ascehazardtool.org/proxy/proxy.ashx?https://hdsc.nws.noaa.gov/cgi-bin/hdsc/new/cgi_readH5.py?lat=28.093102&lon=-82.405715&type=pf&data=intensity&units=english&series=ams",
    "Flood": "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?f=json&where=&returnGeometry=false&spatialRel=esriSpatialRelIntersects&geometry=%7B%22x%22%3A-82.405715%2C%22y%22%3A28.093102%2C%22spatialReference%22%3A%7B%22wkid%22%3A4326%7D%7D&geometryType=esriGeometryPoint&inSR=4326&outFields=*&outSR=4326&callback=dojo_request_script_callbacks.dojo_request_script1",
    "Tsunami": "https://gis.asce.org/arcgis/rest/services/ASCE722/ts2022_Tsunami_Feature_Services/MapServer/4/query?f=json&where=1%3D1&returnGeometry=false&spatialRel=esriSpatialRelIntersects&geometry=%7B%22x%22%3A-82.405715%2C%22y%22%3A28.093102%2C%22spatialReference%22%3A%7B%22wkid%22%3A4326%7D%7D&geometryType=esriGeometryPoint&inSR=4326&outFields=*&outSR=4326",
}

// Fetch wind load data
async function fetchASCEData(coordinates, data_category) {
    console.log(`Fetching ${data_category} data for coordinates:`, coordinates);
    
    if (!(data_category in ASCEApiUrls)) {
        throw new Error(`Unsupported data category: ${data_category}`);
    }
    
    const params = {
        "f": "json",
        "geometry": JSON.stringify({
            x: coordinates[0],
            y: coordinates[1],
            spatialReference: { wkid: 4326 }
        }),
        "returnGeometry": "false",
        "returnCatalogItems": "true",
        "geometryType": "esriGeometryPoint",
        "returnPixelValues": "true"
    };
    
    const queryString = new URLSearchParams();
    for (const key in params) {
        queryString.append(key, params[key]);
    }
    
    const url = ASCEApiUrls[data_category];
    const fullUrl = `${url}?${queryString.toString()}`;
    console.log(`Requesting URL for ${data_category}:`, fullUrl);
    let data;
    try {
        const response = await fetch(fullUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        data = await response.json();
        console.log(`Received data for ${data_category}:`, data);
    } catch (error) {
        console.error(`Error fetching ${data_category} data:`, error);
        throw error;
    }

    switch(data_category) {
        case "Wind":
            return processWindData(data);
        default:
            return data;
    }

}

// Process wind load data
function processWindData(result) {   
    if (!result?.properties?.Values) {
        console.log('No mri data found');
        return mriData;
    }    
    const sortedValues = [...result.properties.Values].sort((a, b) => a - b);    
    const windValues = [result.value, ...sortedValues];
    return windValues.map(value => parseFloat(value).toFixed(2));
}

// Generate wind load report
function generateWindReport(windData) {
    // Create Bootstrap table
    let tableHTML = '<table class="table table-striped table-bordered">';
    tableHTML += '<thead class="thead-dark"><tr><th>Parameter</th><th>Value</th></tr></thead>';
    tableHTML += '<tbody>';
    tableHTML += `<tr><td><b>Wind Speed</b></td><td>${windData[0]} Vmph</td></tr>`;
    tableHTML += `<tr><td>10-year MRI</td><td>${windData[1]} Vmph</td></tr>`;
    tableHTML += `<tr><td>25-year MRI</td><td>${windData[2]} Vmph</td></tr>`;
    tableHTML += `<tr><td>50-year MRI</td><td>${windData[3]} Vmph</td></tr>`;
    tableHTML += `<tr><td>100-year MRI</td><td>${windData[4]} Vmph</td></tr>`;
    tableHTML += `<tr><td>300-year MRI</td><td>${windData[5]} Vmph</td></tr>`;
    tableHTML += `<tr><td>700-year MRI</td><td>${windData[6]} Vmph</td></tr>`;
    tableHTML += `<tr><td>1,700-year MRI</td><td>${windData[7]} Vmph</td></tr>`;
    tableHTML += `<tr><td>3,000-year MRI</td><td>${windData[8]} Vmph</td></tr>`;
    tableHTML += `<tr><td>10,000-year MRI</td><td>${windData[9]} Vmph</td></tr>`;
    tableHTML += '</tbody></table>';
    
    return tableHTML;
}

// Add "View Results" button click event handler
document.getElementById('viewResultsButton').addEventListener('click', async function() {
    if (!currentAddressCoordinates) {
        alert('Please enter an address first');
        return;
    }
    const selectedLoadType = document.querySelector('input[name="loadType"]:checked');
    
    if (!selectedLoadType) {
        alert('Please select a load type');
        return;
    }
    
    // Show loading spinner and disable button
    const button = document.getElementById('viewResultsButton');
    const buttonText = document.getElementById('buttonText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    button.classList.add('disabled');
    buttonText.textContent = 'Loading...';
    loadingSpinner.style.display = 'inline-block';
    
    const loadType = selectedLoadType.id;
    console.log('Selected load type:', loadType);

    let ASCEData;

    try {
        if (loadType === 'Wind') {
            // Get wind load data
            ASCEData = await fetchASCEData(currentAddressCoordinates, loadType);
        } else {
            console.log(`${loadType} data processing not yet implemented`);
            alert(`${loadType} data processing not yet implemented`);
        }
    }catch (error) {
        console.error(`Error fetching ${loadType} data:`, error);
        alert(`Error fetching ${loadType} data. Please try again later.`);
    }

    if (ASCEData) {
        console.log('ASCE data:', ASCEData);
        displayASCEReport(ASCEData, loadType);
    }

    // Hide loading spinner and enable button
    button.classList.remove('disabled');
    buttonText.textContent = 'View Results';
    loadingSpinner.style.display = 'none';
    
});

function displayASCEReport(data, category) {
    let reportHTML = '';
    if (category === 'Wind') {
        reportHTML = generateWindReport(data);
    }
     
    
    document.getElementById('asceReport').innerHTML = reportHTML;
    document.getElementById('asceModalLongTitle').textContent = `${category} Report`;
    
    const modal = new bootstrap.Modal(document.getElementById('asceModel'));
    modal.show();
}

