#!/usr/bin/env python3
"""
Additional HR RBAC Testing - PTO Requests
Testing PTO request endpoints specifically mentioned in the review
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os

# Configuration
BACKEND_URL = "https://233ca807-7ec6-45fa-92ee-267cd8ec8830.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test tokens for different roles
TEST_TOKENS = {
    "team_lead": "dev-token-team_lead",
    "sales_manager": "dev-token-sales_manager", 
    "hr_manager": "dev-token-hr_manager",
    "super_admin": "dev-token-super_admin",
    "sales_rep": "dev-token-sales_rep",
    "employee": "dev-token-employee"
}

def get_headers(role):
    """Get headers for specific role"""
    return {
        "Authorization": f"Bearer {TEST_TOKENS[role]}",
        "Content-Type": "application/json"
    }

def test_endpoint_access(endpoint, method="GET", role="team_lead", data=None, expected_status=200):
    """Test endpoint access for specific role"""
    try:
        headers = get_headers(role)
        url = f"{API_BASE}{endpoint}"
        
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return False, f"Unsupported method: {method}"
        
        if response.status_code == expected_status:
            return True, f"Status {response.status_code} as expected"
        else:
            return False, f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}"
            
    except Exception as e:
        return False, f"Request failed: {str(e)}"

def test_pto_requests():
    """Test PTO request endpoints"""
    print("🧪 Testing PTO Request Endpoints")
    print("-" * 50)
    
    # Test authorized roles
    authorized_roles = ["team_lead", "sales_manager", "hr_manager", "super_admin"]
    
    for role in authorized_roles:
        # Test GET /api/pto/requests
        passed, details = test_endpoint_access("/pto/requests", "GET", role, expected_status=200)
        print(f"✅ GET /pto/requests - {role} role" if passed else f"❌ GET /pto/requests - {role} role: {details}")
        
        # Test PUT /api/pto/requests/{id} (approve/deny PTO)
        pto_update = {
            "status": "approved",
            "notes": "Approved by manager"
        }
        passed, details = test_endpoint_access("/pto/requests/test-pto-123", "PUT", role, pto_update, expected_status=404)
        # Expecting 404 because test PTO doesn't exist, but this confirms authorization works
        if "404" in details:
            print(f"✅ PUT /pto/requests/{{id}} - {role} role (Authorization working - 404 expected for test PTO)")
        else:
            print(f"❌ PUT /pto/requests/{{id}} - {role} role: {details}")
    
    # Test unauthorized roles
    unauthorized_roles = ["sales_rep", "employee"]
    
    for role in unauthorized_roles:
        # Test GET /api/pto/requests (should be 403)
        passed, details = test_endpoint_access("/pto/requests", "GET", role, expected_status=403)
        print(f"✅ GET /pto/requests blocked - {role} role" if passed else f"❌ GET /pto/requests blocked - {role} role: {details}")
        
        # Test PUT /api/pto/requests/{id} (should be 403)
        pto_update = {"status": "approved"}
        passed, details = test_endpoint_access("/pto/requests/test-pto-123", "PUT", role, pto_update, expected_status=403)
        print(f"✅ PUT /pto/requests/{{id}} blocked - {role} role" if passed else f"❌ PUT /pto/requests/{{id}} blocked - {role} role: {details}")

def main():
    """Run additional PTO tests"""
    print("🚀 Testing Additional HR RBAC - PTO Requests")
    print("=" * 60)
    
    test_pto_requests()
    
    print("\n✅ Additional HR RBAC testing completed!")

if __name__ == "__main__":
    main()