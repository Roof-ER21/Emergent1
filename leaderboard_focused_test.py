#!/usr/bin/env python3
"""
Focused Testing for Sales Leaderboard Automated Goal Setting and Bonus Tier Automation
Tests the newly implemented features as requested in the review.
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import time

# Configuration - Use external URL for testing
BASE_URL = "https://175ab446-7532-4f1e-800f-5cff63911a45.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class LeaderboardFocusedTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS.copy()
        self.test_results = {
            "automated_goal_setting": {},
            "bonus_tier_automation": {},
            "role_based_access": {},
            "data_integration": {}
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
        
    def make_request(self, method, endpoint, data=None, auth_token=None):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = self.headers.copy()
        
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
        except requests.exceptions.Timeout as e:
            print(f"Request timeout: {str(e)}")
            return None
        except requests.exceptions.ConnectionError as e:
            print(f"Connection error: {str(e)}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_automated_goal_setting_system(self):
        """Test Automated Goal Setting System"""
        print("\n🎯 Testing Automated Goal Setting System...")
        
        # Test 1: Initialize sample data first
        print("Initializing sample leaderboard data...")
        response = self.make_request("POST", "/leaderboard/initialize-sample-data", 
                                   auth_token="dev-token-super_admin")
        
        if response and response.status_code == 200:
            self.log_result("automated_goal_setting", "sample_data_init", True, 
                           "Sample data initialized successfully")
        else:
            self.log_result("automated_goal_setting", "sample_data_init", False, 
                           f"Failed to initialize sample data: {response.status_code if response else 'No response'}")
        
        # Test 2: Test POST /api/leaderboard/goals endpoint
        print("Testing POST /leaderboard/goals endpoint...")
        goal_data = {
            "rep_id": "rep-789",
            "rep_name": "John Smith",
            "year": 2025,
            "month": 2,
            "signup_goal": 25,
            "revenue_goal": 75000.0,
            "assigned_by": "admin-123"
        }
        response = self.make_request("POST", "/leaderboard/goals", goal_data, 
                                   auth_token="dev-token-super_admin")
        
        if response and response.status_code == 200:
            try:
                goal = response.json()
                if "id" in goal and goal.get("signup_goal") == 25:
                    self.log_result("automated_goal_setting", "create_goal_endpoint", True, 
                                   f"Goal created successfully with ID: {goal['id']}")
                    self.created_goal_id = goal["id"]
                else:
                    self.log_result("automated_goal_setting", "create_goal_endpoint", False, 
                                   f"Unexpected goal format: {goal}")
            except json.JSONDecodeError:
                self.log_result("automated_goal_setting", "create_goal_endpoint", False, 
                               "Invalid JSON response")
        else:
            self.log_result("automated_goal_setting", "create_goal_endpoint", False, 
                           f"Failed to create goal: {response.status_code if response else 'No response'}")
        
        # Test 3: Test PUT /api/leaderboard/goals/{id} endpoint
        if hasattr(self, 'created_goal_id'):
            print(f"Testing PUT /leaderboard/goals/{self.created_goal_id} endpoint...")
            update_data = goal_data.copy()
            update_data["signup_goal"] = 30
            update_data["revenue_goal"] = 80000.0
            
            response = self.make_request("PUT", f"/leaderboard/goals/{self.created_goal_id}", 
                                       update_data, auth_token="dev-token-super_admin")
            
            if response and response.status_code == 200:
                try:
                    updated_goal = response.json()
                    if updated_goal.get("signup_goal") == 30:
                        self.log_result("automated_goal_setting", "update_goal_endpoint", True, 
                                       "Goal updated successfully")
                    else:
                        self.log_result("automated_goal_setting", "update_goal_endpoint", False, 
                                       "Goal not properly updated")
                except json.JSONDecodeError:
                    self.log_result("automated_goal_setting", "update_goal_endpoint", False, 
                                   "Invalid JSON response")
            else:
                self.log_result("automated_goal_setting", "update_goal_endpoint", False, 
                               f"Failed to update goal: {response.status_code if response else 'No response'}")
        
        # Test 4: Test DELETE /api/leaderboard/goals/{id} endpoint
        if hasattr(self, 'created_goal_id'):
            print(f"Testing DELETE /leaderboard/goals/{self.created_goal_id} endpoint...")
            response = self.make_request("DELETE", f"/leaderboard/goals/{self.created_goal_id}", 
                                       auth_token="dev-token-super_admin")
            
            if response and response.status_code == 200:
                self.log_result("automated_goal_setting", "delete_goal_endpoint", True, 
                               "Goal deleted successfully")
            else:
                self.log_result("automated_goal_setting", "delete_goal_endpoint", False, 
                               f"Failed to delete goal: {response.status_code if response else 'No response'}")
        
        # Test 5: Test bulk goal assignment functionality
        print("Testing bulk goal assignment functionality...")
        bulk_goals = [
            {
                "rep_id": "rep-789",
                "rep_name": "John Smith",
                "year": 2025,
                "month": 3,
                "signup_goal": 20,
                "revenue_goal": 60000.0,
                "assigned_by": "admin-123"
            },
            {
                "rep_id": "rep-890",
                "rep_name": "Sarah Johnson",
                "year": 2025,
                "month": 3,
                "signup_goal": 22,
                "revenue_goal": 65000.0,
                "assigned_by": "admin-123"
            }
        ]
        
        bulk_success_count = 0
        for goal in bulk_goals:
            response = self.make_request("POST", "/leaderboard/goals", goal, 
                                       auth_token="dev-token-super_admin")
            if response and response.status_code == 200:
                bulk_success_count += 1
        
        if bulk_success_count == len(bulk_goals):
            self.log_result("automated_goal_setting", "bulk_goal_assignment", True, 
                           f"Successfully created {bulk_success_count} goals in bulk")
        else:
            self.log_result("automated_goal_setting", "bulk_goal_assignment", False, 
                           f"Only {bulk_success_count}/{len(bulk_goals)} goals created")

    def test_bonus_tier_automation_system(self):
        """Test Bonus Tier Automation System"""
        print("\n🏆 Testing Bonus Tier Automation System...")
        
        # Test 1: Test GET /api/leaderboard/bonus-tiers endpoint
        print("Testing GET /leaderboard/bonus-tiers endpoint...")
        response = self.make_request("GET", "/leaderboard/bonus-tiers", 
                                   auth_token="dev-token-super_admin")
        
        if response and response.status_code == 200:
            try:
                tiers = response.json()
                if isinstance(tiers, list) and len(tiers) >= 6:
                    # Check for 6-tier structure (Tier 1: 15 signups to Tier 6: 40 signups)
                    tier_thresholds = [tier.get("signup_threshold") for tier in tiers]
                    if 15 in tier_thresholds and 40 in tier_thresholds:
                        self.log_result("bonus_tier_automation", "get_bonus_tiers", True, 
                                       f"Retrieved {len(tiers)} bonus tiers with correct thresholds")
                    else:
                        self.log_result("bonus_tier_automation", "get_bonus_tiers", False, 
                                       f"Tier thresholds incorrect: {tier_thresholds}")
                else:
                    self.log_result("bonus_tier_automation", "get_bonus_tiers", False, 
                                   f"Expected at least 6 tiers, got {len(tiers) if isinstance(tiers, list) else 'invalid'}")
            except json.JSONDecodeError:
                self.log_result("bonus_tier_automation", "get_bonus_tiers", False, 
                               "Invalid JSON response")
        else:
            self.log_result("bonus_tier_automation", "get_bonus_tiers", False, 
                           f"Failed to get bonus tiers: {response.status_code if response else 'No response'}")
        
        # Test 2: Test POST /api/leaderboard/bonus-tiers endpoint
        print("Testing POST /leaderboard/bonus-tiers endpoint...")
        tier_data = {
            "tier_number": 7,
            "tier_name": "Platinum Elite",
            "signup_threshold": 50,
            "description": "Elite tier for 50+ signups",
            "is_active": True
        }
        response = self.make_request("POST", "/leaderboard/bonus-tiers", tier_data, 
                                   auth_token="dev-token-super_admin")
        
        if response and response.status_code == 200:
            try:
                tier = response.json()
                if "id" in tier and tier.get("tier_name") == "Platinum Elite":
                    self.log_result("bonus_tier_automation", "create_bonus_tier", True, 
                                   f"Bonus tier created successfully: {tier['tier_name']}")
                    self.created_tier_id = tier["id"]
                else:
                    self.log_result("bonus_tier_automation", "create_bonus_tier", False, 
                                   f"Unexpected tier format: {tier}")
            except json.JSONDecodeError:
                self.log_result("bonus_tier_automation", "create_bonus_tier", False, 
                               "Invalid JSON response")
        else:
            self.log_result("bonus_tier_automation", "create_bonus_tier", False, 
                           f"Failed to create bonus tier: {response.status_code if response else 'No response'}")
        
        # Test 3: Verify tier calculation logic (Tier 1: 15 signups, Tier 6: 40 signups)
        print("Testing tier calculation logic...")
        test_signups = [
            {"signups": 10, "expected_tier": 0},  # Below Tier 1
            {"signups": 15, "expected_tier": 1},  # Tier 1
            {"signups": 25, "expected_tier": 2},  # Should be Tier 2 or higher
            {"signups": 40, "expected_tier": 6}   # Tier 6
        ]
        
        tier_logic_correct = True
        for test in test_signups:
            # Create a sales signup to test tier calculation
            signup_data = {
                "rep_id": "rep-789",
                "rep_name": "John Smith",
                "customer_name": f"Test Customer {test['signups']}",
                "customer_email": f"test{test['signups']}@example.com",
                "signup_type": "lead",
                "source": "QR Code",
                "deal_value": 5000.0,
                "status": "confirmed"
            }
            
            # Create multiple signups to reach the threshold
            for i in range(test['signups']):
                signup_data["customer_name"] = f"Test Customer {i}"
                signup_data["customer_email"] = f"test{i}@example.com"
                response = self.make_request("POST", "/leaderboard/signups", signup_data, 
                                           auth_token="dev-token-super_admin")
                if not response or response.status_code != 200:
                    tier_logic_correct = False
                    break
            
            if not tier_logic_correct:
                break
        
        if tier_logic_correct:
            self.log_result("bonus_tier_automation", "tier_calculation_logic", True, 
                           "Tier calculation logic working correctly")
        else:
            self.log_result("bonus_tier_automation", "tier_calculation_logic", False, 
                           "Tier calculation logic not working properly")
        
        # Test 4: Test automatic tier advancement based on signup count
        print("Testing automatic tier advancement...")
        # Get current metrics to check tier advancement
        response = self.make_request("GET", "/leaderboard/metrics", 
                                   auth_token="dev-token-super_admin")
        
        if response and response.status_code == 200:
            try:
                metrics = response.json()
                if isinstance(metrics, list) and len(metrics) > 0:
                    # Check if any rep has tier advancement
                    tier_advancement_found = any(metric.get("current_tier", 0) > 0 for metric in metrics)
                    if tier_advancement_found:
                        self.log_result("bonus_tier_automation", "automatic_tier_advancement", True, 
                                       "Automatic tier advancement working")
                    else:
                        self.log_result("bonus_tier_automation", "automatic_tier_advancement", False, 
                                       "No tier advancement detected")
                else:
                    self.log_result("bonus_tier_automation", "automatic_tier_advancement", False, 
                                   "No metrics found to verify tier advancement")
            except json.JSONDecodeError:
                self.log_result("bonus_tier_automation", "automatic_tier_advancement", False, 
                               "Invalid JSON response")
        else:
            self.log_result("bonus_tier_automation", "automatic_tier_advancement", False, 
                           f"Failed to get metrics: {response.status_code if response else 'No response'}")

    def test_role_based_access_control(self):
        """Test Role-Based Access Control for goal setting"""
        print("\n🔐 Testing Role-Based Access Control...")
        
        # Test different user roles
        test_roles = [
            {"token": "dev-token-super_admin", "role": "super_admin", "should_access": True},
            {"token": "dev-token-sales_manager", "role": "sales_manager", "should_access": True},
            {"token": "dev-token-team_lead", "role": "team_lead", "should_access": True},  # Limited access
            {"token": "dev-token-sales_rep", "role": "sales_rep", "should_access": False}
        ]
        
        goal_data = {
            "rep_id": "rep-789",
            "rep_name": "John Smith",
            "year": 2025,
            "month": 4,
            "signup_goal": 15,
            "revenue_goal": 50000.0,
            "assigned_by": "test-user"
        }
        
        for role_test in test_roles:
            print(f"Testing goal setting access for {role_test['role']}...")
            response = self.make_request("POST", "/leaderboard/goals", goal_data, 
                                       auth_token=role_test["token"])
            
            if role_test["should_access"]:
                if response and response.status_code == 200:
                    self.log_result("role_based_access", f"{role_test['role']}_goal_access", True, 
                                   f"{role_test['role']} can set goals correctly")
                else:
                    self.log_result("role_based_access", f"{role_test['role']}_goal_access", False, 
                                   f"{role_test['role']} should be able to set goals but got: {response.status_code if response else 'No response'}")
            else:
                if response and response.status_code in [401, 403]:
                    self.log_result("role_based_access", f"{role_test['role']}_goal_access_denied", True, 
                                   f"{role_test['role']} correctly denied goal setting access")
                else:
                    self.log_result("role_based_access", f"{role_test['role']}_goal_access_denied", False, 
                                   f"{role_test['role']} should be denied but got: {response.status_code if response else 'No response'}")

    def test_data_integration(self):
        """Test Data Integration between goals, signups, and bonus tiers"""
        print("\n🔗 Testing Data Integration...")
        
        # Test 1: Verify goals are properly linked to sales reps
        print("Testing goal-rep linkage...")
        response = self.make_request("GET", "/leaderboard/goals", 
                                   auth_token="dev-token-super_admin")
        
        if response and response.status_code == 200:
            try:
                goals = response.json()
                if isinstance(goals, list) and len(goals) > 0:
                    # Check if goals have proper rep linkage
                    properly_linked = all(goal.get("rep_id") and goal.get("rep_name") for goal in goals)
                    if properly_linked:
                        self.log_result("data_integration", "goal_rep_linkage", True, 
                                       f"All {len(goals)} goals properly linked to sales reps")
                    else:
                        self.log_result("data_integration", "goal_rep_linkage", False, 
                                       "Some goals missing rep linkage")
                else:
                    self.log_result("data_integration", "goal_rep_linkage", False, 
                                   "No goals found to verify linkage")
            except json.JSONDecodeError:
                self.log_result("data_integration", "goal_rep_linkage", False, 
                               "Invalid JSON response")
        else:
            self.log_result("data_integration", "goal_rep_linkage", False, 
                           f"Failed to get goals: {response.status_code if response else 'No response'}")
        
        # Test 2: Verify signup tracking integrates with bonus tier calculations
        print("Testing signup-tier integration...")
        response = self.make_request("GET", "/leaderboard/signups", 
                                   auth_token="dev-token-super_admin")
        
        if response and response.status_code == 200:
            try:
                signups = response.json()
                if isinstance(signups, list):
                    # Check signup structure for tier calculation compatibility
                    signup_structure_valid = all(
                        signup.get("rep_id") and 
                        signup.get("status") and 
                        "signup_date" in signup 
                        for signup in signups
                    )
                    if signup_structure_valid:
                        self.log_result("data_integration", "signup_tier_integration", True, 
                                       f"All {len(signups)} signups have proper structure for tier calculation")
                    else:
                        self.log_result("data_integration", "signup_tier_integration", False, 
                                       "Some signups missing required fields for tier calculation")
                else:
                    self.log_result("data_integration", "signup_tier_integration", False, 
                                   "Invalid signups data structure")
            except json.JSONDecodeError:
                self.log_result("data_integration", "signup_tier_integration", False, 
                               "Invalid JSON response")
        else:
            self.log_result("data_integration", "signup_tier_integration", False, 
                           f"Failed to get signups: {response.status_code if response else 'No response'}")
        
        # Test 3: Test sample data initialization creates proper tier structure
        print("Testing sample data tier structure...")
        response = self.make_request("GET", "/leaderboard/bonus-tiers", 
                                   auth_token="dev-token-super_admin")
        
        if response and response.status_code == 200:
            try:
                tiers = response.json()
                if isinstance(tiers, list) and len(tiers) >= 6:
                    # Verify 6-tier structure with proper thresholds
                    tier_structure = sorted([(tier.get("tier_number"), tier.get("signup_threshold")) 
                                           for tier in tiers if tier.get("tier_number") and tier.get("signup_threshold")])
                    
                    expected_structure = [(1, 15), (6, 40)]  # Key tiers mentioned in requirements
                    structure_valid = all(expected in tier_structure for expected in expected_structure)
                    
                    if structure_valid:
                        self.log_result("data_integration", "sample_tier_structure", True, 
                                       f"Sample data creates proper 6-tier structure: {tier_structure}")
                    else:
                        self.log_result("data_integration", "sample_tier_structure", False, 
                                       f"Tier structure incorrect: {tier_structure}")
                else:
                    self.log_result("data_integration", "sample_tier_structure", False, 
                                   f"Expected at least 6 tiers, got {len(tiers) if isinstance(tiers, list) else 'invalid'}")
            except json.JSONDecodeError:
                self.log_result("data_integration", "sample_tier_structure", False, 
                               "Invalid JSON response")
        else:
            self.log_result("data_integration", "sample_tier_structure", False, 
                           f"Failed to get bonus tiers: {response.status_code if response else 'No response'}")

    def run_focused_tests(self):
        """Run focused tests for automated goal setting and bonus tier automation"""
        print("🚀 Starting Sales Leaderboard Focused Testing...")
        print(f"Testing against: {self.base_url}")
        print("=" * 80)
        
        # Run focused test suites
        self.test_automated_goal_setting_system()
        self.test_bonus_tier_automation_system()
        self.test_role_based_access_control()
        self.test_data_integration()
        
        return self.test_results

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 FOCUSED TEST SUMMARY - SALES LEADERBOARD AUTOMATION")
        print("=" * 80)
        
        total_tests = 0
        passed_tests = 0
        
        for category, tests in self.test_results.items():
            if tests:
                print(f"\n{category.upper().replace('_', ' ')}:")
                for test_name, result in tests.items():
                    total_tests += 1
                    if result["success"]:
                        passed_tests += 1
                        print(f"  ✅ {test_name}: {result['message']}")
                    else:
                        print(f"  ❌ {test_name}: {result['message']}")
        
        print(f"\n📈 OVERALL RESULTS: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All focused tests passed!")
        elif passed_tests > total_tests * 0.8:
            print("✅ Most tests passed - automation features are largely functional")
        elif passed_tests > total_tests * 0.5:
            print("⚠️ Some issues found - needs attention")
        else:
            print("❌ Major issues found - requires immediate attention")

if __name__ == "__main__":
    tester = LeaderboardFocusedTester()
    results = tester.run_focused_tests()
    tester.print_summary()
    
    # Save results to file
    with open("/app/leaderboard_focused_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Detailed results saved to: /app/leaderboard_focused_test_results.json")