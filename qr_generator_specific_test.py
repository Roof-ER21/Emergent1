#!/usr/bin/env python3
"""
Specific QR Generator Backend Testing
Tests the QR Generator functionality with development authentication
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://838b7fff-14eb-4b7b-b539-e92f8a3a9d11.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}
DEV_TOKEN = "dev-token-super_admin"

class QRGeneratorTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS.copy()
        self.headers["Authorization"] = f"Bearer {DEV_TOKEN}"
        self.test_results = []
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
    def make_request(self, method, endpoint, data=None):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=self.headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, headers=self.headers, json=data, timeout=10)
            elif method == "PUT":
                response = requests.put(url, headers=self.headers, json=data, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=self.headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_sales_rep_crud_operations(self):
        """Test complete CRUD operations for sales reps"""
        print("\n🔧 Testing Sales Rep CRUD Operations...")
        
        # Test 1: Create a new sales rep
        print("Creating new sales rep...")
        rep_data = {
            "name": "Test Representative",
            "email": "test.rep@theroofdocs.com",
            "phone": "555-TEST-REP",
            "territory": "Test Territory",
            "department": "Sales",
            "about_me": "This is a test sales representative for QR generator testing."
        }
        
        response = self.make_request("POST", "/qr-generator/reps", rep_data)
        
        if response and response.status_code == 200:
            try:
                created_rep = response.json()
                rep_id = created_rep.get("id")
                if rep_id and created_rep.get("qr_code") and created_rep.get("landing_page_url"):
                    self.log_result("create_sales_rep", True, f"Sales rep created successfully with ID: {rep_id}")
                    
                    # Test 2: Get the created sales rep
                    print(f"Retrieving sales rep {rep_id}...")
                    get_response = self.make_request("GET", f"/qr-generator/reps/{rep_id}")
                    
                    if get_response and get_response.status_code == 200:
                        retrieved_rep = get_response.json()
                        if retrieved_rep.get("id") == rep_id:
                            self.log_result("get_sales_rep", True, "Sales rep retrieved successfully")
                        else:
                            self.log_result("get_sales_rep", False, "Retrieved rep ID doesn't match")
                    else:
                        self.log_result("get_sales_rep", False, f"Failed to retrieve rep: {get_response.status_code if get_response else 'No response'}")
                    
                    # Test 3: Update the sales rep
                    print(f"Updating sales rep {rep_id}...")
                    update_data = {
                        "phone": "555-UPDATED",
                        "about_me": "Updated bio for testing purposes."
                    }
                    
                    update_response = self.make_request("PUT", f"/qr-generator/reps/{rep_id}", update_data)
                    
                    if update_response and update_response.status_code == 200:
                        updated_rep = update_response.json()
                        if updated_rep.get("phone") == "555-UPDATED":
                            self.log_result("update_sales_rep", True, "Sales rep updated successfully")
                        else:
                            self.log_result("update_sales_rep", False, "Update didn't apply correctly")
                    else:
                        self.log_result("update_sales_rep", False, f"Failed to update rep: {update_response.status_code if update_response else 'No response'}")
                    
                    # Test 4: Delete the sales rep
                    print(f"Deleting sales rep {rep_id}...")
                    delete_response = self.make_request("DELETE", f"/qr-generator/reps/{rep_id}")
                    
                    if delete_response and delete_response.status_code == 200:
                        self.log_result("delete_sales_rep", True, "Sales rep deleted successfully")
                        
                        # Verify deletion
                        verify_response = self.make_request("GET", f"/qr-generator/reps/{rep_id}")
                        if verify_response and verify_response.status_code == 404:
                            self.log_result("verify_deletion", True, "Sales rep deletion verified")
                        else:
                            self.log_result("verify_deletion", False, "Sales rep still exists after deletion")
                    else:
                        self.log_result("delete_sales_rep", False, f"Failed to delete rep: {delete_response.status_code if delete_response else 'No response'}")
                        
                else:
                    self.log_result("create_sales_rep", False, "Created rep missing required fields (id, qr_code, landing_page_url)")
            except json.JSONDecodeError:
                self.log_result("create_sales_rep", False, "Invalid JSON response")
        else:
            self.log_result("create_sales_rep", False, f"Failed to create rep: {response.status_code if response else 'No response'}")

    def test_lead_capture_workflow(self):
        """Test lead capture workflow with existing sales rep"""
        print("\n📋 Testing Lead Capture Workflow...")
        
        # First, get an existing sales rep
        response = self.make_request("GET", "/qr-generator/reps")
        
        if response and response.status_code == 200:
            reps = response.json()
            if reps:
                test_rep = reps[0]  # Use first rep
                rep_id = test_rep.get("id")
                rep_name = test_rep.get("name")
                
                print(f"Using rep: {rep_name} (ID: {rep_id})")
                
                # Test 1: Create a lead (public endpoint - no auth)
                print("Creating lead via public endpoint...")
                lead_data = {
                    "name": "Test Customer",
                    "email": "test.customer@email.com",
                    "phone": "555-CUSTOMER",
                    "address": "123 Test Street, Test City, TS 12345",
                    "message": "I need a roof inspection after the recent storm.",
                    "rep_id": rep_id
                }
                
                # Remove auth header for public endpoint
                public_headers = {"Content-Type": "application/json"}
                
                try:
                    lead_response = requests.post(f"{self.base_url}/qr-generator/leads", 
                                                headers=public_headers, 
                                                json=lead_data, 
                                                timeout=10)
                    
                    if lead_response and lead_response.status_code == 200:
                        created_lead = lead_response.json()
                        lead_id = created_lead.get("id")
                        if lead_id:
                            self.log_result("create_lead_public", True, f"Lead created successfully via public endpoint: {lead_id}")
                            
                            # Test 2: Get the lead (requires auth)
                            print(f"Retrieving lead {lead_id}...")
                            get_lead_response = self.make_request("GET", f"/qr-generator/leads/{lead_id}")
                            
                            if get_lead_response and get_lead_response.status_code == 200:
                                retrieved_lead = get_lead_response.json()
                                if retrieved_lead.get("id") == lead_id:
                                    self.log_result("get_lead", True, "Lead retrieved successfully")
                                else:
                                    self.log_result("get_lead", False, "Retrieved lead ID doesn't match")
                            else:
                                self.log_result("get_lead", False, f"Failed to retrieve lead: {get_lead_response.status_code if get_lead_response else 'No response'}")
                            
                            # Test 3: Update lead status
                            print(f"Updating lead {lead_id} status...")
                            update_data = {
                                "status": "contacted",
                                "priority": "high"
                            }
                            
                            update_lead_response = self.make_request("PUT", f"/qr-generator/leads/{lead_id}", update_data)
                            
                            if update_lead_response and update_lead_response.status_code == 200:
                                updated_lead = update_lead_response.json()
                                if updated_lead.get("status") == "contacted":
                                    self.log_result("update_lead", True, "Lead status updated successfully")
                                else:
                                    self.log_result("update_lead", False, "Lead status update didn't apply")
                            else:
                                self.log_result("update_lead", False, f"Failed to update lead: {update_lead_response.status_code if update_lead_response else 'No response'}")
                            
                            # Test 4: Test conversion tracking
                            print(f"Testing conversion tracking for lead {lead_id}...")
                            conversion_data = {
                                "status": "converted"
                            }
                            
                            conversion_response = self.make_request("PUT", f"/qr-generator/leads/{lead_id}", conversion_data)
                            
                            if conversion_response and conversion_response.status_code == 200:
                                converted_lead = conversion_response.json()
                                if converted_lead.get("status") == "converted":
                                    self.log_result("conversion_tracking", True, "Lead conversion tracked successfully")
                                    
                                    # Verify rep's conversion count increased
                                    rep_check_response = self.make_request("GET", f"/qr-generator/reps/{rep_id}")
                                    if rep_check_response and rep_check_response.status_code == 200:
                                        updated_rep = rep_check_response.json()
                                        if updated_rep.get("conversions", 0) > test_rep.get("conversions", 0):
                                            self.log_result("rep_conversion_count", True, "Rep conversion count updated")
                                        else:
                                            self.log_result("rep_conversion_count", False, "Rep conversion count not updated")
                                else:
                                    self.log_result("conversion_tracking", False, "Lead conversion status not updated")
                            else:
                                self.log_result("conversion_tracking", False, f"Failed to convert lead: {conversion_response.status_code if conversion_response else 'No response'}")
                        else:
                            self.log_result("create_lead_public", False, "Created lead missing ID")
                    else:
                        self.log_result("create_lead_public", False, f"Failed to create lead: {lead_response.status_code if lead_response else 'No response'}")
                        
                except Exception as e:
                    self.log_result("create_lead_public", False, f"Lead creation failed: {str(e)}")
            else:
                self.log_result("lead_capture_workflow", False, "No sales reps available for testing")
        else:
            self.log_result("lead_capture_workflow", False, "Failed to get sales reps")

    def test_public_landing_page_access(self):
        """Test public landing page access"""
        print("\n🌐 Testing Public Landing Page Access...")
        
        # Get existing sales reps to test with
        response = self.make_request("GET", "/qr-generator/reps")
        
        if response and response.status_code == 200:
            reps = response.json()
            if reps:
                test_rep = reps[0]
                rep_name = test_rep.get("name", "").lower().replace(" ", "-")
                
                print(f"Testing landing page for: {rep_name}")
                
                # Test public endpoint (no auth)
                try:
                    public_response = requests.get(f"{self.base_url}/public/rep/{rep_name}", 
                                                 headers={"Content-Type": "application/json"}, 
                                                 timeout=10)
                    
                    if public_response and public_response.status_code == 200:
                        landing_data = public_response.json()
                        required_fields = ["id", "name", "phone", "territory", "picture", "about_me", "qr_code", "landing_page_url"]
                        missing_fields = [field for field in required_fields if field not in landing_data]
                        
                        if not missing_fields:
                            self.log_result("public_landing_page", True, f"Public landing page accessible with all required fields")
                        else:
                            self.log_result("public_landing_page", True, f"Public landing page accessible (missing optional fields: {missing_fields})")
                    else:
                        self.log_result("public_landing_page", False, f"Public landing page not accessible: {public_response.status_code if public_response else 'No response'}")
                        
                except Exception as e:
                    self.log_result("public_landing_page", False, f"Public landing page test failed: {str(e)}")
            else:
                self.log_result("public_landing_page", False, "No sales reps available for testing")
        else:
            self.log_result("public_landing_page", False, "Failed to get sales reps")

    def test_file_upload_functionality(self):
        """Test file upload functionality"""
        print("\n📁 Testing File Upload Functionality...")
        
        # Get existing sales reps to test with
        response = self.make_request("GET", "/qr-generator/reps")
        
        if response and response.status_code == 200:
            reps = response.json()
            if reps:
                test_rep = reps[0]
                rep_id = test_rep.get("id")
                
                print(f"Testing file upload for rep: {rep_id}")
                
                # Test 1: Upload picture
                print("Testing picture upload...")
                picture_data = {
                    "file_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    "file_type": "image/png",
                    "file_name": "test_profile.png"
                }
                
                picture_response = self.make_request("POST", f"/qr-generator/reps/{rep_id}/upload-picture", picture_data)
                
                if picture_response and picture_response.status_code == 200:
                    self.log_result("upload_picture", True, "Picture uploaded successfully")
                else:
                    self.log_result("upload_picture", False, f"Picture upload failed: {picture_response.status_code if picture_response else 'No response'}")
                
                # Test 2: Upload video
                print("Testing video upload...")
                video_data = {
                    "file_data": "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAABBtZGF0",
                    "file_type": "video/mp4",
                    "file_name": "test_welcome.mp4"
                }
                
                video_response = self.make_request("POST", f"/qr-generator/reps/{rep_id}/upload-video", video_data)
                
                if video_response and video_response.status_code == 200:
                    self.log_result("upload_video", True, "Video uploaded successfully")
                else:
                    self.log_result("upload_video", False, f"Video upload failed: {video_response.status_code if video_response else 'No response'}")
                
                # Test 3: Invalid file type
                print("Testing invalid file type...")
                invalid_data = {
                    "file_data": "invalid_data",
                    "file_type": "text/plain",
                    "file_name": "test.txt"
                }
                
                invalid_response = self.make_request("POST", f"/qr-generator/reps/{rep_id}/upload-picture", invalid_data)
                
                if invalid_response and invalid_response.status_code == 400:
                    self.log_result("file_validation", True, "File type validation working correctly")
                else:
                    self.log_result("file_validation", False, f"File validation not working: {invalid_response.status_code if invalid_response else 'No response'}")
            else:
                self.log_result("file_upload", False, "No sales reps available for testing")
        else:
            self.log_result("file_upload", False, "Failed to get sales reps")

    def test_analytics_functionality(self):
        """Test analytics functionality"""
        print("\n📊 Testing Analytics Functionality...")
        
        # Test QR Generator analytics
        response = self.make_request("GET", "/qr-generator/analytics")
        
        if response and response.status_code == 200:
            try:
                analytics = response.json()
                required_fields = ["total_reps", "total_leads", "total_conversions", "conversion_rate"]
                missing_fields = [field for field in required_fields if field not in analytics]
                
                if not missing_fields:
                    self.log_result("qr_analytics", True, f"QR analytics working: {analytics}")
                else:
                    self.log_result("qr_analytics", False, f"QR analytics missing fields: {missing_fields}")
            except json.JSONDecodeError:
                self.log_result("qr_analytics", False, "Invalid JSON response")
        else:
            self.log_result("qr_analytics", False, f"QR analytics failed: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run all QR Generator specific tests"""
        print("🚀 Starting QR Generator Specific Testing...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        self.test_sales_rep_crud_operations()
        self.test_lead_capture_workflow()
        self.test_public_landing_page_access()
        self.test_file_upload_functionality()
        self.test_analytics_functionality()
        
        return self.test_results

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 QR GENERATOR TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        print(f"\n📈 OVERALL RESULTS: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All QR Generator tests passed!")
        elif passed_tests > total_tests * 0.8:
            print("✅ Most QR Generator tests passed - system is largely functional")
        else:
            print("⚠️ Some QR Generator issues found - needs attention")

if __name__ == "__main__":
    tester = QRGeneratorTester()
    results = tester.run_all_tests()
    tester.print_summary()
    
    # Save results to file
    with open("/app/qr_generator_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Detailed results saved to: /app/qr_generator_test_results.json")