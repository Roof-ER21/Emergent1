# Enhanced Sales Leaderboard API Endpoints

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
    return [SalesCompetition(**comp) for comp in competitions]

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

@api_router.get("/leaderboard/bonus-tiers", response_model=List[BonusTier])
async def get_bonus_tiers(current_user: User = Depends(get_current_user)):
    """Get all bonus tiers"""
    tiers = await db.bonus_tiers.find({"is_active": True}).to_list(1000)
    return [BonusTier(**tier) for tier in tiers]

@api_router.post("/leaderboard/bonus-tiers", response_model=BonusTier)
async def create_bonus_tier(tier: BonusTier, current_user: User = Depends(get_current_user)):
    """Create a new bonus tier"""
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
    if current_user.role not in ["super_admin", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.team_assignments.insert_one(assignment.model_dump())
    return assignment

@api_router.get("/leaderboard/dashboard/{user_id}")
async def get_dashboard_data(user_id: str, current_user: User = Depends(get_current_user)):
    """Get comprehensive dashboard data for a user"""
    if current_user.role not in ["super_admin", "sales_manager"] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    current_date = datetime.utcnow()
    current_year = current_date.year
    current_month = current_date.month
    
    # Get user's metrics
    metrics = await db.sales_metrics.find_one({"rep_id": user_id, "year": current_year, "month": current_month})
    if not metrics:
        metrics = SalesMetrics(rep_id=user_id, rep_name="", year=current_year, month=current_month)
    else:
        metrics = SalesMetrics(**metrics)
    
    # Get user's goals
    goals = await db.sales_goals.find_one({"rep_id": user_id, "year": current_year, "month": current_month})
    if goals:
        goals = SalesGoal(**goals)
    
    # Get user's signups for the month
    signups = await db.sales_signups.find({"rep_id": user_id, "signup_date": {
        "$gte": current_date.replace(day=1),
        "$lt": current_date.replace(day=1, month=current_month + 1) if current_month < 12 else current_date.replace(day=1, month=1, year=current_year + 1)
    }}).to_list(1000)
    
    # Get QR leads for the month
    qr_leads = await db.qr_leads.find({"rep_id": user_id, "created_at": {
        "$gte": current_date.replace(day=1),
        "$lt": current_date.replace(day=1, month=current_month + 1) if current_month < 12 else current_date.replace(day=1, month=1, year=current_year + 1)
    }}).to_list(1000)
    
    # Calculate current tier
    signup_count = len(signups)
    tiers = await db.bonus_tiers.find({"is_active": True}).sort("signup_threshold", 1).to_list(1000)
    current_tier = 0
    for tier in tiers:
        if signup_count >= tier["signup_threshold"]:
            current_tier = tier["tier_number"]
    
    return {
        "metrics": metrics,
        "goals": goals,
        "signups": signups,
        "qr_leads": qr_leads,
        "current_tier": current_tier,
        "signup_count": signup_count,
        "qr_lead_count": len(qr_leads)
    }

@api_router.post("/leaderboard/initialize-bonus-tiers")
async def initialize_bonus_tiers(current_user: User = Depends(get_current_user)):
    """Initialize default bonus tiers"""
    if current_user.role not in ["super_admin", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if tiers already exist
    existing_tiers = await db.bonus_tiers.count_documents({})
    if existing_tiers > 0:
        return {"message": "Bonus tiers already exist"}
    
    default_tiers = [
        BonusTier(tier_number=1, tier_name="Bronze", signup_threshold=15, description="Entry level performance"),
        BonusTier(tier_number=2, tier_name="Silver", signup_threshold=25, description="Solid performance"),
        BonusTier(tier_number=3, tier_name="Gold", signup_threshold=35, description="Strong performance"),
        BonusTier(tier_number=4, tier_name="Platinum", signup_threshold=50, description="Excellent performance"),
        BonusTier(tier_number=5, tier_name="Diamond", signup_threshold=75, description="Outstanding performance"),
        BonusTier(tier_number=6, tier_name="Elite", signup_threshold=100, description="Elite performance")
    ]
    
    for tier in default_tiers:
        await db.bonus_tiers.insert_one(tier.model_dump())
    
    return {"message": "Default bonus tiers initialized successfully"}

if __name__ == "__main__":