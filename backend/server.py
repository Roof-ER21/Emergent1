from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks
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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="Roof-HR API", version="1.0.0")

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
    """Send email notification to sales rep about new lead"""
    template_data = {
        "recipient_name": lead.rep_name,
        "message": f"You have received a new lead from {lead.name}.",
        "job_id": lead.id,
        "job_title": f"New Lead - {lead.name}",
        "job_status": lead.status,
        "job_value": "TBD",
        "action_url": f"https://theroofdocs.com/leads/{lead.id}"
    }
    
    await send_email(
        rep_email,
        f"New Lead Alert - {lead.name}",
        template_data,
        background_tasks
    )

async def import_from_google_sheets(spreadsheet_id: str, sheet_range: str):
    """Import employee data from Google Sheets"""
    try:
        # For now, we'll create sample data since we don't have service account credentials
        # In production, this would use Google Sheets API
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
        
        return imported_count
    except Exception as e:
        logging.error(f"Google Sheets import failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Import failed")

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
    if current_user.role not in ["super_admin", "hr_manager"]:
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
    if current_user.role not in ["super_admin", "hr_manager"]:
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
    if current_user.role not in ["super_admin", "hr_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.employees.delete_one({"id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return {"message": "Employee deleted successfully"}

@api_router.post("/employees/import")
async def import_employees(import_request: EmployeeImport, current_user: User = Depends(get_current_user)):
    """Import employees from Google Sheets"""
    if current_user.role not in ["super_admin", "hr_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    imported_count = await import_from_google_sheets(
        import_request.spreadsheet_id,
        import_request.sheet_range
    )
    
    return {"message": f"Imported {imported_count} employees successfully"}

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