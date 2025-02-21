# Segment Geospatial

A web-based geospatial object detection and segmentation tool that combines the power of ArcGIS JavaScript API with Meta's Segment Anything Model (SAM).

This project utilizes [samgeo](https://samgeo.gishub.org), a powerful Python package for segmenting geospatial data with the Segment Anything Model (SAM). Key capabilities include:
- Automatic mask generation for geospatial imagery
- Text-prompted segmentation for remote sensing data
- Integration with common GIS formats (GeoTIFF, GeoJSON, Shapefile)
- Support for various map tile services

## Features

- **Interactive Map Interface**: Built with ArcGIS JavaScript API for smooth map navigation and visualization
- **Object Detection**: Draw rectangles on the map to detect and segment objects
- **Custom Prompts**: Use natural language to specify what objects you want to detect
- **Real-time Visualization**: View detection results directly on the map

## Prerequisites

- Node.js (v14 or higher)
- Python 3.8+
- Conda package manager
- Git

## Installation

### Clone the Repository

```bash
git clone https://github.com/chen5656/segment-geo.git
cd segment-geo
```

### Environment Setup

#### Frontend Setup
```bash
cd segment_geospatial_frontend
npm install
```

#### Backend Setup
```bash
cd segment_geospatial_api
conda env create -f environment.yml
conda activate geo_env
```

### Configuration

1. Create environment files:
```bash
# In segment_geospatial_frontend
cp .env.example .env
```

2. Update the `.env` file with your configuration:
```
REACT_APP_API_URL=http://localhost:8001
```

## Running the Application

### Using Docker (Recommended)

```bash
docker-compose -f docker-compose.dev.yml up
```

### Manual Start

1. Start the Backend:
```bash
conda activate geo_env
cd segment_geospatial_api
python -m app.main
```

2. In a new terminal, start the Frontend:
```bash
cd segment_geospatial_frontend
npm run start
```

The application will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:8001

## Usage

1. Open the application in your web browser
3. Draw a rectangle on the map to select an area
4. Enter what you want to detect (e.g., "buildings", "trees", "roads")
5. Click "Detect Objects" to run the detection
6. View the results on the map

## API Documentation

The API endpoints are available at:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Project Structure

```
segment-geospatial/
├── segment_geospatial_frontend/    # React frontend application
├── segment_geospatial_api/         # FastAPI backend application
├── docker-compose.dev.yml          # Docker compose configuration
└── README.md                       # This file
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

### Segment Anything Model

This project builds upon the Segment Anything Model (SAM). If you use this project in your research, please cite:
```bibtex
@article{kirillov2023segany,
  title={Segment Anything},
  author={Kirillov, Alexander and Mintun, Eric and Ravi, Nikhila and Mao, Hanzi and Rolland, Chloe and Gustafson, Laura and Xiao, Tete and Whitehead, Spencer and Berg, Alexander C. and Lo, Wan-Yen and Doll{\'a}r, Piotr and Girshick, Ross},
  journal={arXiv:2304.02643},
  year={2023}
}
```

### Segment Geospatial Package

This project uses the samgeo package. If you use this project, please also cite:
```bibtex
@article{wu2023samgeo,
  title={samgeo: A Python package for segmenting geospatial data with the Segment Anything Model (SAM)},
  author={Wu, Q. and Osco, L.},
  journal={Journal of Open Source Software},
  volume={8},
  number={89},
  pages={5663},
  year={2023},
  doi={10.21105/joss.05663}
}

@article{osco2023segment,
  title={The Segment Anything Model (SAM) for remote sensing applications: From zero to one shot},
  author={Osco, L. P. and Wu, Q. and de Lemos, E. L. and Gonçalves, W. N. and Ramos, A. P. M. and Li, J. and Junior, J. M.},
  journal={International Journal of Applied Earth Observation and Geoinformation},
  volume={124},
  pages={103540},
  year={2023},
  doi={10.1016/j.jag.2023.103540}
}
```
