#!/usr/bin/env python3
"""
Debug script to investigate lead creation endpoint response
"""

import requests
import json

BASE_URL = "https://c65d6a07-4a13-4a82-b398-311723a3885b.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def debug_lead_creation():
    # First get a sales rep
    headers = HEADERS.copy()
    headers["Authorization"] = "Bearer dev-token-super_admin"
    
    print("Getting sales reps...")
    response = requests.get(f"{BASE_URL}/qr-generator/reps", headers=headers, timeout=10)
    
    if response.status_code == 200:
        reps = response.json()
        if reps:
            test_rep = reps[0]
            rep_id = test_rep["id"]
            print(f"Using rep: {test_rep['name']} (ID: {rep_id})")
            
            # Try to create a lead
            lead_data = {
                "name": "Test User",
                "email": "test@email.com",
                "phone": "(555) 123-4567",
                "address": "123 Test St",
                "message": "Test message",
                "rep_id": rep_id
            }
            
            print(f"Creating lead with data: {lead_data}")
            response = requests.post(f"{BASE_URL}/qr-generator/leads", 
                                   headers={"Content-Type": "application/json"}, 
                                   json=lead_data, timeout=10)
            
            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            print(f"Response text: {response.text}")
            
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    print(f"Response JSON: {json.dumps(response_data, indent=2)}")
                except:
                    print("Could not parse response as JSON")
        else:
            print("No sales reps found")
    else:
        print(f"Failed to get sales reps: {response.status_code}")

if __name__ == "__main__":
    debug_lead_creation()