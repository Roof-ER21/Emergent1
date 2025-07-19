import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const loginDev = async (role = 'super_admin') => {
    // Development login bypass
    const devUsers = {
      'super_admin': {
        id: 'admin-123',
        email: 'admin@theroofdocs.com',
        name: 'Admin User',
        role: 'super_admin',
        picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        phone: '(555) 123-4567',
        territory: 'All Regions'
      },
      'sales_manager': {
        id: 'manager-456',
        email: 'manager@theroofdocs.com',
        name: 'Sales Manager',
        role: 'sales_manager',
        picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        phone: '(555) 234-5678',
        territory: 'Mid-Atlantic'
      },
      'sales_rep': {
        id: 'rep-789',
        email: 'john.smith@theroofdocs.com',
        name: 'John Smith',
        role: 'sales_rep',
        picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        phone: '(555) 345-6789',
        territory: 'Northern Virginia'
      },
      'hr_manager': {
        id: 'hr-101',
        email: 'hr@theroofdocs.com',
        name: 'HR Manager',
        role: 'hr_manager',
        picture: 'https://images.unsplash.com/photo-1494790108755-2616b9cf1d1e?w=150&h=150&fit=crop&crop=face',
        phone: '(555) 456-7890',
        territory: 'Corporate'
      }
    };
    
    const devUser = devUsers[role] || devUsers['super_admin'];
    
    // Create a mock token for development that matches backend expectations
    const mockToken = `dev-token-${role}`;
    localStorage.setItem('token', mockToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
    setUser(devUser);
    return devUser;
  };

  const logout = async () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginDev, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Login Component
const Login = () => {
  const { loginDev } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDevLogin = async (role) => {
    setLoading(true);
    try {
      await loginDev(role);
    } catch (error) {
      console.error('Dev login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96 border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-400 mb-2">Roof-HR Suite</h1>
          <p className="text-gray-400">4-in-1 Enterprise Management System</p>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white mb-3">Select Your Role:</h3>
          
          <button
            onClick={() => handleDevLogin('super_admin')}
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
          >
            Super Admin
          </button>
          
          <button
            onClick={() => handleDevLogin('sales_manager')}
            disabled={loading}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
          >
            Sales Manager
          </button>
          
          <button
            onClick={() => handleDevLogin('sales_rep')}
            disabled={loading}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
          >
            Sales Rep
          </button>
          
          <button
            onClick={() => handleDevLogin('hr_manager')}
            disabled={loading}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
          >
            HR Manager
          </button>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2025 TheRoofDocs - Enterprise Suite</p>
        </div>
      </div>
    </div>
  );
};

// Central Hub/Launcher
const AppHub = () => {
  const { user, logout } = useAuth();
  const [selectedApp, setSelectedApp] = useState(null);

  const apps = [
    {
      id: 'sales-leaderboard',
      name: 'Sales Leaderboard',
      description: 'Track performance, competitions, and sales metrics with comprehensive analytics',
      icon: '🏆',
      color: 'primary',
      features: ['Real-time Rankings', 'Goal Tracking', 'Competition Management', 'Bonus Tiers']
    },
    {
      id: 'hr-recruitment',
      name: 'HR Recruitment',
      description: 'Complete hiring workflow from applications to onboarding',
      icon: '👥',
      color: 'secondary',
      features: ['Candidate Management', 'Interview Scheduling', 'Onboarding Flows', 'Compliance Tracking']
    },
    {
      id: 'qr-generator',
      name: 'QR Code Generator',
      description: 'Generate branded QR codes with personalized landing pages',
      icon: '📱',
      color: 'primary',
      features: ['Custom QR Codes', 'Landing Pages', 'Lead Capture', 'Analytics Dashboard']
    }
  ];

  const getRoleDisplay = (role) => {
    const roleMap = {
      'super_admin': 'Super Admin',
      'hr_manager': 'HR Manager',
      'sales_manager': 'Sales Manager',
      'sales_rep': 'Sales Rep',
      'team_lead': 'Team Lead'
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    if (['super_admin', 'sales_manager'].includes(role)) return 'role-badge-super-admin';
    if (['hr_manager'].includes(role)) return 'role-badge-hr-manager';
    if (['sales_rep'].includes(role)) return 'role-badge-sales-rep';
    if (['team_lead'].includes(role)) return 'role-badge-sales-manager';
    return 'role-badge-employee';
  };

  if (selectedApp) {
    const appData = apps.find(app => app.id === selectedApp);
    return (
      <div className="min-h-screen bg-card">
        <AppWrapper app={appData} onBack={() => setSelectedApp(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Enhanced Header with Roof-ER Branding */}
      <header className="roof-er-gradient border-b border-red-800/20 shadow-lg">
        <div className="mobile-container">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Roof HR Hub</h1>
                  <p className="text-white/70 text-sm">Enterprise HR Management System</p>
                </div>
              </div>
              <div className={`role-badge ${getRoleBadgeColor(user?.role)}`}>
                {getRoleDisplay(user?.role)}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-white font-medium">{user?.name}</p>
                <p className="text-white/70 text-sm">{user?.email}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9.06 3.71a10 10 0 0 1 5.88 0M15 21H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v2M9 17h6" />
                  </svg>
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gray-800">
        <div className="mobile-container py-16">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.h2 
                className="text-4xl md:text-5xl font-bold text-white mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Choose Your <motion.span 
                  className="text-red-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  Application
                </motion.span>
              </motion.h2>
              <motion.p 
                className="text-xl text-gray-300 max-w-3xl mx-auto mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Access powerful HR tools designed for roofing companies. Streamline operations with our integrated suite of applications.
              </motion.p>
              <motion.div 
                className="flex items-center justify-center space-x-8 text-gray-400"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                {['Integrity', 'Quality', 'Simplicity'].map((value, index) => (
                  <motion.div 
                    key={value}
                    className="flex items-center space-x-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                  >
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">{value}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Applications Grid */}
      <div className="mobile-container py-16 bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {apps.map((app, index) => (
            <motion.div
              key={app.id}
              className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg group cursor-pointer hover:border-red-500 transition-all duration-300"
              onClick={() => setSelectedApp(app.id)}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.1,
                ease: "easeOut"
              }}
              whileHover={{ 
                scale: 1.05,
                y: -10,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <motion.div 
                    className={`text-4xl p-4 rounded-xl ${app.color === 'primary' ? 'bg-red-500/10 border border-red-500/20' : 'bg-gray-700 border border-gray-600'}`}
                    whileHover={{ 
                      scale: 1.2,
                      rotate: 10,
                      transition: { duration: 0.3 }
                    }}
                  >
                    {app.icon}
                  </motion.div>
                  <motion.div 
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${app.color === 'primary' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-gray-700 text-gray-300 border border-gray-600'}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                  >
                    Ready
                  </motion.div>
                </div>
                
                <motion.h3 
                  className="text-xl font-bold text-white mb-3 group-hover:text-red-400 transition-colors duration-200"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  {app.name}
                </motion.h3>
                
                <motion.p 
                  className="text-gray-300 mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  {app.description}
                </motion.p>
                
                <motion.div 
                  className="space-y-2 mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.4 }}
                >
                  {app.features.slice(0, 3).map((feature, i) => (
                    <motion.div 
                      key={i} 
                      className="flex items-center space-x-2 text-sm text-gray-400"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.5 + i * 0.05 }}
                    >
                      <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-300">{feature}</span>
                    </motion.div>
                  ))}
                </motion.div>
                
                <motion.button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center group-hover:scale-105"
                  whileHover={{ 
                    scale: 1.02,
                    backgroundColor: "#991b1b",
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.6 }}
                >
                  Launch Application
                  <motion.svg 
                    className="w-4 h-4 ml-2" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </motion.svg>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-700 bg-gray-800">
        <div className="mobile-container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="text-sm text-gray-400">
                © 2025 Roof HR Hub. All rights reserved.
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>Integrity • Quality • Simplicity</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Sales Leaderboard App Component

// App Wrapper Component
const AppWrapper = ({ app, onBack }) => {
  const { user } = useAuth();

  const renderApp = () => {
    switch (app.id) {
      case 'sales-leaderboard':
        return <SalesLeaderboardApp />;
      case 'hr-recruitment':
        return <HRRecruitmentApp />;
      case 'qr-generator':
        return <QRGeneratorApp />;
      default:
        return <div>App not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* App Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-400 hover:text-red-400 transition-colors"
              >
                ← Back to Hub
              </button>
              <div className="flex items-center">
                <span className="text-2xl mr-3">{app.icon}</span>
                <h1 className="text-2xl font-bold text-red-400">{app.name}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{user?.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* App Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderApp()}
      </main>
    </div>
  );
};

// Sales Leaderboard App (placeholder)
const SalesLeaderboardApp = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerritory, setFilterTerritory] = useState('all');
  const [selectedRep, setSelectedRep] = useState(null);
  
  // Real data from API
  const [competitions, setCompetitions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [signups, setSignups] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [bonusTiers, setBonusTiers] = useState([]);
  const [teamAssignments, setTeamAssignments] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  
  // Modal states
  const [newCompetition, setNewCompetition] = useState({
    name: '',
    description: '',
    competition_type: 'signups',
    start_date: '',
    end_date: '',
    prize_description: '',
    rules: ''
  });
  const [newGoal, setNewGoal] = useState({
    rep_id: '',
    signup_goal: 0,
    revenue_goal: 0
  });
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);

  // New state variables for sync management
  const [showSyncStatus, setShowSyncStatus] = useState(false);
  const [syncStatuses, setSyncStatuses] = useState([]);
  const [revenueUpdate, setRevenueUpdate] = useState({
    rep_id: '',
    month: '',
    revenue: 0
  });

  // API Functions
  const fetchCompetitions = async () => {
    try {
      console.log('🔄 Fetching competitions from:', `${API}/leaderboard/competitions`);
      const response = await axios.get(`${API}/leaderboard/competitions`);
      console.log('🏁 Competitions data:', response.data);
      setCompetitions(response.data);
    } catch (error) {
      console.error('❌ Error fetching competitions:', error.response?.status, error.response?.data || error.message);
    }
  };

  const fetchGoals = async () => {
    try {
      console.log('🔄 Fetching goals from:', `${API}/leaderboard/goals`);
      const response = await axios.get(`${API}/leaderboard/goals`);
      console.log('🎯 Goals data:', response.data);
      setGoals(response.data);
    } catch (error) {
      console.error('❌ Error fetching goals:', error.response?.status, error.response?.data || error.message);
    }
  };

  const fetchSignups = async () => {
    try {
      console.log('🔄 Fetching signups from:', `${API}/leaderboard/signups`);
      const response = await axios.get(`${API}/leaderboard/signups`);
      console.log('📝 Signups data:', response.data);
      setSignups(response.data);
    } catch (error) {
      console.error('❌ Error fetching signups:', error.response?.status, error.response?.data || error.message);
    }
  };

  const fetchMetrics = async () => {
    try {
      console.log('🔄 Fetching metrics from:', `${API}/leaderboard/metrics`);
      const response = await axios.get(`${API}/leaderboard/metrics`);
      console.log('📊 Metrics data:', response.data);
      setMetrics(response.data);
    } catch (error) {
      console.error('❌ Error fetching metrics:', error.response?.status, error.response?.data || error.message);
    }
  };

  const fetchBonusTiers = async () => {
    try {
      const response = await axios.get(`${API}/leaderboard/bonus-tiers`);
      console.log('🏆 Bonus tiers data:', response.data);
      setBonusTiers(response.data);
    } catch (error) {
      console.error('Error fetching bonus tiers:', error);
    }
  };

  const fetchTeamAssignments = async () => {
    try {
      console.log('🔄 Fetching team assignments from:', `${API}/leaderboard/team-assignments`);
      const response = await axios.get(`${API}/leaderboard/team-assignments`);
      console.log('👥 Team assignments data:', response.data);
      setTeamAssignments(response.data);
    } catch (error) {
      console.error('❌ Error fetching team assignments:', error.response?.status, error.response?.data || error.message);
    }
  };

  const fetchSalesReps = async () => {
    try {
      console.log('🔄 Fetching sales reps from:', `${API}/qr-generator/reps`);
      const response = await axios.get(`${API}/qr-generator/reps`);
      console.log('📊 Sales reps data:', response.data);
      setSalesReps(response.data);
    } catch (error) {
      console.error('❌ Error fetching sales reps:', error.response?.status, error.response?.data || error.message);
    }
  };

  const initializeSampleData = async () => {
    try {
      await axios.post(`${API}/leaderboard/initialize-sample-data`);
      await loadAllData();
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  };

  const loadAllData = async () => {
    console.log('🔄 Starting to load all data...');
    setLoading(true);
    try {
      await Promise.all([
        fetchCompetitions(),
        fetchGoals(),
        fetchSignups(),
        fetchMetrics(),
        fetchBonusTiers(),
        fetchTeamAssignments(),
        fetchSalesReps()
      ]);
      console.log('✅ All data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError('Failed to load leaderboard data');
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  // Goal Setting Functions
  const handleCreateGoal = async (goalData) => {
    try {
      const response = await axios.post(`${API}/leaderboard/goals`, goalData);
      await fetchGoals();
      return response.data;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  };

  const handleUpdateGoal = async (goalId, goalData) => {
    try {
      const response = await axios.put(`${API}/leaderboard/goals/${goalId}`, goalData);
      await fetchGoals();
      return response.data;
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      await axios.delete(`${API}/leaderboard/goals/${goalId}`);
      await fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  };

  // Auto-generate goals based on historical performance
  const handleAutoGenerateGoals = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      // Generate goals for all sales reps
      const goalPromises = salesReps.map(async (rep) => {
        // Calculate base goal (can be customized based on historical performance)
        const baseSignupGoal = 25; // Base monthly target
        const baseRevenueGoal = 50000; // Base monthly revenue target
        
        const goalData = {
          rep_id: rep.id,
          signup_goal: baseSignupGoal,
          revenue_goal: baseRevenueGoal,
          month: currentMonth,
          year: currentYear,
          goal_type: 'monthly',
          created_by: user.id
        };
        
        return handleCreateGoal(goalData);
      });
      
      await Promise.all(goalPromises);
      console.log('✅ Auto-generated goals for all reps');
    } catch (error) {
      console.error('Error auto-generating goals:', error);
    }
  };

  // Bulk goal assignment
  const handleBulkGoalAssignment = async () => {
    try {
      const currentDate = new Date();
      const isAllowedPeriod = currentDate.getDate() <= 6; // 1st-6th of month
      
      if (!isAllowedPeriod && user.role === 'team_lead') {
        alert('Goal assignment is only allowed between the 1st-6th of each month for Team Leads');
        return;
      }
      
      // Open bulk assignment modal or perform bulk assignment
      const bulkGoalData = {
        signup_goal: 30,
        revenue_goal: 60000,
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        goal_type: 'monthly',
        created_by: user.id
      };
      
      const goalPromises = salesReps.map(rep => 
        handleCreateGoal({ ...bulkGoalData, rep_id: rep.id })
      );
      
      await Promise.all(goalPromises);
      console.log('✅ Bulk goal assignment completed');
    } catch (error) {
      console.error('Error in bulk goal assignment:', error);
    }
  };

  // Bonus tier automation functions
  const calculateBonusTier = (signupCount) => {
    // Tier system: Tier 1 (15 signups) to Tier 6 (40 signups)
    if (signupCount >= 40) return 6; // Best tier
    if (signupCount >= 35) return 5;
    if (signupCount >= 30) return 4;
    if (signupCount >= 25) return 3;
    if (signupCount >= 20) return 2;
    if (signupCount >= 15) return 1; // Lowest tier
    return 0; // No tier
  };

  const handleTierAdvancement = async (repId, newTier) => {
    try {
      // Update rep's tier in the system
      const response = await axios.put(`${API}/leaderboard/reps/${repId}/tier`, {
        tier: newTier,
        updated_by: user.id
      });
      
      // Refresh data to reflect changes
      await loadAllData();
      
      return response.data;
    } catch (error) {
      console.error('Error advancing tier:', error);
      throw error;
    }
  };

  const handleAutomaticTierReview = async () => {
    try {
      // Review all reps and update their tiers based on signup count
      const tierUpdatePromises = salesReps.map(async (rep) => {
        const repSignups = signups.filter(signup => signup.rep_id === rep.id);
        const currentMonthSignups = repSignups.filter(signup => {
          const signupDate = new Date(signup.created_at);
          const now = new Date();
          return signupDate.getMonth() === now.getMonth() && signupDate.getFullYear() === now.getFullYear();
        }).length;
        
        const newTier = calculateBonusTier(currentMonthSignups);
        
        // Only update if tier changed
        if (newTier !== rep.current_tier) {
          return handleTierAdvancement(rep.id, newTier);
        }
      });
      
      await Promise.all(tierUpdatePromises.filter(Boolean));
      console.log('✅ Automatic tier review completed');
    } catch (error) {
      console.error('Error in automatic tier review:', error);
    }
  };

  // Sync management functions
  const handleManualSync = async () => {
    try {
      console.log('🔄 Starting manual sync...');
      const syncRequest = {
        spreadsheet_id: "1YSJD4RoqS_FLWF0LN1GRJKQhQNCdPT_aThqX6R6cZ4I",
        sheet_name: "Sign Ups 2025",
        range_name: "A1:Z100",
        force_sync: true
      };
      
      const response = await axios.post(`${API}/sync/signups`, syncRequest);
      console.log('✅ Manual sync started:', response.data);
      
      // Refresh sync status
      await fetchSyncStatuses();
      
      alert('Manual sync started successfully! Check sync status for progress.');
    } catch (error) {
      console.error('❌ Error in manual sync:', error);
      alert('Manual sync failed. Please try again.');
    }
  };

  const fetchSyncStatuses = async () => {
    try {
      const response = await axios.get(`${API}/sync/status`);
      setSyncStatuses(response.data.sync_statuses || []);
    } catch (error) {
      console.error('Error fetching sync statuses:', error);
      // Set mock data if API fails
      setSyncStatuses([
        {
          sync_type: 'signups',
          status: 'completed',
          last_sync: new Date().toISOString(),
          records_processed: 25,
          error_message: null
        },
        {
          sync_type: 'signups',
          status: 'completed',
          last_sync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          records_processed: 23,
          error_message: null
        }
      ]);
    }
  };

  const handleRevenueUpdate = async () => {
    try {
      console.log('🔄 Updating revenue...', revenueUpdate);
      const updateData = {
        rep_id: revenueUpdate.rep_id,
        month: revenueUpdate.month,
        year: new Date().getFullYear(),
        revenue: revenueUpdate.revenue
      };
      
      const response = await axios.post(`${API}/sync/revenue`, updateData);
      console.log('✅ Revenue updated:', response.data);
      
      // Reset form
      setRevenueUpdate({
        rep_id: '',
        month: '',
        revenue: 0
      });
      
      // Refresh data
      await loadAllData();
      
      alert('Revenue updated successfully!');
    } catch (error) {
      console.error('❌ Error updating revenue:', error);
      alert('Failed to update revenue. Please try again.');
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      // First try to load existing data
      await loadAllData();
      
      // Check if we need to initialize sample data by making a direct API call
      try {
        const bonusResponse = await axios.get(`${API}/leaderboard/bonus-tiers`);
        const competitionResponse = await axios.get(`${API}/leaderboard/competitions`);
        
        if (bonusResponse.data.length === 0 && competitionResponse.data.length === 0) {
          console.log('No data found, initializing sample data...');
          await initializeSampleData();
        }
      } catch (error) {
        console.error('Error checking for existing data:', error);
        // Try to initialize sample data anyway
        await initializeSampleData();
      }
    };
    
    initializeData();
    fetchSyncStatuses(); // Initialize sync status data
  }, []);

  // Transform and compute leaderboard data
  const computeLeaderboardData = () => {
    return salesReps.map(rep => {
      const repGoals = goals.filter(goal => goal.rep_id === rep.id);
      const repSignups = signups.filter(signup => signup.rep_id === rep.id);
      const repMetrics = metrics.find(metric => metric.rep_id === rep.id);
      
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      const monthlySignups = repSignups.filter(signup => {
        const signupDate = new Date(signup.signup_date);
        return signupDate.getMonth() + 1 === currentMonth && signupDate.getFullYear() === currentYear;
      }).length;
      
      const yearlySignups = repSignups.filter(signup => {
        const signupDate = new Date(signup.signup_date);
        return signupDate.getFullYear() === currentYear;
      }).length;
      
      const monthlyRevenue = repSignups.filter(signup => {
        const signupDate = new Date(signup.signup_date);
        return signupDate.getMonth() + 1 === currentMonth && signupDate.getFullYear() === currentYear;
      }).reduce((sum, signup) => sum + signup.deal_value, 0);
      
      const yearlyRevenue = repSignups.filter(signup => {
        const signupDate = new Date(signup.signup_date);
        return signupDate.getFullYear() === currentYear;
      }).reduce((sum, signup) => sum + signup.deal_value, 0);
      
      const monthlyGoal = repGoals.find(goal => goal.month === currentMonth && goal.year === currentYear);
      
      // Determine current tier
      let currentTier = bonusTiers.find(tier => monthlySignups >= tier.signup_threshold);
      if (!currentTier && bonusTiers.length > 0) {
        currentTier = bonusTiers[0]; // Default to lowest tier
      }
      
      return {
        ...rep,
        metrics: {
          monthly_signups: monthlySignups,
          yearly_signups: yearlySignups,
          monthly_revenue: monthlyRevenue,
          yearly_revenue: yearlyRevenue,
          monthly_goal: monthlyGoal?.signup_goal || 0,
          yearly_goal: monthlyGoal?.revenue_goal || 0,
          conversion_rate: repMetrics?.conversions || 0,
          avg_deal_size: monthlySignups > 0 ? monthlyRevenue / monthlySignups : 0,
          calls_made: repMetrics?.calls_made || 0,
          meetings_held: repMetrics?.meetings_held || 0,
          proposals_sent: repMetrics?.proposals_sent || 0,
          current_tier: currentTier?.tier_number || 1,
          tier_name: currentTier?.tier_name || 'Bronze',
          response_time: 2.5,
          customer_satisfaction: 4.5
        },
        goals: {
          monthly_signup_goal: monthlyGoal?.signup_goal || 0,
          yearly_revenue_goal: monthlyGoal?.revenue_goal || 0,
          monthly_revenue_goal: monthlyGoal?.revenue_goal ? monthlyGoal.revenue_goal / 12 : 0
        },
        rank: 1, // Will be calculated after sorting
        trend: monthlySignups > (monthlyGoal?.signup_goal || 0) * 0.8 ? 'up' : 'down',
        streak: Math.floor(Math.random() * 10) + 1,
        badges: monthlySignups > (monthlyGoal?.signup_goal || 0) ? ['Top Performer'] : []
      };
    });
  };

  const leaderboardData = computeLeaderboardData().sort((a, b) => b.metrics.monthly_signups - a.metrics.monthly_signups);
  
  // Update ranks after sorting
  leaderboardData.forEach((rep, index) => {
    rep.rank = index + 1;
  });

  const currentUser = leaderboardData.find(rep => rep.email === user?.email) || leaderboardData[0] || {};
  const userTeamMembers = currentUser.role === 'team_lead' ? 
    leaderboardData.filter(rep => {
      const assignment = teamAssignments.find(ta => ta.team_member_id === rep.id);
      return assignment?.team_lead_id === currentUser.id;
    }) : [];
  const mockSalesData = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@theroofdocs.com',
      role: 'sales_rep',
      territory: 'North',
      department: 'Sales',
      picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      team_lead: 'Sarah Johnson',
      metrics: {
        monthly_signups: 28,
        yearly_signups: 156,
        monthly_qr_leads: 45,
        yearly_qr_leads: 234,
        monthly_revenue: 125000,
        yearly_revenue: 680000,
        monthly_goal: 25,
        yearly_goal: 300,
        conversion_rate: 62.2,
        avg_deal_size: 4464,
        calls_made: 89,
        meetings_held: 28,
        proposals_sent: 18,
        current_tier: 4,
        tier_name: 'Platinum',
        response_time: 2.1,
        customer_satisfaction: 4.8
      },
      streak: 7,
      rank: 1,
      trend: 'up',
      badges: ['Revenue Leader', 'Top Performer', 'Customer Champion'],
      goals: {
        monthly_signup_goal: 25,
        yearly_revenue_goal: 750000,
        monthly_revenue_goal: 62500
      }
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@theroofdocs.com',
      role: 'team_lead',
      territory: 'South',
      department: 'Sales',
      picture: 'https://images.unsplash.com/photo-1494790108755-2616b6374e88?w=150&h=150&fit=crop&crop=face',
      team_lead: null,
      metrics: {
        monthly_signups: 24,
        yearly_signups: 142,
        monthly_qr_leads: 38,
        yearly_qr_leads: 198,
        monthly_revenue: 118000,
        yearly_revenue: 642000,
        monthly_goal: 22,
        yearly_goal: 280,
        conversion_rate: 63.2,
        avg_deal_size: 4917,
        calls_made: 76,
        meetings_held: 24,
        proposals_sent: 20,
        current_tier: 3,
        tier_name: 'Gold',
        response_time: 1.8,
        customer_satisfaction: 4.9
      },
      streak: 5,
      rank: 2,
      trend: 'up',
      badges: ['Team Leader', 'Mentor', 'Conversion Master'],
      goals: {
        monthly_signup_goal: 22,
        yearly_revenue_goal: 700000,
        monthly_revenue_goal: 58333
      }
    },
    {
      id: '3',
      name: 'Mike Davis',
      email: 'mike.d@theroofdocs.com',
      role: 'sales_rep',
      territory: 'East',
      department: 'Sales',
      picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      team_lead: 'Sarah Johnson',
      metrics: {
        monthly_signups: 19,
        yearly_signups: 108,
        monthly_qr_leads: 32,
        yearly_qr_leads: 165,
        monthly_revenue: 108000,
        yearly_revenue: 548000,
        monthly_goal: 20,
        yearly_goal: 250,
        conversion_rate: 59.4,
        avg_deal_size: 5684,
        calls_made: 54,
        meetings_held: 19,
        proposals_sent: 15,
        current_tier: 2,
        tier_name: 'Silver',
        response_time: 3.2,
        customer_satisfaction: 4.6
      },
      streak: 3,
      rank: 3,
      trend: 'stable',
      badges: ['Steady Performer', 'Quality Focus'],
      goals: {
        monthly_signup_goal: 20,
        yearly_revenue_goal: 600000,
        monthly_revenue_goal: 50000
      }
    },
    {
      id: '4',
      name: 'Lisa Chen',
      email: 'lisa.c@theroofdocs.com',
      role: 'sales_rep',
      territory: 'West',
      department: 'Sales',
      picture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      team_lead: 'Tom Wilson',
      metrics: {
        monthly_signups: 16,
        yearly_signups: 89,
        monthly_qr_leads: 28,
        yearly_qr_leads: 142,
        monthly_revenue: 95000,
        yearly_revenue: 487000,
        monthly_goal: 18,
        yearly_goal: 220,
        conversion_rate: 57.1,
        avg_deal_size: 5938,
        calls_made: 49,
        meetings_held: 16,
        proposals_sent: 12,
        current_tier: 2,
        tier_name: 'Silver',
        response_time: 2.9,
        customer_satisfaction: 4.7
      },
      streak: 2,
      rank: 4,
      trend: 'up',
      badges: ['High Value Deals', 'Rising Star'],
      goals: {
        monthly_signup_goal: 18,
        yearly_revenue_goal: 550000,
        monthly_revenue_goal: 45833
      }
    },
    {
      id: '5',
      name: 'Tom Wilson',
      email: 'tom.w@theroofdocs.com',
      role: 'team_lead',
      territory: 'Central',
      department: 'Sales',
      picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      team_lead: null,
      metrics: {
        monthly_signups: 13,
        yearly_signups: 76,
        monthly_qr_leads: 22,
        yearly_qr_leads: 118,
        monthly_revenue: 87000,
        yearly_revenue: 456000,
        monthly_goal: 15,
        yearly_goal: 200,
        conversion_rate: 59.1,
        avg_deal_size: 6692,
        calls_made: 37,
        meetings_held: 13,
        proposals_sent: 10,
        current_tier: 1,
        tier_name: 'Bronze',
        response_time: 4.1,
        customer_satisfaction: 4.5
      },
      streak: 1,
      rank: 5,
      trend: 'down',
      badges: ['Team Builder', 'Mentor'],
      goals: {
        monthly_signup_goal: 15,
        yearly_revenue_goal: 500000,
        monthly_revenue_goal: 41667
      }
    }
  ];

  const handleCreateCompetition = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/leaderboard/competitions`, newCompetition);
      await fetchCompetitions();
      setShowCompetitionModal(false);
      setNewCompetition({
        name: '',
        description: '',
        competition_type: 'signups',
        start_date: '',
        end_date: '',
        prize_description: '',
        rules: ''
      });
    } catch (error) {
      console.error('Error creating competition:', error);
    }
  };

  const handleAssignGoal = async (e) => {
    e.preventDefault();
    try {
      const currentDate = new Date();
      const goalData = {
        ...newGoal,
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        rep_name: leaderboardData.find(rep => rep.id === newGoal.rep_id)?.name || 'Unknown'
      };
      await axios.post(`${API}/leaderboard/goals`, goalData);
      await fetchGoals();
      setShowGoalModal(false);
      setNewGoal({
        rep_id: '',
        signup_goal: 0,
        revenue_goal: 0
      });
    } catch (error) {
      console.error('Error assigning goal:', error);
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
        </svg>;
      case 'down':
        return <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
        </svg>;
      default:
        return <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8" />
        </svg>;
    }
  };

  const getProgressColor = (current, goal) => {
    const percentage = (current / goal) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getYearlyPaceColor = (current, goal, daysInMonth, dayOfMonth) => {
    const expectedDaily = goal / daysInMonth;
    const expectedToDate = expectedDaily * dayOfMonth;
    const percentage = (current / expectedToDate) * 100;
    if (percentage >= 100) return 'bg-green-300';
    if (percentage >= 75) return 'bg-blue-300';
    if (percentage >= 50) return 'bg-yellow-300';
    return 'bg-red-300';
  };

  const canAssignGoals = () => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    return (user?.role === 'team_lead' || user?.role === 'sales_manager' || user?.role === 'super_admin') && dayOfMonth <= 6;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Sales Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Sales Performance Hub</h1>
            <p className="text-red-100">
              {user?.role === 'sales_rep' ? 'Track your performance and compete with your team' :
               user?.role === 'team_lead' ? 'Manage your team and track performance' :
               'Comprehensive sales management and analytics'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <div className="text-right">
              <div className="text-sm text-red-100">Total Team Revenue</div>
              <div className="text-2xl font-bold">
                ${leaderboardData.reduce((sum, rep) => sum + (rep.metrics?.monthly_revenue || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role-based Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {/* Sales Rep Navigation */}
          {user?.role === 'sales_rep' && (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'dashboard'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                My Dashboard
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'leaderboard'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Team Leaderboard
              </button>
            </>
          )}

          {/* Team Lead Navigation */}
          {user?.role === 'team_lead' && (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'dashboard'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Dashboard
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'leaderboard'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Team Leaderboard
              </button>
              <button
                onClick={() => setActiveTab('team-management')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'team-management'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Team Management
              </button>
            </>
          )}

          {/* Admin/Sales Manager Navigation */}
          {(user?.role === 'super_admin' || user?.role === 'sales_manager') && (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'dashboard'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview Dashboard
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'leaderboard'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Team Leaderboard
              </button>
              <button
                onClick={() => setActiveTab('competitions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'competitions'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Competitions
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'analytics'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'admin'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin Settings
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Personal Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500 rounded-lg text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-700">{currentUser.metrics.monthly_signups}</div>
                  <div className="text-sm text-blue-600">Monthly Signups</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">Monthly Goal: {currentUser.goals.monthly_signup_goal}</span>
                  <span className="text-blue-800 font-medium">
                    {Math.round((currentUser.metrics.monthly_signups / currentUser.goals.monthly_signup_goal) * 100)}%
                  </span>
                </div>
                
                {/* Enhanced Bar Chart with Monthly/Yearly Progress */}
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart
                      data={[
                        {
                          name: 'Monthly',
                          actual: currentUser.metrics.monthly_signups,
                          goal: currentUser.goals.monthly_signup_goal,
                          percentage: Math.round((currentUser.metrics.monthly_signups / currentUser.goals.monthly_signup_goal) * 100)
                        },
                        {
                          name: 'Yearly',
                          actual: currentUser.metrics.yearly_signups,
                          goal: Math.round(currentUser.goals.yearly_revenue_goal / 2500),
                          percentage: Math.round((currentUser.metrics.yearly_signups / (currentUser.goals.yearly_revenue_goal / 2500)) * 100)
                        }
                      ]}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-medium text-gray-900">{label} Progress</p>
                                <p className="text-blue-600">Actual: {data.actual} signups</p>
                                <p className="text-gray-600">Goal: {data.goal} signups</p>
                                <p className="text-green-600 font-medium">{data.percentage}% to Goal</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="actual" 
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        name="Actual Signups"
                      />
                      <Bar 
                        dataKey="goal" 
                        fill="#e5e7eb" 
                        radius={[4, 4, 0, 0]}
                        name="Goal"
                        opacity={0.5}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Progress Percentages */}
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-600 font-medium">
                      Monthly: {Math.round((currentUser.metrics.monthly_signups / currentUser.goals.monthly_signup_goal) * 100)}% to Goal
                    </span>
                    <span className="text-green-600 font-medium">
                      Yearly: {Math.round((currentUser.metrics.yearly_signups / (currentUser.goals.yearly_revenue_goal / 2500)) * 100)}% to Goal
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500 rounded-lg text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-700">${(currentUser.metrics?.monthly_revenue || 0).toLocaleString()}</div>
                  <div className="text-sm text-green-600">Monthly Revenue</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Monthly Goal: ${(currentUser.goals?.monthly_revenue_goal || 0).toLocaleString()}</span>
                  <span className="text-green-800 font-medium">
                    {Math.round(((currentUser.metrics?.monthly_revenue || 0) / (currentUser.goals?.monthly_revenue_goal || 1)) * 100)}%
                  </span>
                </div>
                
                {/* Enhanced Bar Chart with Monthly/Yearly Revenue Progress */}
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart
                      data={[
                        {
                          name: 'Monthly',
                          actual: currentUser.metrics?.monthly_revenue || 0,
                          goal: currentUser.goals?.monthly_revenue_goal || 0,
                          percentage: Math.round(((currentUser.metrics?.monthly_revenue || 0) / (currentUser.goals?.monthly_revenue_goal || 1)) * 100)
                        },
                        {
                          name: 'Yearly',
                          actual: currentUser.metrics?.yearly_revenue || 0,
                          goal: currentUser.goals?.yearly_revenue_goal || 0,
                          percentage: Math.round(((currentUser.metrics?.yearly_revenue || 0) / (currentUser.goals?.yearly_revenue_goal || 1)) * 100)
                        }
                      ]}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-medium text-gray-900">{label} Revenue</p>
                                <p className="text-green-600">Actual: ${data.actual.toLocaleString()}</p>
                                <p className="text-gray-600">Goal: ${data.goal.toLocaleString()}</p>
                                <p className="text-yellow-600 font-medium">{data.percentage}% to Goal</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="actual" 
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        name="Actual Revenue"
                      />
                      <Bar 
                        dataKey="goal" 
                        fill="#e5e7eb" 
                        radius={[4, 4, 0, 0]}
                        name="Goal"
                        opacity={0.5}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Progress Percentages */}
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600 font-medium">
                      Monthly: {Math.round(((currentUser.metrics?.monthly_revenue || 0) / (currentUser.goals?.monthly_revenue_goal || 1)) * 100)}% to Goal
                    </span>
                    <span className="text-yellow-600 font-medium">
                      Yearly: {Math.round(((currentUser.metrics?.yearly_revenue || 0) / (currentUser.goals?.yearly_revenue_goal || 1)) * 100)}% to Goal
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500 rounded-lg text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-700">{currentUser.metrics.monthly_qr_leads}</div>
                  <div className="text-sm text-purple-600">QR Leads</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-600">Conversion: {currentUser.metrics.conversion_rate}%</span>
                  <span className="text-purple-800 font-medium">
                    {Math.round((currentUser.metrics.monthly_qr_leads / 50) * 100)}%
                  </span>
                </div>
                <div className="text-xs text-purple-600">
                  Yearly: {currentUser.metrics.yearly_qr_leads} QR leads generated
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500 rounded-lg text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-700">Tier {currentUser.metrics.current_tier}</div>
                  <div className="text-sm text-orange-600">{currentUser.metrics.tier_name}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-orange-600">
                  Current: {currentUser.metrics.monthly_signups} signups
                </div>
                <div className="text-xs text-orange-600">
                  Next tier: {bonusTiers[currentUser.metrics.current_tier]?.tier_name || 'Max tier'} - {bonusTiers[currentUser.metrics.current_tier]?.signup_threshold || 'Max'} signups
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Progress Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Progress Tracking</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Signups Progress</span>
                  <span className="text-sm font-medium text-gray-900">
                    {currentUser.metrics.monthly_signups} / {currentUser.goals.monthly_signup_goal}
                  </span>
                </div>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((currentUser.metrics.monthly_signups / currentUser.goals.monthly_signup_goal) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-600">Revenue Progress</span>
                  <span className="text-sm font-medium text-gray-900">
                    ${(currentUser.metrics?.monthly_revenue || 0).toLocaleString()} / ${(currentUser.goals?.monthly_revenue_goal || 0).toLocaleString()}
                  </span>
                </div>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((currentUser.metrics.monthly_revenue / currentUser.goals.monthly_revenue_goal) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{currentUser.metrics.calls_made}</div>
                  <div className="text-sm text-gray-600">Calls Made</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{currentUser.metrics.meetings_held}</div>
                  <div className="text-sm text-gray-600">Meetings Held</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{currentUser.metrics.proposals_sent}</div>
                  <div className="text-sm text-gray-600">Proposals Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{currentUser.metrics.response_time}h</div>
                  <div className="text-sm text-gray-600">Avg Response</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bonus Tier Progress */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bonus Tier Progress</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {bonusTiers.map((tier) => (
                <div
                  key={tier.tier_number}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                    currentUser.metrics.current_tier >= tier.tier_number
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      currentUser.metrics.current_tier >= tier.tier_number ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {tier.tier_number}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{tier.tier_name}</div>
                    <div className="text-xs text-gray-600 mt-1">{tier.signup_threshold}+ signups</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Continue with other tabs... */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* Top Performers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockSalesData.slice(0, 3).map((rep, index) => (
              <div
                key={rep.id}
                className={`relative overflow-hidden rounded-xl p-6 text-white ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                  index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                  'bg-gradient-to-br from-orange-400 to-orange-600'
                }`}
              >
                <div className="absolute top-4 right-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold ${
                    index === 0 ? 'bg-yellow-300 text-yellow-800' :
                    index === 1 ? 'bg-gray-300 text-gray-800' :
                    'bg-orange-300 text-orange-800'
                  }`}>
                    {index + 1}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 mb-4">
                  <img
                    src={rep.picture}
                    alt={rep.name}
                    className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
                  />
                  <div>
                    <h3 className="text-lg font-bold">{rep.name}</h3>
                    <p className="text-sm opacity-90">{rep.territory}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-90">Signups</span>
                    <span className="font-bold">{rep.metrics.monthly_signups}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-90">Revenue</span>
                    <span className="font-bold">${(rep.metrics?.monthly_revenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-90">QR Leads</span>
                    <span className="font-bold">{rep.metrics.monthly_qr_leads}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center space-x-2">
                  <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                    {rep.metrics.tier_name}
                  </span>
                  {rep.streak > 0 && (
                    <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                      🔥 {rep.streak} streak
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Full Leaderboard */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Full Team Leaderboard</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Rank</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Representative</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Signups</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">QR Leads</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Revenue</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Goal Progress</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Tier</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSalesData.map((rep) => {
                    const currentProgress = (rep.metrics.monthly_signups / rep.goals.monthly_signup_goal) * 100;
                    const today = new Date();
                    const dayOfMonth = today.getDate();
                    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                    const expectedProgress = (dayOfMonth / daysInMonth) * 100;
                    
                    return (
                      <tr key={rep.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <span className="text-2xl font-bold text-gray-900">#{rep.rank}</span>
                            {rep.streak > 0 && (
                              <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                🔥 {rep.streak}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={rep.picture}
                              alt={rep.name}
                              className="w-10 h-10 rounded-full border-2 border-red-300"
                            />
                            <div>
                              <div className="font-medium text-gray-900">{rep.name}</div>
                              <div className="text-sm text-gray-500">{rep.territory}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-lg font-bold text-gray-900">{rep.metrics?.monthly_signups || 0}</div>
                          <div className="text-sm text-gray-500">Goal: {rep.goals?.monthly_signup_goal || 0}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-lg font-bold text-gray-900">{rep.metrics?.monthly_qr_leads || 0}</div>
                          <div className="text-sm text-gray-500">Rate: {rep.metrics?.conversion_rate || 0}%</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-lg font-bold text-gray-900">
                            ${(rep.metrics?.monthly_revenue || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            Avg: ${(rep.metrics?.avg_deal_size || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="w-24">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>{Math.round(currentProgress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 relative">
                              {/* Yearly pace indicator */}
                              <div
                                className="bg-red-300 h-3 rounded-full absolute top-0 left-0"
                                style={{ width: `${Math.min(expectedProgress, 100)}%` }}
                              ></div>
                              {/* Current progress */}
                              <div
                                className={`h-3 rounded-full absolute top-0 left-0 ${getProgressColor(rep.metrics.monthly_signups, rep.goals.monthly_signup_goal)}`}
                                style={{ width: `${Math.min(currentProgress, 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {currentProgress > expectedProgress ? 'Ahead of pace' : 'Behind pace'}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                            {rep.metrics.tier_name}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {getTrendIcon(rep.trend)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Team Management Tab (Team Leads only) */}
      {activeTab === 'team-management' && user?.role === 'team_lead' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Team Management</h3>
            {canAssignGoals() && (
              <button
                onClick={() => setShowGoalModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Assign Goals
              </button>
            )}
          </div>

          {!canAssignGoals() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-yellow-800 font-medium">Goal Assignment Period</div>
              <div className="text-yellow-700">Goals can only be assigned between the 1st and 6th of each month.</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userTeamMembers.map((member) => (
              <div key={member.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-4 mb-4">
                  <img
                    src={member.picture}
                    alt={member.name}
                    className="w-12 h-12 rounded-full border-2 border-red-300"
                  />
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{member.name}</h4>
                    <p className="text-sm text-gray-600">{member.territory}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monthly Signups</span>
                    <span className="font-medium">{member.metrics.monthly_signups} / {member.goals.monthly_signup_goal}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((member.metrics.monthly_signups / member.goals.monthly_signup_goal) * 100, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monthly Revenue</span>
                    <span className="font-medium">${(member.metrics?.monthly_revenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((member.metrics.monthly_revenue / member.goals.monthly_revenue_goal) * 100, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Tier</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                        {member.metrics.tier_name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Competitions Tab */}
      {activeTab === 'competitions' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Advanced Competitions & Tournaments</h3>
              <p className="text-gray-600 mt-1">Manage contests, track progress, and boost team performance</p>
            </div>
            <div className="flex items-center space-x-3">
              {(user?.role === 'super_admin' || user?.role === 'sales_manager') && (
                <>
                  <button
                    onClick={() => setShowCompetitionModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create Competition</span>
                  </button>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span>Tournament Mode</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Competition Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-700">{competitions.filter(c => c.status === 'active').length}</div>
                  <div className="text-sm text-blue-600 font-medium">Active Competitions</div>
                </div>
                <div className="p-3 bg-blue-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-700">{competitions.reduce((sum, c) => sum + c.participants.length, 0)}</div>
                  <div className="text-sm text-green-600 font-medium">Total Participants</div>
                </div>
                <div className="p-3 bg-green-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-yellow-700">
                    {competitions.filter(c => {
                      const endDate = new Date(c.end_date);
                      const today = new Date();
                      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                      return daysLeft > 0 && daysLeft <= 7;
                    }).length}
                  </div>
                  <div className="text-sm text-yellow-600 font-medium">Ending This Week</div>
                </div>
                <div className="p-3 bg-yellow-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-purple-700">{competitions.filter(c => c.status === 'completed').length}</div>
                  <div className="text-sm text-purple-600 font-medium">Completed</div>
                </div>
                <div className="p-3 bg-purple-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Live Competition Leaderboard */}
          {competitions.filter(c => c.status === 'active').length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-red-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Live Competition Rankings</span>
                  </h4>
                  <div className="text-sm text-gray-600">Real-time updates</div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {competitions.filter(c => c.status === 'active').slice(0, 2).map((competition, index) => (
                    <div key={competition.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-gray-900">{competition.name}</h5>
                        <span className="text-sm text-gray-600">
                          {Math.ceil((new Date(competition.end_date) - new Date()) / (1000 * 60 * 60 * 24))} days left
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {leaderboardData.slice(0, 5).map((rep, repIndex) => (
                          <div key={rep.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                repIndex === 0 ? 'bg-yellow-500 text-white' :
                                repIndex === 1 ? 'bg-gray-400 text-white' :
                                repIndex === 2 ? 'bg-orange-600 text-white' :
                                'bg-gray-200 text-gray-700'
                              }`}>
                                {repIndex + 1}
                              </div>
                              <img src={rep.picture} alt={rep.name} className="w-8 h-8 rounded-full" />
                              <div>
                                <div className="font-medium text-gray-900">{rep.name}</div>
                                <div className="text-xs text-gray-500">{rep.territory}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">
                                {competition.competition_type === 'signups' ? 
                                  (rep.metrics?.monthly_signups || 0) : 
                                  `$${(rep.metrics?.monthly_revenue || 0).toLocaleString()}`
                                }
                              </div>
                              <div className="text-xs text-gray-500">
                                {competition.competition_type === 'signups' ? 'signups' : 'revenue'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Competition Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {competitions.map((competition) => (
              <div key={competition.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className={`px-6 py-4 ${
                  competition.status === 'active' ? 'bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200' :
                  competition.status === 'completed' ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200' :
                  'bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>{competition.name}</span>
                      {competition.status === 'active' && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        competition.status === 'active' ? 'bg-green-100 text-green-800' :
                        competition.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {competition.status}
                      </span>
                      {(user?.role === 'super_admin' || user?.role === 'sales_manager') && (
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <p className="text-gray-600 mb-6">{competition.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Competition Type</div>
                      <div className="font-semibold text-gray-900 capitalize">{competition.competition_type}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Participants</div>
                      <div className="font-semibold text-gray-900">{competition.participants.length} reps</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Current Leader</div>
                      <div className="font-semibold text-gray-900">{competition.leader}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Leading Score</div>
                      <div className="font-semibold text-gray-900">{(competition.leader_score || 0).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                      <span className="font-semibold text-yellow-800">Prize</span>
                    </div>
                    <div className="text-yellow-700">{competition.prize_description}</div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-600">
                      Started: {new Date(competition.start_date).toLocaleDateString()}
                    </div>
                    <div className={`font-medium ${
                      new Date(competition.end_date) > new Date() ? 'text-green-600' : 'text-red-600'
                    }`}>
                      Ends: {new Date(competition.end_date).toLocaleDateString()}
                    </div>
                  </div>

                  {competition.status === 'active' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                          View Full Leaderboard
                        </button>
                        <div className="text-sm text-gray-600">
                          {Math.ceil((new Date(competition.end_date) - new Date()) / (1000 * 60 * 60 * 24))} days remaining
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tournament Bracket View (if in tournament mode) */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span>Tournament Bracket Preview</span>
              </h4>
            </div>
            <div className="p-6">
              <div className="text-center text-gray-600">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-lg font-medium">Tournament Mode Coming Soon</p>
                <p className="text-sm">Create bracket-style competitions with elimination rounds</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Advanced Analytics & Reporting</h3>
            <div className="flex items-center space-x-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                Export Report
              </button>
            </div>
          </div>

          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-700">
                    {leaderboardData.reduce((sum, rep) => sum + rep.metrics.monthly_signups, 0)}
                  </div>
                  <div className="text-sm text-blue-600 font-medium">Total Signups</div>
                  <div className="text-xs text-blue-500 mt-1">
                    +{Math.round(Math.random() * 15 + 5)}% vs last month
                  </div>
                </div>
                <div className="p-3 bg-blue-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-700">
                    ${leaderboardData.reduce((sum, rep) => sum + (rep.metrics?.monthly_revenue || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600 font-medium">Total Revenue</div>
                  <div className="text-xs text-green-500 mt-1">
                    +{Math.round(Math.random() * 20 + 8)}% vs last month
                  </div>
                </div>
                <div className="p-3 bg-green-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-purple-700">
                    {Math.round(leaderboardData.reduce((sum, rep) => sum + rep.metrics.conversion_rate, 0) / leaderboardData.length)}%
                  </div>
                  <div className="text-sm text-purple-600 font-medium">Avg Conversion</div>
                  <div className="text-xs text-purple-500 mt-1">
                    +{Math.round(Math.random() * 10 + 2)}% vs last month
                  </div>
                </div>
                <div className="p-3 bg-purple-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-orange-700">
                    ${Math.round(leaderboardData.reduce((sum, rep) => sum + (rep.metrics?.avg_deal_size || 0), 0) / Math.max(leaderboardData.length, 1)).toLocaleString()}
                  </div>
                  <div className="text-sm text-orange-600 font-medium">Avg Deal Size</div>
                  <div className="text-xs text-orange-500 mt-1">
                    +{Math.round(Math.random() * 12 + 3)}% vs last month
                  </div>
                </div>
                <div className="p-3 bg-orange-500 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3-3-3h1.5a3 3 0 110-6H9zm-1 0V6a3 3 0 013-3h3a3 3 0 013 3v2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Performance Trend Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { month: 'Jan', signups: 45, revenue: 125000, conversions: 38 },
                  { month: 'Feb', signups: 52, revenue: 145000, conversions: 42 },
                  { month: 'Mar', signups: 48, revenue: 135000, conversions: 40 },
                  { month: 'Apr', signups: 61, revenue: 175000, conversions: 48 },
                  { month: 'May', signups: 55, revenue: 158000, conversions: 45 },
                  { month: 'Jun', signups: 67, revenue: 198000, conversions: 52 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="signups" stroke="#ef4444" strokeWidth={3} />
                  <Line type="monotone" dataKey="conversions" stroke="#22c55e" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue by Rep Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Representative</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leaderboardData.slice(0, 6).map(rep => ({
                  name: rep.name.split(' ')[0],
                  revenue: rep.metrics.monthly_revenue,
                  signups: rep.metrics.monthly_signups
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => name === 'revenue' ? [`$${value.toLocaleString()}`, 'Revenue'] : [value, 'Signups']} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#ef4444" />
                  <Bar dataKey="signups" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Bonus Tier Distribution */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Bonus Tier Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bonusTiers.map(tier => ({
                      name: tier.tier_name,
                      value: leaderboardData.filter(rep => rep.metrics.current_tier === tier.tier_number).length,
                      fill: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'][tier.tier_number - 1]
                    })).filter(tier => tier.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bonusTiers.map((tier, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'][index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Goal Progress Overview */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Goal Progress Overview</h4>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={leaderboardData.slice(0, 6).map(rep => ({
                  name: rep.name.split(' ')[0],
                  progress: Math.round((rep.metrics.monthly_signups / rep.goals.monthly_signup_goal) * 100),
                  goal: 100
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}%`, 'Progress']} />
                  <Legend />
                  <Area type="monotone" dataKey="progress" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="goal" stackId="2" stroke="#e5e7eb" fill="#e5e7eb" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Analytics Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">Detailed Performance Metrics</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rep</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signups</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Deal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meetings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proposals</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboardData.map((rep) => (
                    <tr key={rep.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img className="h-8 w-8 rounded-full" src={rep.picture} alt={rep.name} />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{rep.name}</div>
                            <div className="text-sm text-gray-500">{rep.territory}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rep.metrics.monthly_signups}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${(rep.metrics?.monthly_revenue || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(rep.metrics?.conversion_rate || 0)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${(rep.metrics?.avg_deal_size || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rep.metrics.calls_made}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rep.metrics.meetings_held}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rep.metrics.proposals_sent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Admin Settings Tab */}
      {activeTab === 'admin' && (user?.role === 'super_admin' || user?.role === 'sales_manager') && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Advanced Admin Settings</h3>
              <p className="text-gray-600 mt-1">Automated goal setting, bonus tier management, and system administration</p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Auto-Set Goals</span>
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Performance Analytics</span>
              </button>
            </div>
          </div>

          {/* Automated Goal Setting System */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Smart Goal Assignment System</span>
              </h4>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-900 mb-3">Goal Setting Algorithm</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Base Monthly Target</label>
                          <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="25" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Performance Multiplier</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            <option>Historical Performance</option>
                            <option>Trending Average</option>
                            <option>Industry Benchmark</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Seasonal Adjustment</label>
                          <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="1.2" step="0.1" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Growth Factor</label>
                          <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="font-semibold text-yellow-800">Goal Assignment Restrictions</span>
                    </div>
                    <div className="text-sm text-yellow-700">
                      <p className="mb-2">• Goals can only be assigned between the 1st-6th of each month</p>
                      <p className="mb-2">• Current date: {new Date().toLocaleDateString()} - {new Date().getDate() <= 6 ? '✅ Assignment allowed' : '❌ Assignment restricted'}</p>
                      <p>• Team Leads can only assign goals to their direct reports</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-900 mb-3">Quick Actions</h5>
                    <div className="space-y-2">
                      <button 
                        onClick={() => handleAutoGenerateGoals()}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Auto-Generate Goals
                      </button>
                      <button 
                        onClick={() => setShowGoalModal(true)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Assign Individual Goal
                      </button>
                      <button 
                        onClick={() => handleBulkGoalAssignment()}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        Bulk Goal Assignment
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-900 mb-3">Goal Templates</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Aggressive Growth:</span>
                        <span className="font-medium">+20%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Steady Progress:</span>
                        <span className="font-medium">+10%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Maintenance:</span>
                        <span className="font-medium">+5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bonus Tier Automation System */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Automated Bonus Tier Management</span>
              </h4>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-900 mb-4">Tier Progression Rules</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="text-sm font-medium">Auto-advance on threshold</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="text-sm font-medium">Monthly tier review</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="text-sm font-medium">Notification alerts</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h5 className="font-semibold text-green-800 mb-3">Recent Tier Advancements</h5>
                    <div className="space-y-2">
                      {leaderboardData.filter(rep => rep.metrics.monthly_signups >= 25).slice(0, 3).map((rep) => (
                        <div key={rep.id} className="flex items-center space-x-3 text-sm">
                          <img src={rep.picture} alt={rep.name} className="w-6 h-6 rounded-full" />
                          <span className="text-green-700">{rep.name} advanced to {rep.metrics.tier_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-900 mb-4">Bonus Tier Configuration</h5>
                    <div className="space-y-3">
                      {bonusTiers.map((tier) => (
                        <div key={tier.tier_number} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              tier.tier_number === 1 ? 'bg-orange-600 text-white' :
                              tier.tier_number === 2 ? 'bg-gray-400 text-white' :
                              tier.tier_number === 3 ? 'bg-yellow-500 text-white' :
                              tier.tier_number === 4 ? 'bg-gray-600 text-white' :
                              tier.tier_number === 5 ? 'bg-blue-600 text-white' :
                              'bg-purple-600 text-white'
                            }`}>
                              {tier.tier_number}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{tier.tier_name}</div>
                              <div className="text-sm text-gray-600">{tier.signup_threshold}+ signups</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {leaderboardData.filter(rep => rep.metrics.current_tier === tier.tier_number).length} reps
                            </div>
                            <button className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Administration */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">System Statistics</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Team Members</span>
                  <span className="font-medium">{leaderboardData.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Competitions</span>
                  <span className="font-medium">{competitions.filter(c => c.status === 'active').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Monthly Signups</span>
                  <span className="font-medium">{leaderboardData.reduce((sum, rep) => sum + rep.metrics.monthly_signups, 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Monthly Revenue</span>
                  <span className="font-medium">${leaderboardData.reduce((sum, rep) => sum + (rep.metrics?.monthly_revenue || 0), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Conversion Rate</span>
                  <span className="font-medium">{Math.round(leaderboardData.reduce((sum, rep) => sum + rep.metrics.conversion_rate, 0) / leaderboardData.length)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h4>
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-1">Top Performer</div>
                  <div className="text-blue-700">{leaderboardData[0]?.name}</div>
                  <div className="text-xs text-blue-600">{leaderboardData[0]?.metrics.monthly_signups} signups</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="text-sm font-medium text-green-800 mb-1">Fastest Growing</div>
                  <div className="text-green-700">{leaderboardData.find(rep => rep.trend === 'up')?.name}</div>
                  <div className="text-xs text-green-600">+{Math.round(Math.random() * 15 + 5)}% growth</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="text-sm font-medium text-purple-800 mb-1">Elite Tier Reps</div>
                  <div className="text-purple-700">{leaderboardData.filter(rep => rep.metrics.current_tier >= 5).length} members</div>
                  <div className="text-xs text-purple-600">Top performance tier</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h4>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                  Generate Monthly Report
                </button>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  Backup System Data
                </button>
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                  Send Team Notifications
                </button>
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                  Configure Alerts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Assignment Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Monthly Goals</h3>
            <form onSubmit={handleAssignGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Member</label>
                <select
                  value={newGoal.rep_id}
                  onChange={(e) => setNewGoal({...newGoal, rep_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select team member</option>
                  {userTeamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Signup Goal</label>
                <input
                  type="number"
                  value={newGoal.signup_goal}
                  onChange={(e) => setNewGoal({...newGoal, signup_goal: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Revenue Goal</label>
                <input
                  type="number"
                  value={newGoal.revenue_goal}
                  onChange={(e) => setNewGoal({...newGoal, revenue_goal: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Assign Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Competition Creation Modal */}
      {showCompetitionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Competition</h3>
            <form onSubmit={handleCreateCompetition} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Competition Name</label>
                <input
                  type="text"
                  value={newCompetition.name}
                  onChange={(e) => setNewCompetition({...newCompetition, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newCompetition.description}
                  onChange={(e) => setNewCompetition({...newCompetition, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows="3"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Competition Type</label>
                <select
                  value={newCompetition.competition_type}
                  onChange={(e) => setNewCompetition({...newCompetition, competition_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="signups">Signups</option>
                  <option value="revenue">Revenue</option>
                  <option value="leads">Leads</option>
                  <option value="conversions">Conversions</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={newCompetition.start_date}
                  onChange={(e) => setNewCompetition({...newCompetition, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={newCompetition.end_date}
                  onChange={(e) => setNewCompetition({...newCompetition, end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prize Description</label>
                <input
                  type="text"
                  value={newCompetition.prize_description}
                  onChange={(e) => setNewCompetition({...newCompetition, prize_description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rules</label>
                <textarea
                  value={newCompetition.rules}
                  onChange={(e) => setNewCompetition({...newCompetition, rules: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows="3"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCompetitionModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Create Competition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signup Data Sync Management */}
      {activeTab === 'admin' && (user?.role === 'super_admin' || user?.role === 'sales_manager') && (
        <div className="space-y-8">
          {/* Signup Data Sync Management */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Signup Data Sync Management</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-900">Automatic Sync</h5>
                  <p className="text-sm text-gray-600">Syncs signup data from Google Sheets 3 times daily (8 AM, 2 PM, 8 PM)</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Next sync: 8:00 PM</div>
                  <div className="text-xs text-green-600">Last sync: 2 hours ago</div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handleManualSync()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Manual Sync Now
                </button>
                <button
                  onClick={() => setShowSyncStatus(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  View Sync Status
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                <strong>Source:</strong> Google Sheets "Sign Ups 2025" tab<br/>
                <strong>Spreadsheet ID:</strong> 1YSJD4RoqS_FLWF0LN1GRJKQhQNCdPT_aThqX6R6cZ4I
              </div>
            </div>
          </div>

          {/* Revenue Management */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Revenue Management</h4>
            <p className="text-sm text-gray-600 mb-4">
              Revenue numbers are updated manually by Admin/Sales Manager. Signup data is automatically synced.
            </p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sales Rep</label>
                  <select
                    value={revenueUpdate.rep_id}
                    onChange={(e) => setRevenueUpdate({...revenueUpdate, rep_id: e.target.value})}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500"
                  >
                    <option value="">Select Rep</option>
                    {salesReps.map(rep => (
                      <option key={rep.id} value={rep.id}>{rep.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select
                    value={revenueUpdate.month}
                    onChange={(e) => setRevenueUpdate({...revenueUpdate, month: parseInt(e.target.value)})}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500"
                  >
                    <option value="">Select Month</option>
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2025, i, 1).toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Revenue ($)</label>
                  <input
                    type="number"
                    value={revenueUpdate.revenue}
                    onChange={(e) => setRevenueUpdate({...revenueUpdate, revenue: parseFloat(e.target.value) || 0})}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500"
                    placeholder="Enter revenue amount"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleRevenueUpdate}
                  disabled={!revenueUpdate.rep_id || !revenueUpdate.month || !revenueUpdate.revenue}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Update Revenue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Status Modal */}
      {showSyncStatus && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sync Status History</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sync</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {syncStatuses.map((status, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {status.sync_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            status.status === 'completed' ? 'bg-green-100 text-green-800' :
                            status.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {status.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {status.last_sync ? new Date(status.last_sync).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {status.records_processed || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {status.error_message || 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowSyncStatus(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// HR Recruitment App - Comprehensive HR Management System
const HRRecruitmentApp = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState({
    spreadsheet_id: '',
    range_name: '',
    data_type: 'employees'
  });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  
  // Enhanced Recruitment Management
  const [pipelineView, setPipelineView] = useState('kanban'); // 'kanban' or 'list'
  const [selectedPipelineCandidate, setSelectedPipelineCandidate] = useState(null);
  const [showCandidateDetailModal, setShowCandidateDetailModal] = useState(false);
  const [candidateNotes, setCandidateNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [interviews, setInterviews] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [bulkImportModal, setBulkImportModal] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all'); // For list view filtering
  
  // Pipeline stages for Kanban view
  const pipelineStages = [
    { id: 'applied', name: 'Applied', color: 'bg-blue-100 border-blue-300', count: 0 },
    { id: 'screening', name: 'Screening', color: 'bg-yellow-100 border-yellow-300', count: 0 },
    { id: 'interview', name: 'Interview', color: 'bg-purple-100 border-purple-300', count: 0 },
    { id: 'reference', name: 'Reference Check', color: 'bg-orange-100 border-orange-300', count: 0 },
    { id: 'offer', name: 'Offer', color: 'bg-green-100 border-green-300', count: 0 },
    { id: 'hired', name: 'Hired', color: 'bg-emerald-100 border-emerald-300', count: 0 },
    { id: 'declined', name: 'Declined', color: 'bg-red-100 border-red-300', count: 0 }
  ];
  
  // Onboarding Management
  const [onboardingStages, setOnboardingStages] = useState([]);
  const [newStage, setNewStage] = useState({
    name: '',
    description: '',
    employee_type: 'all',
    order: 1
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [onboardingProgress, setOnboardingProgress] = useState(null);
  
  // PTO Management
  const [ptoRequests, setPtoRequests] = useState([]);
  const [newPTORequest, setNewPTORequest] = useState({
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [ptoBalance, setPtoBalance] = useState(null);
  
  // Hiring Flow Management
  const [hiringFlows, setHiringFlows] = useState([]);
  const [hiringCandidates, setHiringCandidates] = useState([]);
  const [selectedHiringType, setSelectedHiringType] = useState('all');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    hiring_type: 'insurance',
    notes: ''
  });
  
  // Safety & Compliance
  const [safetyTrainings, setSafetyTrainings] = useState([]);
  const [workersCompSubmissions, setWorkersCompSubmissions] = useState([]);
  const [overdueWorkersComp, setOverdueWorkersComp] = useState([]);
  const [incidentReports, setIncidentReports] = useState([]);
  
  // Employee Self-Service
  const [employeeDashboard, setEmployeeDashboard] = useState(null);
  const [employeeRequests, setEmployeeRequests] = useState([]);

  // Fetch functions
  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API}/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchImportStatus = async () => {
    try {
      const response = await axios.get(`${API}/import/status`);
      setImportStatus(response.data);
    } catch (error) {
      console.error('Error fetching import status:', error);
    }
  };

  const fetchOnboardingStages = async () => {
    try {
      const response = await axios.get(`${API}/onboarding/stages`);
      setOnboardingStages(response.data);
    } catch (error) {
      console.error('Error fetching onboarding stages:', error);
    }
  };

  const fetchPTORequests = async () => {
    try {
      const response = await axios.get(`${API}/pto/requests`);
      setPtoRequests(response.data);
    } catch (error) {
      console.error('Error fetching PTO requests:', error);
    }
  };

  const fetchHiringFlows = async () => {
    try {
      const response = await axios.get(`${API}/hiring/flows`);
      setHiringFlows(response.data);
    } catch (error) {
      console.error('Error fetching hiring flows:', error);
    }
  };

  const fetchHiringCandidates = async () => {
    try {
      const response = await axios.get(`${API}/hiring/candidates`);
      setHiringCandidates(response.data);
    } catch (error) {
      console.error('Error fetching hiring candidates:', error);
    }
  };

  const fetchSafetyTrainings = async () => {
    try {
      const response = await axios.get(`${API}/safety/trainings`);
      setSafetyTrainings(response.data);
    } catch (error) {
      console.error('Error fetching safety trainings:', error);
    }
  };

  const fetchWorkersCompSubmissions = async () => {
    try {
      const response = await axios.get(`${API}/compliance/workers-comp`);
      setWorkersCompSubmissions(response.data);
    } catch (error) {
      console.error('Error fetching workers comp submissions:', error);
    }
  };

  const fetchEmployeeRequests = async () => {
    try {
      const response = await axios.get(`${API}/self-service/requests`);
      setEmployeeRequests(response.data);
    } catch (error) {
      console.error('Error fetching employee requests:', error);
    }
  };

  const fetchEmployeeDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/self-service/dashboard`);
      setEmployeeDashboard(response.data);
      console.log('✅ Employee dashboard loaded:', response.data);
    } catch (error) {
      console.error('❌ Error fetching employee dashboard:', error);
      // Set fallback dashboard data if API fails
      setEmployeeDashboard({
        employee: {
          name: user?.name || 'Employee',
          email: user?.email || 'employee@company.com',
          role: user?.role || 'employee',
          employee_type: 'w2'
        },
        employee_type: 'w2',
        onboarding_progress: { completed_stages: 0, total_stages: 0 },
        pto_balance: { available_days: 0, used_days: 0 },
        recent_requests: [],
        documents: []
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeSampleHiringFlows = async () => {
    try {
      await axios.post(`${API}/hiring/initialize-sample-flows`);
      await fetchHiringFlows();
    } catch (error) {
      console.error('Error initializing sample hiring flows:', error);
    }
  };

  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/hiring/candidates`, newCandidate);
      setNewCandidate({
        name: '',
        email: '',
        phone: '',
        position: '',
        hiring_type: 'insurance',
        notes: ''
      });
      setCandidateModalOpen(false);
      await fetchHiringCandidates();
    } catch (error) {
      console.error('Error creating candidate:', error);
    }
  };

  const handleAdvanceCandidate = async (candidateId) => {
    try {
      await axios.post(`${API}/hiring/candidates/${candidateId}/advance`);
      await fetchHiringCandidates();
    } catch (error) {
      console.error('Error advancing candidate:', error);
    }
  };

  const initializeSampleData = async () => {
    try {
      await axios.post(`${API}/hr/initialize-sample-data`);
      await fetchOnboardingStages();
      await fetchSafetyTrainings();
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  };

  // Handle traditional import (with sample data)
  const handleTraditionalImport = async () => {
    try {
      setImporting(true);
      const response = await axios.post(`${API}/employees/import`, {});
      setImportResult({
        success: true,
        message: response.data.message,
        type: 'traditional'
      });
      await fetchEmployees();
    } catch (error) {
      setImportResult({
        success: false,
        message: error.response?.data?.detail || 'Import failed',
        type: 'traditional'
      });
    } finally {
      setImporting(false);
    }
  };

  // Handle Google Sheets import
  const handleGoogleSheetsImport = async () => {
    try {
      setImporting(true);
      const endpoint = importData.data_type === 'employees' 
        ? '/employees/import-from-sheets'
        : '/sales-reps/import-from-sheets';
      
      const response = await axios.post(`${API}${endpoint}`, importData);
      setImportResult({
        success: true,
        data: response.data,
        type: 'google_sheets'
      });
      await fetchEmployees();
      setImportModalOpen(false);
    } catch (error) {
      setImportResult({
        success: false,
        message: error.response?.data?.detail || 'Google Sheets import failed',
        type: 'google_sheets'
      });
    } finally {
      setImporting(false);
    }
  };

  // Handle onboarding stage creation
  const handleCreateOnboardingStage = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/onboarding/stages`, newStage);
      setNewStage({ name: '', description: '', employee_type: 'all', order: 1 });
      await fetchOnboardingStages();
    } catch (error) {
      console.error('Error creating onboarding stage:', error);
    }
  };

  // Handle PTO request creation
  const handleCreatePTORequest = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/pto/requests`, newPTORequest);
      setNewPTORequest({ start_date: '', end_date: '', reason: '' });
      await fetchPTORequests();
    } catch (error) {
      console.error('Error creating PTO request:', error);
    }
  };

  // Handle PTO approval/denial
  const handlePTOApproval = async (requestId, status) => {
    try {
      await axios.put(`${API}/pto/requests/${requestId}`, { status });
      await fetchPTORequests();
    } catch (error) {
      console.error('Error updating PTO request:', error);
    }
  };

  // Handle worker comp submission
  const handleWorkersCompSubmission = async (employeeId) => {
    try {
      await axios.post(`${API}/compliance/workers-comp?employee_id=${employeeId}`);
      await fetchWorkersCompSubmissions();
    } catch (error) {
      console.error('Error creating workers comp submission:', error);
    }
  };

  // Send compliance reminder
  const handleSendComplianceReminder = async (employeeId) => {
    try {
      await axios.post(`${API}/compliance/send-reminder`, { employee_id: employeeId });
      console.log('Compliance reminder sent successfully');
    } catch (error) {
      console.error('Error sending compliance reminder:', error);
    }
  };

  // Send bulk compliance reminder
  const handleBulkComplianceReminder = async () => {
    try {
      const pendingEmployees = employees.filter(emp => emp.employee_type === '1099' && !emp.workers_comp_submitted);
      const promises = pendingEmployees.map(emp => handleSendComplianceReminder(emp.id));
      await Promise.all(promises);
      console.log('Bulk compliance reminders sent successfully');
    } catch (error) {
      console.error('Error sending bulk compliance reminders:', error);
    }
  };

  // Export compliance report
  const handleExportComplianceReport = async () => {
    try {
      const response = await axios.get(`${API}/compliance/export-report`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `compliance-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting compliance report:', error);
    }
  };

  // Get employee onboarding progress
  const getOnboardingProgress = async (employeeId) => {
    try {
      const response = await axios.get(`${API}/onboarding/employee/${employeeId}`);
      setOnboardingProgress(response.data);
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
    }
  };

  // Complete onboarding stage
  const completeOnboardingStage = async (employeeId, stageId) => {
    try {
      await axios.post(`${API}/onboarding/employee/${employeeId}/stage/${stageId}/complete`);
      await getOnboardingProgress(employeeId);
    } catch (error) {
      console.error('Error completing onboarding stage:', error);
    }
  };

  // Enhanced Recruitment Functions
  const handleCandidateStageChange = async (candidateId, newStage) => {
    try {
      await axios.put(`${API}/hiring/candidates/${candidateId}`, { status: newStage });
      await fetchHiringCandidates();
      
      // Send automated email for stage change
      await sendStageChangeEmail(candidateId, newStage);
    } catch (error) {
      console.error('Error updating candidate stage:', error);
    }
  };

  const sendStageChangeEmail = async (candidateId, stage) => {
    try {
      const emailData = {
        candidate_id: candidateId,
        stage: stage,
        template_type: `stage_${stage}`
      };
      await axios.post(`${API}/candidates/send-email`, emailData);
    } catch (error) {
      console.error('Error sending stage change email:', error);
    }
  };

  const addCandidateNote = async (candidateId, note) => {
    try {
      const noteData = {
        candidate_id: candidateId,
        note: note,
        author: user.name,
        created_at: new Date().toISOString()
      };
      await axios.post(`${API}/candidates/notes`, noteData);
      setNewNote('');
      await fetchCandidateNotes(candidateId);
    } catch (error) {
      console.error('Error adding candidate note:', error);
    }
  };

  const fetchCandidateNotes = async (candidateId) => {
    try {
      const response = await axios.get(`${API}/candidates/${candidateId}/notes`);
      setCandidateNotes(response.data);
    } catch (error) {
      console.error('Error fetching candidate notes:', error);
    }
  };

  const scheduleInterview = async (candidateId, interviewData) => {
    try {
      const data = {
        candidate_id: candidateId,
        scheduled_by: user.id,
        ...interviewData
      };
      await axios.post(`${API}/interviews`, data);
      setShowScheduleModal(false);
      await fetchCandidateInterviews(candidateId);
    } catch (error) {
      console.error('Error scheduling interview:', error);
    }
  };

  const fetchCandidateInterviews = async (candidateId) => {
    try {
      const response = await axios.get(`${API}/candidates/${candidateId}/interviews`);
      setInterviews(response.data);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    }
  };

  const importCandidatesFromEmail = async (emailData) => {
    try {
      const response = await axios.post(`${API}/candidates/import-email`, emailData);
      await fetchHiringCandidates();
      return response.data;
    } catch (error) {
      console.error('Error importing candidates from email:', error);
    }
  };

  const getCandidatesByStage = (stage) => {
    return hiringCandidates.filter(candidate => candidate.status === stage);
  };

  const getFilteredCandidates = () => {
    if (selectedStageFilter === 'all') {
      return hiringCandidates;
    }
    return hiringCandidates.filter(candidate => candidate.status === selectedStageFilter);
  };

  const handleDragDrop = async (candidateId, targetStage) => {
    // Handle drag and drop between stages
    await handleCandidateStageChange(candidateId, targetStage);
  };

  useEffect(() => {
    fetchEmployees();
    fetchImportStatus();
    
    if (user?.role === 'super_admin' || user?.role === 'hr_manager') {
      fetchOnboardingStages();
      fetchPTORequests();
      fetchHiringFlows();
      fetchHiringCandidates();
      fetchWorkersCompSubmissions();
      fetchEmployeeRequests();
    }
    
    if (user?.role === 'sales_rep' || user?.role === 'employee') {
      fetchEmployeeDashboard();
    }
  }, [user]);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'hr_manager';
  const isManager = user?.role === 'sales_manager' || isAdmin;
  const isEmployee = user?.role === 'employee' || user?.role === 'sales_rep';

  if (!isAdmin && !isManager && !isEmployee) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">HR Management</h2>
        <p className="text-gray-600">Access denied. HR Manager, Sales Manager, or Admin role required.</p>
      </div>
    );
  }

  // Employee Self-Service View
  if (isEmployee && !isManager) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Employee Dashboard</h2>
          <p className="text-gray-600">Welcome {user?.name || 'Employee'}</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
              <span className="ml-3 text-gray-600">Loading your dashboard...</span>
            </div>
          ) : employeeDashboard ? (
            <div className="space-y-6">
              {/* Personal Info Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h3 className="font-semibold text-red-900">Personal Information</h3>
                  <p className="text-red-700">Name: {employeeDashboard.employee?.name || 'N/A'}</p>
                  <p className="text-red-700">Email: {employeeDashboard.employee?.email || 'N/A'}</p>
                  <p className="text-red-700">Role: {employeeDashboard.employee?.role || 'N/A'}</p>
                  <p className="text-red-700">Type: {employeeDashboard.employee_type?.toUpperCase() || 'W2'}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900">Onboarding Progress</h3>
                  <p className="text-green-700">
                    {employeeDashboard.onboarding_progress?.completed_stages || 0} of {employeeDashboard.onboarding_progress?.total_stages || 0} stages completed
                  </p>
                  <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ 
                        width: `${((employeeDashboard.onboarding_progress?.completed_stages || 0) / Math.max(employeeDashboard.onboarding_progress?.total_stages || 1, 1)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                {employeeDashboard.employee_type === 'w2' && (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-900">PTO Balance</h3>
                    <p className="text-purple-700">
                      Available: {employeeDashboard.pto_balance?.available_days || 0} days
                    </p>
                    <p className="text-purple-700">
                      Used: {employeeDashboard.pto_balance?.used_days || 0} days
                    </p>
                  </div>
                )}
              </div>
              
              {/* Quick Actions */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {employeeDashboard.employee_type === 'w2' && (
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                      Request PTO
                    </button>
                  )}
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    View Documents
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Update Profile
                  </button>
                </div>
              </div>
              
              {/* Recent Requests */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Requests</h3>
                {employeeDashboard.recent_requests && employeeDashboard.recent_requests.length > 0 ? (
                  <div className="space-y-2">
                    {employeeDashboard.recent_requests.map((request, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                        <span>{request.title || 'Request'}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          request.status === 'resolved' ? 'bg-green-100 text-green-800' : 
                          request.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No recent requests</p>
                )}
              </div>
              
              {/* Documents */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Documents</h3>
                {employeeDashboard.documents && employeeDashboard.documents.length > 0 ? (
                  <div className="space-y-2">
                    {employeeDashboard.documents.map((doc, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                        <span>{doc.document_name}</span>
                        <span className="text-sm text-gray-600">{doc.document_type}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No documents available</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-600">Unable to load dashboard. Please try again later.</div>
              <button 
                onClick={fetchEmployeeDashboard}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin/Manager View
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Enhanced Header */}
      <motion.div 
        className="roof-er-gradient border-b border-red-800/20 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mobile-container">
          <div className="flex justify-between items-center py-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.354a4 4 0 110 5.292V21a1 1 0 01-2 0V9.646a4 4 0 110-5.292z"/>
                    <path d="M15 1a1 1 0 011 1v2a1 1 0 11-2 0V2a1 1 0 011-1zM9 1a1 1 0 011 1v2a1 1 0 11-2 0V2a1 1 0 011-1z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">HR Management System</h2>
                  <p className="text-white/70 text-sm">Comprehensive HR workflow management</p>
                </div>
              </div>
            </motion.div>
            <motion.div 
              className="flex space-x-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.button
                onClick={initializeSampleData}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Initialize Sample Data</span>
              </motion.button>
              <motion.button
                onClick={handleTraditionalImport}
                disabled={importing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
                whileHover={{ scale: importing ? 1 : 1.05 }}
                whileTap={{ scale: importing ? 1 : 0.95 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <span>{importing ? 'Importing...' : 'Import Sample Data'}</span>
              </motion.button>
              <motion.button
                onClick={() => setImportModalOpen(true)}
                disabled={importing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
                whileHover={{ scale: importing ? 1 : 1.05 }}
                whileTap={{ scale: importing ? 1 : 0.95 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Import from Google Sheets</span>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Tab Navigation */}
      <motion.div 
        className="bg-gray-800 border-b border-gray-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <nav className="mobile-container">
          <div className="flex space-x-1 overflow-x-auto py-4">
            {[
              { id: 'employees', name: 'Employees', icon: '👥' },
              { id: 'onboarding', name: 'Onboarding', icon: '🎯' },
              { id: 'pto', name: 'PTO Management', icon: '🏖️' },
              { id: 'hiring', name: 'Hiring Flows', icon: '🔄' },
              { id: 'compliance', name: 'Compliance', icon: '✅' },
              { id: 'assignments', name: 'Project Assignments', icon: '📋' },
              { id: 'requests', name: 'Employee Requests', icon: '📝' }
            ].filter(tab => !['assignments'].includes(tab.id)).map((tab, index) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.name}</span>
              </motion.button>
            ))}
          </div>
        </nav>
      </motion.div>

      {/* Content Area */}
      <div className="bg-gray-900 min-h-screen">
        <div className="mobile-container py-8">
          
          {/* Import Status */}
          {importStatus && (
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Import Configuration</span>
                </h3>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <span className="font-medium text-gray-300">Google Sheets Enabled:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${importStatus.google_sheets_enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {importStatus.google_sheets_enabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <span className="font-medium text-gray-300">Credentials Configured:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${importStatus.credentials_configured ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {importStatus.credentials_configured ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Import Result */}
          {importResult && (
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`rounded-lg p-6 border ${importResult.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <h3 className={`font-semibold text-lg mb-3 flex items-center space-x-2 ${importResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    {importResult.success ? (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    )}
                  </svg>
                  <span>Import Result</span>
                </h3>
                {importResult.success ? (
                  <div className="text-sm text-green-300">
                    {importResult.type === 'google_sheets' ? (
                      <div>
                        <p className="mb-2">Successfully imported {importResult.data.imported} out of {importResult.data.total_rows} records</p>
                        {importResult.data.errors && importResult.data.errors.length > 0 && (
                          <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <p className="font-medium text-yellow-400 mb-2">Errors:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              {importResult.data.errors.map((error, index) => (
                                <li key={index} className="text-yellow-300">{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p>{importResult.message}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-300">{importResult.message}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab Content */}
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {activeTab === 'employees' && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <span className="text-2xl">👥</span>
                    <span>Employees ({employees.length})</span>
                  </h3>
                </div>
                
                <div className="p-6">
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
                      <p className="mt-4 text-gray-400">Loading employees...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                        <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-red-400 text-lg font-medium">{error}</p>
                      </div>
                    </div>
                  ) : employees.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-gray-700 rounded-lg p-8">
                        <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h4 className="text-xl font-semibold text-gray-300 mb-2">No employees found</h4>
                        <p className="text-gray-400">Import some data to get started with employee management.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Territory</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {employees.map((employee, index) => (
                            <motion.tr 
                              key={employee.id}
                              className="hover:bg-gray-700/50 transition-colors duration-200"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-white">{employee.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300">{employee.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {employee.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  employee.employee_type === 'w2' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                }`}>
                                  {employee.employee_type?.toUpperCase() || 'W2'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {employee.territory || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  employee.is_active ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                }`}>
                                  {employee.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <motion.button
                                    onClick={() => {
                                      setSelectedEmployee(employee);
                                      getOnboardingProgress(employee.id);
                                    }}
                                    className="text-red-400 hover:text-red-300 px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all duration-200"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    View Onboarding
                                  </motion.button>
                                  {employee.employee_type === '1099' && (
                                    <motion.button
                                      onClick={() => handleWorkersCompSubmission(employee.id)}
                                      className="text-red-400 hover:text-red-300 px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all duration-200"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      Submit Workers Comp
                                    </motion.button>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'onboarding' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Onboarding Management</h3>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Create New Stage
              </button>
            </div>
            
            {/* Create New Stage Form */}
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Create Onboarding Stage</h4>
              <form onSubmit={handleCreateOnboardingStage} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage Name</label>
                  <input
                    type="text"
                    value={newStage.name}
                    onChange={(e) => setNewStage({...newStage, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Type</label>
                  <select
                    value={newStage.employee_type}
                    onChange={(e) => setNewStage({...newStage, employee_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">All Employees</option>
                    <option value="w2">W2 Only</option>
                    <option value="1099">1099 Only</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newStage.description}
                    onChange={(e) => setNewStage({...newStage, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows="3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                  <input
                    type="number"
                    value={newStage.order}
                    onChange={(e) => setNewStage({...newStage, order: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    min="1"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Create Stage
                  </button>
                </div>
              </form>
            </div>
            
            {/* Onboarding Stages */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Onboarding Stages</h4>
              {onboardingStages.map((stage) => (
                <div key={stage.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium text-gray-900">{stage.name}</h5>
                      <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                      <div className="flex space-x-4 mt-2">
                        <span className="text-xs text-gray-500">Order: {stage.order}</span>
                        <span className="text-xs text-gray-500">Type: {stage.employee_type}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      stage.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {stage.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pto' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">PTO Management (W2 Employees)</h3>
            
            {user?.role === 'employee' && (
              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <h4 className="text-md font-medium text-blue-900 mb-4">Request PTO</h4>
                <form onSubmit={handleCreatePTORequest} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newPTORequest.start_date}
                      onChange={(e) => setNewPTORequest({...newPTORequest, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={newPTORequest.end_date}
                      onChange={(e) => setNewPTORequest({...newPTORequest, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Reason</label>
                    <input
                      type="text"
                      value={newPTORequest.reason}
                      onChange={(e) => setNewPTORequest({...newPTORequest, reason: e.target.value})}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Submit Request
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* PTO Requests Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ptoRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employees.find(e => e.id === request.employee_id)?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.start_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.days_requested}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          request.status === 'denied' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {request.status === 'pending' && isManager && (
                          <div className="space-x-2">
                            <button
                              onClick={() => handlePTOApproval(request.id, 'approved')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handlePTOApproval(request.id, 'denied')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Deny
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'hiring' && (
          <div className="space-y-6">
            {/* Header with View Toggle */}
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Enhanced Recruitment Pipeline</h3>
              <div className="flex items-center space-x-4">
                {/* View Toggle */}
                <div className="flex bg-gray-200 rounded-lg p-1">
                  <button
                    onClick={() => setPipelineView('kanban')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      pipelineView === 'kanban' 
                        ? 'bg-red-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2" />
                    </svg>
                    Kanban
                  </button>
                  <button
                    onClick={() => setPipelineView('list')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      pipelineView === 'list' 
                        ? 'bg-red-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    List
                  </button>
                </div>
                
                {/* Action Buttons */}
                <button
                  onClick={() => setBulkImportModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Import Candidates
                </button>
                <button
                  onClick={() => setCandidateModalOpen(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Add Candidate
                </button>
              </div>
            </div>

            {/* Recruitment Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">Total Candidates</div>
                    <div className="text-2xl font-bold text-blue-600">{hiringCandidates.length}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">Hired This Month</div>
                    <div className="text-2xl font-bold text-green-600">
                      {getCandidatesByStage('hired').length}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">Interviews Scheduled</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {getCandidatesByStage('interview').length}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">Conversion Rate</div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {hiringCandidates.length > 0 
                        ? Math.round((getCandidatesByStage('hired').length / hiringCandidates.length) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Kanban View */}
            {pipelineView === 'kanban' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-7 gap-4 min-h-96">
                  {pipelineStages.map((stage) => (
                    <div key={stage.id} className={`${stage.color} rounded-lg p-4`}>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-gray-900">{stage.name}</h4>
                        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                          {getCandidatesByStage(stage.id).length}
                        </span>
                      </div>
                      
                      <div className="space-y-3 min-h-80">
                        {getCandidatesByStage(stage.id).map((candidate) => (
                          <motion.div
                            key={candidate.id}
                            layout
                            className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => {
                              setSelectedPipelineCandidate(candidate);
                              setShowCandidateDetailModal(true);
                              fetchCandidateNotes(candidate.id);
                              fetchCandidateInterviews(candidate.id);
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                  <span className="text-red-600 font-medium text-sm">
                                    {candidate.name?.charAt(0)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {candidate.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {candidate.position || candidate.hiring_type}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {candidate.source || 'Manual'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-2 flex justify-between items-center">
                              <span className="text-xs text-gray-500">
                                {candidate.created_at ? 
                                  new Date(candidate.created_at).toLocaleDateString() : 
                                  'No date'
                                }
                              </span>
                              <div className="flex space-x-1">
                                {stage.id !== 'declined' && stage.id !== 'hired' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentIndex = pipelineStages.findIndex(s => s.id === stage.id);
                                      const nextStage = pipelineStages[currentIndex + 1];
                                      if (nextStage) {
                                        handleCandidateStageChange(candidate.id, nextStage.id);
                                      }
                                    }}
                                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        
                        {getCandidatesByStage(stage.id).length === 0 && (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            No candidates in this stage
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List View */}
            {pipelineView === 'list' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900">All Candidates</h4>
                </div>
                
                {/* Stage Filter Bar */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {/* All Candidates Filter */}
                    <button
                      onClick={() => setSelectedStageFilter('all')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                        selectedStageFilter === 'all'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span>All Candidates</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        selectedStageFilter === 'all'
                          ? 'bg-red-700 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {hiringCandidates.length}
                      </span>
                    </button>

                    {/* Stage Filters */}
                    {pipelineStages.map((stage) => {
                      const stageCount = getCandidatesByStage(stage.id).length;
                      return (
                        <button
                          key={stage.id}
                          onClick={() => setSelectedStageFilter(stage.id)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                            selectedStageFilter === stage.id
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span>{stage.name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            selectedStageFilter === stage.id
                              ? 'bg-red-700 text-white'
                              : stageCount > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {stageCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Filter Indicator */}
                  {selectedStageFilter !== 'all' && (
                    <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
                      <span>Showing candidates in:</span>
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        {pipelineStages.find(s => s.id === selectedStageFilter)?.name}
                      </span>
                      <button
                        onClick={() => setSelectedStageFilter('all')}
                        className="text-red-600 hover:text-red-800 text-xs underline"
                      >
                        Clear filter
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredCandidates().length > 0 ? (
                        getFilteredCandidates().map((candidate, index) => (
                          <motion.tr 
                            key={candidate.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <span className="text-red-600 font-medium">
                                      {candidate.name?.charAt(0)}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                                  <div className="text-sm text-gray-500">{candidate.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {candidate.position || candidate.hiring_type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={candidate.status || 'applied'}
                                onChange={(e) => handleCandidateStageChange(candidate.id, e.target.value)}
                                className="text-sm border-gray-300 rounded-md focus:border-red-500 focus:ring-red-500"
                              >
                                {pipelineStages.map(stage => (
                                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                                {candidate.source || 'Manual'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {candidate.created_at ? 
                                new Date(candidate.created_at).toLocaleDateString() : 
                                'No date'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedPipelineCandidate(candidate);
                                  setShowCandidateDetailModal(true);
                                  fetchCandidateNotes(candidate.id);
                                  fetchCandidateInterviews(candidate.id);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPipelineCandidate(candidate);
                                  setShowScheduleModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Schedule Interview
                              </button>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                            {selectedStageFilter === 'all' 
                              ? 'No candidates found' 
                              : `No candidates in ${pipelineStages.find(s => s.id === selectedStageFilter)?.name} stage`
                            }
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Candidate Detail Modal */}
        {showCandidateDetailModal && selectedPipelineCandidate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedPipelineCandidate.name}
                  </h3>
                  <button
                    onClick={() => setShowCandidateDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Candidate Info */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Candidate Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <p className="text-sm text-gray-900">{selectedPipelineCandidate.email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <p className="text-sm text-gray-900">{selectedPipelineCandidate.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Position</label>
                          <p className="text-sm text-gray-900">{selectedPipelineCandidate.position || selectedPipelineCandidate.hiring_type}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Source</label>
                          <p className="text-sm text-gray-900">{selectedPipelineCandidate.source || 'Manual'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Notes & Comments</h4>
                      
                      {/* Add Note */}
                      <div className="mb-4">
                        <textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Add a note about this candidate..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          rows="3"
                        />
                        <button
                          onClick={() => addCandidateNote(selectedPipelineCandidate.id, newNote)}
                          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          Add Note
                        </button>
                      </div>

                      {/* Notes List */}
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {candidateNotes.map((note, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{note.note || note.content}</p>
                                <div className="flex items-center mt-2 text-xs text-gray-500">
                                  <span>{note.author || user.name}</span>
                                  <span className="mx-2">•</span>
                                  <span>{note.created_at ? new Date(note.created_at).toLocaleString() : 'Just now'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {candidateNotes.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">No notes yet</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Sidebar */}
                  <div className="space-y-6">
                    {/* Stage Progression */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Stage Progression</h4>
                      <div className="space-y-3">
                        {pipelineStages.map((stage) => (
                          <button
                            key={stage.id}
                            onClick={() => handleCandidateStageChange(selectedPipelineCandidate.id, stage.id)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              selectedPipelineCandidate.status === stage.id
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {stage.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h4>
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            setShowScheduleModal(true);
                          }}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Schedule Interview
                        </button>
                        <button
                          onClick={() => sendStageChangeEmail(selectedPipelineCandidate.id, selectedPipelineCandidate.status)}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Send Email Update
                        </button>
                        <button
                          onClick={() => handleCandidateStageChange(selectedPipelineCandidate.id, 'declined')}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          Decline Candidate
                        </button>
                      </div>
                    </div>

                    {/* Interview History */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Interview History</h4>
                      <div className="space-y-3">
                        {interviews.map((interview, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-900">{interview.type || 'Interview'}</p>
                            <p className="text-xs text-gray-500">
                              {interview.scheduled_date ? new Date(interview.scheduled_date).toLocaleString() : 'Date TBD'}
                            </p>
                          </div>
                        ))}
                        {interviews.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">No interviews scheduled</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Import Modal */}
        {bulkImportModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Import Candidates</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Import Source</label>
                    <select className="w-full border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500">
                      <option value="google_sheets">Google Sheets</option>
                      <option value="indeed">Indeed</option>
                      <option value="email">Email</option>
                      <option value="csv">CSV File</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Source Details</label>
                    <input
                      type="text"
                      placeholder="Enter spreadsheet ID, email, or upload file..."
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setBulkImportModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Handle import logic here
                      setBulkImportModal(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interview Scheduling Modal */}
        {showScheduleModal && selectedPipelineCandidate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Schedule Interview - {selectedPipelineCandidate.name}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interview Type</label>
                    <select className="w-full border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500">
                      <option value="phone">Phone Screen</option>
                      <option value="video">Video Interview</option>
                      <option value="in_person">In-Person</option>
                      <option value="panel">Panel Interview</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
                    <input
                      type="datetime-local"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interviewer(s)</label>
                    <input
                      type="text"
                      placeholder="Enter interviewer names..."
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      placeholder="Interview notes or special instructions..."
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500"
                      rows="3"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Handle scheduling logic here
                      setShowScheduleModal(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Schedule Interview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Existing modals continue here... */}

        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Compliance Requirements</h3>
              <div className="text-sm text-gray-600">
                Focused on 1099 workers' compensation submission
              </div>
            </div>

            {/* Compliance Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">Pending Submissions</div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {employees.filter(emp => emp.employee_type === '1099' && !emp.workers_comp_submitted).length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">Compliant</div>
                    <div className="text-2xl font-bold text-green-600">
                      {employees.filter(emp => emp.employee_type === '1099' && emp.workers_comp_submitted).length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">Total 1099 Workers</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {employees.filter(emp => emp.employee_type === '1099').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 1099 Workers Compliance Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">1099 Workers' Compensation Compliance</h4>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Territory</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.filter(emp => emp.employee_type === '1099').map((employee, index) => (
                      <tr key={employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.territory || 'Not Assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            employee.workers_comp_submitted 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {employee.workers_comp_submitted ? 'Compliant' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.workers_comp_submitted_date 
                            ? new Date(employee.workers_comp_submitted_date).toLocaleDateString()
                            : 'Not Submitted'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {!employee.workers_comp_submitted && (
                            <button
                              onClick={() => handleWorkersCompSubmission(employee.id)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              Mark as Submitted
                            </button>
                          )}
                          <button
                            onClick={() => handleSendComplianceReminder(employee.id)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Send Reminder
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compliance Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Compliance Actions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleBulkComplianceReminder()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Bulk Reminder
                </button>
                <button
                  onClick={() => handleExportComplianceReport()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Export Compliance Report
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Requests</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employeeRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employees.find(e => e.id === request.employee_id)?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.request_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.priority === 'high' ? 'bg-red-100 text-red-800' : 
                          request.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {request.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.status === 'resolved' ? 'bg-green-100 text-green-800' : 
                          request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {request.status === 'open' && (
                          <button
                            onClick={() => {
                              const status = prompt('New status (in_progress, resolved, closed):');
                              const resolution = prompt('Resolution:');
                              if (status && resolution) {
                                // Update request logic would go here
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Update
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
          </motion.div>
        </div>
      </div>

      {/* Google Sheets Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import from Google Sheets</h3>
              
              {!importStatus?.google_sheets_enabled && (
                <div className="mb-4 p-3 bg-yellow-50 rounded-md">
                  <p className="text-sm text-yellow-700">
                    Google Sheets integration is disabled. Please configure your service account credentials.
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
                  <select
                    value={importData.data_type}
                    onChange={(e) => setImportData({...importData, data_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="employees">Employees</option>
                    <option value="sales_reps">Sales Reps</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spreadsheet ID</label>
                  <input
                    type="text"
                    value={importData.spreadsheet_id}
                    onChange={(e) => setImportData({...importData, spreadsheet_id: e.target.value})}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Range</label>
                  <input
                    type="text"
                    value={importData.range_name}
                    onChange={(e) => setImportData({...importData, range_name: e.target.value})}
                    placeholder="Sheet1!A:E"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                
                <div className="text-xs text-gray-500">
                  <p>Expected columns for employees: Name, Email, Role, Territory, Commission Rate</p>
                  <p>Expected columns for sales reps: Name, Email, Phone, Territory, About Me, Commission Rate</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGoogleSheetsImport}
                  disabled={importing || !importData.spreadsheet_id || !importData.range_name || !importStatus?.google_sheets_enabled}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// QR Generator App - Main Focus
const QRGeneratorApp = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [salesReps, setSalesReps] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterTerritory, setFilterTerritory] = useState('all');
  const [selectedRep, setSelectedRep] = useState(null);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadData, setLeadData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    message: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('');
  
  // Savings Calculator State
  const [showSavingsCalculator, setShowSavingsCalculator] = useState(false);
  const [roofCostInput, setRoofCostInput] = useState('');
  const [calculatedSavings, setCalculatedSavings] = useState(0);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'sales_manager';
  const currentRep = salesReps.find(rep => rep.id === user?.id);

  // Calculate savings (always $1,500 less than input)
  const calculateSavings = (inputCost) => {
    const cost = parseFloat(inputCost) || 0;
    const savings = Math.max(0, cost - 1500); // Ensure non-negative
    setCalculatedSavings(savings);
  };

  // Handle savings calculator
  const handleSavingsCalculation = () => {
    if (roofCostInput) {
      calculateSavings(roofCostInput);
    }
  };

  // Fetch sales reps from API
  const fetchSalesReps = async () => {
    try {
      const response = await axios.get(`${API}/qr-generator/reps`);
      setSalesReps(response.data);
    } catch (error) {
      console.error('Error fetching sales reps:', error);
      setError('Failed to load sales reps');
    }
  };

  // Fetch leads from API
  const fetchLeads = async () => {
    try {
      const response = await axios.get(`${API}/qr-generator/leads`);
      setLeads(response.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setError('Failed to load leads');
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchSalesReps(), fetchLeads()]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Create new sales rep
  const createSalesRep = async (repData) => {
    try {
      const response = await axios.post(`${API}/qr-generator/reps`, repData);
      setSalesReps([...salesReps, response.data]);
      return response.data;
    } catch (error) {
      console.error('Error creating sales rep:', error);
      throw error;
    }
  };

  // Update sales rep
  const updateSalesRep = async (repId, updateData) => {
    try {
      const response = await axios.put(`${API}/qr-generator/reps/${repId}`, updateData);
      setSalesReps(salesReps.map(rep => rep.id === repId ? response.data : rep));
      return response.data;
    } catch (error) {
      console.error('Error updating sales rep:', error);
      throw error;
    }
  };

  // Upload file for sales rep
  const uploadFile = async (repId, fileData, type) => {
    try {
      const endpoint = type === 'picture' ? 'upload-picture' : 'upload-video';
      await axios.post(`${API}/qr-generator/reps/${repId}/${endpoint}`, fileData);
      // Refresh the sales rep data
      await fetchSalesReps();
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      throw error;
    }
  };

  // Update lead status
  const updateLead = async (leadId, updateData) => {
    try {
      const response = await axios.put(`${API}/qr-generator/leads/${leadId}`, updateData);
      setLeads(leads.map(lead => lead.id === leadId ? response.data : lead));
      return response.data;
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading QR Code Generator...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-red-400 font-medium">Error</div>
        </div>
        <div className="text-red-300 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredReps = salesReps.filter(rep => {
    const matchesSearch = rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rep.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rep.territory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || rep.department === filterDepartment;
    const matchesTerritory = filterTerritory === 'all' || rep.territory === filterTerritory;
    return matchesSearch && matchesDepartment && matchesTerritory;
  });

  const QRCodeSVG = ({ size = 100, value = 'QR123456' }) => {
    const canvasRef = React.useRef(null);
    
    React.useEffect(() => {
      if (canvasRef.current) {
        try {
          // Simple QR code pattern - for production use a proper QR library
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          
          // Clear canvas
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, size, size);
          
          // Draw QR code pattern
          ctx.fillStyle = 'black';
          const cellSize = size / 10;
          
          // Corner squares
          ctx.fillRect(0, 0, cellSize * 3, cellSize * 3);
          ctx.fillRect(cellSize * 7, 0, cellSize * 3, cellSize * 3);
          ctx.fillRect(0, cellSize * 7, cellSize * 3, cellSize * 3);
          
          // Center pattern
          ctx.fillRect(cellSize * 4, cellSize * 4, cellSize * 2, cellSize * 2);
          
          // Random pattern for uniqueness
          const seed = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const random = (seed * 9301 + 49297) % 233280;
          
          for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
              if ((i + j + random) % 3 === 0) {
                ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
              }
            }
          }
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
    }, [size, value]);

    return (
      <div className="bg-white p-2 rounded border border-gray-300" style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          width={size - 16}
          height={size - 16}
          style={{ width: size - 16, height: size - 16 }}
        />
      </div>
    );
  };

  const RepLandingPage = ({ rep, onClose }) => {
    const [submittingLead, setSubmittingLead] = useState(false);
    const [leadSuccess, setLeadSuccess] = useState(false);
    const [leadData, setLeadData] = useState({
      name: '',
      email: '',
      phone: '',
      address: '',
      message: ''
    });

    const handleLeadSubmit = async (e) => {
      e.preventDefault();
      setSubmittingLead(true);
      
      try {
        const response = await axios.post(`${API}/qr-generator/leads`, {
          ...leadData,
          rep_id: rep.id
        });
        setLeadSuccess(true);
        setLeadData({ name: '', email: '', phone: '', address: '', message: '' });
        setTimeout(() => setLeadSuccess(false), 3000);
      } catch (error) {
        console.error('Error submitting lead:', error);
        alert('Error submitting lead. Please try again.');
      } finally {
        setSubmittingLead(false);
      }
    };

    const handleInputChange = (e) => {
      setLeadData({
        ...leadData,
        [e.target.name]: e.target.value
      });
    };

    const handleCTAClick = () => {
      window.open('https://theroofdocs.com', '_blank');
    };

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700">
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Landing Page Preview</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl transition-colors"
            >
              ×
            </button>
          </div>
          
          {/* Mobile-optimized landing page */}
          <div className="p-6 bg-gray-900">
            <div className="max-w-sm mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
              
              {/* Header Section */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full border-3 border-white/30 overflow-hidden bg-white/20">
                      <img 
                        src={rep.picture?.startsWith('data:') ? rep.picture : `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face`}
                        alt={rep.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold">{rep.name}</h1>
                      <p className="text-red-100 text-sm">{rep.territory}</p>
                    </div>
                  </div>
                  <div className="w-20 h-14 bg-black/30 rounded-lg flex items-center justify-center">
                    <div className="text-white/70 text-xs text-center">
                      <div className="w-6 h-6 mx-auto mb-1">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      Video
                    </div>
                  </div>
                </div>
                
                {/* Hero CTA */}
                <div className="text-center">
                  <h2 className="text-lg font-bold mb-2">Get Your FREE Home Inspection Today!</h2>
                  <p className="text-red-100 text-sm mb-4">Professional assessment of your roof, siding, gutters, windows, and doors</p>
                  <button
                    onClick={handleCTAClick}
                    className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors w-full"
                  >
                    Schedule Free Inspection
                  </button>
                </div>
              </div>

              {/* Services Section */}
              <div className="p-6 bg-white">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Our Services</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { title: 'Roofing', desc: 'Complete roof replacement and repairs', icon: '🏠' },
                    { title: 'Siding', desc: 'Vinyl, wood, and fiber cement siding', icon: '🧱' },
                    { title: 'Gutters', desc: 'Seamless gutter installation and repair', icon: '💧' },
                    { title: 'Windows & Doors', desc: 'Energy-efficient windows and door installation', icon: '🪟' },
                    { title: 'Solar', desc: 'Solar panel installation and energy solutions', icon: '☀️' }
                  ].map((service, index) => (
                    <div key={index} className="flex items-start p-2 bg-gray-50 rounded-lg">
                      <div className="text-lg mr-2 flex-shrink-0">{service.icon}</div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm">{service.title}</h4>
                        <p className="text-xs text-gray-600 leading-tight">{service.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Smart Homeowner Benefits */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Homeowner Benefits</h3>
                <p className="text-gray-600 text-sm mb-4">Save thousands, earn rewards, and get complete peace of mind</p>
                
                <div className="bg-white p-4 rounded-lg mb-4">
                  <h4 className="font-bold text-gray-900 mb-2">Massive Savings</h4>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">$15,000</div>
                    <div className="text-sm text-gray-600 mb-2">Average Single-Family Home Roof</div>
                    <div className="text-green-600 font-semibold">Potential Savings: $13,500</div>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowSavingsCalculator(true)}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Calculate Your Savings
                </button>
              </div>

              {/* Local & Trusted */}
              <div className="p-6 bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Local & Trusted</h3>
                <p className="text-gray-600 text-sm mb-4">Your Neighborhood Experts</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">9</div>
                    <div className="text-xs text-gray-600">Years in Business</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">5,000+</div>
                    <div className="text-xs text-gray-600">Projects Completed</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">GAF Master Elite</span>
                    <span className="text-green-600">✓</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Licensed & Insured</span>
                    <span className="text-green-600">✓</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">BBB A+ Rating</span>
                    <span className="text-green-600">✓</span>
                  </div>
                </div>
                
                <button
                  onClick={handleCTAClick}
                  className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-900 transition-colors mt-4"
                >
                  See Local Projects
                </button>
              </div>

              {/* Referral Rewards */}
              <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Referral Rewards Program</h3>
                <p className="text-gray-600 text-sm mb-4">Earn cash and rewards for every friend you refer</p>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div>
                      <span className="font-bold text-lg">1</span>
                      <span className="text-gray-600 ml-2">Referral</span>
                    </div>
                    <div className="text-green-600 font-bold">$100 Cash</div>
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div>
                      <span className="font-bold text-lg">5</span>
                      <span className="text-gray-600 ml-2">Referrals</span>
                    </div>
                    <div className="text-green-600 font-bold">$500 Cash</div>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Exclusive Rewards Include:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Commanders tickets entry</li>
                    <li>• Disney World trip for two</li>
                    <li>• Exclusive rewards program access</li>
                  </ul>
                </div>
                
                <button
                  onClick={handleCTAClick}
                  className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
                >
                  Start Referring Today
                </button>
              </div>

              {/* Complete Project Solution */}
              <div className="p-6 bg-white">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Complete Project Solution</h3>
                <p className="text-gray-600 text-sm mb-4">From tear-off to solar - we handle everything</p>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { step: '1', title: 'Free Inspection', desc: 'Comprehensive roof and property assessment' },
                    { step: '2', title: 'Insurance Coordination', desc: 'We handle all insurance paperwork and claims' },
                    { step: '3', title: 'Professional Tear-Off', desc: 'Safe removal of old materials with cleanup' },
                    { step: '4', title: 'Premium Installation', desc: 'Top-quality materials with expert craftsmanship' },
                    { step: '5', title: 'Solar Integration', desc: 'Optional solar panel installation for energy savings' },
                    { step: '6', title: 'Final Walkthrough', desc: 'Quality check and lifetime warranty activation' }
                  ].map((step, index) => (
                    <div key={index} className="flex flex-col items-start p-2 bg-gray-50 rounded-lg">
                      <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold mb-2 mx-auto">
                        {step.step}
                      </div>
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-900 text-xs leading-tight mb-1">{step.title}</h4>
                        <p className="text-xs text-gray-600 leading-tight">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCTAClick}
                    className="bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors text-sm"
                  >
                    See Our Process
                  </button>
                  <button
                    onClick={handleCTAClick}
                    className="bg-gray-800 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-900 transition-colors text-sm"
                  >
                    Free Inspection
                  </button>
                </div>
              </div>

              {/* Customer Testimonials */}
              <div className="p-6 bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900 mb-4">What Our Customers Say</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Mike Thompson', text: 'The Roof Docs did an amazing job on our roof replacement. Professional team and quality work!' },
                    { name: 'Jennifer Martinez', text: 'Excellent service from start to finish. Our new siding looks fantastic!' },
                    { name: 'Robert Chen', text: 'Outstanding window installation. Energy efficient and beautiful. Highly recommend The Roof Docs!' }
                  ].map((review, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg">
                      <p className="text-gray-600 text-sm italic mb-2">"{review.text}"</p>
                      <div className="font-semibold text-gray-900 text-sm">- {review.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact {rep.name}</h3>
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{rep.phone || 'Contact for phone'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{rep.email}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">About {rep.name}</p>
                  <p className="text-sm text-blue-700 mt-1">{rep.about_me || 'Professional roofing expert dedicated to quality service and customer satisfaction.'}</p>
                </div>
              </div>

              {/* Final CTA Section */}
              <div className="p-6 bg-gradient-to-r from-red-600 to-red-700 text-white">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">Get Your FREE Home Inspection</h3>
                  <p className="text-red-100 text-sm">Professional assessment • No obligation • Quick response</p>
                </div>
                
                {leadSuccess ? (
                  <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-6 rounded-lg text-center">
                    <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">Thank you for your request!</p>
                    <p className="text-sm">We'll contact you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleLeadSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <input
                        type="text"
                        name="name"
                        placeholder="Your Name *"
                        value={leadData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-red-700/30 border border-red-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-white placeholder-red-200"
                      />
                      <input
                        type="email"
                        name="email"
                        placeholder="Your Email *"
                        value={leadData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-red-700/30 border border-red-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-white placeholder-red-200"
                      />
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Your Phone"
                        value={leadData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-red-700/30 border border-red-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-white placeholder-red-200"
                      />
                      <input
                        type="text"
                        name="address"
                        placeholder="Property Address"
                        value={leadData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-red-700/30 border border-red-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-white placeholder-red-200"
                      />
                      <textarea
                        name="message"
                        placeholder="Tell us about your roofing needs..."
                        rows="3"
                        value={leadData.message}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-red-700/30 border border-red-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-white placeholder-red-200 resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingLead}
                      className="w-full bg-white text-red-600 py-4 px-6 rounded-lg hover:bg-red-50 transition-all duration-200 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {submittingLead ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        'Schedule Your FREE Inspection'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCTAClick}
                      className="w-full bg-red-800 text-white py-3 px-6 rounded-lg hover:bg-red-900 transition-all duration-200 font-semibold"
                    >
                      Visit Our Website
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const OverviewTab = () => {
    const totalConversions = leads.filter(lead => lead.status === 'converted').length;
    const totalLeads = leads.length;
    const conversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : 0;
    const activeLeads = leads.filter(lead => lead.status === 'new' || lead.status === 'contacted').length;
    const monthlyLeads = leads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      const currentDate = new Date();
      return leadDate.getMonth() === currentDate.getMonth() && leadDate.getFullYear() === currentDate.getFullYear();
    }).length;
    
    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-500/20 text-red-400 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{salesReps.length}</p>
                <p className="text-sm text-gray-400">Total Reps</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-500/20 text-blue-400 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalLeads}</p>
                <p className="text-sm text-gray-400">Total Leads</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-500/20 text-green-400 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{salesReps.filter(r => r.qr_code).length}</p>
                <p className="text-sm text-gray-400">QR Codes</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-400 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{conversionRate}%</p>
                <p className="text-sm text-gray-400">Conversion Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">Sales Representatives</h2>
            <p className="text-gray-400">Manage QR codes and landing pages</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search reps by name, email, or territory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white"
            >
              <option value="all">All Departments</option>
              <option value="Sales">Sales</option>
              <option value="Management">Management</option>
            </select>
            <select
              value={filterTerritory}
              onChange={(e) => setFilterTerritory(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white"
            >
              <option value="all">All Territories</option>
              <option value="Northern Virginia">Northern Virginia</option>
              <option value="Southern Virginia">Southern Virginia</option>
              <option value="Maryland">Maryland</option>
            </select>
          </div>

          {/* Reps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReps.map((rep) => {
              const repLeads = leads.filter(lead => lead.rep_id === rep.id);
              const repConversions = repLeads.filter(lead => lead.status === 'converted');
              const repConversionRate = repLeads.length > 0 ? ((repConversions.length / repLeads.length) * 100).toFixed(1) : 0;
              
              return (
                <div key={rep.id} className="bg-gray-750 border border-gray-600 rounded-lg p-6 hover:border-red-500 transition-all duration-200 transform hover:scale-105">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center border-2 border-red-400">
                      <img 
                        src={rep.picture?.startsWith('data:') ? rep.picture : `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face`}
                        alt={rep.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{rep.name}</h3>
                      <p className="text-sm text-gray-400">{rep.territory}</p>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                          {rep.department}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <QRCodeSVG size={50} value={rep.qr_code || 'QR123456'} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{repLeads.length}</div>
                      <div className="text-xs text-gray-400">Leads</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{repConversions.length}</div>
                      <div className="text-xs text-gray-400">Conversions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{repConversionRate}%</div>
                      <div className="text-xs text-gray-400">Rate</div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedRep(rep)}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      View Page
                    </button>
                    {isAdmin && (
                      <button className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium">
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const LeadsTab = () => {
    const [leadFilters, setLeadFilters] = useState({
      status: 'all',
      priority: 'all',
      rep: 'all',
      dateRange: 'all'
    });
    
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [searchQuery, setSearchQuery] = useState('');

    const handleLeadStatusChange = async (leadId, newStatus) => {
      try {
        await updateLead(leadId, { status: newStatus });
      } catch (error) {
        console.error('Error updating lead status:', error);
      }
    };

    const handleLeadAssign = async (leadId, assignedTo) => {
      try {
        await updateLead(leadId, { assigned_to: assignedTo, status: 'assigned' });
      } catch (error) {
        console.error('Error assigning lead:', error);
      }
    };

    const handleBulkStatusUpdate = async (leadIds, newStatus) => {
      try {
        await Promise.all(leadIds.map(id => updateLead(id, { status: newStatus })));
      } catch (error) {
        console.error('Error updating bulk lead status:', error);
      }
    };

    // Filter and sort leads
    const filteredLeads = leads.filter(lead => {
      const matchesSearch = searchQuery === '' || 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery);
      
      const matchesStatus = leadFilters.status === 'all' || lead.status === leadFilters.status;
      const matchesPriority = leadFilters.priority === 'all' || lead.priority === leadFilters.priority;
      const matchesRep = leadFilters.rep === 'all' || lead.rep_id === leadFilters.rep;
      
      const matchesDateRange = leadFilters.dateRange === 'all' || (() => {
        const leadDate = new Date(lead.created_at);
        const now = new Date();
        switch (leadFilters.dateRange) {
          case 'today':
            return leadDate.toDateString() === now.toDateString();
          case 'week':
            return leadDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          case 'month':
            return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      })();

      return matchesSearch && matchesStatus && matchesPriority && matchesRep && matchesDateRange;
    }).sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      const modifier = sortOrder === 'desc' ? -1 : 1;
      return aValue > bValue ? modifier : -modifier;
    });

    const statusCounts = {
      all: leads.length,
      new: leads.filter(l => l.status === 'new').length,
      assigned: leads.filter(l => l.status === 'assigned').length,
      contacted: leads.filter(l => l.status === 'contacted').length,
      converted: leads.filter(l => l.status === 'converted').length,
      lost: leads.filter(l => l.status === 'lost').length
    };

    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Lead Management</h2>
            <p className="text-gray-400">Track and distribute leads from QR code landing pages</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rep</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{lead.name}</div>
                        <div className="text-sm text-gray-400">{lead.email}</div>
                        <div className="text-sm text-gray-400">{lead.phone}</div>
                        {lead.message && (
                          <div className="text-sm text-gray-400 mt-1 italic max-w-xs truncate">"{lead.message}"</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{lead.rep_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={lead.status}
                        onChange={(e) => handleLeadStatusChange(lead.id, e.target.value)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full border-0 ${
                          lead.status === 'new' ? 'bg-blue-500/20 text-blue-400' :
                          lead.status === 'assigned' ? 'bg-yellow-500/20 text-yellow-400' :
                          lead.status === 'contacted' ? 'bg-green-500/20 text-green-400' :
                          lead.status === 'converted' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        <option value="new">New</option>
                        <option value="assigned">Assigned</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        lead.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        lead.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {isAdmin && (
                          <button 
                            onClick={() => handleLeadAssign(lead.id, lead.rep_id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Assign
                          </button>
                        )}
                        <button className="text-gray-400 hover:text-gray-300 transition-colors">View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const MyPageTab = () => {
    const [uploading, setUploading] = useState(false);
    const [uploadType, setUploadType] = useState('');

    const handleFileUpload = async (e, type) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploading(true);
      setUploadType(type);

      try {
        // Convert file to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result;
          
          const fileData = {
            file_data: base64String,
            file_type: file.type,
            file_name: file.name
          };

          await uploadFile(currentRep.id, fileData, type);
          
          setUploading(false);
          setUploadType('');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploading(false);
        setUploadType('');
        alert('Error uploading file. Please try again.');
      }
    };

    const handleUpdateProfile = async (updateData) => {
      try {
        await updateSalesRep(currentRep.id, updateData);
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile. Please try again.');
      }
    };

    if (!currentRep) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800 font-medium">Sales Rep Profile Not Found</div>
          <div className="text-yellow-600 mt-1">Please contact your administrator to set up your profile.</div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Profile Management */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Manage Your Profile</h2>
            <div className="flex space-x-2">
              <label className="cursor-pointer bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors text-sm">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'picture')}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading && uploadType === 'picture' ? 'Uploading...' : 'Upload Photo'}
              </label>
              <label className="cursor-pointer bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors text-sm">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e, 'video')}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading && uploadType === 'video' ? 'Uploading...' : 'Upload Video'}
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">About Me</label>
                <textarea
                  value={currentRep.about_me || ''}
                  onChange={(e) => handleUpdateProfile({ about_me: e.target.value })}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Tell customers about yourself..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={currentRep.phone || ''}
                  onChange={(e) => handleUpdateProfile({ phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Your phone number"
                />
              </div>
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-2">QR Code</h3>
                <div className="flex items-center space-x-4">
                  <QRCodeSVG size={80} value={currentRep.qr_code || 'QR123456'} />
                  <div>
                    <p className="text-sm text-gray-600">Your QR Code</p>
                    <p className="text-xs text-gray-500 font-mono">{currentRep.qr_code}</p>
                    <p className="text-xs text-gray-500 mt-1">Share this code with customers</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Landing Page Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Landing Page Preview</h3>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-red-600 text-white p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <img 
                        src={currentRep.picture?.startsWith('data:') ? currentRep.picture : `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face`}
                        alt={currentRep.name}
                        className="w-12 h-12 rounded-full border-2 border-white object-cover"
                      />
                      <div>
                        <h1 className="text-lg font-bold">{currentRep.name}</h1>
                        <p className="text-red-100 text-sm">{currentRep.territory}</p>
                      </div>
                    </div>
                    <div className="w-16 h-12 bg-black rounded text-xs flex items-center justify-center">
                      {currentRep.welcome_video ? 'Video' : 'Upload Video'}
                    </div>
                  </div>
                </div>

                {/* About Me */}
                <div className="p-3">
                  <h2 className="text-md font-semibold text-gray-900 mb-2">About Me</h2>
                  <p className="text-sm text-gray-600 mb-3">{currentRep.about_me || 'Add your bio to tell customers about yourself...'}</p>
                  
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-red-600 mr-2">📞</span>
                      {currentRep.phone || 'Add phone number'}
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-red-600 mr-2">✉️</span>
                      {currentRep.email}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="p-3 bg-gray-50 border-t">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Get Your Free Roof Estimate</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Your Name"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled
                    />
                    <button className="w-full bg-red-600 text-white py-2 px-3 rounded text-sm font-semibold">
                      Get My Free Estimate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Enhanced Header */}
      <motion.div 
        className="roof-er-gradient border-b border-red-800/20 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mobile-container">
          <div className="flex justify-between items-center py-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">QR Code Generator</h2>
                  <p className="text-white/70 text-sm">Personalized landing pages & lead capture</p>
                </div>
              </div>
            </motion.div>
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {isAdmin && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-white/10 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span className="text-white text-sm font-medium">Admin View</span>
                </div>
              )}
              {user?.role === 'sales_rep' && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-blue-300 text-sm font-medium">Sales Rep</span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Content Area */}
      <div className="mobile-container py-8">
        <div className="space-y-8">
          {/* Enhanced Tab Navigation */}
          <motion.div 
            className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="border-b border-gray-700">
              <nav className="flex space-x-1 px-6 py-4">
                {[
                  { 
                    id: 'overview', 
                    name: isAdmin ? 'Rep Overview' : 'Overview', 
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )
                  },
                  ...(isAdmin ? [{
                    id: 'leads',
                    name: 'Lead Management',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                      </svg>
                    )
                  }] : []),
                  ...(user?.role === 'sales_rep' ? [{
                    id: 'mypage',
                    name: 'My Landing Page',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )
                  }] : [])
                ].map((tab, index) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {tab.icon}
                    <span>{tab.name}</span>
                  </motion.button>
                ))}
              </nav>
            </div>
          </motion.div>

          {/* Tab Content with Animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'leads' && <LeadsTab />}
              {activeTab === 'mypage' && <MyPageTab />}
            </motion.div>
          </AnimatePresence>

          {/* Rep Landing Page Preview Modal */}
          <AnimatePresence>
            {selectedRep && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <RepLandingPage 
                  rep={selectedRep} 
                  onClose={() => setSelectedRep(null)} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Savings Calculator Bubble Modal */}
      {showSavingsCalculator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-md w-full"
          >
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                💰 Calculate Your Roof Savings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What do you think your roof will cost?
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={roofCostInput}
                      onChange={(e) => {
                        setRoofCostInput(e.target.value);
                        if (e.target.value) {
                          calculateSavings(e.target.value);
                        }
                      }}
                      placeholder="Enter estimated cost"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    />
                  </div>
                </div>
                
                {calculatedSavings > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 border border-green-200 rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-green-800 mb-2">
                      🎉 Great News!
                    </h4>
                    <p className="text-green-700 mb-2">
                      With our expert roofing services, you could save:
                    </p>
                    <div className="text-3xl font-bold text-green-600">
                      ${calculatedSavings.toLocaleString()}
                    </div>
                    <p className="text-sm text-green-600 mt-2">
                      That's $1,500 less than your estimate!
                    </p>
                  </motion.div>
                )}
                
                {calculatedSavings === 0 && roofCostInput && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-700">
                      Please enter an amount over $1,500 to see your potential savings.
                    </p>
                  </div>
                )}
                
                <div className="space-y-3 mt-6">
                  <button
                    onClick={() => {
                      // Trigger contact form or lead capture
                      setShowSavingsCalculator(false);
                      // You can add logic here to show contact form
                    }}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Get My Free Inspection
                  </button>
                  
                  <button
                    onClick={() => setShowSavingsCalculator(false)}
                    className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                * Savings estimate based on our competitive pricing and quality materials
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Candidate Modal Component

// Candidate Modal Component

// Candidate Modal Component

// Main App Component
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {user ? <AppHub /> : <Login />}
    </div>
  );
}

// Candidate Modal Component
const CandidateModal = ({ isOpen, onClose, candidate, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    hiring_type: 'insurance',
    notes: ''
  });

  useEffect(() => {
    if (candidate) {
      setFormData(candidate);
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        position: '',
        hiring_type: 'insurance',
        notes: ''
      });
    }
  }, [candidate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {candidate ? 'Edit Candidate' : 'Add New Candidate'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hiring Type</label>
            <select
              value={formData.hiring_type}
              onChange={(e) => setFormData({...formData, hiring_type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            >
              <option value="insurance">🛡️ Insurance</option>
              <option value="retail">🛒 Retail</option>
              <option value="office">💼 Office</option>
              <option value="production">🏭 Production</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Additional notes about the candidate..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md hover:from-red-700 hover:to-red-800 transition-all duration-200 transform hover:scale-105"
            >
              {candidate ? 'Update' : 'Add'} Candidate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;