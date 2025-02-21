# Use CUDA base image if GPU is needed
FROM continuumio/miniconda3

WORKDIR /app

# Copy only the environment file first to leverage Docker cache
COPY environment.yml .

# Create conda environment
RUN conda env create -f environment.yml

# Copy the rest of the application
COPY . .

# Set environment variables
ENV MODEL_PATH=/app/models \
    PYTHONPATH=/app \
    CONDA_DEFAULT_ENV=geo_app_env

# Initialize conda in bash
SHELL ["/bin/bash", "-c"]

# Start the API server
CMD source /opt/conda/etc/profile.d/conda.sh && \
    conda activate geo_app_env && \
    uvicorn app.main:app --host 0.0.0.0 --port 8001