#!/usr/bin/env python3
"""
Test script for QR Generator endpoints
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8001/api"

def test_qr_endpoints():
    print("🔗 Testing QR Code Generator Endpoints...")
    
    # Test 1: QR generator endpoints require authentication
    print("\n1. Testing authentication requirements...")
    
    endpoints = [
        "GET /qr-generator/reps",
        "POST /qr-generator/reps",
        "GET /qr-generator/leads",
        "GET /qr-generator/analytics"
    ]
    
    for endpoint in endpoints:
        method, path = endpoint.split(" ")
        url = f"{BASE_URL}{path}"
        
        try:
            if method == "GET":
                response = requests.get(url, timeout=5)
            elif method == "POST":
                response = requests.post(url, json={}, timeout=5)
            
            if response.status_code in [401, 403]:
                print(f"✅ {endpoint}: Correctly requires authentication")
            else:
                print(f"❌ {endpoint}: Expected 401/403, got {response.status_code}")
                
        except Exception as e:
            print(f"❌ {endpoint}: Error - {str(e)}")
    
    # Test 2: Public endpoint - lead creation
    print("\n2. Testing public lead creation endpoint...")
    lead_data = {
        "name": "Test Customer",
        "email": "test@email.com",
        "phone": "555-0123",
        "rep_id": "non-existent-rep"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/qr-generator/leads", json=lead_data, timeout=5)
        if response.status_code == 404:
            print("✅ Public lead creation: Accessible (404 expected for non-existent rep)")
        elif response.status_code in [200, 201]:
            print("✅ Public lead creation: Working")
        elif response.status_code in [401, 403]:
            print("❌ Public lead creation: Incorrectly requires authentication")
        else:
            print(f"✅ Public lead creation: Accessible (status: {response.status_code})")
    except Exception as e:
        print(f"❌ Public lead creation: Error - {str(e)}")
    
    # Test 3: Public landing page endpoint
    print("\n3. Testing public landing page endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/public/rep/john-smith", timeout=5)
        if response.status_code == 404:
            print("✅ Public landing page: Accessible (404 expected for non-existent rep)")
        elif response.status_code == 200:
            print("✅ Public landing page: Working")
        elif response.status_code in [401, 403]:
            print("❌ Public landing page: Incorrectly requires authentication")
        else:
            print(f"✅ Public landing page: Accessible (status: {response.status_code})")
    except Exception as e:
        print(f"❌ Public landing page: Error - {str(e)}")

    # Test 4: Check if new models are in the code
    print("\n4. Checking data models implementation...")
    try:
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
            
        models_to_check = ['SalesRep', 'Lead', 'QRCode', 'SalesRepCreate', 'LeadCreate', 'FileUpload']
        for model in models_to_check:
            if f"class {model}" in content:
                print(f"✅ Model {model}: Found in code")
            else:
                print(f"❌ Model {model}: Not found in code")
    except Exception as e:
        print(f"❌ Model check: Error - {str(e)}")

    # Test 5: Check if helper functions exist
    print("\n5. Checking helper functions...")
    try:
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
            
        functions_to_check = ['generate_qr_code', 'generate_landing_page_url', 'send_lead_notification']
        for func in functions_to_check:
            if f"def {func}" in content:
                print(f"✅ Function {func}: Found in code")
            else:
                print(f"❌ Function {func}: Not found in code")
    except Exception as e:
        print(f"❌ Function check: Error - {str(e)}")

if __name__ == "__main__":
    test_qr_endpoints()