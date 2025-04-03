import requests
import json
from pathlib import Path
import time

def fetch_url(url):
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching {url}: {str(e)}")
        return None

def create_url_json(url_file):
    with open(url_file, 'r') as f:
        urls = [line.strip() for line in f if line.strip() and line.startswith('http')]
    
    url_data = {
        "urls": [{"id": i, "url": url} for i, url in enumerate(urls, 1)]
    }
    
    json_path = Path(url_file).parent / "URL.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(url_data, f, indent=2, ensure_ascii=False)
    
    return url_data["urls"]

def read_url_json(url_file):
    with open(url_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def main():

    type = "wind"

    output_dir = Path(__file__).parent / f"{type}/json_resutls"
    output_dir.mkdir(exist_ok=True)
    
    # url_file = f"/Users/huajunchen/Library/Project/Python/address_identify/research/python/{type}/URL.md"
    # create_url_json(url_file)
    url_file = f"/Users/huajunchen/Library/Project/Python/address_identify/research/python/{type}/URL.json"
    urls_with_ids = read_url_json(url_file)
    
    # If urls_with_ids is a dictionary with a "urls" key
    if isinstance(urls_with_ids, dict) and "urls" in urls_with_ids:
        url_list = urls_with_ids["urls"]
    else:
        # If it's already a list
        url_list = urls_with_ids
    
    for url_entry in url_list:
        print(f"Processing URL {url_entry['id']}/{len(url_list)}")
        
        filename = f"{url_entry['id']}.json"
        result = fetch_url(url_entry['url'])
        
        if result:
            output_path = output_dir / filename
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"Saved result to {output_path}")
        
        time.sleep(1)

if __name__ == "__main__":
    main()