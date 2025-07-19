from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import httpx
import threading
import time
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import websockets

# Google Sheets Service
class GoogleSheetsService:
    def __init__(self):
        self.enabled = os.getenv("GOOGLE_SHEETS_ENABLED", "false").lower() == "true"
        self.credentials_path = os.getenv("GOOGLE_SHEETS_CREDENTIALS_PATH", "/app/backend/service-account.json")
        self.scopes = [os.getenv("GOOGLE_SHEETS_SCOPES", "https://www.googleapis.com/auth/spreadsheets.readonly")]
        self.service = None
        
    async def get_service(self):
        # Check enabled status dynamically
        self.enabled = os.getenv("GOOGLE_SHEETS_ENABLED", "false").lower() == "true"
        
        if not self.enabled:
            raise HTTPException(status_code=400, detail="Google Sheets integration is disabled")
            
        if not os.path.exists(self.credentials_path):
            raise HTTPException(status_code=400, detail="Google Sheets credentials file not found")
            
        try:
            creds = service_account.Credentials.from_service_account_file(
                self.credentials_path, scopes=self.scopes)
            self.service = build('sheets', 'v4', credentials=creds)
            return self.service
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to initialize Google Sheets service: {str(e)}")
    
    async def read_sheet_data(self, spreadsheet_id: str, range_name: str):
        service = await self.get_service()
        try:
            result = service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            return result.get('values', [])
        except HttpError as e:
            raise HTTPException(status_code=400, detail=f"Error reading Google Sheet: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# Initialize Google Sheets service
google_sheets_service = GoogleSheetsService()

# Additional models for Google Sheets import
class GoogleSheetsImportRequest(BaseModel):
    spreadsheet_id: str
    range_name: str
    data_type: str  # "employees" or "sales_reps"

def parse_employee_row(row: List[str]) -> dict:
    """Parse employee row from Google Sheets"""
    try:
        return {
            "name": row[0] if len(row) > 0 else "",
            "email": row[1] if len(row) > 1 else "",
            "role": row[2] if len(row) > 2 else "employee",
            "territory": row[3] if len(row) > 3 else None,
            "commission_rate": float(row[4]) if len(row) > 4 and row[4] else 0.0
        }
    except (IndexError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid row format: {str(e)}")

def parse_sales_rep_row(row: List[str]) -> dict:
    """Parse sales rep row from Google Sheets"""
    try:
        return {
            "name": row[0] if len(row) > 0 else "",
            "email": row[1] if len(row) > 1 else "",
            "phone": row[2] if len(row) > 2 else "",
            "territory": row[3] if len(row) > 3 else None,
            "about_me": row[4] if len(row) > 4 else "",
            "commission_rate": float(row[5]) if len(row) > 5 and row[5] else 0.05
        }
    except (IndexError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid row format: {str(e)}")

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
security = HTTPBearer()

# Initialize scheduler for signup sync
signup_scheduler = AsyncIOScheduler()

# WebSocket Connection Manager for Real-Time Updates
class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
        
    async def broadcast(self, message: dict):
        """Broadcast real-time updates to all connected clients"""
        if self.active_connections:
            for connection in self.active_connections.copy():
                try:
                    await connection.send_json(message)
                except:
                    # Remove stale connections
                    self.active_connections.remove(connection)

# Global WebSocket manager
ws_manager = WebSocketManager()

# Enhanced Sync Service for Real-Time Updates
class RealTimeSyncService:
    def __init__(self, db_client, sheets_service, ws_manager):
        self.db = db_client
        self.sheets_service = sheets_service
        self.ws_manager = ws_manager
        
    async def sync_signups_data(self, background: bool = False):
        """Enhanced signup sync with real-time broadcasting"""
        try:
            # Get Google Sheets service
            service = await self.sheets_service.get_service()
            
            # Your existing signup sync logic here
            spreadsheet_id = os.getenv("GOOGLE_SHEETS_SIGNUP_ID")
            if not spreadsheet_id:
                raise HTTPException(status_code=400, detail="Signup spreadsheet ID not configured")
            
            # Fetch data from sheets (using exponential backoff)
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    result = service.spreadsheets().values().get(
                        spreadsheetId=spreadsheet_id,
                        range='A:Z'  # Get all data
                    ).execute()
                    break
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise e
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
            
            values = result.get('values', [])
            if not values:
                return {"message": "No data found", "synced_count": 0}
            
            # Process and validate data
            headers = values[0] if values else []
            synced_count = 0
            updated_users = []
            
            for i, row in enumerate(values[1:], 1):
                if len(row) < len(headers):
                    row.extend([''] * (len(headers) - len(row)))
                    
                try:
                    # Extract signup data (customize based on your sheet structure)
                    signup_data = {}
                    for j, header in enumerate(headers):
                        signup_data[header.lower().replace(' ', '_')] = row[j] if j < len(row) else ''
                    
                    # Update database
                    if 'email' in signup_data and signup_data['email']:
                        # Update or insert signup record
                        await self.db.signups.update_one(
                            {"email": signup_data['email']},
                            {"$set": {
                                **signup_data,
                                "last_updated": datetime.utcnow(),
                                "sync_source": "google_sheets"
                            }},
                            upsert=True
                        )
                        synced_count += 1
                        updated_users.append(signup_data.get('email', ''))
                        
                except Exception as e:
                    print(f"Error processing row {i}: {e}")
                    continue
            
            # Broadcast real-time update to connected clients
            if not background:  # Only broadcast for manual syncs
                await self.ws_manager.broadcast({
                    "type": "data_sync_complete",
                    "timestamp": datetime.utcnow().isoformat(),
                    "synced_count": synced_count,
                    "updated_users": updated_users[:10],  # Limit for performance
                    "message": f"Successfully synced {synced_count} signup records"
                })
            
            return {
                "message": f"Successfully synced {synced_count} signup records",
                "synced_count": synced_count,
                "timestamp": datetime.utcnow()
            }
            
        except Exception as e:
            error_msg = f"Sync failed: {str(e)}"
            # Broadcast error to clients
            await self.ws_manager.broadcast({
                "type": "sync_error",
                "timestamp": datetime.utcnow().isoformat(),
                "error": error_msg
            })
            raise HTTPException(status_code=500, detail=error_msg)
    
    async def sync_estimates_data(self):
        """Sync estimates data from Google Sheets"""
        # Similar implementation for estimates
        pass
    
    async def sync_revenue_data(self):
        """Sync revenue data from Google Sheets"""  
        # Similar implementation for revenue
        pass
    
    async def full_data_sync(self):
        """Perform complete data sync - signups, estimates, revenue"""
        results = {}
        
        try:
            results['signups'] = await self.sync_signups_data(background=True)
            results['estimates'] = await self.sync_estimates_data()
            results['revenue'] = await self.sync_revenue_data()
            
            # Broadcast completion
            await self.ws_manager.broadcast({
                "type": "full_sync_complete",
                "timestamp": datetime.utcnow().isoformat(),
                "results": results
            })
            
            return results
            
        except Exception as e:
            await self.ws_manager.broadcast({
                "type": "full_sync_error", 
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
            raise

# Initialize real-time sync service
sync_service = RealTimeSyncService(db, google_sheets_service, ws_manager)

# Schedule automated sync jobs (3 times daily: 08:00, 14:00, 20:00)
async def schedule_automated_sync():
    """Schedule automated data sync jobs"""
    
    # 8:00 AM sync
    signup_scheduler.add_job(
        sync_service.full_data_sync,
        'cron',
        hour=8,
        minute=0,
        id='morning_sync',
        replace_existing=True
    )
    
    # 2:00 PM sync  
    signup_scheduler.add_job(
        sync_service.full_data_sync,
        'cron',
        hour=14,
        minute=0,
        id='afternoon_sync',
        replace_existing=True
    )
    
    # 8:00 PM sync
    signup_scheduler.add_job(
        sync_service.full_data_sync,
        'cron', 
        hour=20,
        minute=0,
        id='evening_sync',
        replace_existing=True
    )
    
    signup_scheduler.start()
    print("📅 Scheduled automated sync jobs: 08:00, 14:00, 20:00")

# Create the main app without a prefix
app = FastAPI(title="Roof-HR API", version="1.0.0")

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for any client messages
            data = await websocket.receive_text()
            # Echo back or handle specific client requests
            await ws_manager.send_personal_message(f"Server received: {data}", websocket)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

# Enhanced API endpoints with real-time sync
@app.post("/api/sync/manual")
async def manual_sync(background_tasks: BackgroundTasks):
    """Trigger manual data sync with real-time updates"""
    try:
        result = await sync_service.full_data_sync()
        return {
            "success": True,
            "message": "Manual sync completed successfully",
            "timestamp": datetime.utcnow(),
            "results": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sync/signups")
async def sync_signups_endpoint():
    """Sync only signup data"""
    try:
        result = await sync_service.sync_signups_data()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sync/status")
async def get_sync_status():
    """Get current sync status and schedule info"""
    jobs = []
    for job in signup_scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "func": str(job.func)
        })
    
    return {
        "scheduler_running": signup_scheduler.running,
        "scheduled_jobs": jobs,
        "active_websocket_connections": len(ws_manager.active_connections),
        "last_sync": datetime.utcnow()  # You can store this in DB for real tracking
    }

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "employee"  # super_admin, hr_manager, sales_manager, project_manager, sales_rep, field_worker
    territory: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime

class Employee(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: str
    territory: Optional[str] = None
    commission_rate: float = 0.0
    phone: Optional[str] = None
    hire_date: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    assigned_rep_id: Optional[str] = None
    status: str = "lead"  # lead, scheduled, in_progress, completed, cancelled
    value: float = 0.0
    commission_amount: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Commission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    job_id: str
    amount: float
    rate: float
    status: str = "pending"  # pending, paid, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SalesRep(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    territory: str
    department: str = "Sales"
    picture: Optional[str] = None  # base64 encoded image
    welcome_video: Optional[str] = None  # video URL or base64
    about_me: Optional[str] = None
    qr_code: Optional[str] = None
    landing_page_url: Optional[str] = None
    leads: int = 0
    conversions: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Lead(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    message: Optional[str] = None
    rep_id: str
    rep_name: str
    status: str = "new"  # new, assigned, contacted, converted, lost
    priority: str = "medium"  # high, medium, low
    source: str = "QR Code"
    assigned_to: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Enhanced Sales Leaderboard Models
class SalesGoal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rep_id: str
    rep_name: str
    year: int
    month: int
    signup_goal: int = 0
    revenue_goal: float = 0.0
    assigned_by: str  # user_id who assigned the goal
    assigned_date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SalesSignup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rep_id: str
    rep_name: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    signup_type: str = "lead"  # lead, referral, direct, other
    source: str = "QR Code"  # QR Code, Website, Referral, Cold Call, etc.
    lead_id: Optional[str] = None  # reference to original lead if applicable
    deal_value: float = 0.0
    status: str = "pending"  # pending, confirmed, cancelled
    signup_date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ContestParticipant(BaseModel):
    participant_id: str
    participant_name: str
    participant_role: Optional[str] = None
    joined_at: datetime
    current_score: int = 0

class SalesCompetition(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    competition_type: str = "signups"  # signups, revenue, leads, conversions
    start_date: datetime
    end_date: datetime
    prize_description: str
    participants: List[ContestParticipant] = []  # list of participant objects
    rules: Optional[str] = None
    status: str = "active"  # active, completed, cancelled
    created_by: str  # user_id who created the competition
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BonusTier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tier_number: int
    tier_name: str
    signup_threshold: int
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SalesMetrics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rep_id: str
    rep_name: str
    year: int
    month: int
    signups: int = 0
    qr_leads: int = 0
    total_leads: int = 0
    conversions: int = 0
    revenue: float = 0.0
    calls_made: int = 0
    meetings_held: int = 0
    proposals_sent: int = 0
    current_tier: int = 0
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TeamAssignment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_lead_id: str
    team_lead_name: str
    team_member_id: str
    team_member_name: str
    assignment_date: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class QRCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rep_id: str
    code: str
    url: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class AuthRequest(BaseModel):
    session_id: str

class EmployeeImport(BaseModel):
    spreadsheet_id: str
    sheet_range: str = "Employees!A2:G"

class JobCreate(BaseModel):
    title: str
    description: Optional[str] = None
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    assigned_rep_id: Optional[str] = None
    value: float = 0.0

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    assigned_rep_id: Optional[str] = None
    status: Optional[str] = None
    value: Optional[float] = None

class SalesRepCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    territory: str
    department: str = "Sales"
    about_me: Optional[str] = None

class SalesRepUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    territory: Optional[str] = None
    department: Optional[str] = None
    picture: Optional[str] = None
    welcome_video: Optional[str] = None
    about_me: Optional[str] = None
    is_active: Optional[bool] = None

class SyncStatus(BaseModel):
    id: str
    sync_type: str  # 'signups', 'revenue', 'employees'
    last_sync: Optional[datetime] = None
    next_sync: Optional[datetime] = None
    status: str = 'pending'  # 'pending', 'running', 'completed', 'failed'
    records_processed: int = 0
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MonthlySignupData(BaseModel):
    id: str
    rep_id: str
    rep_name: str
    month: int
    year: int
    signups: int
    revenue: Optional[float] = None
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None
    sync_source: str = 'manual'  # 'manual', 'google_sheets'

class RevenueUpdate(BaseModel):
    rep_id: str
    month: int
    year: int
    revenue: float
    updated_by: str

class SignupSyncRequest(BaseModel):
    spreadsheet_id: str
    sheet_name: str
    range_name: str
    force_sync: bool = False

class LeadCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    message: Optional[str] = None
    rep_id: str

class LeadUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None

class FileUpload(BaseModel):
    file_data: str  # base64 encoded file
    file_type: str  # image/jpeg, image/png, video/mp4, etc.
    file_name: str

# New HR Module Models

# Employee Onboarding Models
class OnboardingStage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    required_documents: List[str] = []
    required_training: List[str] = []
    order: int
    employee_type: str = "all"  # "all", "w2", "1099"
    is_active: bool = True

class OnboardingProgress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    stage_id: str
    status: str = "pending"  # pending, in_progress, completed, skipped
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    documents_uploaded: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OnboardingTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    employee_type: str  # "w2", "1099"
    stages: List[str] = []  # List of stage IDs
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# PTO Models (W2 employees only)
class PTORequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    start_date: datetime
    end_date: datetime
    days_requested: float
    reason: str
    status: str = "pending"  # pending, approved, denied
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PTOBalance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    year: int
    accrued_days: float = 0.0
    used_days: float = 0.0
    pending_days: float = 0.0
    available_days: float = 0.0
    carry_over_days: float = 0.0
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Safety & Compliance Models
class SafetyTraining(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    required_for: str = "1099"  # "all", "w2", "1099"
    duration_hours: float
    certification_required: bool = False
    renewal_months: Optional[int] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Hiring Flow Models
class HiringFlow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # insurance, retail, office, production
    description: Optional[str] = None
    stages: List[str] = []
    requirements: List[str] = []
    timeline_days: int = 30
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class HiringCandidate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    position: str
    hiring_type: str  # insurance, retail, office, production
    current_stage: str = "application"
    status: str = "active"  # active, hired, rejected, withdrawn
    resume_url: Optional[str] = None
    notes: Optional[str] = None
    interview_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SafetyTrainingProgress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    training_id: str
    status: str = "not_started"  # not_started, in_progress, completed, expired
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    score: Optional[float] = None
    certificate_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class WorkersCompSubmission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    submission_date: datetime
    submission_deadline: datetime
    status: str = "pending"  # pending, submitted, approved, rejected
    document_url: Optional[str] = None
    submitted_by: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class IncidentReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    incident_date: datetime
    location: str
    description: str
    injury_type: str
    severity: str = "minor"  # minor, moderate, severe
    witnesses: List[str] = []
    actions_taken: str
    reported_by: str
    status: str = "open"  # open, investigating, resolved
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Project Assignment Models
class ProjectAssignment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    assigned_rep_id: str
    assigned_by: str
    assignment_date: datetime = Field(default_factory=datetime.utcnow)
    priority: str = "medium"  # low, medium, high, urgent
    status: str = "assigned"  # assigned, accepted, in_progress, completed
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class QRCodeScan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rep_id: str
    scanned_at: datetime = Field(default_factory=datetime.utcnow)
    location: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    lead_generated: bool = False
    lead_id: Optional[str] = None

class AppointmentRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rep_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    preferred_date: datetime
    preferred_time: str
    service_type: str
    message: Optional[str] = None
    status: str = "pending"  # pending, confirmed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Employee Self-Service Models
class EmployeeDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    document_type: str  # "contract", "tax_forms", "handbook", "certification", "other"
    document_name: str
    document_url: str
    uploaded_by: str
    is_required: bool = False
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EmployeeRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    request_type: str  # "document", "info_change", "equipment", "other"
    title: str
    description: str
    priority: str = "medium"  # low, medium, high
    status: str = "open"  # open, in_progress, resolved, closed
    assigned_to: Optional[str] = None
    resolution: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Create Models for API requests
class OnboardingStageCreate(BaseModel):
    name: str
    description: str
    required_documents: List[str] = []
    required_training: List[str] = []
    order: int
    employee_type: str = "all"

class OnboardingStageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    required_documents: Optional[List[str]] = None
    required_training: Optional[List[str]] = None
    order: Optional[int] = None
    employee_type: Optional[str] = None
    is_active: Optional[bool] = None

class PTORequestCreate(BaseModel):
    start_date: datetime
    end_date: datetime
    reason: str

class PTORequestUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class SafetyTrainingCreate(BaseModel):
    name: str
    description: str
    required_for: str = "1099"
    duration_hours: float
    certification_required: bool = False
    renewal_months: Optional[int] = None

class IncidentReportCreate(BaseModel):
    incident_date: datetime
    location: str
    description: str
    injury_type: str
    severity: str = "minor"
    witnesses: List[str] = []
    actions_taken: str

class ProjectAssignmentCreate(BaseModel):
    lead_id: str
    assigned_rep_id: str
    priority: str = "medium"
    notes: Optional[str] = None
    due_date: Optional[datetime] = None

class AppointmentRequestCreate(BaseModel):
    rep_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    preferred_date: datetime
    preferred_time: str
    service_type: str
    message: Optional[str] = None

class EmployeeRequestCreate(BaseModel):
    request_type: str
    title: str
    description: str
    priority: str = "medium"

# Update existing Employee model to include employee type
class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    territory: Optional[str] = None
    commission_rate: Optional[float] = None
    phone: Optional[str] = None
    hire_date: Optional[datetime] = None
    employee_type: Optional[str] = None  # "w2", "1099"
    is_active: Optional[bool] = None

# Email Templates
EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; margin: -20px -20px 20px -20px; }
        .content { line-height: 1.6; }
        .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Roof-HR Notification</h2>
        </div>
        <div class="content">
            <p>Hello {{ recipient_name }},</p>
            <p>{{ message }}</p>
            <p><strong>Job Details:</strong></p>
            <ul>
                <li>Job ID: {{ job_id }}</li>
                <li>Title: {{ job_title }}</li>
                <li>Status: {{ job_status }}</li>
                <li>Value: ${{ job_value }}</li>
            </ul>
            <a href="{{ action_url }}" class="button">View Job Details</a>
        </div>
        <div class="footer">
            <p>© 2025 Roof-HR. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

# Helper Functions
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Verify session token and return current user"""
    try:
        # Check if it's a development token
        if credentials.credentials.startswith("dev-token-"):
            # For development mode, return a mock user based on the token
            dev_users = {
                'super_admin': User(
                    id='admin-123',
                    email='admin@theroofdocs.com',
                    name='Admin User',
                    role='super_admin',
                    picture='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                    territory='All Regions'
                ),
                'sales_manager': User(
                    id='manager-456',
                    email='manager@theroofdocs.com',
                    name='Sales Manager',
                    role='sales_manager',
                    picture='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
                    territory='Mid-Atlantic'
                ),
                'sales_rep': User(
                    id='rep-789',
                    email='john.smith@theroofdocs.com',
                    name='John Smith',
                    role='sales_rep',
                    picture='https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
                    territory='Northern Virginia'
                ),
                'hr_manager': User(
                    id='hr-101',
                    email='hr@theroofdocs.com',
                    name='HR Manager',
                    role='hr_manager',
                    picture='https://images.unsplash.com/photo-1494790108755-2616b9cf1d1e?w=150&h=150&fit=crop&crop=face',
                    territory='Corporate'
                )
            }
            return dev_users['super_admin']  # Default to super admin for development
        
        # Normal authentication flow
        session = await db.user_sessions.find_one({"session_token": credentials.credentials})
        if not session or datetime.utcnow() > session["expires_at"]:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        user = await db.users.find_one({"id": session["user_id"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")

async def send_email(recipient: str, subject: str, template_data: Dict[str, Any], background_tasks: BackgroundTasks):
    """Send email notification using Gmail SMTP"""
    def send_email_sync():
        try:
            smtp_server = "smtp.gmail.com"
            smtp_port = 587
            sender_email = os.environ.get("GMAIL_USER", "ahmed.mahmoud@theroofdocs.com")
            sender_password = os.environ.get("GMAIL_PASSWORD", "vcks cdnk feqb zqnh")
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = sender_email
            msg['To'] = recipient
            
            template = Template(EMAIL_TEMPLATE)
            html_content = template.render(**template_data)
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
            server.quit()
            
            logging.info(f"Email sent successfully to {recipient}")
        except Exception as e:
            logging.error(f"Failed to send email: {str(e)}")
    
    background_tasks.add_task(send_email_sync)

def calculate_commission(job_value: float, commission_rate: float) -> float:
    """Calculate commission based on job value and rate"""
    return job_value * commission_rate

def generate_qr_code(rep_id: str, base_url: str = "https://theroofdocs.com") -> str:
    """Generate QR code data for sales rep"""
    import hashlib
    import time
    
    # Create a unique code based on rep_id and timestamp
    data = f"{rep_id}-{int(time.time())}"
    qr_code = hashlib.md5(data.encode()).hexdigest()[:8].upper()
    return f"QR{qr_code}"

def generate_landing_page_url(rep_name: str, base_url: str = "https://theroofdocs.com") -> str:
    """Generate landing page URL for sales rep"""
    # Convert name to URL-friendly format
    url_name = rep_name.lower().replace(" ", "-").replace(".", "")
    return f"{base_url}/rep/{url_name}"

async def send_lead_notification(lead: Lead, rep_email: str, background_tasks: BackgroundTasks):
    """Send email notification to sales managers about new lead"""
    # Get all users with sales_manager role
    sales_managers = await db.users.find({"role": "sales_manager"}).to_list(100)
    
    if not sales_managers:
        # Fallback to super_admin if no sales managers found
        super_admins = await db.users.find({"role": "super_admin"}).to_list(100)
        sales_managers = super_admins
    
    template_data = {
        "recipient_name": "Sales Manager",
        "message": f"A new lead has been submitted by {lead.name} for rep {lead.rep_name}.",
        "job_id": lead.id,
        "job_title": f"New Lead - {lead.name}",
        "job_status": lead.status,
        "job_value": "TBD",
        "action_url": f"https://theroofdocs.com/leads/{lead.id}"
    }
    
    # Send email to all sales managers
    for manager in sales_managers:
        template_data["recipient_name"] = manager.get("name", "Sales Manager")
        await send_email(
            manager["email"],
            f"New Lead Alert - {lead.name}",
            template_data,
            background_tasks
        )

# HR Module Helper Functions
async def calculate_pto_days(start_date: datetime, end_date: datetime) -> float:
    """Calculate number of PTO days between two dates (excluding weekends)"""
    delta = end_date - start_date
    total_days = delta.days + 1
    
    # Count weekdays only
    weekdays = 0
    current_date = start_date
    while current_date <= end_date:
        if current_date.weekday() < 5:  # Monday = 0, Sunday = 6
            weekdays += 1
        current_date += timedelta(days=1)
    
    return float(weekdays)

async def update_pto_balance(employee_id: str, days_used: float, year: int):
    """Update PTO balance for an employee"""
    balance = await db.pto_balances.find_one({"employee_id": employee_id, "year": year})
    
    if balance:
        balance["used_days"] += days_used
        balance["available_days"] = balance["accrued_days"] + balance["carry_over_days"] - balance["used_days"] - balance["pending_days"]
        balance["updated_at"] = datetime.utcnow()
        await db.pto_balances.update_one(
            {"employee_id": employee_id, "year": year},
            {"$set": balance}
        )
    else:
        # Create new balance record
        new_balance = PTOBalance(
            employee_id=employee_id,
            year=year,
            accrued_days=15.0,  # Default annual PTO
            used_days=days_used,
            pending_days=0.0,
            available_days=15.0 - days_used,
            carry_over_days=0.0
        )
        await db.pto_balances.insert_one(new_balance.model_dump())

async def check_workers_comp_deadline(employee_id: str) -> bool:
    """Check if workers comp submission is approaching deadline"""
    employee = await db.employees.find_one({"id": employee_id})
    if not employee or employee.get("employee_type") != "1099":
        return False
    
    hire_date = employee.get("hire_date")
    if not hire_date:
        return False
    
    deadline = hire_date + timedelta(days=14)
    days_remaining = (deadline - datetime.utcnow()).days
    
    return days_remaining <= 3  # Alert if 3 days or less remaining

async def get_employee_onboarding_progress(employee_id: str) -> dict:
    """Get onboarding progress for an employee"""
    employee = await db.employees.find_one({"id": employee_id})
    if not employee:
        return {}
    
    employee_type = employee.get("employee_type", "w2")
    
    # Get onboarding stages for this employee type
    stages = await db.onboarding_stages.find({
        "$or": [
            {"employee_type": "all"},
            {"employee_type": employee_type}
        ]
    }).sort("order", 1).to_list(100)
    
    # Get progress for each stage
    progress_list = []
    for stage in stages:
        progress = await db.onboarding_progress.find_one({
            "employee_id": employee_id,
            "stage_id": stage["id"]
        })
        
        if not progress:
            # Create initial progress record
            progress = OnboardingProgress(
                employee_id=employee_id,
                stage_id=stage["id"],
                status="pending"
            )
            await db.onboarding_progress.insert_one(progress.model_dump())
        
        progress_list.append({
            "stage": stage,
            "progress": progress
        })
    
    return {
        "employee_id": employee_id,
        "employee_type": employee_type,
        "stages": progress_list,
        "total_stages": len(stages),
        "completed_stages": len([p for p in progress_list if p["progress"]["status"] == "completed"])
    }

async def send_onboarding_notification(employee_id: str, stage_name: str, background_tasks: BackgroundTasks):
    """Send notification about onboarding stage completion"""
    employee = await db.employees.find_one({"id": employee_id})
    if not employee:
        return
    
    template_data = {
        "recipient_name": employee["name"],
        "message": f"You have completed the {stage_name} onboarding stage.",
        "job_id": employee_id,
        "job_title": f"Onboarding Progress - {stage_name}",
        "job_status": "Completed",
        "job_value": "N/A",
        "action_url": f"https://theroofdocs.com/onboarding/{employee_id}"
    }
    
    await send_email(
        employee["email"],
        f"Onboarding Update - {stage_name} Completed",
        template_data,
        background_tasks
    )

async def send_workers_comp_reminder(employee_id: str, background_tasks: BackgroundTasks):
    """Send reminder about workers comp submission deadline"""
    employee = await db.employees.find_one({"id": employee_id})
    if not employee:
        return
    
    hire_date = employee.get("hire_date")
    if not hire_date:
        return
    
    deadline = hire_date + timedelta(days=14)
    days_remaining = (deadline - datetime.utcnow()).days
    
    template_data = {
        "recipient_name": employee["name"],
        "message": f"Your workers compensation submission is due in {days_remaining} days. Please complete it as soon as possible.",
        "job_id": employee_id,
        "job_title": "Workers Compensation Submission",
        "job_status": "Due Soon",
        "job_value": "N/A",
        "action_url": f"https://theroofdocs.com/compliance/{employee_id}"
    }
    
    await send_email(
        employee["email"],
        "Workers Compensation Submission Reminder",
        template_data,
        background_tasks
    )

async def send_assignment_notification(assignment: ProjectAssignment, background_tasks: BackgroundTasks):
    """Send notification to sales rep about new assignment"""
    rep = await db.employees.find_one({"id": assignment.assigned_rep_id})
    lead = await db.leads.find_one({"id": assignment.lead_id})
    
    if not rep or not lead:
        return
    
    template_data = {
        "recipient_name": rep["name"],
        "message": f"You have been assigned a new lead: {lead['name']}.",
        "job_id": assignment.id,
        "job_title": f"New Assignment - {lead['name']}",
        "job_status": assignment.status,
        "job_value": "TBD",
        "action_url": f"https://theroofdocs.com/assignments/{assignment.id}"
    }
    
    await send_email(
        rep["email"],
        f"New Assignment - {lead['name']}",
        template_data,
        background_tasks
    )

async def log_qr_scan(rep_id: str, request_info: dict) -> QRCodeScan:
    """Log QR code scan event"""
    scan = QRCodeScan(
        rep_id=rep_id,
        location=request_info.get("location"),
        ip_address=request_info.get("ip_address"),
        user_agent=request_info.get("user_agent")
    )
    
    await db.qr_scans.insert_one(scan.model_dump())
    return scan

async def initialize_sample_data():
    """Initialize sample data for QR Generator"""
    try:
        # Check if sample data already exists
        existing_reps = await db.sales_reps.count_documents({})
        if existing_reps > 0:
            return  # Data already exists
        
        # Add sample sales reps
        sample_reps = [
            {
                "id": "rep-789",
                "name": "John Smith",
                "email": "john.smith@theroofdocs.com",
                "phone": "(555) 345-6789",
                "territory": "Northern Virginia",
                "department": "Sales",
                "picture": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
                "qr_code": "QR123456",
                "landing_page_url": "https://theroofdocs.com/rep/john-smith",
                "welcome_video": "https://www.youtube.com/embed/dQw4w9WgXcQ",
                "about_me": "Hi! I'm John Smith, your local roofing expert with over 10 years of experience. I specialize in residential roofing solutions and pride myself on honest, quality work.",
                "leads": 0,
                "conversions": 0,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "rep-890",
                "name": "Sarah Johnson",
                "email": "sarah.johnson@theroofdocs.com",
                "phone": "(555) 456-7890",
                "territory": "Southern Virginia",
                "department": "Sales",
                "picture": "https://images.unsplash.com/photo-1494790108755-2616b9cf1d1e?w=150&h=150&fit=crop&crop=face",
                "qr_code": "QR234567",
                "landing_page_url": "https://theroofdocs.com/rep/sarah-johnson",
                "welcome_video": "https://www.youtube.com/embed/dQw4w9WgXcQ",
                "about_me": "Hello! I'm Sarah Johnson, dedicated to providing exceptional roofing services. With 8 years in the industry, I focus on storm damage restoration and preventive maintenance.",
                "leads": 0,
                "conversions": 0,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "rep-901",
                "name": "Mike Wilson",
                "email": "mike.wilson@theroofdocs.com",
                "phone": "(555) 567-8901",
                "territory": "Maryland",
                "department": "Sales",
                "picture": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
                "qr_code": "QR345678",
                "landing_page_url": "https://theroofdocs.com/rep/mike-wilson",
                "welcome_video": "https://www.youtube.com/embed/dQw4w9WgXcQ",
                "about_me": "I'm Mike Wilson, your trusted roofing professional in Maryland. I specialize in commercial and residential projects, ensuring every job meets the highest standards.",
                "leads": 0,
                "conversions": 0,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        # Insert sample data
        await db.sales_reps.insert_many(sample_reps)
        
        # Add sample leads
        sample_leads = [
            {
                "id": "lead-001",
                "name": "Robert Davis",
                "email": "robert.davis@email.com",
                "phone": "(555) 111-2222",
                "address": "123 Main St, Richmond, VA",
                "rep_id": "rep-789",
                "rep_name": "John Smith",
                "status": "new",
                "priority": "high",
                "source": "QR Code",
                "message": "Need roof inspection after storm damage",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "assigned_to": None
            },
            {
                "id": "lead-002",
                "name": "Emily Brown",
                "email": "emily.brown@email.com",
                "phone": "(555) 222-3333",
                "address": "456 Oak Ave, Norfolk, VA",
                "rep_id": "rep-890",
                "rep_name": "Sarah Johnson",
                "status": "assigned",
                "priority": "medium",
                "source": "QR Code",
                "message": "Interested in solar roof installation",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "assigned_to": "rep-890"
            },
            {
                "id": "lead-003",
                "name": "David Miller",
                "email": "david.miller@email.com",
                "phone": "(555) 333-4444",
                "address": "789 Pine Rd, Baltimore, MD",
                "rep_id": "rep-901",
                "rep_name": "Mike Wilson",
                "status": "contacted",
                "priority": "low",
                "source": "QR Code",
                "message": "Routine maintenance and gutter cleaning",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "assigned_to": "rep-901"
            }
        ]
        
        await db.leads.insert_many(sample_leads)
        
        print("Sample QR Generator data initialized successfully")
        
    except Exception as e:
        print(f"Error initializing sample data: {str(e)}")

# Initialize sample data on startup
@app.on_event("startup")
async def startup_event():
    await initialize_sample_data()
    
    # Set up and start the automated sync scheduler
    await schedule_automated_sync()
    print("🔄 Automated sync scheduler started (3 times daily)")

@app.on_event("shutdown")
async def shutdown_event():
    # Stop the signup sync scheduler
    signup_scheduler.stop()
    print("⏹️ Signup sync scheduler stopped")

# Authentication Routes
@api_router.post("/auth/login")
async def login(auth_request: AuthRequest):
    """Login with Emergent OAuth session"""
    try:
        # Call Emergent auth API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": auth_request.session_id}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            auth_data = response.json()
            
            # Create or update user
            user_data = {
                "id": auth_data.get("id", str(uuid.uuid4())),
                "email": auth_data["email"],
                "name": auth_data["name"],
                "picture": auth_data.get("picture"),
                "role": "employee",  # Default role
                "created_at": datetime.utcnow(),
                "is_active": True
            }
            
            # Check if user exists
            existing_user = await db.users.find_one({"email": user_data["email"]})
            if existing_user:
                user_data["role"] = existing_user["role"]  # Keep existing role
                await db.users.update_one({"email": user_data["email"]}, {"$set": user_data})
            else:
                await db.users.insert_one(user_data)
            
            # Create session
            session_token = auth_data["session_token"]
            expires_at = datetime.utcnow() + timedelta(days=7)
            
            session_data = {
                "user_id": user_data["id"],
                "session_token": session_token,
                "expires_at": expires_at
            }
            
            await db.user_sessions.insert_one(session_data)
            
            return {
                "access_token": session_token,
                "user": user_data,
                "expires_at": expires_at
            }
    except Exception as e:
        logging.error(f"Login failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

@api_router.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout current user"""
    await db.user_sessions.delete_many({"user_id": current_user.id})
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# Employee Management Routes
@api_router.get("/employees", response_model=List[Employee])
async def get_employees(current_user: User = Depends(get_current_user)):
    """Get all employees"""
    employees = await db.employees.find().to_list(1000)
    return [Employee(**emp) for emp in employees]

@api_router.post("/employees", response_model=Employee)
async def create_employee(employee: Employee, current_user: User = Depends(get_current_user)):
    """Create a new employee"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    employee_dict = employee.model_dump()
    await db.employees.insert_one(employee_dict)
    return employee

@api_router.get("/employees/{employee_id}", response_model=Employee)
async def get_employee(employee_id: str, current_user: User = Depends(get_current_user)):
    """Get employee by ID"""
    employee = await db.employees.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return Employee(**employee)

@api_router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(employee_id: str, employee_update: Employee, current_user: User = Depends(get_current_user)):
    """Update employee"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    employee_dict = employee_update.model_dump()
    employee_dict["updated_at"] = datetime.utcnow()
    
    result = await db.employees.update_one(
        {"id": employee_id},
        {"$set": employee_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return employee_update

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: User = Depends(get_current_user)):
    """Delete employee"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.employees.delete_one({"id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return {"message": "Employee deleted successfully"}

@api_router.post("/employees/import")
async def import_employees(import_request: EmployeeImport, current_user: User = Depends(get_current_user)):
    """Import employees from Google Sheets (fallback to sample data)"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # For now, we'll create sample data since we don't have service account credentials
    sample_employees = [
        {"name": "John Smith", "email": "john.smith@theroofdocs.com", "role": "sales_rep", "territory": "North VA", "commission_rate": 0.05},
        {"name": "Sarah Johnson", "email": "sarah.johnson@theroofdocs.com", "role": "sales_rep", "territory": "South VA", "commission_rate": 0.05},
        {"name": "Mike Wilson", "email": "mike.wilson@theroofdocs.com", "role": "project_manager", "territory": "MD", "commission_rate": 0.03},
        {"name": "Lisa Davis", "email": "lisa.davis@theroofdocs.com", "role": "field_worker", "territory": "PA", "commission_rate": 0.02},
        {"name": "Ahmed Mahmoud", "email": "ahmed.mahmoud@theroofdocs.com", "role": "super_admin", "territory": "All", "commission_rate": 0.10}
    ]
    
    imported_count = 0
    for emp_data in sample_employees:
        employee = Employee(**emp_data)
        existing = await db.employees.find_one({"email": employee.email})
        if not existing:
            await db.employees.insert_one(employee.model_dump())
            imported_count += 1
    
    return {"message": f"Imported {imported_count} employees successfully"}

@api_router.post("/employees/import-from-sheets")
async def import_employees_from_sheets(import_request: GoogleSheetsImportRequest, current_user: User = Depends(get_current_user)):
    """Import employees from Google Sheets with real API integration"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if import_request.data_type != "employees":
        raise HTTPException(status_code=400, detail="Invalid data type for employee import")
    
    try:
        # Read data from Google Sheets
        sheet_data = await google_sheets_service.read_sheet_data(
            import_request.spreadsheet_id, 
            import_request.range_name
        )
        
        if not sheet_data:
            raise HTTPException(status_code=400, detail="No data found in the specified range")
        
        # Skip header row
        data_rows = sheet_data[1:] if len(sheet_data) > 1 else []
        
        imported_count = 0
        errors = []
        
        for i, row in enumerate(data_rows, start=2):  # Start from row 2 (after header)
            try:
                emp_data = parse_employee_row(row)
                if not emp_data.get("name") or not emp_data.get("email"):
                    errors.append(f"Row {i}: Missing required fields (name, email)")
                    continue
                
                employee = Employee(**emp_data)
                existing = await db.employees.find_one({"email": employee.email})
                if not existing:
                    await db.employees.insert_one(employee.model_dump())
                    imported_count += 1
                    
            except Exception as e:
                errors.append(f"Row {i}: {str(e)}")
        
        response = {"imported": imported_count, "total_rows": len(data_rows)}
        if errors:
            response["errors"] = errors
            
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@api_router.post("/sales-reps/import-from-sheets")
async def import_sales_reps_from_sheets(import_request: GoogleSheetsImportRequest, current_user: User = Depends(get_current_user)):
    """Import sales reps from Google Sheets with real API integration"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if import_request.data_type != "sales_reps":
        raise HTTPException(status_code=400, detail="Invalid data type for sales rep import")
    
    try:
        # Read data from Google Sheets
        sheet_data = await google_sheets_service.read_sheet_data(
            import_request.spreadsheet_id, 
            import_request.range_name
        )
        
        if not sheet_data:
            raise HTTPException(status_code=400, detail="No data found in the specified range")
        
        # Skip header row
        data_rows = sheet_data[1:] if len(sheet_data) > 1 else []
        
        imported_count = 0
        errors = []
        
        for i, row in enumerate(data_rows, start=2):  # Start from row 2 (after header)
            try:
                rep_data = parse_sales_rep_row(row)
                if not rep_data.get("name") or not rep_data.get("email"):
                    errors.append(f"Row {i}: Missing required fields (name, email)")
                    continue
                
                sales_rep = SalesRep(**rep_data)
                existing = await db.sales_reps.find_one({"email": sales_rep.email})
                if not existing:
                    await db.sales_reps.insert_one(sales_rep.model_dump())
                    imported_count += 1
                    
            except Exception as e:
                errors.append(f"Row {i}: {str(e)}")
        
        response = {"imported": imported_count, "total_rows": len(data_rows)}
        if errors:
            response["errors"] = errors
            
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@api_router.get("/import/status")
async def get_import_status(current_user: User = Depends(get_current_user)):
    """Get Google Sheets import status and configuration"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check enabled status dynamically
    google_sheets_enabled = os.getenv("GOOGLE_SHEETS_ENABLED", "false").lower() == "true"
    
    return {
        "google_sheets_enabled": google_sheets_enabled,
        "credentials_configured": os.path.exists(google_sheets_service.credentials_path),
        "supported_data_types": ["employees", "sales_reps"],
        "sample_ranges": {
            "employees": "Employees!A:E",
            "sales_reps": "Sales Reps!A:F"
        }
    }

# Job Management Routes
@api_router.get("/jobs", response_model=List[Job])
async def get_jobs(current_user: User = Depends(get_current_user)):
    """Get all jobs"""
    query = {}
    if current_user.role == "sales_rep":
        query["assigned_rep_id"] = current_user.id
    
    jobs = await db.jobs.find(query).to_list(1000)
    return [Job(**job) for job in jobs]

@api_router.post("/jobs", response_model=Job)
async def create_job(job_create: JobCreate, current_user: User = Depends(get_current_user)):
    """Create a new job"""
    job_data = job_create.model_dump()
    job_data["id"] = str(uuid.uuid4())
    job_data["created_at"] = datetime.utcnow()
    job_data["updated_at"] = datetime.utcnow()
    
    job = Job(**job_data)
    await db.jobs.insert_one(job.model_dump())
    
    return job

@api_router.get("/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str, current_user: User = Depends(get_current_user)):
    """Get job by ID"""
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check permissions
    if current_user.role == "sales_rep" and job["assigned_rep_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return Job(**job)

@api_router.put("/jobs/{job_id}", response_model=Job)
async def update_job(job_id: str, job_update: JobUpdate, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """Update job"""
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check permissions
    if current_user.role == "sales_rep" and job["assigned_rep_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in job_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Handle status change
    old_status = job["status"]
    new_status = update_data.get("status", old_status)
    
    await db.jobs.update_one({"id": job_id}, {"$set": update_data})
    
    # Send email notification if status changed
    if old_status != new_status and job.get("customer_email"):
        template_data = {
            "recipient_name": job["customer_name"],
            "message": f"Your job status has been updated from {old_status} to {new_status}.",
            "job_id": job_id,
            "job_title": job["title"],
            "job_status": new_status,
            "job_value": job["value"],
            "action_url": f"https://yourapp.com/jobs/{job_id}"
        }
        
        await send_email(
            job["customer_email"],
            f"Job Status Update - {job['title']}",
            template_data,
            background_tasks
        )
    
    # Calculate commission if job completed
    if new_status == "completed" and job.get("assigned_rep_id"):
        employee = await db.employees.find_one({"id": job["assigned_rep_id"]})
        if employee:
            commission_amount = calculate_commission(job["value"], employee["commission_rate"])
            commission = Commission(
                employee_id=employee["id"],
                job_id=job_id,
                amount=commission_amount,
                rate=employee["commission_rate"]
            )
            await db.commissions.insert_one(commission.model_dump())
            
            # Update job with commission amount
            await db.jobs.update_one(
                {"id": job_id},
                {"$set": {"commission_amount": commission_amount}}
            )
    
    updated_job = await db.jobs.find_one({"id": job_id})
    return Job(**updated_job)

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, current_user: User = Depends(get_current_user)):
    """Delete job"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.jobs.delete_one({"id": job_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"message": "Job deleted successfully"}

# Commission Routes
@api_router.get("/commissions", response_model=List[Commission])
async def get_commissions(current_user: User = Depends(get_current_user)):
    """Get commissions"""
    query = {}
    if current_user.role == "sales_rep":
        query["employee_id"] = current_user.id
    
    commissions = await db.commissions.find(query).to_list(1000)
    return [Commission(**comm) for comm in commissions]

@api_router.get("/commissions/employee/{employee_id}", response_model=List[Commission])
async def get_employee_commissions(employee_id: str, current_user: User = Depends(get_current_user)):
    """Get commissions for specific employee"""
    if current_user.role == "sales_rep" and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    commissions = await db.commissions.find({"employee_id": employee_id}).to_list(1000)
    return [Commission(**comm) for comm in commissions]

# Analytics Routes
@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(current_user: User = Depends(get_current_user)):
    """Get dashboard analytics"""
    if current_user.role == "sales_rep":
        # Sales rep specific analytics
        jobs = await db.jobs.find({"assigned_rep_id": current_user.id}).to_list(1000)
        commissions = await db.commissions.find({"employee_id": current_user.id}).to_list(1000)
        
        total_jobs = len(jobs)
        completed_jobs = len([j for j in jobs if j["status"] == "completed"])
        total_commission = sum([c["amount"] for c in commissions])
        
        return {
            "total_jobs": total_jobs,
            "completed_jobs": completed_jobs,
            "total_commission": total_commission,
            "completion_rate": (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0
        }
    else:
        # Admin/Manager analytics
        total_employees = await db.employees.count_documents({})
        total_jobs = await db.jobs.count_documents({})
        completed_jobs = await db.jobs.count_documents({"status": "completed"})
        total_commissions = await db.commissions.count_documents({})
        
        return {
            "total_employees": total_employees,
            "total_jobs": total_jobs,
            "completed_jobs": completed_jobs,
            "total_commissions": total_commissions,
            "completion_rate": (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0
        }

# QR Code Generator Routes
@api_router.get("/qr-generator/reps", response_model=List[SalesRep])
async def get_sales_reps(current_user: User = Depends(get_current_user)):
    """Get all sales reps"""
    if current_user.role == "sales_rep":
        # Sales rep can only see their own data
        reps = await db.sales_reps.find({"id": current_user.id}).to_list(1000)
    else:
        # Admin/managers can see all reps
        reps = await db.sales_reps.find().to_list(1000)
    
    return [SalesRep(**rep) for rep in reps]

@api_router.post("/qr-generator/reps", response_model=SalesRep)
async def create_sales_rep(rep_create: SalesRepCreate, current_user: User = Depends(get_current_user)):
    """Create a new sales rep"""
    if current_user.role not in ["super_admin", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Generate QR code and landing page URL
    qr_code = generate_qr_code(str(uuid.uuid4()))
    landing_page_url = generate_landing_page_url(rep_create.name)
    
    rep_data = rep_create.model_dump()
    rep_data["id"] = str(uuid.uuid4())
    rep_data["qr_code"] = qr_code
    rep_data["landing_page_url"] = landing_page_url
    rep_data["created_at"] = datetime.utcnow()
    rep_data["updated_at"] = datetime.utcnow()
    
    rep = SalesRep(**rep_data)
    await db.sales_reps.insert_one(rep.model_dump())
    
    # Store QR code mapping
    qr_mapping = QRCode(
        rep_id=rep.id,
        code=qr_code,
        url=landing_page_url
    )
    await db.qr_codes.insert_one(qr_mapping.model_dump())
    
    return rep

@api_router.get("/qr-generator/reps/{rep_id}", response_model=SalesRep)
async def get_sales_rep(rep_id: str, current_user: User = Depends(get_current_user)):
    """Get sales rep by ID"""
    if current_user.role == "sales_rep" and current_user.id != rep_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    rep = await db.sales_reps.find_one({"id": rep_id})
    if not rep:
        raise HTTPException(status_code=404, detail="Sales rep not found")
    
    return SalesRep(**rep)

@api_router.put("/qr-generator/reps/{rep_id}", response_model=SalesRep)
async def update_sales_rep(rep_id: str, rep_update: SalesRepUpdate, current_user: User = Depends(get_current_user)):
    """Update sales rep"""
    if current_user.role == "sales_rep" and current_user.id != rep_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.role == "sales_rep":
        # Sales reps can only update certain fields
        allowed_fields = ["phone", "about_me", "picture", "welcome_video"]
        update_data = {k: v for k, v in rep_update.model_dump().items() if v is not None and k in allowed_fields}
    else:
        # Admin/managers can update all fields
        update_data = {k: v for k, v in rep_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.sales_reps.update_one(
        {"id": rep_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sales rep not found")
    
    updated_rep = await db.sales_reps.find_one({"id": rep_id})
    return SalesRep(**updated_rep)

@api_router.delete("/qr-generator/reps/{rep_id}")
async def delete_sales_rep(rep_id: str, current_user: User = Depends(get_current_user)):
    """Delete sales rep"""
    if current_user.role not in ["super_admin", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.sales_reps.delete_one({"id": rep_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sales rep not found")
    
    # Also delete QR code mapping
    await db.qr_codes.delete_many({"rep_id": rep_id})
    
    return {"message": "Sales rep deleted successfully"}

# File Upload Routes
@api_router.post("/qr-generator/reps/{rep_id}/upload-picture")
async def upload_rep_picture(rep_id: str, file_upload: FileUpload, current_user: User = Depends(get_current_user)):
    """Upload sales rep picture"""
    if current_user.role == "sales_rep" and current_user.id != rep_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate file type
    if not file_upload.file_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")
    
    # Store as base64 in database
    update_data = {
        "picture": file_upload.file_data,
        "updated_at": datetime.utcnow()
    }
    
    result = await db.sales_reps.update_one(
        {"id": rep_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sales rep not found")
    
    return {"message": "Picture uploaded successfully"}

@api_router.post("/qr-generator/reps/{rep_id}/upload-video")
async def upload_rep_video(rep_id: str, file_upload: FileUpload, current_user: User = Depends(get_current_user)):
    """Upload sales rep welcome video"""
    if current_user.role == "sales_rep" and current_user.id != rep_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate file type
    if not file_upload.file_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only videos are allowed.")
    
    # Store as base64 in database
    update_data = {
        "welcome_video": file_upload.file_data,
        "updated_at": datetime.utcnow()
    }
    
    result = await db.sales_reps.update_one(
        {"id": rep_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sales rep not found")
    
    return {"message": "Video uploaded successfully"}

# Lead Management Routes
@api_router.get("/qr-generator/leads", response_model=List[Lead])
async def get_leads(current_user: User = Depends(get_current_user)):
    """Get all leads"""
    if current_user.role == "sales_rep":
        # Sales rep can only see their own leads
        leads = await db.leads.find({"rep_id": current_user.id}).to_list(1000)
    else:
        # Admin/managers can see all leads
        leads = await db.leads.find().to_list(1000)
    
    return [Lead(**lead) for lead in leads]

@api_router.post("/qr-generator/leads", response_model=Lead)
async def create_lead(lead_create: LeadCreate, background_tasks: BackgroundTasks):
    """Create a new lead (public endpoint for landing pages)"""
    # Get rep information
    rep = await db.sales_reps.find_one({"id": lead_create.rep_id})
    if not rep:
        raise HTTPException(status_code=404, detail="Sales rep not found")
    
    lead_data = lead_create.model_dump()
    lead_data["id"] = str(uuid.uuid4())
    lead_data["rep_name"] = rep["name"]
    lead_data["created_at"] = datetime.utcnow()
    lead_data["updated_at"] = datetime.utcnow()
    
    lead = Lead(**lead_data)
    await db.leads.insert_one(lead.model_dump())
    
    # Update rep's lead count
    await db.sales_reps.update_one(
        {"id": lead_create.rep_id},
        {"$inc": {"leads": 1}}
    )
    
    # Send notification email to rep
    await send_lead_notification(lead, rep["email"], background_tasks)
    
    return lead

@api_router.get("/qr-generator/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str, current_user: User = Depends(get_current_user)):
    """Get lead by ID"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check permissions
    if current_user.role == "sales_rep" and lead["rep_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return Lead(**lead)

@api_router.put("/qr-generator/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, lead_update: LeadUpdate, current_user: User = Depends(get_current_user)):
    """Update lead"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check permissions
    if current_user.role == "sales_rep" and lead["rep_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in lead_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Track conversions
    if lead_update.status == "converted" and lead["status"] != "converted":
        # Increment conversion count for the rep
        await db.sales_reps.update_one(
            {"id": lead["rep_id"]},
            {"$inc": {"conversions": 1}}
        )
    
    result = await db.leads.update_one(
        {"id": lead_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    updated_lead = await db.leads.find_one({"id": lead_id})
    return Lead(**updated_lead)

# Public Landing Page Routes (no authentication required)
@api_router.get("/public/rep/{rep_name}")
async def get_rep_landing_page(rep_name: str):
    """Get sales rep landing page data (public endpoint)"""
    # Convert URL name back to search format
    search_name = rep_name.replace("-", " ").title()
    
    rep = await db.sales_reps.find_one({"name": {"$regex": search_name, "$options": "i"}})
    if not rep or not rep["is_active"]:
        raise HTTPException(status_code=404, detail="Sales rep not found")
    
    # Return only public information
    return {
        "id": rep["id"],
        "name": rep["name"],
        "phone": rep["phone"],
        "territory": rep["territory"],
        "picture": rep["picture"],
        "welcome_video": rep["welcome_video"],
        "about_me": rep["about_me"],
        "qr_code": rep["qr_code"],
        "landing_page_url": rep["landing_page_url"]
    }

# QR Code Analytics
@api_router.get("/qr-generator/analytics")
async def get_qr_analytics(current_user: User = Depends(get_current_user)):
    """Get QR code generator analytics"""
    if current_user.role == "sales_rep":
        # Sales rep specific analytics
        rep = await db.sales_reps.find_one({"id": current_user.id})
        leads = await db.leads.find({"rep_id": current_user.id}).to_list(1000)
        
        total_leads = len(leads)
        new_leads = len([l for l in leads if l["status"] == "new"])
        conversions = len([l for l in leads if l["status"] == "converted"])
        
        return {
            "total_leads": total_leads,
            "new_leads": new_leads,
            "conversions": conversions,
            "conversion_rate": (conversions / total_leads * 100) if total_leads > 0 else 0,
            "qr_code": rep["qr_code"] if rep else None
        }
    else:
        # Admin/manager analytics
        total_reps = await db.sales_reps.count_documents({"is_active": True})
        total_leads = await db.leads.count_documents({})
        total_conversions = await db.leads.count_documents({"status": "converted"})
        total_qr_codes = await db.qr_codes.count_documents({"is_active": True})
        
        return {
            "total_reps": total_reps,
            "total_leads": total_leads,
            "total_conversions": total_conversions,
            "total_qr_codes": total_qr_codes,
            "conversion_rate": (total_conversions / total_leads * 100) if total_leads > 0 else 0
        }

# ===== HR MODULE ENDPOINTS =====

# Employee Onboarding Management
@api_router.get("/onboarding/stages", response_model=List[OnboardingStage])
async def get_onboarding_stages(current_user: User = Depends(get_current_user)):
    """Get all onboarding stages"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    stages = await db.onboarding_stages.find({"is_active": True}).sort("order", 1).to_list(100)
    return [OnboardingStage(**stage) for stage in stages]

@api_router.post("/onboarding/stages", response_model=OnboardingStage)
async def create_onboarding_stage(stage_create: OnboardingStageCreate, current_user: User = Depends(get_current_user)):
    """Create new onboarding stage"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    stage = OnboardingStage(**stage_create.model_dump())
    await db.onboarding_stages.insert_one(stage.model_dump())
    return stage

@api_router.put("/onboarding/stages/{stage_id}", response_model=OnboardingStage)
async def update_onboarding_stage(stage_id: str, stage_update: OnboardingStageUpdate, current_user: User = Depends(get_current_user)):
    """Update onboarding stage"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in stage_update.model_dump().items() if v is not None}
    result = await db.onboarding_stages.update_one({"id": stage_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    stage = await db.onboarding_stages.find_one({"id": stage_id})
    return OnboardingStage(**stage)

@api_router.get("/onboarding/employee/{employee_id}")
async def get_employee_onboarding(employee_id: str, current_user: User = Depends(get_current_user)):
    """Get onboarding progress for an employee"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"] and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    progress = await get_employee_onboarding_progress(employee_id)
    return progress

@api_router.post("/onboarding/employee/{employee_id}/stage/{stage_id}/complete")
async def complete_onboarding_stage(employee_id: str, stage_id: str, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """Mark onboarding stage as complete"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"] and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update progress
    result = await db.onboarding_progress.update_one(
        {"employee_id": employee_id, "stage_id": stage_id},
        {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Progress record not found")
    
    # Send notification
    stage = await db.onboarding_stages.find_one({"id": stage_id})
    if stage:
        await send_onboarding_notification(employee_id, stage["name"], background_tasks)
    
    return {"message": "Stage marked as complete"}

# PTO Management (W2 employees only)
@api_router.get("/pto/requests", response_model=List[PTORequest])
async def get_pto_requests(current_user: User = Depends(get_current_user)):
    """Get PTO requests"""
    if current_user.role == "employee" or current_user.role == "sales_rep":
        requests = await db.pto_requests.find({"employee_id": current_user.id}).to_list(100)
    else:
        requests = await db.pto_requests.find({}).to_list(100)
    
    return [PTORequest(**req) for req in requests]

@api_router.post("/pto/requests", response_model=PTORequest)
async def create_pto_request(pto_request: PTORequestCreate, current_user: User = Depends(get_current_user)):
    """Create PTO request"""
    # Check if employee is W2
    employee = await db.employees.find_one({"id": current_user.id})
    if not employee or employee.get("employee_type") != "w2":
        raise HTTPException(status_code=403, detail="PTO requests are only available for W2 employees")
    
    # Calculate days requested
    days_requested = await calculate_pto_days(pto_request.start_date, pto_request.end_date)
    
    # Check available balance
    balance = await db.pto_balances.find_one({"employee_id": current_user.id, "year": pto_request.start_date.year})
    if balance and balance["available_days"] < days_requested:
        raise HTTPException(status_code=400, detail="Insufficient PTO balance")
    
    request = PTORequest(
        employee_id=current_user.id,
        start_date=pto_request.start_date,
        end_date=pto_request.end_date,
        days_requested=days_requested,
        reason=pto_request.reason
    )
    
    await db.pto_requests.insert_one(request.model_dump())
    
    # Update pending days in balance
    if balance:
        await db.pto_balances.update_one(
            {"employee_id": current_user.id, "year": pto_request.start_date.year},
            {"$inc": {"pending_days": days_requested}}
        )
    
    return request

@api_router.put("/pto/requests/{request_id}", response_model=PTORequest)
async def update_pto_request(request_id: str, pto_update: PTORequestUpdate, current_user: User = Depends(get_current_user)):
    """Update PTO request (approve/deny)"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    request = await db.pto_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    update_data = {k: v for k, v in pto_update.model_dump().items() if v is not None}
    update_data["approved_by"] = current_user.id
    update_data["approved_at"] = datetime.utcnow()
    
    result = await db.pto_requests.update_one({"id": request_id}, {"$set": update_data})
    
    # Update PTO balance based on approval/denial
    if pto_update.status == "approved":
        await update_pto_balance(request["employee_id"], request["days_requested"], request["start_date"].year)
    
    # Update pending days
    await db.pto_balances.update_one(
        {"employee_id": request["employee_id"], "year": request["start_date"].year},
        {"$inc": {"pending_days": -request["days_requested"]}}
    )
    
    updated_request = await db.pto_requests.find_one({"id": request_id})
    return PTORequest(**updated_request)

@api_router.get("/pto/balance/{employee_id}")
async def get_pto_balance(employee_id: str, current_user: User = Depends(get_current_user)):
    """Get PTO balance for employee"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"] and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    current_year = datetime.utcnow().year
    balance = await db.pto_balances.find_one({"employee_id": employee_id, "year": current_year})
    
    if not balance:
        # Create initial balance
        balance = PTOBalance(
            employee_id=employee_id,
            year=current_year,
            accrued_days=15.0,  # Default annual PTO
            available_days=15.0
        )
        await db.pto_balances.insert_one(balance.model_dump())
    
    return balance

# Hiring Flow Management Routes
@api_router.get("/hiring/flows", response_model=List[HiringFlow])
async def get_hiring_flows(current_user: User = Depends(get_current_user)):
    """Get all hiring flows"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    flows = await db.hiring_flows.find().to_list(1000)
    return [HiringFlow(**flow) for flow in flows]

@api_router.post("/hiring/flows", response_model=HiringFlow)
async def create_hiring_flow(flow: HiringFlow, current_user: User = Depends(get_current_user)):
    """Create a new hiring flow"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.hiring_flows.insert_one(flow.model_dump())
    return flow

@api_router.get("/hiring/flows/{flow_id}", response_model=HiringFlow)
async def get_hiring_flow(flow_id: str, current_user: User = Depends(get_current_user)):
    """Get hiring flow by ID"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    flow = await db.hiring_flows.find_one({"id": flow_id})
    if not flow:
        raise HTTPException(status_code=404, detail="Hiring flow not found")
    
    return HiringFlow(**flow)

@api_router.put("/hiring/flows/{flow_id}", response_model=HiringFlow)
async def update_hiring_flow(flow_id: str, flow_update: HiringFlow, current_user: User = Depends(get_current_user)):
    """Update hiring flow"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    flow_data = flow_update.model_dump()
    flow_data["updated_at"] = datetime.utcnow()
    
    result = await db.hiring_flows.update_one(
        {"id": flow_id},
        {"$set": flow_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hiring flow not found")
    
    return flow_update

@api_router.delete("/hiring/flows/{flow_id}")
async def delete_hiring_flow(flow_id: str, current_user: User = Depends(get_current_user)):
    """Delete hiring flow"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.hiring_flows.delete_one({"id": flow_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hiring flow not found")
    
    return {"message": "Hiring flow deleted successfully"}

# Hiring Candidate Management Routes
@api_router.get("/hiring/candidates", response_model=List[HiringCandidate])
async def get_hiring_candidates(current_user: User = Depends(get_current_user)):
    """Get all hiring candidates"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    candidates = await db.hiring_candidates.find().to_list(1000)
    return [HiringCandidate(**candidate) for candidate in candidates]

@api_router.post("/hiring/candidates", response_model=HiringCandidate)
async def create_hiring_candidate(candidate: HiringCandidate, current_user: User = Depends(get_current_user)):
    """Create a new hiring candidate"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.hiring_candidates.insert_one(candidate.model_dump())
    return candidate

@api_router.get("/hiring/candidates/{candidate_id}", response_model=HiringCandidate)
async def get_hiring_candidate(candidate_id: str, current_user: User = Depends(get_current_user)):
    """Get hiring candidate by ID"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    candidate = await db.hiring_candidates.find_one({"id": candidate_id})
    if not candidate:
        raise HTTPException(status_code=404, detail="Hiring candidate not found")
    
    return HiringCandidate(**candidate)

@api_router.put("/hiring/candidates/{candidate_id}", response_model=HiringCandidate)
async def update_hiring_candidate(candidate_id: str, candidate_update: HiringCandidate, current_user: User = Depends(get_current_user)):
    """Update hiring candidate"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    candidate_data = candidate_update.model_dump()
    candidate_data["updated_at"] = datetime.utcnow()
    
    result = await db.hiring_candidates.update_one(
        {"id": candidate_id},
        {"$set": candidate_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hiring candidate not found")
    
    return candidate_update

@api_router.delete("/hiring/candidates/{candidate_id}")
async def delete_hiring_candidate(candidate_id: str, current_user: User = Depends(get_current_user)):
    """Delete hiring candidate"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.hiring_candidates.delete_one({"id": candidate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hiring candidate not found")
    
    return {"message": "Hiring candidate deleted successfully"}

@api_router.get("/hiring/candidates/by-type/{hiring_type}", response_model=List[HiringCandidate])
async def get_candidates_by_type(hiring_type: str, current_user: User = Depends(get_current_user)):
    """Get candidates by hiring type"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    candidates = await db.hiring_candidates.find({"hiring_type": hiring_type}).to_list(1000)
    return [HiringCandidate(**candidate) for candidate in candidates]

@api_router.post("/hiring/candidates/{candidate_id}/advance")
async def advance_candidate_stage(candidate_id: str, current_user: User = Depends(get_current_user)):
    """Advance candidate to next stage"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    candidate = await db.hiring_candidates.find_one({"id": candidate_id})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get the hiring flow to determine next stage
    flow = await db.hiring_flows.find_one({"type": candidate["hiring_type"]})
    if not flow:
        raise HTTPException(status_code=404, detail="Hiring flow not found")
    
    current_stage_index = flow["stages"].index(candidate["current_stage"])
    if current_stage_index < len(flow["stages"]) - 1:
        next_stage = flow["stages"][current_stage_index + 1]
        await db.hiring_candidates.update_one(
            {"id": candidate_id},
            {"$set": {"current_stage": next_stage, "updated_at": datetime.utcnow()}}
        )
        return {"message": f"Candidate advanced to {next_stage}"}
    else:
        await db.hiring_candidates.update_one(
            {"id": candidate_id},
            {"$set": {"status": "hired", "updated_at": datetime.utcnow()}}
        )
        return {"message": "Candidate hired successfully"}

@api_router.post("/hiring/initialize-sample-flows")
async def initialize_sample_hiring_flows(current_user: User = Depends(get_current_user)):
    """Initialize sample hiring flows for different types"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if flows already exist
    existing_flows = await db.hiring_flows.count_documents({})
    if existing_flows > 0:
        return {"message": "Sample flows already exist"}
    
    sample_flows = [
        {
            "name": "Insurance Agent Hiring",
            "type": "insurance",
            "description": "Comprehensive hiring process for insurance agents",
            "stages": ["application", "phone_screening", "skills_assessment", "interview_round_1", "interview_round_2", "background_check", "offer"],
            "requirements": ["Valid insurance license", "2+ years experience", "Clean driving record", "Professional references"],
            "timeline_days": 21,
            "is_active": True
        },
        {
            "name": "Retail Associate Hiring",
            "type": "retail",
            "description": "Streamlined hiring process for retail associates",
            "stages": ["application", "phone_screening", "in_person_interview", "skills_assessment", "reference_check", "offer"],
            "requirements": ["Customer service experience", "Availability for flexible hours", "Basic math skills", "Professional appearance"],
            "timeline_days": 14,
            "is_active": True
        },
        {
            "name": "Office Administrator Hiring",
            "type": "office",
            "description": "Professional hiring process for office administrators",
            "stages": ["application", "resume_review", "phone_screening", "skills_test", "panel_interview", "background_check", "offer"],
            "requirements": ["Office management experience", "Proficiency in Microsoft Office", "Strong communication skills", "Organizational abilities"],
            "timeline_days": 18,
            "is_active": True
        },
        {
            "name": "Production Worker Hiring",
            "type": "production",
            "description": "Safety-focused hiring process for production workers",
            "stages": ["application", "safety_screening", "physical_assessment", "skills_demonstration", "interview", "drug_test", "offer"],
            "requirements": ["Physical fitness", "Safety training certification", "Previous manufacturing experience", "Ability to work shifts"],
            "timeline_days": 10,
            "is_active": True
        }
    ]
    
    for flow_data in sample_flows:
        flow = HiringFlow(**flow_data)
        await db.hiring_flows.insert_one(flow.model_dump())
    
    return {"message": "Sample hiring flows initialized successfully"}

@api_router.get("/safety/employee/{employee_id}/progress")
async def get_employee_safety_progress(employee_id: str, current_user: User = Depends(get_current_user)):
    """Get safety training progress for employee"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"] and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    employee = await db.employees.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee_type = employee.get("employee_type", "w2")
    
    # Get required trainings for this employee type
    trainings = await db.safety_trainings.find({
        "$or": [
            {"required_for": "all"},
            {"required_for": employee_type}
        ]
    }).to_list(100)
    
    progress_list = []
    for training in trainings:
        progress = await db.safety_training_progress.find_one({
            "employee_id": employee_id,
            "training_id": training["id"]
        })
        
        if not progress:
            progress = SafetyTrainingProgress(
                employee_id=employee_id,
                training_id=training["id"]
            )
            await db.safety_training_progress.insert_one(progress.model_dump())
        
        progress_list.append({
            "training": training,
            "progress": progress
        })
    
    return progress_list

@api_router.post("/safety/employee/{employee_id}/training/{training_id}/complete")
async def complete_safety_training(employee_id: str, training_id: str, score: float, current_user: User = Depends(get_current_user)):
    """Mark safety training as complete"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"] and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    training = await db.safety_trainings.find_one({"id": training_id})
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    
    # Calculate expiration date if renewal is required
    expires_at = None
    if training.get("renewal_months"):
        expires_at = datetime.utcnow() + timedelta(days=training["renewal_months"] * 30)
    
    result = await db.safety_training_progress.update_one(
        {"employee_id": employee_id, "training_id": training_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.utcnow(),
            "expires_at": expires_at,
            "score": score
        }}
    )
    
    return {"message": "Training marked as complete"}

# Workers Compensation Management
@api_router.get("/compliance/workers-comp", response_model=List[WorkersCompSubmission])
async def get_workers_comp_submissions(current_user: User = Depends(get_current_user)):
    """Get workers compensation submissions"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    submissions = await db.workers_comp_submissions.find({}).to_list(100)
    return [WorkersCompSubmission(**sub) for sub in submissions]

@api_router.post("/compliance/workers-comp", response_model=WorkersCompSubmission)
async def create_workers_comp_submission(employee_id: str, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """Create workers compensation submission record"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    employee = await db.employees.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if employee.get("employee_type") != "1099":
        raise HTTPException(status_code=400, detail="Workers comp only required for 1099 employees")
    
    hire_date = employee.get("hire_date", datetime.utcnow())
    deadline = hire_date + timedelta(days=14)
    
    submission = WorkersCompSubmission(
        employee_id=employee_id,
        submission_date=datetime.utcnow(),
        submission_deadline=deadline,
        submitted_by=current_user.id
    )
    
    await db.workers_comp_submissions.insert_one(submission.model_dump())
    
    # Send reminder if approaching deadline
    if await check_workers_comp_deadline(employee_id):
        await send_workers_comp_reminder(employee_id, background_tasks)
    
    return submission

@api_router.get("/compliance/workers-comp/overdue")
async def get_overdue_workers_comp(current_user: User = Depends(get_current_user)):
    """Get overdue workers compensation submissions"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Find all 1099 employees hired more than 14 days ago without submissions
    cutoff_date = datetime.utcnow() - timedelta(days=14)
    
    employees = await db.employees.find({
        "employee_type": "1099",
        "hire_date": {"$lte": cutoff_date}
    }).to_list(100)
    
    overdue_employees = []
    for employee in employees:
        submission = await db.workers_comp_submissions.find_one({"employee_id": employee["id"]})
        if not submission:
            overdue_employees.append({
                "employee": employee,
                "days_overdue": (datetime.utcnow() - (employee["hire_date"] + timedelta(days=14))).days
            })
    
    return overdue_employees

# Incident Reporting
@api_router.get("/safety/incidents", response_model=List[IncidentReport])
async def get_incident_reports(current_user: User = Depends(get_current_user)):
    """Get incident reports"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    incidents = await db.incident_reports.find({}).to_list(100)
    return [IncidentReport(**incident) for incident in incidents]

@api_router.post("/safety/incidents", response_model=IncidentReport)
async def create_incident_report(incident_create: IncidentReportCreate, current_user: User = Depends(get_current_user)):
    """Create new incident report"""
    incident = IncidentReport(
        employee_id=current_user.id,
        incident_date=incident_create.incident_date,
        location=incident_create.location,
        description=incident_create.description,
        injury_type=incident_create.injury_type,
        severity=incident_create.severity,
        witnesses=incident_create.witnesses,
        actions_taken=incident_create.actions_taken,
        reported_by=current_user.id
    )
    
    await db.incident_reports.insert_one(incident.model_dump())
    return incident

# Project Assignment Management
@api_router.get("/assignments", response_model=List[ProjectAssignment])
async def get_project_assignments(current_user: User = Depends(get_current_user)):
    """Get project assignments"""
    if current_user.role == "sales_rep":
        assignments = await db.project_assignments.find({"assigned_rep_id": current_user.id}).to_list(100)
    else:
        assignments = await db.project_assignments.find({}).to_list(100)
    
    return [ProjectAssignment(**assignment) for assignment in assignments]

@api_router.post("/assignments", response_model=ProjectAssignment)
async def create_project_assignment(assignment_create: ProjectAssignmentCreate, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """Create new project assignment"""
    if current_user.role not in ["super_admin", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    assignment = ProjectAssignment(
        lead_id=assignment_create.lead_id,
        assigned_rep_id=assignment_create.assigned_rep_id,
        assigned_by=current_user.id,
        priority=assignment_create.priority,
        notes=assignment_create.notes,
        due_date=assignment_create.due_date
    )
    
    await db.project_assignments.insert_one(assignment.model_dump())
    
    # Send notification to rep
    await send_assignment_notification(assignment, background_tasks)
    
    return assignment

@api_router.get("/assignments/qr-scans")
async def get_qr_scan_analytics(current_user: User = Depends(get_current_user)):
    """Get QR code scan analytics for assignment"""
    if current_user.role not in ["super_admin", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all QR scans with lead generation info
    scans = await db.qr_scans.find({}).to_list(1000)
    
    # Group by rep
    rep_stats = {}
    for scan in scans:
        rep_id = scan["rep_id"]
        if rep_id not in rep_stats:
            rep_stats[rep_id] = {
                "total_scans": 0,
                "leads_generated": 0,
                "recent_scans": []
            }
        
        rep_stats[rep_id]["total_scans"] += 1
        if scan.get("lead_generated"):
            rep_stats[rep_id]["leads_generated"] += 1
        
        # Add recent scan info
        if len(rep_stats[rep_id]["recent_scans"]) < 5:
            rep_stats[rep_id]["recent_scans"].append(scan)
    
    # Get rep names
    for rep_id, stats in rep_stats.items():
        rep = await db.sales_reps.find_one({"id": rep_id})
        stats["rep_name"] = rep["name"] if rep else "Unknown"
    
    return rep_stats

@api_router.post("/assignments/qr-scan/{rep_id}")
async def log_qr_code_scan(rep_id: str, request: Dict[str, Any], current_user: User = Depends(get_current_user)):
    """Log QR code scan event"""
    scan = await log_qr_scan(rep_id, request)
    
    # Notify admin/sales managers about the scan
    if current_user.role in ["super_admin", "sales_manager"]:
        rep = await db.sales_reps.find_one({"id": rep_id})
        if rep:
            return {
                "message": f"QR code scan logged for {rep['name']}",
                "scan_id": scan.id,
                "rep_name": rep["name"]
            }
    
    return {"message": "QR code scan logged", "scan_id": scan.id}

# Appointment Management
@api_router.get("/appointments", response_model=List[AppointmentRequest])
async def get_appointment_requests(current_user: User = Depends(get_current_user)):
    """Get appointment requests"""
    if current_user.role == "sales_rep":
        appointments = await db.appointment_requests.find({"rep_id": current_user.id}).to_list(100)
    else:
        appointments = await db.appointment_requests.find({}).to_list(100)
    
    return [AppointmentRequest(**appointment) for appointment in appointments]

@api_router.post("/appointments", response_model=AppointmentRequest)
async def create_appointment_request(appointment_create: AppointmentRequestCreate, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """Create new appointment request"""
    appointment = AppointmentRequest(**appointment_create.model_dump())
    await db.appointment_requests.insert_one(appointment.model_dump())
    
    # Log QR scan with lead generation
    await log_qr_scan(appointment.rep_id, {
        "lead_generated": True,
        "lead_id": appointment.id
    })
    
    # Create lead record
    lead = Lead(
        rep_id=appointment.rep_id,
        name=appointment.customer_name,
        email=appointment.customer_email,
        phone=appointment.customer_phone,
        address=appointment.customer_address,
        message=appointment.message or "",
        status="new",
        priority="medium",
        rep_name="",  # Will be filled by system
        territory="",  # Will be filled by system
        department="Sales"
    )
    
    await db.leads.insert_one(lead.model_dump())
    
    # Send notification to rep
    rep = await db.sales_reps.find_one({"id": appointment.rep_id})
    if rep:
        await send_assignment_notification(
            ProjectAssignment(
                lead_id=lead.id,
                assigned_rep_id=appointment.rep_id,
                assigned_by="system",
                priority="medium"
            ),
            background_tasks
        )
    
    return appointment

# Employee Self-Service
@api_router.get("/self-service/dashboard")
async def get_employee_dashboard(current_user: User = Depends(get_current_user)):
    """Get employee self-service dashboard"""
    employee = await db.employees.find_one({"id": current_user.id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    dashboard_data = {
        "employee": employee,
        "employee_type": employee.get("employee_type", "w2"),
        "onboarding_progress": await get_employee_onboarding_progress(current_user.id),
        "recent_requests": await db.employee_requests.find({"employee_id": current_user.id}).limit(5).to_list(5),
        "documents": await db.employee_documents.find({"employee_id": current_user.id}).to_list(10)
    }
    
    # Add PTO info for W2 employees
    if employee.get("employee_type") == "w2":
        dashboard_data["pto_balance"] = await db.pto_balances.find_one({
            "employee_id": current_user.id,
            "year": datetime.utcnow().year
        })
        dashboard_data["pto_requests"] = await db.pto_requests.find({
            "employee_id": current_user.id
        }).limit(5).to_list(5)
    
    # Add compliance info for 1099 employees
    if employee.get("employee_type") == "1099":
        dashboard_data["safety_progress"] = await get_employee_safety_progress(current_user.id, current_user)
        dashboard_data["workers_comp"] = await db.workers_comp_submissions.find_one({
            "employee_id": current_user.id
        })
    
    return dashboard_data

@api_router.get("/self-service/documents", response_model=List[EmployeeDocument])
async def get_employee_documents(current_user: User = Depends(get_current_user)):
    """Get employee documents"""
    documents = await db.employee_documents.find({"employee_id": current_user.id}).to_list(100)
    return [EmployeeDocument(**doc) for doc in documents]

@api_router.post("/self-service/requests", response_model=EmployeeRequest)
async def create_employee_request(request_create: EmployeeRequestCreate, current_user: User = Depends(get_current_user)):
    """Create new employee request"""
    request = EmployeeRequest(
        employee_id=current_user.id,
        request_type=request_create.request_type,
        title=request_create.title,
        description=request_create.description,
        priority=request_create.priority
    )
    
    await db.employee_requests.insert_one(request.model_dump())
    return request

@api_router.get("/self-service/requests", response_model=List[EmployeeRequest])
async def get_employee_requests(current_user: User = Depends(get_current_user)):
    """Get employee requests"""
    if current_user.role in ["super_admin", "hr_manager", "sales_manager"]:
        requests = await db.employee_requests.find({}).to_list(100)
    else:
        requests = await db.employee_requests.find({"employee_id": current_user.id}).to_list(100)
    
    return [EmployeeRequest(**req) for req in requests]

@api_router.put("/self-service/requests/{request_id}")
async def update_employee_request(request_id: str, status: str, resolution: str, current_user: User = Depends(get_current_user)):
    """Update employee request status"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.employee_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": status,
            "resolution": resolution,
            "assigned_to": current_user.id,
            "updated_at": datetime.utcnow()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Request updated successfully"}

# Initialize sample HR data
@api_router.post("/hr/initialize-sample-data")
async def initialize_hr_sample_data(current_user: User = Depends(get_current_user)):
    """Initialize sample HR data"""
    if current_user.role not in ["super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create sample onboarding stages
    stages = [
        {"name": "Personal Information", "description": "Complete personal information and contact details", "order": 1, "employee_type": "all"},
        {"name": "Tax Documents", "description": "Submit W-2 or 1099 tax documents", "order": 2, "employee_type": "all"},
        {"name": "Safety Training", "description": "Complete basic safety training", "order": 3, "employee_type": "1099"},
        {"name": "Workers Compensation", "description": "Submit workers compensation documentation", "order": 4, "employee_type": "1099"},
        {"name": "Company Handbook", "description": "Read and acknowledge company handbook", "order": 5, "employee_type": "all"},
        {"name": "Equipment Assignment", "description": "Receive and sign for assigned equipment", "order": 6, "employee_type": "all"}
    ]
    
    for stage_data in stages:
        stage = OnboardingStage(**stage_data)
        existing = await db.onboarding_stages.find_one({"name": stage.name})
        if not existing:
            await db.onboarding_stages.insert_one(stage.model_dump())
    
    # Create sample safety trainings
    trainings = [
        {"name": "Basic Safety Training", "description": "Fundamental safety practices for roofing work", "required_for": "1099", "duration_hours": 4.0, "certification_required": True},
        {"name": "Fall Protection", "description": "Proper use of fall protection equipment", "required_for": "1099", "duration_hours": 2.0, "certification_required": True, "renewal_months": 12},
        {"name": "Ladder Safety", "description": "Safe ladder usage and positioning", "required_for": "all", "duration_hours": 1.0, "certification_required": False},
        {"name": "Emergency Procedures", "description": "Emergency response and first aid basics", "required_for": "all", "duration_hours": 2.0, "certification_required": False}
    ]
    
    for training_data in trainings:
        training = SafetyTraining(**training_data)
        existing = await db.safety_trainings.find_one({"name": training.name})
        if not existing:
            await db.safety_trainings.insert_one(training.model_dump())
    
    return {"message": "Sample HR data initialized successfully"}

# Sales Leaderboard API Endpoints

@api_router.get("/leaderboard/goals", response_model=List[SalesGoal])
async def get_sales_goals(current_user: User = Depends(get_current_user)):
    """Get sales goals for current user or all if admin"""
    if current_user.role in ["super_admin", "sales_manager"]:
        goals = await db.sales_goals.find().to_list(1000)
    elif current_user.role in ["team_lead", "sales_rep"]:
        goals = await db.sales_goals.find({"rep_id": current_user.id}).to_list(1000)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return [SalesGoal(**goal) for goal in goals]

@api_router.post("/leaderboard/goals", response_model=SalesGoal)
async def create_sales_goal(goal: SalesGoal, current_user: User = Depends(get_current_user)):
    """Create or update sales goal"""
    if current_user.role not in ["super_admin", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if it's 1-6th of the month for team leads
    if current_user.role == "team_lead":
        current_date = datetime.utcnow()
        if current_date.day > 6:
            raise HTTPException(status_code=400, detail="Goals can only be assigned between 1st-6th of the month")
    
    goal.assigned_by = current_user.id
    await db.sales_goals.insert_one(goal.model_dump())
    return goal

@api_router.get("/leaderboard/signups", response_model=List[SalesSignup])
async def get_sales_signups(current_user: User = Depends(get_current_user)):
    """Get sales signups"""
    if current_user.role in ["super_admin", "sales_manager"]:
        signups = await db.sales_signups.find().to_list(1000)
    elif current_user.role in ["team_lead", "sales_rep"]:
        signups = await db.sales_signups.find({"rep_id": current_user.id}).to_list(1000)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return [SalesSignup(**signup) for signup in signups]

@api_router.post("/leaderboard/signups", response_model=SalesSignup)
async def create_sales_signup(signup: SalesSignup, current_user: User = Depends(get_current_user)):
    """Create a new sales signup"""
    if current_user.role not in ["super_admin", "sales_manager", "team_lead", "sales_rep"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # If sales rep, can only create for themselves
    if current_user.role == "sales_rep":
        signup.rep_id = current_user.id
        signup.rep_name = current_user.name
    
    await db.sales_signups.insert_one(signup.model_dump())
    return signup

@api_router.get("/leaderboard/competitions", response_model=List[SalesCompetition])
async def get_competitions(current_user: User = Depends(get_current_user)):
    """Get all competitions"""
    competitions = await db.sales_competitions.find().to_list(1000)
    
    # Handle data migration - convert old string participants to ContestParticipant objects
    processed_competitions = []
    for comp in competitions:
        # Handle participants field migration
        participants = comp.get("participants", [])
        if participants and isinstance(participants[0], str):
            # Old format - convert string rep_ids to ContestParticipant objects
            comp["participants"] = []
        
        try:
            processed_competitions.append(SalesCompetition(**comp))
        except Exception as e:
            # Skip invalid competitions for now
            print(f"Skipping invalid competition: {e}")
            continue
    
    return processed_competitions

@api_router.post("/leaderboard/competitions", response_model=SalesCompetition)
async def create_competition(competition: SalesCompetition, current_user: User = Depends(get_current_user)):
    """Create a new competition"""
    if current_user.role not in ["super_admin", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    competition.created_by = current_user.id
    await db.sales_competitions.insert_one(competition.model_dump())
    return competition

@api_router.put("/leaderboard/competitions/{competition_id}", response_model=SalesCompetition)
async def update_competition(competition_id: str, competition_update: SalesCompetition, current_user: User = Depends(get_current_user)):
    """Update competition"""
    if current_user.role not in ["super_admin", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    competition_data = competition_update.model_dump()
    competition_data["updated_at"] = datetime.utcnow()
    
    result = await db.sales_competitions.update_one(
        {"id": competition_id},
        {"$set": competition_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    return competition_update

@api_router.get("/leaderboard/metrics", response_model=List[SalesMetrics])
async def get_sales_metrics(current_user: User = Depends(get_current_user)):
    """Get sales metrics"""
    if current_user.role in ["super_admin", "sales_manager"]:
        metrics = await db.sales_metrics.find().to_list(1000)
    elif current_user.role in ["team_lead", "sales_rep"]:
        metrics = await db.sales_metrics.find({"rep_id": current_user.id}).to_list(1000)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return [SalesMetrics(**metric) for metric in metrics]

@api_router.post("/leaderboard/metrics", response_model=SalesMetrics)
async def create_sales_metrics(metrics: SalesMetrics, current_user: User = Depends(get_current_user)):
    """Create or update sales metrics"""
    if current_user.role not in ["super_admin", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.sales_metrics.insert_one(metrics.model_dump())
    return metrics

@api_router.get("/leaderboard/bonus-tiers", response_model=List[BonusTier])
async def get_bonus_tiers(current_user: User = Depends(get_current_user)):
    """Get bonus tiers"""
    tiers = await db.bonus_tiers.find().to_list(1000)
    return [BonusTier(**tier) for tier in tiers]

@api_router.post("/leaderboard/bonus-tiers", response_model=BonusTier)
async def create_bonus_tier(tier: BonusTier, current_user: User = Depends(get_current_user)):
    """Create bonus tier"""
    if current_user.role not in ["super_admin", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.bonus_tiers.insert_one(tier.model_dump())
    return tier

@api_router.get("/leaderboard/team-assignments", response_model=List[TeamAssignment])
async def get_team_assignments(current_user: User = Depends(get_current_user)):
    """Get team assignments"""
    if current_user.role in ["super_admin", "sales_manager"]:
        assignments = await db.team_assignments.find().to_list(1000)
    elif current_user.role == "team_lead":
        assignments = await db.team_assignments.find({"team_lead_id": current_user.id}).to_list(1000)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return [TeamAssignment(**assignment) for assignment in assignments]

@api_router.post("/leaderboard/team-assignments", response_model=TeamAssignment)
async def create_team_assignment(assignment: TeamAssignment, current_user: User = Depends(get_current_user)):
    """Create team assignment"""
    if current_user.role not in ["super_admin", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    assignment.team_lead_id = current_user.id
    assignment.team_lead_name = current_user.name
    await db.team_assignments.insert_one(assignment.model_dump())
    return assignment

@api_router.get("/leaderboard/dashboard/{rep_id}")
async def get_rep_dashboard(rep_id: str, current_user: User = Depends(get_current_user)):
    """Get comprehensive dashboard data for a sales rep"""
    # Authorization check
    if current_user.role not in ["super_admin", "sales_manager", "team_lead"] and current_user.id != rep_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    current_date = datetime.utcnow()
    current_year = current_date.year
    current_month = current_date.month
    
    # Get rep's metrics
    metrics = await db.sales_metrics.find_one({"rep_id": rep_id, "year": current_year, "month": current_month})
    if metrics:
        metrics = SalesMetrics(**metrics)
    
    # Get rep's goals
    goals = await db.sales_goals.find_one({"rep_id": rep_id, "year": current_year, "month": current_month})
    if goals:
        goals = SalesGoal(**goals)
    
    # Get rep's signups for the month
    signups = await db.sales_signups.find({
        "rep_id": rep_id,
        "signup_date": {
            "$gte": current_date.replace(day=1),
            "$lt": current_date.replace(day=1, month=current_month + 1) if current_month < 12 else current_date.replace(day=1, month=1, year=current_year + 1)
        }
    }).to_list(1000)
    
    # Get rep's active competitions
    competitions = await db.sales_competitions.find({
        "status": "active",
        "participants": rep_id
    }).to_list(1000)
    
    # Get rep's bonus tier
    current_tier = None
    if metrics:
        tiers = await db.bonus_tiers.find().to_list(1000)
        for tier in sorted(tiers, key=lambda x: x.get('signup_threshold', 0), reverse=True):
            if metrics.signups >= tier.get('signup_threshold', 0):
                current_tier = BonusTier(**tier)
                break
    
    return {
        "metrics": metrics.model_dump() if metrics else None,
        "goals": goals.model_dump() if goals else None,
        "signups": [SalesSignup(**signup) for signup in signups],
        "competitions": [SalesCompetition(**comp) for comp in competitions],
        "current_tier": current_tier.model_dump() if current_tier else None,
        "qr_leads": await db.leads.count_documents({"rep_id": rep_id, "source": "QR Code"})
    }

@api_router.post("/leaderboard/initialize-sample-data")
async def initialize_leaderboard_sample_data(current_user: User = Depends(get_current_user)):
    """Initialize sample leaderboard data"""
    if current_user.role not in ["super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create sample bonus tiers
    tiers = [
        {"tier_number": 1, "tier_name": "Bronze", "signup_threshold": 15, "description": "Entry level performance"},
        {"tier_number": 2, "tier_name": "Silver", "signup_threshold": 25, "description": "Solid performance"},
        {"tier_number": 3, "tier_name": "Gold", "signup_threshold": 35, "description": "Strong performance"},
        {"tier_number": 4, "tier_name": "Platinum", "signup_threshold": 50, "description": "Excellent performance"},
        {"tier_number": 5, "tier_name": "Diamond", "signup_threshold": 75, "description": "Outstanding performance"},
        {"tier_number": 6, "tier_name": "Elite", "signup_threshold": 100, "description": "Elite performance"}
    ]
    
    for tier_data in tiers:
        tier = BonusTier(**tier_data)
        existing = await db.bonus_tiers.find_one({"tier_number": tier.tier_number})
        if not existing:
            await db.bonus_tiers.insert_one(tier.model_dump())
    
    # Create sample competitions
    competitions = [
        {
            "name": "Q1 Signup Challenge",
            "description": "Race to the most signups this quarter",
            "competition_type": "signups",
            "start_date": datetime(2025, 1, 1),
            "end_date": datetime(2025, 3, 31),
            "prize_description": "Winner takes all bonus pool",
            "participants": [],
            "rules": "Most signups converted to customers wins",
            "created_by": current_user.id
        },
        {
            "name": "Monthly Revenue Sprint",
            "description": "Hit your monthly revenue target",
            "competition_type": "revenue",
            "start_date": datetime(2025, 1, 1),
            "end_date": datetime(2025, 1, 31),
            "prize_description": "Monthly performance bonus",
            "participants": [],
            "rules": "First to exceed monthly goal wins",
            "created_by": current_user.id
        }
    ]
    
    for comp_data in competitions:
        competition = SalesCompetition(**comp_data)
        existing = await db.sales_competitions.find_one({"name": competition.name})
        if not existing:
            await db.sales_competitions.insert_one(competition.model_dump())
    
    return {"message": "Sample leaderboard data initialized successfully"}

@api_router.post("/sync/signups")
async def sync_signup_data(
    request: SignupSyncRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Sync signup data from Google Sheets"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create sync status record
    sync_id = str(uuid.uuid4())
    sync_record = {
        "id": sync_id,
        "sync_type": "signups",
        "status": "running",
        "records_processed": 0,
        "created_at": datetime.utcnow(),
        "started_by": current_user.id
    }
    
    await db.sync_status.insert_one(sync_record)
    
    # Start background sync
    background_tasks.add_task(sync_signup_data_background, sync_id, request.__dict__, current_user.id)
    
    return {"message": "Signup sync started", "sync_id": sync_id}

@api_router.post("/sync/revenue")
async def update_revenue(
    request: RevenueUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update revenue for a specific rep/month (Admin/Sales Manager only)"""
    if current_user.role not in ["super_admin", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update revenue in monthly signups
    result = await db.monthly_signups.update_one(
        {
            "rep_id": request.rep_id,
            "month": request.month,
            "year": request.year
        },
        {"$set": {
            "revenue": request.revenue,
            "last_updated": datetime.utcnow(),
            "updated_by": current_user.id
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Monthly signup record not found")
    
    return {"message": "Revenue updated successfully"}

@api_router.get("/sync/status")
async def get_sync_status(current_user: User = Depends(get_current_user)):
    """Get sync status for all sync operations"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get latest sync status for each type
    sync_statuses = await db.sync_status.find().sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "sync_statuses": sync_statuses,
        "next_auto_sync": datetime.utcnow() + timedelta(hours=8)
    }

@api_router.get("/signups/monthly")
async def get_monthly_signups(
    year: int = None,
    current_user: User = Depends(get_current_user)
):
    """Get monthly signup data for all reps"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not year:
        year = datetime.utcnow().year
    
    signups = await db.monthly_signups.find({"year": year}).to_list(None)
    
    return {"signups": signups, "year": year}

@api_router.get("/signups/rep/{rep_id}")
async def get_rep_signups(
    rep_id: str,
    year: int = None,
    current_user: User = Depends(get_current_user)
):
    """Get signup data for specific rep"""
    if current_user.role not in ["super_admin", "hr_manager", "sales_manager", "team_lead", "sales_rep"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Sales reps can only see their own data
    if current_user.role == "sales_rep" and current_user.id != rep_id:
        raise HTTPException(status_code=403, detail="Can only view your own data")
    
    if not year:
        year = datetime.utcnow().year
    
    signups = await db.monthly_signups.find({
        "rep_id": rep_id,
        "year": year
    }).to_list(None)
    
    return {"signups": signups, "rep_id": rep_id, "year": year}

# Include the router in the main app
def setup_signup_sync_scheduler():
    """Set up the scheduler for signup sync (3 times daily)"""
    
    def sync_job():
        """Sync job that runs 3 times daily"""
        try:
            print(f"🔄 Starting scheduled signup sync at {datetime.utcnow()}")
            
            # Create sync request
            sync_request = {
                "spreadsheet_id": "1YSJD4RoqS_FLWF0LN1GRJKQhQNCdPT_aThqX6R6cZ4I",
                "sheet_name": "Sign Ups 2025",
                "range_name": "A1:Z100",
                "force_sync": True
            }
            
            # Run sync in a separate thread to avoid blocking
            import threading
            import asyncio
            
            def run_async_sync():
                try:
                    # Create new event loop for this thread
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    # Run the sync
                    sync_id = str(uuid.uuid4())
                    loop.run_until_complete(
                        sync_signup_data_background(sync_id, sync_request, "system")
                    )
                    
                    loop.close()
                except Exception as e:
                    print(f"❌ Scheduled sync failed: {e}")
            
            # Start the sync in a new thread
            thread = threading.Thread(target=run_async_sync)
            thread.start()
            
        except Exception as e:
            print(f"❌ Error in scheduled sync job: {e}")
    
    # Schedule the job to run 3 times a day: 8 AM, 2 PM, 8 PM
    signup_scheduler.add_job(
        sync_job,
        'cron',
        hour='8,14,20',  # 8 AM, 2 PM, 8 PM
        minute=0,
        id='signup_sync_job',
        replace_existing=True
    )
    
    print("📅 Scheduled signup sync job: 8 AM, 2 PM, 8 PM daily")

async def sync_signup_data_background(sync_id: str, request: dict, user_id: str):
    """Background task for syncing signup data"""
    try:
        # Update sync status
        await db.sync_status.update_one(
            {"id": sync_id},
            {"$set": {"status": "running", "last_sync": datetime.utcnow()}},
            upsert=True
        )
        
        # Get Google Sheets data
        service = await google_sheets_service.get_service()
        
        # Try different possible sheet names for signup data
        possible_ranges = [
            f"'{request['sheet_name']}'!{request['range_name']}",
            f"Sign Ups 2025!A1:Z100",
            f"Sheet1!A1:Z100"
        ]
        
        data = None
        for range_name in possible_ranges:
            try:
                result = service.spreadsheets().values().get(
                    spreadsheetId=request['spreadsheet_id'],
                    range=range_name
                ).execute()
                
                data = result.get('values', [])
                if data:
                    break
            except Exception as e:
                print(f"Failed to get data from range {range_name}: {e}")
                continue
        
        if not data:
            raise Exception("No data found in any of the attempted ranges")
        
        # Parse signup data
        records_processed = 0
        current_year = datetime.utcnow().year
        
        # Skip header row
        header = data[0] if data else []
        rows = data[1:] if len(data) > 1 else []
        
        for row in rows:
            if len(row) < 2:  # Skip empty rows
                continue
                
            try:
                # Flexible parsing - adapt based on your sheet structure
                rep_name = row[0] if len(row) > 0 else ""
                if not rep_name:
                    continue
                
                # Find or create rep
                rep = await db.sales_reps.find_one({"name": {"$regex": rep_name, "$options": "i"}})
                if not rep:
                    # Create new rep if not found
                    rep_id = str(uuid.uuid4())
                    rep = {
                        "id": rep_id,
                        "name": rep_name,
                        "email": f"{rep_name.lower().replace(' ', '.')}@company.com",
                        "territory": "Unknown",
                        "department": "Sales",
                        "created_at": datetime.utcnow()
                    }
                    await db.sales_reps.insert_one(rep)
                
                # Process monthly signup data (columns 1-12 for months)
                for month in range(1, 13):
                    if len(row) > month:
                        try:
                            signups = int(row[month]) if row[month] and str(row[month]).isdigit() else 0
                            
                            # Update or create monthly signup record
                            existing = await db.monthly_signups.find_one({
                                "rep_id": rep["id"],
                                "month": month,
                                "year": current_year
                            })
                            
                            if existing:
                                await db.monthly_signups.update_one(
                                    {"id": existing["id"]},
                                    {"$set": {
                                        "signups": signups,
                                        "last_updated": datetime.utcnow(),
                                        "sync_source": "google_sheets"
                                    }}
                                )
                            else:
                                await db.monthly_signups.insert_one({
                                    "id": str(uuid.uuid4()),
                                    "rep_id": rep["id"],
                                    "rep_name": rep["name"],
                                    "month": month,
                                    "year": current_year,
                                    "signups": signups,
                                    "revenue": None,
                                    "last_updated": datetime.utcnow(),
                                    "sync_source": "google_sheets"
                                })
                            
                            records_processed += 1
                            
                        except (ValueError, IndexError):
                            continue
                            
            except Exception as e:
                print(f"Error processing row {row}: {e}")
                continue
        
        # Update sync status
        await db.sync_status.update_one(
            {"id": sync_id},
            {"$set": {
                "status": "completed",
                "records_processed": records_processed,
                "last_sync": datetime.utcnow(),
                "next_sync": datetime.utcnow() + timedelta(hours=8)  # Next sync in 8 hours
            }}
        )
        
        print(f"✅ Signup sync completed: {records_processed} records processed")
        
    except Exception as e:
        # Update sync status with error
        await db.sync_status.update_one(
            {"id": sync_id},
            {"$set": {
                "status": "failed",
                "error_message": str(e),
                "last_sync": datetime.utcnow()
            }},
            upsert=True
        )
        print(f"❌ Signup sync failed: {e}")

# Enhanced Contest/Competition Management Endpoints
@api_router.post("/leaderboard/competitions/{contest_id}/join")
async def join_contest(contest_id: str, participant_data: dict = None):
    """Join a contest/competition"""
    try:
        # Find the contest
        contest = await db.sales_competitions.find_one({"id": contest_id})
        if not contest:
            raise HTTPException(status_code=404, detail="Contest not found")
        
        # Check if contest is joinable (upcoming or current)
        start_date_str = contest['start_date']
        end_date_str = contest['end_date']
        
        # Handle both string and datetime objects
        if isinstance(start_date_str, str):
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00') if 'Z' in start_date_str else start_date_str)
        else:
            start_date = start_date_str
            
        if isinstance(end_date_str, str):
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00') if 'Z' in end_date_str else end_date_str)
        else:
            end_date = end_date_str
        now = datetime.utcnow()
        
        if now > end_date:
            raise HTTPException(status_code=400, detail="Contest has ended")
            
        # Add participant to contest
        participant = ContestParticipant(
            participant_id=participant_data.get("participant_id"),
            participant_name=participant_data.get("participant_name"),
            participant_role=participant_data.get("participant_role"),
            joined_at=datetime.utcnow(),
            current_score=0
        )
        
        # Check if already joined
        existing_participants = contest.get("participants", [])
        if any(p.get("participant_id") == participant.participant_id for p in existing_participants):
            raise HTTPException(status_code=400, detail="Already joined this contest")
        
        # Update contest with new participant
        await db.sales_competitions.update_one(
            {"id": contest_id},
            {"$push": {"participants": participant.model_dump()}}
        )
        
        # Broadcast real-time update
        if 'ws_manager' in globals():
            await ws_manager.broadcast({
                "type": "contest_joined",
                "contest_id": contest_id,
                "participant": participant,
                "timestamp": datetime.utcnow().isoformat()
            })
        
        return {"message": "Successfully joined contest", "participant": participant}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/leaderboard/competitions/{contest_id}/standings")
async def get_contest_standings(contest_id: str):
    """Get contest standings and participant rankings"""
    try:
        # Find the contest
        contest = await db.sales_competitions.find_one({"id": contest_id})
        if not contest:
            raise HTTPException(status_code=404, detail="Contest not found")
        
        participants = contest.get("participants", [])
        competition_type = contest.get("competition_type", "signups")
        
        # Calculate current scores based on competition type
        standings = []
        for participant in participants:
            participant_id = participant.get("participant_id")
            
            # Get participant's current metrics
            # This would typically query actual performance data
            # For now, we'll use sample data
            current_score = 0
            
            if competition_type == "signups":
                # Query monthly signups for this participant
                signups = await db.monthly_signups.find({
                    "rep_id": participant_id,
                    "month": datetime.utcnow().month,
                    "year": datetime.utcnow().year
                }).to_list(100)
                current_score = len(signups)
            elif competition_type == "revenue":
                # Query revenue data
                current_score = 50000  # Sample revenue
            elif competition_type == "calls":
                current_score = 25  # Sample calls
            
            standings.append({
                "participant_id": participant_id,
                "participant_name": participant.get("participant_name"),
                "current_score": current_score,
                "joined_at": participant.get("joined_at"),
                "rank": 0  # Will be calculated after sorting
            })
        
        # Sort by score and assign ranks
        standings.sort(key=lambda x: x["current_score"], reverse=True)
        for i, standing in enumerate(standings):
            standing["rank"] = i + 1
        
        return {
            "contest_id": contest_id,
            "contest_name": contest.get("name"),
            "competition_type": competition_type,
            "total_participants": len(standings),
            "standings": standings,
            "last_updated": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/leaderboard/competitions/{contest_id}/status")
async def get_contest_status(contest_id: str):
    """Get detailed contest status and timeline information"""
    try:
        contest = await db.sales_competitions.find_one({"id": contest_id})
        if not contest:
            raise HTTPException(status_code=404, detail="Contest not found")
        
        start_date_str = contest['start_date']
        end_date_str = contest['end_date']
        
        # Handle both string and datetime objects
        if isinstance(start_date_str, str):
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00') if 'Z' in start_date_str else start_date_str)
        else:
            start_date = start_date_str
            
        if isinstance(end_date_str, str):
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00') if 'Z' in end_date_str else end_date_str)
        else:
            end_date = end_date_str
        now = datetime.utcnow()
        
        # Calculate status
        if now < start_date:
            status = 'upcoming'
            progress = 0
            days_remaining = (start_date - now).days
        elif now > end_date:
            status = 'past'
            progress = 100
            days_remaining = 0
        else:
            status = 'current'
            total_duration = (end_date - start_date).total_seconds()
            elapsed_duration = (now - start_date).total_seconds()
            progress = int((elapsed_duration / total_duration) * 100)
            days_remaining = (end_date - now).days
        
        return {
            "contest_id": contest_id,
            "status": status,
            "progress": progress,
            "days_remaining": days_remaining,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "participants_count": len(contest.get("participants", [])),
            "last_updated": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()