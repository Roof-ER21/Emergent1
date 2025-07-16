import React, { useState, useEffect, createContext, useContext } from 'react';
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

  const login = async (sessionId) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { session_id: sessionId });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(user);
      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const loginDev = async (role = 'super_admin') => {
    // Development login bypass
    const devUser = {
      id: 'dev-user-123',
      email: 'admin@theroofdocs.com',
      name: 'Admin User',
      role: role,
      picture: null
    };
    
    // Create a mock token for development
    const mockToken = 'dev-token-' + Date.now();
    localStorage.setItem('token', mockToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
    setUser(devUser);
    return devUser;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, loginDev, logout, loading }}>
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
  const { login, loginDev } = useAuth();
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    const redirectUrl = encodeURIComponent(window.location.origin + '/auth/callback');
    window.location.href = `https://auth.emergentagent.com/?redirect=${redirectUrl}`;
  };

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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 border-2 border-red-600">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-600 mb-2">Roof-HR</h1>
          <p className="text-gray-600">Enterprise HR Management System</p>
        </div>
        
        {!devMode ? (
          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Redirecting...' : 'Login with Google'}
            </button>
            
            <button
              onClick={() => setDevMode(true)}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Development Login
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Select Role:</h3>
            
            <button
              onClick={() => handleDevLogin('super_admin')}
              disabled={loading}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Super Admin
            </button>
            
            <button
              onClick={() => handleDevLogin('hr_manager')}
              disabled={loading}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              HR Manager
            </button>
            
            <button
              onClick={() => handleDevLogin('sales_manager')}
              disabled={loading}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Sales Manager
            </button>
            
            <button
              onClick={() => handleDevLogin('sales_rep')}
              disabled={loading}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Sales Rep
            </button>
            
            <button
              onClick={() => setDevMode(false)}
              className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Back
            </button>
          </div>
        )}
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Secure authentication powered by Emergent</p>
        </div>
      </div>
    </div>
  );
};

// Dashboard Layout
const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'employees', name: 'Employees', icon: '👥' },
    { id: 'jobs', name: 'Jobs', icon: '🔨' },
    { id: 'commissions', name: 'Commissions', icon: '💰' },
  ];

  const getRoleDisplay = (role) => {
    const roleMap = {
      'super_admin': 'Super Admin',
      'hr_manager': 'HR Manager',
      'sales_manager': 'Sales Manager',
      'project_manager': 'Project Manager',
      'sales_rep': 'Sales Rep',
      'field_worker': 'Field Worker',
      'employee': 'Employee'
    };
    return roleMap[role] || role;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-red-600">Roof-HR</h1>
              <span className="ml-3 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                {getRoleDisplay(user?.role)}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user?.picture && (
                  <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-full" />
                )}
                <span className="text-gray-700">{user?.name}</span>
              </div>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-red-600 px-3 py-1 rounded-md text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar */}
          <nav className="w-64 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center px-3 py-2 text-left rounded-md transition-colors ${
                      activeTab === item.id
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {React.cloneElement(children, { activeTab, setActiveTab })}
          </main>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState({
    total_jobs: 25,
    completed_jobs: 18,
    total_commission: 15420.50,
    completion_rate: 72.0,
    total_employees: 12,
    total_commissions: 8
  });
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {user?.name}!</h2>
        <p className="text-gray-600">Here's what's happening in your workspace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user?.role === 'sales_rep' ? (
          <>
            <div className="bg-red-50 rounded-lg p-6 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Total Jobs</p>
                  <p className="text-2xl font-bold text-red-900">{analytics?.total_jobs || 0}</p>
                </div>
                <div className="text-red-400 text-2xl">🔨</div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Completed Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.completed_jobs || 0}</p>
                </div>
                <div className="text-gray-400 text-2xl">✅</div>
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-6 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Total Commission</p>
                  <p className="text-2xl font-bold text-red-900">${analytics?.total_commission?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="text-red-400 text-2xl">💰</div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.completion_rate?.toFixed(1) || '0.0'}%</p>
                </div>
                <div className="text-gray-400 text-2xl">📈</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-red-50 rounded-lg p-6 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Total Employees</p>
                  <p className="text-2xl font-bold text-red-900">{analytics?.total_employees || 0}</p>
                </div>
                <div className="text-red-400 text-2xl">👥</div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.total_jobs || 0}</p>
                </div>
                <div className="text-gray-400 text-2xl">🔨</div>
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-6 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Completed Jobs</p>
                  <p className="text-2xl font-bold text-red-900">{analytics?.completed_jobs || 0}</p>
                </div>
                <div className="text-red-400 text-2xl">✅</div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Commissions</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.total_commissions || 0}</p>
                </div>
                <div className="text-gray-400 text-2xl">💰</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Employees Component
const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([
    { id: '1', name: 'John Smith', email: 'john.smith@theroofdocs.com', role: 'sales_rep', territory: 'North VA', commission_rate: 0.05, is_active: true },
    { id: '2', name: 'Sarah Johnson', email: 'sarah.johnson@theroofdocs.com', role: 'sales_rep', territory: 'South VA', commission_rate: 0.05, is_active: true },
    { id: '3', name: 'Mike Wilson', email: 'mike.wilson@theroofdocs.com', role: 'project_manager', territory: 'MD', commission_rate: 0.03, is_active: true },
    { id: '4', name: 'Lisa Davis', email: 'lisa.davis@theroofdocs.com', role: 'field_worker', territory: 'PA', commission_rate: 0.02, is_active: true },
    { id: '5', name: 'Ahmed Mahmoud', email: 'ahmed.mahmoud@theroofdocs.com', role: 'super_admin', territory: 'All', commission_rate: 0.10, is_active: true }
  ]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    // Simulate import
    setTimeout(() => {
      setImporting(false);
      alert('Employees imported successfully!');
    }, 2000);
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      'super_admin': 'Super Admin',
      'hr_manager': 'HR Manager',
      'sales_manager': 'Sales Manager',
      'project_manager': 'Project Manager',
      'sales_rep': 'Sales Rep',
      'field_worker': 'Field Worker',
      'employee': 'Employee'
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const colorMap = {
      'super_admin': 'bg-red-100 text-red-800',
      'hr_manager': 'bg-gray-100 text-gray-800',
      'sales_manager': 'bg-red-100 text-red-800',
      'project_manager': 'bg-gray-100 text-gray-800',
      'sales_rep': 'bg-red-100 text-red-800',
      'field_worker': 'bg-gray-100 text-gray-800',
      'employee': 'bg-gray-100 text-gray-800'
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Employee Management</h2>
            <p className="text-gray-600">Manage your team members and their roles</p>
          </div>
          {(user?.role === 'super_admin' || user?.role === 'hr_manager') && (
            <div className="flex space-x-3">
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {importing ? 'Importing...' : 'Import from Sheets'}
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Add Employee
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Territory
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Commission Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-red-600 font-medium">
                          {employee.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{employee.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(employee.role)}`}>
                    {getRoleDisplay(employee.role)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{employee.territory || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{(employee.commission_rate * 100).toFixed(1)}%</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    employee.is_active ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {employee.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {employees.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">👥</div>
          <p className="text-gray-500">No employees found. Click "Import from Sheets" to get started.</p>
        </div>
      )}
    </div>
  );
};

// Jobs Component
const Jobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([
    { id: '1', title: 'Roof Repair - Main Street', description: 'Complete roof repair', customer_name: 'Alice Johnson', customer_email: 'alice@email.com', status: 'lead', value: 5000, assigned_rep_id: '1' },
    { id: '2', title: 'New Roof Installation', description: 'Full roof replacement', customer_name: 'Bob Smith', customer_email: 'bob@email.com', status: 'in_progress', value: 12000, assigned_rep_id: '2' },
    { id: '3', title: 'Roof Inspection', description: 'Annual inspection', customer_name: 'Carol Davis', customer_email: 'carol@email.com', status: 'completed', value: 800, assigned_rep_id: '1' },
  ]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [employees] = useState([
    { id: '1', name: 'John Smith', role: 'sales_rep' },
    { id: '2', name: 'Sarah Johnson', role: 'sales_rep' },
  ]);

  const updateJobStatus = (jobId, newStatus) => {
    setJobs(jobs.map(job => 
      job.id === jobId ? { ...job, status: newStatus } : job
    ));
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'lead': 'bg-gray-100 text-gray-800',
      'scheduled': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-red-100 text-red-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      'lead': 'Lead',
      'scheduled': 'Scheduled',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  };

  const AddJobForm = () => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_address: '',
      assigned_rep_id: '',
      value: 0
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      const newJob = {
        id: Date.now().toString(),
        ...formData,
        status: 'lead'
      };
      setJobs([...jobs, newJob]);
      setShowAddForm(false);
      setFormData({
        title: '',
        description: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_address: '',
        assigned_rep_id: '',
        value: 0
      });
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Add New Job</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Rep</label>
              <select
                value={formData.assigned_rep_id}
                onChange={(e) => setFormData({...formData, assigned_rep_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select Rep</option>
                {employees.filter(emp => emp.role === 'sales_rep').map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Value ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Add Job
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Job Management</h2>
            <p className="text-gray-600">Track and manage roofing jobs</p>
          </div>
          {(user?.role !== 'field_worker') && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Add Job
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Rep
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map((job) => {
              const assignedRep = employees.find(emp => emp.id === job.assigned_rep_id);
              return (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{job.title}</div>
                    <div className="text-sm text-gray-500">{job.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{job.customer_name}</div>
                    <div className="text-sm text-gray-500">{job.customer_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{assignedRep?.name || 'Unassigned'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${job.value.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                      {getStatusDisplay(job.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <select
                      value={job.status}
                      onChange={(e) => updateJobStatus(job.id, e.target.value)}
                      className="text-sm border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="lead">Lead</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">🔨</div>
          <p className="text-gray-500">No jobs found. Click "Add Job" to create your first job.</p>
        </div>
      )}

      {showAddForm && <AddJobForm />}
    </div>
  );
};

// Commissions Component
const Commissions = () => {
  const { user } = useAuth();
  const [commissions] = useState([
    { id: '1', employee_id: '1', job_id: '1', amount: 250.00, rate: 0.05, status: 'pending', created_at: '2025-01-15T10:00:00Z' },
    { id: '2', employee_id: '2', job_id: '2', amount: 600.00, rate: 0.05, status: 'paid', created_at: '2025-01-14T14:30:00Z' },
    { id: '3', employee_id: '1', job_id: '3', amount: 40.00, rate: 0.05, status: 'paid', created_at: '2025-01-13T16:45:00Z' },
  ]);
  const [loading, setLoading] = useState(false);
  const [employees] = useState([
    { id: '1', name: 'John Smith', email: 'john.smith@theroofdocs.com' },
    { id: '2', name: 'Sarah Johnson', email: 'sarah.johnson@theroofdocs.com' },
  ]);

  const getStatusColor = (status) => {
    const colorMap = {
      'pending': 'bg-gray-100 text-gray-800',
      'paid': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getTotalCommissions = () => {
    return commissions.reduce((total, comm) => total + comm.amount, 0);
  };

  const getPaidCommissions = () => {
    return commissions.filter(comm => comm.status === 'paid').reduce((total, comm) => total + comm.amount, 0);
  };

  const getPendingCommissions = () => {
    return commissions.filter(comm => comm.status === 'pending').reduce((total, comm) => total + comm.amount, 0);
  };

  return (
    <div className="space-y-6">
      {/* Commission Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Commissions</p>
              <p className="text-2xl font-bold text-gray-900">${getTotalCommissions().toFixed(2)}</p>
            </div>
            <div className="text-red-400 text-2xl">💰</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid Commissions</p>
              <p className="text-2xl font-bold text-gray-600">${getPaidCommissions().toFixed(2)}</p>
            </div>
            <div className="text-gray-400 text-2xl">✅</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Commissions</p>
              <p className="text-2xl font-bold text-red-600">${getPendingCommissions().toFixed(2)}</p>
            </div>
            <div className="text-red-400 text-2xl">⏳</div>
          </div>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Commission History</h2>
          <p className="text-gray-600">Track commission earnings and payments</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commissions.map((commission) => {
                const employee = employees.find(emp => emp.id === commission.employee_id);
                return (
                  <tr key={commission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <span className="text-red-600 font-medium">
                              {employee?.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{employee?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{employee?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{commission.job_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{(commission.rate * 100).toFixed(1)}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">${commission.amount.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(commission.status)}`}>
                        {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(commission.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {commissions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">💰</div>
            <p className="text-gray-500">No commissions found. Complete some jobs to start earning commissions!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
const MainApp = ({ activeTab, setActiveTab }) => {
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'employees':
        return <Employees />;
      case 'jobs':
        return <Jobs />;
      case 'commissions':
        return <Commissions />;
      default:
        return <Dashboard />;
    }
  };

  return renderContent();
};

// Auth Callback Component
const AuthCallback = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');
        
        if (sessionId) {
          await login(sessionId);
          window.location.href = '/';
        } else {
          throw new Error('No session ID found');
        }
      } catch (error) {
        console.error('Auth callback failed:', error);
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [login]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  return null;
};

// Main App
function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  return (
    <AuthProvider>
      <div className="App">
        <AppContent currentPath={currentPath} />
      </div>
    </AuthProvider>
  );
}

const AppContent = ({ currentPath }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentPath === '/auth/callback') {
    return <AuthCallback />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <DashboardLayout>
      <MainApp />
    </DashboardLayout>
  );
};

export default App;