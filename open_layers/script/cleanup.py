import os
import shutil
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def clean_directory():
    """
    Clean up model files and temporary files in the project directory
    """
    # Get the current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define directories and patterns to clean
    cleanup_targets = {
        'temp_files': ['.tmp', '.temp', '.log'],
        'model_files': ['.pt', '.pth', '.h5', '.model'],
        'cache_dirs': ['__pycache__', '.pytest_cache', '.cache'],
        'temp_dirs': ['temp', 'tmp']
    }
    
    try:
        # Clean files with specific extensions
        files_removed = 0
        for root, dirs, files in os.walk(current_dir):
            # Skip git directory if exists
            if '.git' in dirs:
                dirs.remove('.git')
            
            # Remove cache directories
            for cache_dir in cleanup_targets['cache_dirs']:
                if cache_dir in dirs:
                    cache_path = os.path.join(root, cache_dir)
                    try:
                        shutil.rmtree(cache_path)
                        logger.info(f"Removed cache directory: {cache_path}")
                    except Exception as e:
                        logger.error(f"Failed to remove {cache_path}: {e}")
            
            # Remove temp directories
            for temp_dir in cleanup_targets['temp_dirs']:
                if temp_dir in dirs:
                    temp_path = os.path.join(root, temp_dir)
                    try:
                        shutil.rmtree(temp_path)
                        logger.info(f"Removed temp directory: {temp_path}")
                    except Exception as e:
                        logger.error(f"Failed to remove {temp_path}: {e}")
            
            # Remove specific file types
            for file in files:
                file_path = os.path.join(root, file)
                # Check if file ends with any of the target extensions
                for category in ['temp_files', 'model_files']:
                    if any(file.endswith(ext) for ext in cleanup_targets[category]):
                        try:
                            os.remove(file_path)
                            files_removed += 1
                            logger.info(f"Removed file: {file_path}")
                        except Exception as e:
                            logger.error(f"Failed to remove {file_path}: {e}")
        
        logger.info(f"Cleanup completed. Removed {files_removed} files.")
        
    except Exception as e:
        logger.error(f"An error occurred during cleanup: {e}")
        raise

if __name__ == "__main__":
    logger.info("Starting cleanup process...")
    clean_directory()
    logger.info("Cleanup process completed.")