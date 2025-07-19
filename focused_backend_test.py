#!/usr/bin/env python3
"""
Focused Backend Testing for Three Newly Implemented Features:
1. QR Code Lead Email Routing to Sales Managers Only
2. Sales Leaderboard Backend API Development  
3. QR Code Generator Backend APIs (Re-verification)
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import time

# Configuration - Use external URL for testing
BASE_URL = "https://233ca807-7ec6-45fa-92ee-267cd8ec8830.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class FocusedRoofHRTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS.copy()
        self.auth_token = "dev-token-super_admin"  # Use dev token for testing
        self.test_results = {
            "qr_lead_email_routing": {},
            "sales_leaderboard_api": {},
            "qr_generator_verification": {}
        }
        
    def log_result(self, category, test_name, success, message, response_data=None):
        """Log test results"""
        self.test_results[category][test_name] = {
            "success": success,
            "message": message,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        }
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {category.upper()}: {test_name} - {message}")
        
    def make_request(self, method, endpoint, data=None, auth_required=True):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = self.headers.copy()
        
        if auth_required and self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
            
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
        except requests.exceptions.Timeout as e:
            print(f"Request timeout: {str(e)}")
            return None
        except requests.exceptions.ConnectionError as e:
            print(f"Connection error: {str(e)}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_qr_lead_email_routing_to_sales_managers(self):
        """Test QR Code Lead Email Routing to Sales Managers Only"""
        print("\n📧 Testing QR Code Lead Email Routing to Sales Managers Only...")
        
        # First, verify we have sales reps to work with
        print("Step 1: Getting available sales reps...")
        response = self.make_request("GET", "/qr-generator/reps", auth_required=True)
        
        if response is None or response.status_code != 200:
            self.log_result("qr_lead_email_routing", "get_sales_reps", False, "Could not retrieve sales reps for testing")
            return
        
        try:
            reps = response.json()
            if not reps:
                self.log_result("qr_lead_email_routing", "get_sales_reps", False, "No sales reps found for testing")
                return
            
            test_rep = reps[0]  # Use first available rep
            rep_id = test_rep["id"]
            rep_name = test_rep["name"]
            
            self.log_result("qr_lead_email_routing", "get_sales_reps", True, f"Found {len(reps)} sales reps, using {rep_name} for testing")
            
        except json.JSONDecodeError:
            self.log_result("qr_lead_email_routing", "get_sales_reps", False, "Invalid JSON response from sales reps endpoint")
            return
        
        # Test 2: Create a new lead (public endpoint - should work without auth)
        print("Step 2: Creating new lead via public endpoint...")
        lead_data = {
            "name": "Emily Rodriguez",
            "email": "emily.rodriguez@email.com", 
            "phone": "(555) 987-6543",
            "address": "456 Oak Street, Richmond, VA 23220",
            "message": "I need a roof inspection after recent storm damage. Please contact me to schedule an appointment.",
            "rep_id": rep_id
        }
        
        response = self.make_request("POST", "/qr-generator/leads", lead_data, auth_required=False)
        
        if response is None:
            self.log_result("qr_lead_email_routing", "create_lead_public", False, "No response received from lead creation endpoint")
            return
        
        if response.status_code == 201:
            try:
                created_lead = response.json()
                lead_id = created_lead.get("id")
                self.log_result("qr_lead_email_routing", "create_lead_public", True, f"Lead created successfully with ID: {lead_id}")
                
                # Verify lead was created with correct data
                if (created_lead.get("name") == lead_data["name"] and 
                    created_lead.get("email") == lead_data["email"] and
                    created_lead.get("rep_id") == rep_id):
                    self.log_result("qr_lead_email_routing", "lead_data_integrity", True, "Lead data stored correctly")
                else:
                    self.log_result("qr_lead_email_routing", "lead_data_integrity", False, "Lead data not stored correctly")
                    
            except json.JSONDecodeError:
                self.log_result("qr_lead_email_routing", "create_lead_public", False, "Invalid JSON response from lead creation")
                return
                
        elif response.status_code == 404:
            self.log_result("qr_lead_email_routing", "create_lead_public", False, f"Sales rep {rep_id} not found - endpoint working but rep doesn't exist")
            return
        else:
            self.log_result("qr_lead_email_routing", "create_lead_public", False, f"Lead creation failed with status {response.status_code}")
            return
        
        # Test 3: Verify the send_lead_notification function routes to sales managers
        print("Step 3: Verifying email routing implementation...")
        try:
            # Read the server.py file to check the modified send_lead_notification function
            with open('/app/backend/server.py', 'r') as f:
                server_content = f.read()
            
            # Check for sales manager routing logic
            routing_checks = [
                'sales_managers = await db.users.find({"role": "sales_manager"}).to_list(100)',
                'if not sales_managers:',
                'super_admins = await db.users.find({"role": "super_admin"}).to_list(100)',
                'sales_managers = super_admins',
                'for manager in sales_managers:'
            ]
            
            routing_implemented = True
            missing_checks = []
            for check in routing_checks:
                if check not in server_content:
                    routing_implemented = False
                    missing_checks.append(check)
            
            if routing_implemented:
                self.log_result("qr_lead_email_routing", "sales_manager_routing_logic", True, 
                               "Email routing to sales managers properly implemented")
            else:
                self.log_result("qr_lead_email_routing", "sales_manager_routing_logic", False, 
                               f"Missing routing logic: {missing_checks}")
            
            # Check that old individual rep routing is removed
            old_routing_patterns = [
                'await send_email(rep_email,',  # Old pattern sending to individual rep
                'rep["email"]'  # Old pattern using rep email directly
            ]
            
            old_routing_removed = True
            for pattern in old_routing_patterns:
                if pattern in server_content and 'sales_managers' not in server_content[server_content.find(pattern):server_content.find(pattern)+200]:
                    old_routing_removed = False
                    break
            
            if old_routing_removed:
                self.log_result("qr_lead_email_routing", "old_routing_removed", True, 
                               "Old individual rep email routing properly removed")
            else:
                self.log_result("qr_lead_email_routing", "old_routing_removed", False, 
                               "Old individual rep email routing still present")
                
        except Exception as e:
            self.log_result("qr_lead_email_routing", "email_routing_verification", False, 
                           f"Could not verify email routing implementation: {str(e)}")
        
        # Test 4: Verify fallback to super_admin logic
        print("Step 4: Verifying fallback to super_admin logic...")
        try:
            fallback_checks = [
                'if not sales_managers:',
                'super_admins = await db.users.find({"role": "super_admin"}).to_list(100)',
                'sales_managers = super_admins'
            ]
            
            fallback_implemented = all(check in server_content for check in fallback_checks)
            
            if fallback_implemented:
                self.log_result("qr_lead_email_routing", "super_admin_fallback", True, 
                               "Fallback to super_admin properly implemented")
            else:
                self.log_result("qr_lead_email_routing", "super_admin_fallback", False, 
                               "Fallback to super_admin not properly implemented")
                
        except Exception as e:
            self.log_result("qr_lead_email_routing", "super_admin_fallback", False, 
                           f"Could not verify super_admin fallback: {str(e)}")

    def test_sales_leaderboard_backend_api(self):
        """Test Sales Leaderboard Backend API Development"""
        print("\n📊 Testing Sales Leaderboard Backend API Development...")
        
        # Test 1: Check if leaderboard endpoints exist
        print("Step 1: Testing leaderboard endpoint availability...")
        
        # Test dashboard endpoint for a sample rep
        test_rep_id = "rep-789"  # Using sample rep ID
        response = self.make_request("GET", f"/leaderboard/dashboard/{test_rep_id}", auth_required=True)
        
        if response is None:
            self.log_result("sales_leaderboard_api", "dashboard_endpoint_availability", False, "No response from dashboard endpoint")
            return
        
        if response.status_code == 200:
            try:
                dashboard_data = response.json()
                self.log_result("sales_leaderboard_api", "dashboard_endpoint_availability", True, 
                               f"Dashboard endpoint accessible, returned data keys: {list(dashboard_data.keys())}")
                
                # Test data structure for bar chart requirements
                expected_fields = ["monthly_metrics", "yearly_metrics", "goals", "actual_values"]
                recharts_compatible = True
                missing_fields = []
                
                # Check if data structure is suitable for Recharts bar charts
                if isinstance(dashboard_data, dict):
                    # Look for data that can be used for bar charts
                    chart_data_found = False
                    
                    # Check for various possible data structures
                    if "competitions" in dashboard_data:
                        chart_data_found = True
                        self.log_result("sales_leaderboard_api", "bar_chart_data_structure", True, 
                                       "Dashboard contains competitions data suitable for visualization")
                    
                    if "metrics" in dashboard_data or "goals" in dashboard_data:
                        chart_data_found = True
                        self.log_result("sales_leaderboard_api", "metrics_data_available", True, 
                                       "Dashboard contains metrics/goals data")
                    
                    if not chart_data_found:
                        self.log_result("sales_leaderboard_api", "bar_chart_data_structure", False, 
                                       "Dashboard data structure may not be optimal for bar charts")
                else:
                    self.log_result("sales_leaderboard_api", "bar_chart_data_structure", False, 
                                   "Dashboard response is not a dictionary")
                    
            except json.JSONDecodeError:
                self.log_result("sales_leaderboard_api", "dashboard_endpoint_availability", False, 
                               "Invalid JSON response from dashboard endpoint")
                
        elif response.status_code == 404:
            self.log_result("sales_leaderboard_api", "dashboard_endpoint_availability", False, 
                           f"Dashboard endpoint not found for rep {test_rep_id}")
        else:
            self.log_result("sales_leaderboard_api", "dashboard_endpoint_availability", False, 
                           f"Dashboard endpoint returned status {response.status_code}")
        
        # Test 2: Test leaderboard goals endpoint
        print("Step 2: Testing leaderboard goals endpoint...")
        response = self.make_request("GET", "/leaderboard/goals", auth_required=True)
        
        if response is not None and response.status_code == 200:
            try:
                goals_data = response.json()
                if isinstance(goals_data, list):
                    self.log_result("sales_leaderboard_api", "goals_endpoint", True, 
                                   f"Goals endpoint working, returned {len(goals_data)} goals")
                else:
                    self.log_result("sales_leaderboard_api", "goals_endpoint", False, 
                                   "Goals endpoint response is not a list")
            except json.JSONDecodeError:
                self.log_result("sales_leaderboard_api", "goals_endpoint", False, 
                               "Invalid JSON response from goals endpoint")
        elif response is not None:
            self.log_result("sales_leaderboard_api", "goals_endpoint", False, 
                           f"Goals endpoint returned status {response.status_code}")
        else:
            self.log_result("sales_leaderboard_api", "goals_endpoint", False, 
                           "No response from goals endpoint")
        
        # Test 3: Test leaderboard signups endpoint
        print("Step 3: Testing leaderboard signups endpoint...")
        response = self.make_request("GET", "/leaderboard/signups", auth_required=True)
        
        if response is not None and response.status_code == 200:
            try:
                signups_data = response.json()
                if isinstance(signups_data, list):
                    self.log_result("sales_leaderboard_api", "signups_endpoint", True, 
                                   f"Signups endpoint working, returned {len(signups_data)} signups")
                else:
                    self.log_result("sales_leaderboard_api", "signups_endpoint", False, 
                                   "Signups endpoint response is not a list")
            except json.JSONDecodeError:
                self.log_result("sales_leaderboard_api", "signups_endpoint", False, 
                               "Invalid JSON response from signups endpoint")
        elif response is not None:
            self.log_result("sales_leaderboard_api", "signups_endpoint", False, 
                           f"Signups endpoint returned status {response.status_code}")
        else:
            self.log_result("sales_leaderboard_api", "signups_endpoint", False, 
                           "No response from signups endpoint")
        
        # Test 4: Test sample data structure for Recharts compatibility
        print("Step 4: Testing sample data creation for bar charts...")
        response = self.make_request("POST", "/leaderboard/initialize-sample-data", auth_required=True)
        
        if response is not None and response.status_code in [200, 201]:
            try:
                init_response = response.json()
                self.log_result("sales_leaderboard_api", "sample_data_initialization", True, 
                               f"Sample data initialization successful: {init_response.get('message', 'Success')}")
            except json.JSONDecodeError:
                self.log_result("sales_leaderboard_api", "sample_data_initialization", True, 
                               "Sample data initialization completed (non-JSON response)")
        elif response is not None:
            self.log_result("sales_leaderboard_api", "sample_data_initialization", False, 
                           f"Sample data initialization returned status {response.status_code}")
        else:
            self.log_result("sales_leaderboard_api", "sample_data_initialization", False, 
                           "No response from sample data initialization")
        
        # Test 5: Verify leaderboard models exist
        print("Step 5: Verifying leaderboard data models...")
        try:
            with open('/app/backend/server.py', 'r') as f:
                server_content = f.read()
            
            required_models = ['SalesGoal', 'SalesSignup', 'SalesCompetition', 'SalesMetrics', 'BonusTier', 'TeamAssignment']
            models_found = []
            
            for model in required_models:
                if f'class {model}(BaseModel):' in server_content:
                    models_found.append(model)
            
            if len(models_found) == len(required_models):
                self.log_result("sales_leaderboard_api", "leaderboard_models", True, 
                               f"All leaderboard models found: {', '.join(models_found)}")
            else:
                missing = set(required_models) - set(models_found)
                self.log_result("sales_leaderboard_api", "leaderboard_models", False, 
                               f"Missing leaderboard models: {', '.join(missing)}")
                
        except Exception as e:
            self.log_result("sales_leaderboard_api", "leaderboard_models", False, 
                           f"Could not verify leaderboard models: {str(e)}")

    def test_qr_generator_backend_verification(self):
        """Re-verify QR Code Generator Backend APIs after email routing changes"""
        print("\n🔗 Re-verifying QR Code Generator Backend APIs...")
        
        # Test 1: Verify authentication still works
        print("Step 1: Testing authentication requirements...")
        response = self.make_request("GET", "/qr-generator/reps", auth_required=False)
        
        if response is not None and response.status_code in [401, 403]:
            self.log_result("qr_generator_verification", "auth_requirements", True, 
                           "Authentication requirements still properly enforced")
        elif response is not None:
            self.log_result("qr_generator_verification", "auth_requirements", False, 
                           f"Expected 401/403 without auth, got {response.status_code}")
        else:
            self.log_result("qr_generator_verification", "auth_requirements", False, 
                           "No response received")
        
        # Test 2: Verify authenticated access works
        print("Step 2: Testing authenticated access...")
        response = self.make_request("GET", "/qr-generator/reps", auth_required=True)
        
        if response is not None and response.status_code == 200:
            try:
                reps = response.json()
                if isinstance(reps, list):
                    self.log_result("qr_generator_verification", "authenticated_access", True, 
                                   f"Authenticated access working, found {len(reps)} sales reps")
                else:
                    self.log_result("qr_generator_verification", "authenticated_access", False, 
                                   "Response is not a list")
            except json.JSONDecodeError:
                self.log_result("qr_generator_verification", "authenticated_access", False, 
                               "Invalid JSON response")
        elif response is not None:
            self.log_result("qr_generator_verification", "authenticated_access", False, 
                           f"Expected 200 with auth, got {response.status_code}")
        else:
            self.log_result("qr_generator_verification", "authenticated_access", False, 
                           "No response received")
        
        # Test 3: Verify public endpoints still work
        print("Step 3: Testing public endpoint accessibility...")
        
        # Test public landing page endpoint
        response = self.make_request("GET", "/public/rep/john-smith", auth_required=False)
        
        if response is not None and response.status_code in [200, 404]:
            self.log_result("qr_generator_verification", "public_endpoints", True, 
                           f"Public endpoints accessible (status: {response.status_code})")
        elif response is not None and response.status_code in [401, 403]:
            self.log_result("qr_generator_verification", "public_endpoints", False, 
                           "Public endpoints incorrectly require authentication")
        elif response is not None:
            self.log_result("qr_generator_verification", "public_endpoints", True, 
                           f"Public endpoints accessible (status: {response.status_code})")
        else:
            self.log_result("qr_generator_verification", "public_endpoints", False, 
                           "No response from public endpoints")
        
        # Test 4: Test lead creation still works after email routing changes
        print("Step 4: Testing lead creation after email routing changes...")
        
        # First get a rep to use
        response = self.make_request("GET", "/qr-generator/reps", auth_required=True)
        if response is not None and response.status_code == 200:
            try:
                reps = response.json()
                if reps:
                    test_rep = reps[0]
                    rep_id = test_rep["id"]
                    
                    # Create a test lead
                    lead_data = {
                        "name": "Michael Thompson",
                        "email": "michael.thompson@email.com",
                        "phone": "(555) 123-4567",
                        "address": "789 Pine Avenue, Norfolk, VA 23510",
                        "message": "Looking for commercial roofing services for my business.",
                        "rep_id": rep_id
                    }
                    
                    response = self.make_request("POST", "/qr-generator/leads", lead_data, auth_required=False)
                    
                    if response is not None and response.status_code == 201:
                        try:
                            created_lead = response.json()
                            self.log_result("qr_generator_verification", "lead_creation_after_changes", True, 
                                           f"Lead creation still working after email routing changes, created lead ID: {created_lead.get('id')}")
                        except json.JSONDecodeError:
                            self.log_result("qr_generator_verification", "lead_creation_after_changes", False, 
                                           "Lead creation returned invalid JSON")
                    elif response is not None:
                        self.log_result("qr_generator_verification", "lead_creation_after_changes", False, 
                                       f"Lead creation failed with status {response.status_code}")
                    else:
                        self.log_result("qr_generator_verification", "lead_creation_after_changes", False, 
                                       "No response from lead creation")
                else:
                    self.log_result("qr_generator_verification", "lead_creation_after_changes", False, 
                                   "No sales reps available for testing")
            except json.JSONDecodeError:
                self.log_result("qr_generator_verification", "lead_creation_after_changes", False, 
                               "Could not get sales reps for testing")
        
        # Test 5: Verify QR generator helper functions still exist
        print("Step 5: Verifying QR generator helper functions...")
        try:
            with open('/app/backend/server.py', 'r') as f:
                server_content = f.read()
            
            required_functions = [
                'def generate_qr_code(',
                'def generate_landing_page_url(',
                'async def send_lead_notification('
            ]
            
            functions_found = []
            for func in required_functions:
                if func in server_content:
                    functions_found.append(func.split('(')[0].replace('def ', '').replace('async ', ''))
            
            if len(functions_found) == len(required_functions):
                self.log_result("qr_generator_verification", "helper_functions", True, 
                               f"All QR generator helper functions still exist: {', '.join(functions_found)}")
            else:
                missing = set([f.split('(')[0].replace('def ', '').replace('async ', '') for f in required_functions]) - set(functions_found)
                self.log_result("qr_generator_verification", "helper_functions", False, 
                               f"Missing QR generator helper functions: {', '.join(missing)}")
                
        except Exception as e:
            self.log_result("qr_generator_verification", "helper_functions", False, 
                           f"Could not verify QR generator helper functions: {str(e)}")

    def run_focused_tests(self):
        """Run all focused tests"""
        print("🚀 Starting Focused Backend Testing for Three New Features...")
        print("=" * 80)
        
        # Test 1: QR Code Lead Email Routing to Sales Managers Only
        self.test_qr_lead_email_routing_to_sales_managers()
        
        # Test 2: Sales Leaderboard Backend API Development
        self.test_sales_leaderboard_backend_api()
        
        # Test 3: QR Code Generator Backend APIs (Re-verification)
        self.test_qr_generator_backend_verification()
        
        # Print summary
        self.print_test_summary()
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📋 FOCUSED BACKEND TESTING SUMMARY")
        print("=" * 80)
        
        total_tests = 0
        passed_tests = 0
        
        for category, tests in self.test_results.items():
            category_passed = 0
            category_total = len(tests)
            
            print(f"\n🔍 {category.upper().replace('_', ' ')}:")
            for test_name, result in tests.items():
                status = "✅ PASS" if result["success"] else "❌ FAIL"
                print(f"  {status} {test_name}: {result['message']}")
                if result["success"]:
                    category_passed += 1
                    passed_tests += 1
                total_tests += 1
            
            if category_total > 0:
                percentage = (category_passed / category_total) * 100
                print(f"  📊 Category Score: {category_passed}/{category_total} ({percentage:.1f}%)")
        
        print(f"\n🎯 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {total_tests - passed_tests}")
        if total_tests > 0:
            overall_percentage = (passed_tests / total_tests) * 100
            print(f"   Success Rate: {overall_percentage:.1f}%")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = FocusedRoofHRTester()
    tester.run_focused_tests()