#!/usr/bin/env python3
"""
Debug authentication roles
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
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except Exception as e:
        print(f"Request failed: {str(e)}")
        return None

def debug_auth_roles():
    print("🔍 Debugging Authentication Roles...")
    
    tokens = {
        "super_admin": "dev-token-super_admin",
        "sales_rep": "dev-token-sales_rep",
        "hr_manager": "dev-token-hr_manager",
        "sales_manager": "dev-token-sales_manager"
    }
    
    for role_name, token in tokens.items():
        print(f"\n{role_name.upper()} TOKEN:")
        response = make_request("GET", "/auth/me", auth_token=token)
        
        if response and response.status_code == 200:
            try:
                user_data = response.json()
                print(f"  Role returned: {user_data.get('role')}")
                print(f"  Name: {user_data.get('name')}")
                print(f"  Email: {user_data.get('email')}")
            except:
                print("  Could not parse user data")
        else:
            print(f"  Failed: {response.status_code if response else 'No response'}")

if __name__ == "__main__":
    debug_auth_roles()