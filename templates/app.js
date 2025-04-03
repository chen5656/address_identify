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
let currentAddressCoordinates = null;

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

// Wind API URLs
const windApiUrls = [
    {
        name: "MRI",
        url: "https://gis.asce.org/arcgis/rest/services/ASCE722/w2022_CONUS_Mosaic/ImageServer/identify"
    }
];

// Fetch wind load data
async function fetchWindData(coordinates) {
    console.log('Fetching wind data for coordinates:', coordinates);
    
    const results = {};
    const promises = [];
    
    // 构建参数对象
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
    
    // 创建URL查询字符串
    const queryString = new URLSearchParams();
    for (const key in params) {
        queryString.append(key, params[key]);
    }
    
    windApiUrls.forEach((urlObj, index) => {
        const fullUrl = `${urlObj.url}?${queryString.toString()}`;
        console.log(`Requesting URL (${index}):`, fullUrl);
        
        const promise = fetch(fullUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                results[index] = data;
                console.log(`Received data for URL index ${index}:`, data);
            })
            .catch(error => {
                console.error(`Error fetching URL index ${index}:`, error);
                results[index] = null;
            });
        
        promises.push(promise);
    });
    
    // Wait for all requests to complete
    await Promise.all(promises);
    
    // Process results
    const processedData = processWindData(results);
        
    return processedData
}

// Process wind load data
function processWindData(results) {
    function matchMriResults(result) {
        // 初始化返回对象
        const mriData = {
            mri10: 'N/A',
            mri25: 'N/A',
            mri50: 'N/A',
            mri100: 'N/A',
            mri300: 'N/A',
            mri700: 'N/A',
            mri1700: 'N/A',
            mri3000: 'N/A',
            mri10000: 'N/A',
            mri100000: 'N/A',
            mri1000000: 'N/A'
        };
        
        // 确保结果存在且包含必要的数据
        if (!result || !result.catalogItems || !result.catalogItems.features || 
            !result.properties || !result.properties.Values) {
            return mriData;
        }
        
        // 创建OBJECTID到Values索引的映射
        const valuesByObjectId = {};
        result.catalogItemVisibilities.forEach((visibility, index) => {
            if (visibility === 1 && index < result.properties.Values.length) {
                valuesByObjectId[index + 1] = result.properties.Values[index];
            }
        });
        
        // 遍历features一次，填充所有MRI值
        result.catalogItems.features.forEach(feature => {
            const name = feature.attributes.Name;
            const objectId = feature.attributes.OBJECTID;
            
            if (!name) return;
            
            // 使用正则表达式提取MRI值
            const mriMatch = name.match(/w2022_mri(\d+)/);
            if (mriMatch && mriMatch[1]) {
                const mriValue = mriMatch[1];
                const key = `mri${mriValue}`;
                
                // 如果mriData中有这个键，则更新值
                if (key in mriData) {
                    // 使用OBJECTID获取对应的值
                    if (objectId in valuesByObjectId) {
                        mriData[key] = valuesByObjectId[objectId];
                    } else if (objectId - 1 < result.properties.Values.length) {
                        // 备选方案：直接使用OBJECTID-1作为索引
                        mriData[key] = result.properties.Values[objectId - 1];
                    }
                }
            }
        });
        
        return mriData;
    }
    
    // 获取所有MRI值
    const mriValues = matchMriResults(results[0]);
    
    const windData = {
        ...mriValues,
        windSpeed: mriValues.mri300 !== 'N/A' ? `${mriValues.mri300} Vmph` : 'N/A'
    };
    
    // 添加单位到所有MRI值
    Object.keys(mriValues).forEach(key => {
        if (mriValues[key] !== 'N/A') {
            windData[key] = `${mriValues[key]} Vmph`;
        }
    });
    
    // Check special wind region
    if (results[5] && results[5].features) {
        windData.specialWindRegion = results[5].features.length > 0;
    }
    
    // Check hurricane prone zone
    if (results[2] && results[2].features) {
        windData.hurricaneProne = results[2].features.length > 0;
    }
    
    // Check wind borne debris requirements
    if (results[3] && results[3].features) {
        windData.windborneDebris = results[3].features.length > 0;
    }
    
    // Get location information
    if (results[8] && results[8].features && results[8].features.length > 0) {
        windData.location = results[8].features[0].attributes.STATE_NAME || 'Unknown';
    }
    
    return windData;
}

// Generate wind load report
function generateWindReport(windData) {
    // Create Bootstrap table
    let tableHTML = '<table class="table table-striped table-bordered">';
    tableHTML += '<thead class="thead-dark"><tr><th>Parameter</th><th>Value</th></tr></thead>';
    tableHTML += '<tbody>';
    tableHTML += `<tr><td>Wind Speed</td><td>${windData.windSpeed}</td></tr>`;
    tableHTML += `<tr><td>10-year MRI</td><td>${windData.mri10}</td></tr>`;
    tableHTML += `<tr><td>25-year MRI</td><td>${windData.mri25}</td></tr>`;
    tableHTML += `<tr><td>50-year MRI</td><td>${windData.mri50}</td></tr>`;
    tableHTML += `<tr><td>100-year MRI</td><td>${windData.mri100}</td></tr>`;
    tableHTML += `<tr><td>300-year MRI</td><td>${windData.mri300}</td></tr>`;
    tableHTML += `<tr><td>700-year MRI</td><td>${windData.mri700}</td></tr>`;
    tableHTML += `<tr><td>1,700-year MRI</td><td>${windData.mri1700}</td></tr>`;
    tableHTML += `<tr><td>3,000-year MRI</td><td>${windData.mri3000}</td></tr>`;
    tableHTML += `<tr><td>10,000-year MRI</td><td>${windData.mri10000}</td></tr>`;
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
    
    const loadType = selectedLoadType.id;
    console.log('Selected load type:', loadType);
    
    if (loadType === 'Wind') {        
        // Get wind load data
        try {
            const windData = await fetchWindData(currentAddressCoordinates);
            displayWindReport(windData);
            console.log('Wind data fetched successfully:', windData);
        } catch (error) {
            console.error('Error fetching wind data:', error);
            alert('Error fetching wind load data. Please try again later.');
        }
    } else {
        console.log(`${loadType} data processing not yet implemented`);
        alert(`${loadType} data processing not yet implemented`);
    }
});

function displayWindReport(windData) {
    const windReportHTML = generateWindReport(windData);
    
    document.getElementById('windReport').innerHTML = windReportHTML;
    
    const modal = new bootstrap.Modal(document.getElementById('exampleModalCenter'));
    modal.show();
}

