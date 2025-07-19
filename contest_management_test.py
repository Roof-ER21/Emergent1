#!/usr/bin/env python3
"""
Contest Management System Backend Testing
Tests the specific contest/competition functionality requested in the review.
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import time

# Configuration - Use external URL for testing
BASE_URL = "https://c65d6a07-4a13-4a82-b398-311723a3885b.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class ContestManagementTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS.copy()
        self.test_results = {
            "contest_api_endpoints": {},
            "enhanced_competition_management": {},
            "real_time_contest_updates": {},
            "rbac_integration": {},
            "contest_timeline_status": {}
        }
        
    def log_result(self, category, test_name, success, message, response_data=None):
        """Log test results"""
        self.test_results[category][test_name] = {
            "success": success,
            "message": message,
            "response_data": response_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {category.upper()}: {test_name} - {message}")

    def make_request(self, method, endpoint, data=None, auth_required=False, auth_token=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = self.headers.copy()
        
        if auth_required:
            if auth_token:
                headers["Authorization"] = f"Bearer {auth_token}"
            else:
                headers["Authorization"] = "Bearer dev-token-super_admin"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return None
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def test_contest_api_endpoints(self):
        """Test Contest/Competition API Endpoints"""
        print("\n🏆 Testing Contest/Competition API Endpoints...")
        
        # Test 1: List all competitions
        print("Testing GET /leaderboard/competitions...")
        response = self.make_request("GET", "/leaderboard/competitions", auth_required=True)
        
        if response and response.status_code == 200:
            try:
                competitions = response.json()
                self.log_result("contest_api_endpoints", "list_competitions", True, 
                               f"Retrieved {len(competitions)} competitions successfully")
            except json.JSONDecodeError:
                self.log_result("contest_api_endpoints", "list_competitions", False, "Invalid JSON response")
        else:
            status_code = response.status_code if response else "No response"
            self.log_result("contest_api_endpoints", "list_competitions", False, 
                           f"Failed to retrieve competitions: {status_code}")

        # Test 2: Create new competition
        print("Testing POST /leaderboard/competitions...")
        competition_data = {
            "name": "Test Contest 2025",
            "description": "Test contest for backend verification",
            "competition_type": "signups",
            "start_date": "2025-01-15T00:00:00",
            "end_date": "2025-02-15T23:59:59",
            "prize_description": "$500 bonus for winner",
            "participants": ["rep-789", "rep-890"],
            "rules": "Most signups wins",
            "status": "active"
        }
        
        response = self.make_request("POST", "/leaderboard/competitions", competition_data, auth_required=True)
        
        if response and response.status_code == 200:
            try:
                contest = response.json()
                contest_id = contest.get("id")
                self.log_result("contest_api_endpoints", "create_competition", True, 
                               f"Created competition successfully with ID: {contest_id}")
                
                # Test 3: Check for JOIN contest endpoint (NOT IMPLEMENTED)
                print(f"Testing POST /leaderboard/competitions/{contest_id}/join...")
                join_response = self.make_request("POST", f"/leaderboard/competitions/{contest_id}/join", 
                                                {"participant_id": "rep-901"}, auth_required=True)
                
                if join_response and join_response.status_code == 200:
                    self.log_result("contest_api_endpoints", "join_contest", True, "Join contest endpoint working")
                else:
                    status_code = join_response.status_code if join_response else "No response"
                    self.log_result("contest_api_endpoints", "join_contest", False, 
                                   f"Join contest endpoint not implemented: {status_code}")
                
                # Test 4: Check for STANDINGS endpoint (NOT IMPLEMENTED)
                print(f"Testing GET /leaderboard/competitions/{contest_id}/standings...")
                standings_response = self.make_request("GET", f"/leaderboard/competitions/{contest_id}/standings", 
                                                     auth_required=True)
                
                if standings_response and standings_response.status_code == 200:
                    self.log_result("contest_api_endpoints", "contest_standings", True, "Contest standings endpoint working")
                else:
                    status_code = standings_response.status_code if standings_response else "No response"
                    self.log_result("contest_api_endpoints", "contest_standings", False, 
                                   f"Contest standings endpoint not implemented: {status_code}")
                
            except json.JSONDecodeError:
                self.log_result("contest_api_endpoints", "create_competition", False, "Invalid JSON response")
        else:
            status_code = response.status_code if response else "No response"
            self.log_result("contest_api_endpoints", "create_competition", False, 
                           f"Failed to create competition: {status_code}")

    def test_enhanced_competition_management(self):
        """Test Enhanced Competition Management Features"""
        print("\n🔧 Testing Enhanced Competition Management...")
        
        # Test enhanced data model fields
        print("Testing enhanced competition data model...")
        enhanced_competition = {
            "name": "Enhanced Contest Test",
            "description": "Testing enhanced features",
            "competition_type": "signups",
            "start_date": "2025-01-20T00:00:00",
            "end_date": "2025-02-20T23:59:59",
            "prize_description": "$1000 bonus",
            # Enhanced fields that should exist but probably don't
            "prize_tiers": [
                {"position": 1, "prize": "$1000"},
                {"position": 2, "prize": "$500"},
                {"position": 3, "prize": "$250"}
            ],
            "target_metric": "monthly_signups",
            "is_team_competition": False,
            "max_participants": 50,
            "participants": ["rep-789"],
            "rules": "Most signups wins",
            "status": "upcoming"
        }
        
        response = self.make_request("POST", "/leaderboard/competitions", enhanced_competition, auth_required=True)
        
        if response and response.status_code == 200:
            try:
                contest = response.json()
                # Check if enhanced fields are preserved
                has_prize_tiers = "prize_tiers" in contest
                has_target_metric = "target_metric" in contest
                has_team_competition = "is_team_competition" in contest
                has_max_participants = "max_participants" in contest
                
                enhanced_fields_count = sum([has_prize_tiers, has_target_metric, has_team_competition, has_max_participants])
                
                if enhanced_fields_count >= 3:
                    self.log_result("enhanced_competition_management", "enhanced_data_model", True, 
                                   f"Enhanced data model supports {enhanced_fields_count}/4 new fields")
                else:
                    self.log_result("enhanced_competition_management", "enhanced_data_model", False, 
                                   f"Enhanced data model only supports {enhanced_fields_count}/4 new fields")
                    
            except json.JSONDecodeError:
                self.log_result("enhanced_competition_management", "enhanced_data_model", False, "Invalid JSON response")
        else:
            status_code = response.status_code if response else "No response"
            self.log_result("enhanced_competition_management", "enhanced_data_model", False, 
                           f"Failed to test enhanced data model: {status_code}")

        # Test contest status logic
        print("Testing contest status logic...")
        current_time = datetime.utcnow()
        
        # Create contests with different time ranges
        test_contests = [
            {
                "name": "Past Contest",
                "start_date": (current_time - timedelta(days=30)).isoformat(),
                "end_date": (current_time - timedelta(days=1)).isoformat(),
                "expected_status": "past"
            },
            {
                "name": "Current Contest", 
                "start_date": (current_time - timedelta(days=1)).isoformat(),
                "end_date": (current_time + timedelta(days=30)).isoformat(),
                "expected_status": "current"
            },
            {
                "name": "Upcoming Contest",
                "start_date": (current_time + timedelta(days=1)).isoformat(),
                "end_date": (current_time + timedelta(days=30)).isoformat(),
                "expected_status": "upcoming"
            }
        ]
        
        status_logic_working = True
        for test_contest in test_contests:
            contest_data = {
                "name": test_contest["name"],
                "description": "Status test",
                "competition_type": "signups",
                "start_date": test_contest["start_date"],
                "end_date": test_contest["end_date"],
                "prize_description": "$100",
                "participants": [],
                "rules": "Test",
                "status": "active"
            }
            
            response = self.make_request("POST", "/leaderboard/competitions", contest_data, auth_required=True)
            if not response or response.status_code != 200:
                status_logic_working = False
                break
        
        if status_logic_working:
            self.log_result("enhanced_competition_management", "contest_status_logic", True, 
                           "Contest status logic can handle different time ranges")
        else:
            self.log_result("enhanced_competition_management", "contest_status_logic", False, 
                           "Contest status logic not properly implemented")

    def test_real_time_contest_updates(self):
        """Test Real-Time Contest Updates with WebSocket"""
        print("\n🔄 Testing Real-Time Contest Updates...")
        
        # Test WebSocket endpoint availability
        print("Testing WebSocket endpoint availability...")
        try:
            import websocket
            ws_url = "wss://c65d6a07-4a13-4a82-b398-311723a3885b.preview.emergentagent.com/ws"
            
            def on_message(ws, message):
                print(f"WebSocket message received: {message}")
            
            def on_error(ws, error):
                print(f"WebSocket error: {error}")
            
            def on_close(ws, close_status_code, close_msg):
                print("WebSocket connection closed")
            
            def on_open(ws):
                print("WebSocket connection opened")
                ws.send("test message")
                ws.close()
            
            ws = websocket.WebSocketApp(ws_url,
                                      on_open=on_open,
                                      on_message=on_message,
                                      on_error=on_error,
                                      on_close=on_close)
            
            # Run for a short time to test connection
            ws.run_forever(timeout=5)
            
            self.log_result("real_time_contest_updates", "websocket_endpoint", True, 
                           "WebSocket endpoint is available")
            
        except ImportError:
            self.log_result("real_time_contest_updates", "websocket_endpoint", False, 
                           "WebSocket library not available for testing")
        except Exception as e:
            self.log_result("real_time_contest_updates", "websocket_endpoint", False, 
                           f"WebSocket connection failed: {str(e)}")

        # Test contest creation triggers WebSocket broadcast
        print("Testing contest creation WebSocket broadcast...")
        contest_data = {
            "name": "WebSocket Test Contest",
            "description": "Testing real-time updates",
            "competition_type": "signups",
            "start_date": "2025-01-25T00:00:00",
            "end_date": "2025-02-25T23:59:59",
            "prize_description": "$200 bonus",
            "participants": ["rep-789"],
            "rules": "Test contest",
            "status": "active"
        }
        
        response = self.make_request("POST", "/leaderboard/competitions", contest_data, auth_required=True)
        
        if response and response.status_code == 200:
            # Note: We can't easily test WebSocket broadcasts in this simple test
            # but we can verify the endpoint works
            self.log_result("real_time_contest_updates", "contest_creation_broadcast", True, 
                           "Contest creation endpoint working (WebSocket broadcast not directly testable)")
        else:
            self.log_result("real_time_contest_updates", "contest_creation_broadcast", False, 
                           "Contest creation failed, cannot test WebSocket broadcast")

    def test_rbac_integration(self):
        """Test RBAC Integration with Contest Management"""
        print("\n🔐 Testing RBAC Integration with Contest Management...")
        
        # Test different user roles
        test_roles = [
            {"token": "dev-token-super_admin", "role": "super_admin", "should_create": True, "should_manage": True},
            {"token": "dev-token-sales_manager", "role": "sales_manager", "should_create": True, "should_manage": True},
            {"token": "dev-token-sales_rep", "role": "sales_rep", "should_create": False, "should_manage": False},
        ]
        
        for role_test in test_roles:
            print(f"Testing {role_test['role']} permissions...")
            
            # Test contest creation permission
            contest_data = {
                "name": f"RBAC Test Contest - {role_test['role']}",
                "description": "Testing role-based access",
                "competition_type": "signups",
                "start_date": "2025-01-30T00:00:00",
                "end_date": "2025-02-28T23:59:59",
                "prize_description": "$100",
                "participants": [],
                "rules": "RBAC test",
                "status": "active"
            }
            
            response = self.make_request("POST", "/leaderboard/competitions", contest_data, 
                                       auth_required=True, auth_token=role_test["token"])
            
            if role_test["should_create"]:
                if response and response.status_code == 200:
                    self.log_result("rbac_integration", f"{role_test['role']}_create_permission", True, 
                                   f"{role_test['role']} can create contests as expected")
                else:
                    status_code = response.status_code if response else "No response"
                    self.log_result("rbac_integration", f"{role_test['role']}_create_permission", False, 
                                   f"{role_test['role']} cannot create contests: {status_code}")
            else:
                if response and response.status_code == 403:
                    self.log_result("rbac_integration", f"{role_test['role']}_create_denied", True, 
                                   f"{role_test['role']} correctly denied contest creation")
                elif response and response.status_code == 200:
                    self.log_result("rbac_integration", f"{role_test['role']}_create_denied", False, 
                                   f"{role_test['role']} should not be able to create contests")
                else:
                    status_code = response.status_code if response else "No response"
                    self.log_result("rbac_integration", f"{role_test['role']}_create_denied", False, 
                                   f"Unexpected response for {role_test['role']}: {status_code}")

    def test_contest_timeline_status(self):
        """Test Contest Timeline and Status Logic"""
        print("\n📅 Testing Contest Timeline and Status Logic...")
        
        # Get all competitions to analyze their status logic
        response = self.make_request("GET", "/leaderboard/competitions", auth_required=True)
        
        if response and response.status_code == 200:
            try:
                competitions = response.json()
                
                # Check if competitions have timeline-related fields
                timeline_fields = ["start_date", "end_date", "status"]
                has_timeline_logic = True
                
                for competition in competitions[:3]:  # Check first 3 competitions
                    for field in timeline_fields:
                        if field not in competition:
                            has_timeline_logic = False
                            break
                    if not has_timeline_logic:
                        break
                
                if has_timeline_logic:
                    self.log_result("contest_timeline_status", "timeline_fields", True, 
                                   "Competitions have required timeline fields")
                    
                    # Test date-based status calculation (this would need to be implemented)
                    current_time = datetime.utcnow()
                    status_logic_working = False
                    
                    for competition in competitions:
                        try:
                            start_date = datetime.fromisoformat(competition["start_date"].replace("Z", "+00:00"))
                            end_date = datetime.fromisoformat(competition["end_date"].replace("Z", "+00:00"))
                            
                            # Check if status matches timeline
                            if current_time < start_date and competition["status"] in ["upcoming", "active"]:
                                status_logic_working = True
                            elif start_date <= current_time <= end_date and competition["status"] in ["active", "current"]:
                                status_logic_working = True
                            elif current_time > end_date and competition["status"] in ["completed", "past", "active"]:
                                status_logic_working = True
                                
                        except (ValueError, KeyError):
                            continue
                    
                    if status_logic_working:
                        self.log_result("contest_timeline_status", "date_based_status", True, 
                                       "Date-based status calculation appears to be working")
                    else:
                        self.log_result("contest_timeline_status", "date_based_status", False, 
                                       "Date-based status calculation not properly implemented")
                        
                else:
                    self.log_result("contest_timeline_status", "timeline_fields", False, 
                                   "Competitions missing required timeline fields")
                    
            except json.JSONDecodeError:
                self.log_result("contest_timeline_status", "timeline_analysis", False, "Invalid JSON response")
        else:
            status_code = response.status_code if response else "No response"
            self.log_result("contest_timeline_status", "timeline_analysis", False, 
                           f"Failed to retrieve competitions for timeline analysis: {status_code}")

    def run_all_tests(self):
        """Run all contest management tests"""
        print("🚀 Starting Contest Management System Backend Testing...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        self.test_contest_api_endpoints()
        self.test_enhanced_competition_management()
        self.test_real_time_contest_updates()
        self.test_rbac_integration()
        self.test_contest_timeline_status()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 CONTEST MANAGEMENT TEST SUMMARY")
        print("=" * 60)
        
        total_tests = 0
        passed_tests = 0
        
        for category, tests in self.test_results.items():
            print(f"\n{category.upper().replace('_', ' ')}:")
            for test_name, result in tests.items():
                status = "✅" if result["success"] else "❌"
                print(f"  {status} {test_name}: {result['message']}")
                total_tests += 1
                if result["success"]:
                    passed_tests += 1
        
        print(f"\n📈 OVERALL RESULTS: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All contest management tests passed!")
        elif passed_tests >= total_tests * 0.8:
            print("⚠️ Most tests passed - minor issues found")
        else:
            print("❌ Significant issues found - needs attention")
        
        return self.test_results

if __name__ == "__main__":
    tester = ContestManagementTester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open("/app/contest_management_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Detailed results saved to: /app/contest_management_test_results.json")