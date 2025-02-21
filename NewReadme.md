# GPU Docker Setup

## Quick Setup (3 steps)

### 1. Check NVIDIA Drivers
```bash
nvidia-smi
```
If this command works, you have drivers installed. If not, install them:
```bash
sudo apt update
sudo apt install -y nvidia-driver-525
sudo reboot
```

### 2. Install NVIDIA Container Toolkit
```bash
# Install NVIDIA Container Toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
```

### 3. Configure Docker
```bash
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

That's it! Now you can right-click on `docker-compose.gpu.yml` and select "Compose Up" as usual.

## Verify Setup
To verify everything is working:
```bash
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```
If you see the GPU information, you're good to go! 🚀

## Troubleshooting
If "Compose Up" doesn't work:
1. Make sure `nvidia-smi` works in terminal
2. Try running `docker compose -f docker-compose.gpu.yml up` in terminal to see any error messages

## Running the Stack
```bash
# Build and start the services
docker compose up --build

# To run in detached mode
docker compose up -d --build

# To stop the services
docker compose down
```






