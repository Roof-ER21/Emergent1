#!/usr/bin/env python3
"""
Debug test for hiring flow issues
"""

import requests
import json

BASE_URL = "https://33b33743-99df-44c4-98d4-d821875bb83a.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def make_request(method, endpoint, data=None, auth_token=None):
    """Make HTTP request with proper headers"""
    url = f"{BASE_URL}{endpoint}"
    headers = HEADERS.copy()
    
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
        
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except Exception as e:
        print(f"Request failed: {str(e)}")
        return None

def debug_hiring_flows():
    print("🔍 Debugging Hiring Flow Issues...")
    
    # Test 1: Check role-based access with sales_rep
    print("\n1. Testing sales_rep access to hiring flows...")
    auth_token = "dev-token-sales_rep"
    response = make_request("GET", "/hiring/flows", auth_token=auth_token)
    
    if response:
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("❌ Sales rep can access hiring flows (should be 403)")
            try:
                flows = response.json()
                print(f"Retrieved {len(flows)} flows")
            except:
                print("Could not parse response")
        elif response.status_code == 403:
            print("✅ Sales rep correctly denied access")
        else:
            print(f"Unexpected status code: {response.status_code}")
    else:
        print("No response received")
    
    # Test 2: Create candidate and test advancement
    print("\n2. Testing candidate advancement...")
    auth_token = "dev-token-super_admin"
    
    # First, ensure we have insurance flow
    response = make_request("POST", "/hiring/initialize-sample-flows", auth_token=auth_token)
    print(f"Initialize flows: {response.status_code if response else 'No response'}")
    
    # Create candidate with insurance type
    candidate_data = {
        "name": "Debug Candidate",
        "email": "debug@email.com",
        "phone": "555-0000",
        "position": "Insurance Agent",
        "hiring_type": "insurance",
        "current_stage": "application",
        "status": "active",
        "notes": "Debug test candidate"
    }
    
    response = make_request("POST", "/hiring/candidates", candidate_data, auth_token=auth_token)
    if response and response.status_code == 200:
        candidate = response.json()
        candidate_id = candidate["id"]
        print(f"Created candidate: {candidate_id}")
        
        # Try to advance candidate
        response = make_request("POST", f"/hiring/candidates/{candidate_id}/advance", auth_token=auth_token)
        if response:
            print(f"Advance status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Advancement result: {result}")
            else:
                print(f"❌ Advancement failed: {response.text}")
        else:
            print("No response for advancement")
        
        # Try to delete candidate
        response = make_request("DELETE", f"/hiring/candidates/{candidate_id}", auth_token=auth_token)
        if response:
            print(f"Delete status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Delete result: {result}")
            else:
                print(f"❌ Delete failed: {response.text}")
        else:
            print("No response for delete")
    else:
        print(f"Failed to create candidate: {response.status_code if response else 'No response'}")

if __name__ == "__main__":
    debug_hiring_flows()