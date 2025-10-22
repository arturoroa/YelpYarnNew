import React, { useState, useEffect } from 'react';
import { Play, Square, Users, Code, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Clock, User, LogOut, Trash, Copy, Upload, Wand2, UserPlus } from 'lucide-react';
import { apiGet, apiPost } from '../utils/api';

interface GuvUser {
  guv: string;
  username: string;
  email: string;
  yelpUserId?: string;
  status: 'active' | 'inactive' | 'pending';
  sessionCount: number;
  lastUsed?: string;
  createdAt: string;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'basic' | 'advanced';
  expectedBehavior: string;
  filterName?: string;
  estimatedDuration: number;
}

interface TestResult {
  id: string;
  sessionId: string;
  scenario: string;
  action: string;
  success: boolean;
  details: string;
  timestamp: string;
  clickRecorded?: boolean;
  filterTriggered?: boolean;
}

interface TestSession {
  sessionId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  selectedTests: string[];
  results: TestResult[];
  guv: string;
}

interface UserSession {
  id: string;
  guv: string;
  username: string;
  startTime: string;
  ipAddress: string;
  endTime?: string;
  active: boolean;
}

const TEST_SCENARIOS: TestScenario[] = [
  // Core Tests
  {
    id: 'session_filter_1111',
    name: 'Session Filter 1:1:1:1 Rule',
    description: 'Tests rapid re-click filtering with timing rules',
    category: 'core',
    expectedBehavior: 'Initial click billable, rapid re-click within 5min filtered, 1hr+ delay billable',
    filterName: 'MoreThanOneClickPerYuvPerBizPerHourFilter',
    estimatedDuration: 8
  },
  // Basic Tests
  {
    id: 'fast_click_rate',
    name: 'Fast Click Rate Test',
    description: 'Detects >7 clicks per second automated behavior',
    category: 'basic',
    expectedBehavior: 'Clicks faster than 7/second should be filtered',
    filterName: 'FastClickRateFilter',
    estimatedDuration: 3
  },
  {
    id: 'no_js_clicks',
    name: 'No-JS Clicks Test',
    description: 'Detects JavaScript-disabled headless browsers',
    category: 'basic',
    expectedBehavior: 'Clicks without JS execution should be filtered',
    filterName: 'NoJSClicksFilter',
    estimatedDuration: 4
  },
  {
    id: 'excessive_business_views',
    name: 'Excessive Business Views',
    description: 'Detects 25+ rapid page views of same business',
    category: 'basic',
    expectedBehavior: 'More than 25 views in short time should be filtered',
    filterName: 'ExcessiveBusinessViewsFilter',
    estimatedDuration: 6
  },
  {
    id: 'invalid_android_version',
    name: 'Invalid Android Version',
    description: 'Filters future or negative Android versions',
    category: 'basic',
    expectedBehavior: 'Invalid Android versions should be filtered',
    filterName: 'InvalidAndroidVersionFilter',
    estimatedDuration: 2
  },
  {
    id: 'internal_ip_spoofing',
    name: 'Internal IP Spoofing',
    description: 'Detects internal Yelp IP range spoofing',
    category: 'basic',
    expectedBehavior: 'Internal IP ranges should be filtered',
    filterName: 'InternalIPSpoofingFilter',
    estimatedDuration: 3
  },
  {
    id: 'mobile_app_clicks',
    name: 'Mobile App Clicks',
    description: 'Tests legitimate mobile app interactions',
    category: 'basic',
    expectedBehavior: 'Valid mobile app clicks should be billable',
    filterName: 'MobileAppClicksFilter',
    estimatedDuration: 5
  },
  {
    id: 'high_volume_search',
    name: 'High Volume Search',
    description: 'Tests 50+ rapid searches with GQL calls',
    category: 'basic',
    expectedBehavior: 'Excessive search volume should be filtered',
    filterName: 'HighVolumeSearchFilter',
    estimatedDuration: 7
  },
  // Advanced Tests
  {
    id: 'session_pollution',
    name: 'Session Pollution',
    description: 'Tests mixed valid/invalid behavior contamination',
    category: 'advanced',
    expectedBehavior: 'Invalid behavior should contaminate entire session',
    filterName: 'SessionPollutionFilter',
    estimatedDuration: 10
  },
  {
    id: 'click_storms',
    name: 'Click Storms',
    description: 'Tests burst views with dwell time analysis',
    category: 'advanced',
    expectedBehavior: 'Burst clicks with low dwell time should be filtered',
    filterName: 'ClickStormsFilter',
    estimatedDuration: 8
  },
  {
    id: 'geo_located_proxies',
    name: 'Geo-Located Proxies',
    description: 'Tests excluded countries filtering',
    category: 'advanced',
    expectedBehavior: 'Clicks from excluded countries should be filtered',
    filterName: 'GeoLocatedProxiesFilter',
    estimatedDuration: 5
  },
  {
    id: 'ui_only_interaction',
    name: 'UI-Only Interaction',
    description: 'Tests screen readers and synthetic events',
    category: 'advanced',
    expectedBehavior: 'Synthetic UI events should be filtered',
    filterName: 'UIOnlyInteractionFilter',
    estimatedDuration: 6
  },
  {
    id: 'latency_manipulation',
    name: 'Latency Manipulation',
    description: 'Tests poor connection simulation',
    category: 'advanced',
    expectedBehavior: 'Artificially slow connections should be filtered',
    filterName: 'LatencyManipulationFilter',
    estimatedDuration: 4
  }
];

const TestRunner: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<GuvUser | null>(null);
  const [users, setUsers] = useState<GuvUser[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [customPuppeteerCode, setCustomPuppeteerCode] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [loading, setLoading] = useState(false);

  // New user form state
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [userCreationMode, setUserCreationMode] = useState<'choice' | 'manual' | 'automated'>('choice');
  const [userCreationStatus, setUserCreationStatus] = useState<{
    loading: boolean;
    error: string | null;
    success: boolean;
  }>({
    loading: false,
    error: null,
    success: false
  });
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  // Añade este estado junto a los demás estados
  const [currentUserSession, setCurrentUserSession] = useState<UserSession | null>(null);
  const [puppeteerCode, setPuppeteerCode] = useState<string>('');
  const [running, setRunning] = useState<boolean>(false);
  const [output, setOutput] = useState<string>('');
  // Nuevo estado para la opción headless
  const [isHeadless, setIsHeadless] = useState<boolean>(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('selectedUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setSelectedUser(parsedUser);
        console.log('User loaded from localStorage:', parsedUser.username);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('selectedUser');
      }
    }
  }, []);

  const loadUsers = async () => {
    try {
      const response = await apiGet<any[]>('/api/users?type=TestUser');
      console.log('TestUsers loaded:', response);

      if (Array.isArray(response) && response.length > 0) {
        const mappedUsers: GuvUser[] = response.map(user => ({
          guv: user.id,
          username: user.username,
          email: user.email || '',
          yelpUserId: user.id,
          status: 'active' as 'active',
          sessionCount: 0,
          createdAt: user.creation_time
        }));
        setUsers(mappedUsers);
        return true;
      } else {
        console.log('No TestUsers found in database');

        const demoUsers: GuvUser[] = [
          {
            guv: 'demo-guv-1',
            username: 'testuser',
            email: 'test@example.com',
            status: 'active' as 'active',
            sessionCount: 0,
            createdAt: new Date().toISOString()
          },
          {
            guv: 'demo-guv-2',
            username: 'john_doe',
            email: 'john@example.com',
            status: 'active' as 'active',
            sessionCount: 0,
            createdAt: new Date().toISOString()
          }
        ];
        
        setUsers(demoUsers);
        return true;
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      
      // Usar datos de demostración en caso de error
      const demoUsers: GuvUser[] = [
        {
          guv: 'demo-guv-1',
          username: 'demouser1',
          email: 'demo1@example.com',
          status: 'active' as 'active',
          sessionCount: 2,
          createdAt: new Date().toISOString()
        }
      ];
      
      setUsers(demoUsers);
      return true;
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password || !newUser.confirmPassword) {
      setUserCreationStatus({
        loading: false,
        error: 'All fields are required',
        success: false
      });
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      setUserCreationStatus({
        loading: false,
        error: 'Password and Confirm Password don\'t match',
        success: false
      });
      return;
    }

    setUserCreationStatus({ loading: true, error: null, success: false });

    try {
      const existingUser = await apiGet<GuvUser>(`/api/users/check/${newUser.username}`);
      if (existingUser) {
        setUserCreationStatus({
          loading: false,
          error: 'Username already exists',
          success: false
        });
        return;
      }

      const userData = {
        username: newUser.username,
        password: newUser.password,
        email: newUser.email,
        type_of_user: 'TestUser',
        created_by: 'system'
      };

      const createdDbUser = await apiPost<any>('/api/users', userData);

      const mappedUser: GuvUser = {
        guv: createdDbUser.id,
        username: createdDbUser.username,
        email: createdDbUser.email || '',
        yelpUserId: createdDbUser.id,
        status: 'active',
        sessionCount: 0,
        createdAt: createdDbUser.creation_time
      };

      setUsers(prev => [...prev, mappedUser]);
      setSelectedUser(mappedUser);
      localStorage.setItem('selectedUser', JSON.stringify(mappedUser));
      setUserCreationStatus({ loading: false, error: null, success: true });
      setShowUserModal(false);
      setUserCreationMode('choice');
      setNewUser({ username: '', email: '', password: '', confirmPassword: '' });
    } catch (error) {
      setUserCreationStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
        success: false
      });
    }
  };

  const createAutomatedUser = async () => {
    setUserCreationStatus({ loading: true, error: null, success: false });

    try {
      const response = await fetch('/api/users/create-automated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          headless: false,
          timeout: 30000
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const mappedUser: GuvUser = {
          guv: result.user.id,
          username: result.user.username,
          email: result.user.email || '',
          yelpUserId: result.user.id,
          status: 'active',
          sessionCount: 0,
          createdAt: result.user.creation_time
        };

        setUsers(prev => [...prev, mappedUser]);
        setSelectedUser(mappedUser);
        localStorage.setItem('selectedUser', JSON.stringify(mappedUser));
        setUserCreationStatus({ loading: false, error: null, success: true });

        setTimeout(() => {
          setShowUserModal(false);
          setUserCreationMode('choice');
          setUserCreationStatus({ loading: false, error: null, success: false });
        }, 2000);
      } else {
        setUserCreationStatus({
          loading: false,
          error: result.error || 'Failed to create automated user',
          success: false
        });
      }
    } catch (error) {
      setUserCreationStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create automated user',
        success: false
      });
    }
  };

  // Agrega esta función para iniciar una sesión de usuario

  const startUserSession = async (user: GuvUser) => {
    try {
      // Obtener IP del usuario (usando un servicio externo)
      let ipAddress = "Unknown";
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (error) {
        console.warn("Could not fetch IP address:", error);
      }

      // Crear una nueva sesión
      const session: UserSession = {
        id: `session-${Date.now()}`,
        guv: user.guv,
        username: user.username,
        startTime: new Date().toISOString(),
        ipAddress,
        active: true
      };

      // Guardar en localStorage y estado
      localStorage.setItem('currentUserSession', JSON.stringify(session));
      setCurrentUserSession(session);

      // Registrar inicio de sesión en el backend (si está disponible)
      try {
        await apiPost('/api/sessions/start', {
          sessionId: session.id,
          guv: user.guv,
          ipAddress
        });
      } catch (error) {
        console.warn('Failed to record session start in backend:', error);
      }
      
      return session;
    } catch (error) {
      console.error('Failed to start user session:', error);
      return null;
    }
  };

  // Reemplaza la función selectUser existente con esta versión
  const selectUser = async (user: GuvUser) => {
    setSelectedUser(user);
    localStorage.setItem('selectedUser', JSON.stringify(user));
    setShowUserList(false);
    console.log('User saved to localStorage:', user.username);
    
    // Iniciar sesión para el usuario
    const session = await startUserSession(user);
    if (session) {
      console.log('Session started:', session.id);
    }
  };

  // Agrega esta función para terminar una sesión
  const endUserSession = async () => {
    if (!currentUserSession) return;
    
    try {
      // Crear una copia actualizada de la sesión con estado terminado
      const updatedSession = {
        ...currentUserSession,
        endTime: new Date().toISOString(),
        active: false
      };
      
      console.log('Ending user session:', updatedSession.id);
      
      // Eliminar sesión actual del localStorage
      localStorage.removeItem('currentUserSession');
      setCurrentUserSession(null);
      
      // Obtener sesiones recientes existentes
      const savedRecentSessions = localStorage.getItem('recentUserSessions');
      let recentSessions = [];
      
      if (savedRecentSessions) {
        try {
          recentSessions = JSON.parse(savedRecentSessions);
        } catch (error) {
          console.error('Error parsing recent sessions:', error);
        }
      }
      
      // Asegurarse de que la sesión actual se añada al principio sin duplicados
      recentSessions = [
        updatedSession, 
        ...recentSessions.filter(s => s.id !== updatedSession.id)
      ];
      
      // Limitar a 10 sesiones recientes
      if (recentSessions.length > 10) {
        recentSessions = recentSessions.slice(0, 10);
      }
      
      // IMPORTANTE: Guardar las sesiones actualizadas en localStorage
      localStorage.setItem('recentUserSessions', JSON.stringify(recentSessions));
      console.log('Updated recent sessions in localStorage:', recentSessions.length);
      
      // Disparar el evento storage manualmente para componentes en la misma ventana
      window.dispatchEvent(new Event('storage'));
      
      // Emitir un evento personalizado para notificar a otros componentes
      const sessionEndEvent = new CustomEvent('userSessionEnded', {
        detail: updatedSession
      });
      window.dispatchEvent(sessionEndEvent);
      
      return updatedSession;
    } catch (error) {
      console.error('Failed to end user session:', error);
      return null;
    }
  };

  // Reemplaza la función logoutUser existente con esta versión
  const logoutUser = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      console.log('User logout requested. Current session:', currentUserSession?.id);
      
      // Terminar la sesión antes de hacer logout
      if (currentUserSession) {
        const endedSession = await endUserSession();
        console.log('Session ended successfully:', endedSession?.id);
      } else {
        console.warn('No active session to end during logout');
      }
      
      // Logout normal
      setSelectedUser(null);
      localStorage.removeItem('selectedUser');
      console.log('User logged out successfully');
    }
  };

  const toggleTestSelection = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  const selectAllTests = () => {
    setSelectedTests(TEST_SCENARIOS.map(test => test.id));
  };

  const clearAllTests = () => {
    setSelectedTests([]);
  };

  const startTests = async () => {
    if (!selectedUser) {
      alert('Please select a user first');
      return;
    }

    if (selectedTests.length === 0) {
      alert('Please select at least one test');
      return;
    }

    setLoading(true);
    
    try {
      const sessionData = {
        guv: selectedUser.guv,
        selectedTests,
        customPuppeteerCode: customPuppeteerCode.trim() || undefined
      };

      const session = await apiPost<TestSession>('/tests/start', sessionData);
      setCurrentSession(session);
      
      // Poll for results
      pollTestResults(session.sessionId);
    } catch (error) {
      console.error('Failed to start tests:', error);
      alert('Failed to start tests');
      setLoading(false);
    }
  };

  const stopTests = async () => {
    if (!currentSession) return;

    try {
      await apiPost(`/api/tests/stop/${currentSession.sessionId}`);
      setCurrentSession(null);
      setLoading(false);
    } catch (error) {
      console.error('Failed to stop tests:', error);
    }
  };

  const pollTestResults = async (sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const session = await apiGet<TestSession>(`/api/tests/session/${sessionId}`);
        setCurrentSession(session);
        setTestResults(session.results);

        if (session.status === 'completed' || session.status === 'failed') {
          clearInterval(pollInterval);
          setLoading(false);
          
          // Update user session count
          if (selectedUser) {
            await apiPost(`/api/users/${selectedUser.guv}/increment-session`);
            loadUsers(); // Refresh user list
          }
        }
      } catch (error) {
        console.error('Failed to poll test results:', error);
        clearInterval(pollInterval);
        setLoading(false);
      }
    }, 2000);
  };

  const getTestsByCategory = (category: 'core' | 'basic' | 'advanced') => {
    return TEST_SCENARIOS.filter(test => test.category === category);
  };

  const getTotalEstimatedDuration = () => {
    return selectedTests.reduce((total, testId) => {
      const test = TEST_SCENARIOS.find(t => t.id === testId);
      return total + (test?.estimatedDuration || 0);
    }, 0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'inactive': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'basic': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'advanced': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Función para ejecutar código Puppeteer
  const executePuppeteerCode = async () => {
    // Si no hay usuario seleccionado, usar uno simulado
    const userToUse = selectedUser || {
      guv: 'temp-guv-' + Date.now(),
      username: 'tempuser',
      status: 'active'
    };
    
    if (!customPuppeteerCode.trim()) {
      alert('Please enter some code to execute.');
      return;
    }
    
    setLoading(true);
    try {
      console.log(`Executing Puppeteer code for user: ${userToUse.username}`);
      
      const sessionData = {
        guv: userToUse.guv,
        selectedTests: ['custom_puppeteer_code'],
        customPuppeteerCode: customPuppeteerCode
      };
      
      try {
        // Intenta ejecutar el código a través de la API
        const session = await apiPost<TestSession>('/api/tests/start', sessionData);
        setCurrentSession(session);
        console.log('Puppeteer code execution started:', session);
        alert('Code execution started successfully!');
      } catch (apiError) {
        console.error('API error:', apiError);
        // Simulación local si la API falla
        alert('API unavailable. Simulating execution locally...');
        // Espera simulada
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert('Code executed successfully (simulated)');
      }
    } catch (error) {
      console.error('Error executing Puppeteer code:', error);
      alert('Error executing Puppeteer code. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Función para limpiar el editor
  const cleanEditor = () => {
    if (customPuppeteerCode.trim() && !confirm('Are you sure you want to clear all code?')) {
      return;
    }
    setCustomPuppeteerCode('');
  };

  // Función para cargar código desde un archivo
  const loadPuppeteerCode = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js,.ts,.txt';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setCustomPuppeteerCode(content);
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  };

  // Add this function to handle the sessions API call with fallback

  const loadSessions = async () => {
    try {
      console.log('Attempting to load sessions from API');
      const sessions = await apiGet('/api/tests/sessions');
      console.log('Sessions loaded successfully:', sessions);
      return sessions;
    } catch (error) {
      console.error('Failed to load sessions:', error);
      
      // Return mock data if API fails
      console.log('Using fallback mock session data');
      return [
        {
          sessionId: 'fallback-session-1',
          guv: 'fallback-user',
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: new Date().toISOString(),
          test_count: 2,
          duration_ms: 3600000,
          status: 'completed'
        }
      ];
    }
  };

  // Then, in your useEffect or wherever you load sessions:
  useEffect(() => {
    const fetchSessions = async () => {
      const sessions = await loadSessions();
      setTestSessions(sessions);
    };
    
    fetchSessions();
  }, []);

  const validatePasswords = (password: string, confirmPassword: string) => {
    // Si ambos campos tienen contenido, verifica que coincidan
    if (password && confirmPassword) {
      return password === confirmPassword;
    }
    // Si alguno está vacío, no mostrar error todavía
    return true;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    const updatedUser = { ...newUser, password: newPassword };
    setNewUser(updatedUser);
    setPasswordsMatch(validatePasswords(newPassword, updatedUser.confirmPassword));
  };

  // Función para el cambio en confirmPassword
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    const updatedUser = { ...newUser, confirmPassword: newConfirmPassword };
    setNewUser(updatedUser);
    setPasswordsMatch(validatePasswords(updatedUser.password, newConfirmPassword));
  };

  // Añade una función para hacer la solicitud con reintentos

  const fetchWithRetries = async (url: string, options: RequestInit, retries = 3, delay = 1000) => {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (retries <= 0) throw error;
      
      console.log(`Error de conexión, reintentando en ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetries(url, options, retries - 1, delay * 2);
    }
  };

  // Modificar la función handleExecuteCode para usar fetchWithRetries
  const handleExecuteCode = async () => {
    try {
      setRunning(true);
      setOutput('Executing code...\n');

      console.log('Sending request to execute Puppeteer code');
      const response = await fetch('/api/tests/execute-puppeteer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: puppeteerCode,
          headless: isHeadless
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(errorText || 'Error en la solicitud');
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      setOutput(prev => prev + '\nExecution completed!\n\nOutput:\n' + data.output);
      if (data.logs) {
        setOutput(prev => prev + '\n\nBrowser logs:\n' + data.logs);
      }
    } catch (error) {
      console.error('Failed to execute code:', error);
      setOutput(prev => prev + '\nFailed to execute code: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setRunning(false);
    }
  };

  // Nueva función para limpiar el código
  const handleClearCode = () => {
    if (running) return;
    if (window.confirm('Are you sure you want to clear the code?')) {
      setPuppeteerCode('');
    }
  };

  // Nueva función para cargar código de ejemplo
  const handleLoadSampleCode = () => {
    if (running) return;
    const sampleCode = `// Sample Puppeteer code
const page = await browser.newPage();
await page.goto('https://www.yelp.com');
await page.waitForSelector('.search-keywords-input');
await page.type('.search-keywords-input', 'restaurants');
await page.click('.search-button');
await page.waitForNavigation();
const results = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.business-name')).map(el => el.textContent);
});
return results;`;
    setPuppeteerCode(sampleCode);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center">
          <Code className="mr-2" /> Yelp Click Testing
        </h1>

        {/* User Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">1. Select User</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUserList(!showUserList)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showUserList ? 'Hide Users' : 'Select User'}
              </button>
              <button
                onClick={() => setShowUserModal(true)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Create User
              </button>
            </div>
          </div>
          
          {selectedUser ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
              <div className="flex items-center">
                <User className="w-5 h-5 text-blue-500 mr-2" />
                <div>
                  <h3 className="font-medium">{selectedUser.username}</h3>
                  <p className="text-sm text-gray-600">GUV: {selectedUser.guv}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  {getStatusIcon(selectedUser.status)}
                  <span className="text-sm ml-1 capitalize">{selectedUser.status}</span>
                </div>
                <button
                  onClick={logoutUser}
                  className="flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
              No user selected
            </div>
          )}
          
          {/* User List */}
          {showUserList && (
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {users.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No users found. Create a user to get started.
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.guv}
                    className="p-3 border-b last:border-b-0 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{user.username}</h4>
                      <p className="text-sm text-gray-600">GUV: {user.guv}</p>
                      <p className="text-sm text-gray-600">Sessions: {user.sessionCount}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(user.status)}
                      <span className="text-sm capitalize">{user.status}</span>
                      <button
                        onClick={() => selectUser(user)}
                        className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        
        
        {/* Test Selection */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">2. Select Tests</h2>
            <div className="flex gap-2">
              <button
                onClick={selectAllTests}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                onClick={clearAllTests}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear All
              </button>
            </div>
          </div>
          
          {/* Core Tests */}
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
              Core Tests
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getTestsByCategory('core').map(test => (
                <div
                  key={test.id}
                  onClick={() => toggleTestSelection(test.id)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTests.includes(test.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{test.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(test.category)}`}>
                      {test.estimatedDuration}m
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{test.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Basic Tests */}
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              Basic Tests
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getTestsByCategory('basic').map(test => (
                <div
                  key={test.id}
                  onClick={() => toggleTestSelection(test.id)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTests.includes(test.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{test.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(test.category)}`}>
                      {test.estimatedDuration}m
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{test.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Advanced Tests */}
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
              Advanced Tests
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getTestsByCategory('advanced').map(test => (
                <div
                  key={test.id}
                  onClick={() => toggleTestSelection(test.id)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTests.includes(test.id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{test.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(test.category)}`}>
                      {test.estimatedDuration}m
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{test.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Run Tests Button */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              {selectedTests.length} tests selected 
              ({getTotalEstimatedDuration()} minutes estimated)
            </p>
          </div>
          {currentSession ? (
            <button
              onClick={stopTests}
              disabled={loading}
              className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 transition-colors"
            >
              <Square className="mr-2 w-5 h-5" />
              {loading ? 'Stopping Tests...' : 'Stop Tests'}
            </button>
          ) : (
            <button
              onClick={startTests}
              disabled={loading || !selectedUser || selectedTests.length === 0}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 transition-colors"
            >
              <Play className="mr-2 w-5 h-5" />
              {loading ? 'Running Tests...' : 'Run Tests'}
            </button>
          )}
        </div>
        
        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b grid grid-cols-4 font-medium">
                <div>Test</div>
                <div>Status</div>
                <div>Time</div>
                <div>Details</div>
              </div>
              {testResults.map(result => (
                <div key={result.id} className="p-3 border-b last:border-b-0 grid grid-cols-4">
                  <div>{result.scenario}</div>
                  <div>
                    {result.success ? (
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" /> Passed
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600">
                        <AlertCircle className="w-4 h-4 mr-1" /> Failed
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-sm">{result.details}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Test User</h2>

            {userCreationStatus.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {userCreationStatus.error}
              </div>
            )}

            {userCreationStatus.success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                User created successfully!
              </div>
            )}

            {/* Choice Screen */}
            {userCreationMode === 'choice' && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-6">Choose how you want to create a test user:</p>

                <button
                  onClick={() => setUserCreationMode('manual')}
                  className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <UserPlus className="w-8 h-8 text-blue-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 mb-1">Manual Creation</h3>
                      <p className="text-sm text-gray-600">Enter username, email, and password manually</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setUserCreationMode('automated')}
                  className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <Wand2 className="w-8 h-8 text-purple-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 mb-1">Automated Creation</h3>
                      <p className="text-sm text-gray-600">Automatically generate a random Yelp user via Puppeteer</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setUserCreationMode('choice');
                    setUserCreationStatus({ loading: false, error: null, success: false });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 mt-4"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Manual Creation Form */}
            {userCreationMode === 'manual' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter username"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={newUser.confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    className={`w-full px-3 py-2 border ${
                      !passwordsMatch ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Confirm your password"
                  />
                  {!passwordsMatch && (
                    <p className="text-red-500 text-sm mt-1">
                      Password and Confirm Password don't match
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setUserCreationMode('choice');
                      setUserCreationStatus({ loading: false, error: null, success: false });
                      setNewUser({ username: '', email: '', password: '', confirmPassword: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={createUser}
                    disabled={userCreationStatus.loading || !passwordsMatch || !newUser.username || !newUser.email || !newUser.password || !newUser.confirmPassword}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {userCreationStatus.loading ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </>
            )}

            {/* Automated Creation Screen */}
            {userCreationMode === 'automated' && (
              <>
                <div className="mb-6 text-center py-8">
                  {userCreationStatus.loading ? (
                    <>
                      <Wand2 className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-700 font-medium mb-2">Creating automated user...</p>
                      <p className="text-sm text-gray-500">This may take a few minutes. Please wait for captcha resolution.</p>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                      <p className="text-gray-700 font-medium mb-2">Ready to create automated user</p>
                      <p className="text-sm text-gray-500">A browser will open to automatically register a new Yelp user.</p>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setUserCreationMode('choice');
                      setUserCreationStatus({ loading: false, error: null, success: false });
                    }}
                    disabled={userCreationStatus.loading}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={createAutomatedUser}
                    disabled={userCreationStatus.loading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-300 flex items-center gap-2"
                  >
                    {userCreationStatus.loading ? (
                      <>
                        <Wand2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        Start Automation
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Puppeteer Code Execution Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Code className="w-5 h-5 mr-2 text-blue-600" />
              Puppeteer Code
            </h3>
            <div className="flex space-x-3">
              <button
                onClick={handleClearCode}
                disabled={running || !puppeteerCode}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50"
              >
                <Trash className="w-4 h-4 mr-2" />
                Clean
              </button>
<button
  onClick={() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js,.ts,.txt';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setPuppeteerCode(content);
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  }}
  disabled={running}
  className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-200"
>
  <Upload className="w-4 h-4 mr-2" />
  Load File
</button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <textarea
            value={puppeteerCode}
            onChange={(e) => setPuppeteerCode(e.target.value)}
            placeholder="// Enter your Puppeteer code here
const page = await browser.newPage();
await page.goto('https://www.yelp.com');
await page.waitForSelector('.search-keywords-input');
await page.type('.search-keywords-input', 'restaurants');
await page.click('.search-button');
await page.waitForNavigation();
const results = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.business-name')).map(el => el.textContent);
});
return results;"
            className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-y"
            disabled={running}
          />

          <div className="flex items-center space-x-4 mt-4">
            <button
              onClick={handleExecuteCode}
              disabled={running || !puppeteerCode.trim()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {running ? (
                <>
                  <div className="mr-2 animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute Puppeteer Code
                </>
              )}
            </button>
            
            {/* Checkbox para la opción headless */}
            <div className="flex items-center">
              <input
                id="headless-checkbox"
                type="checkbox"
                checked={isHeadless}
                onChange={(e) => setIsHeadless(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="headless-checkbox" className="ml-2 text-sm font-medium text-gray-700">
                Execute Headless
              </label>
              <span className="ml-2 inline-block text-xs text-gray-500">
                {isHeadless ? "(Browser will run in background)" : "(Browser will be visible)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Output Console */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-4">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Console Output</h3>
        </div>

        <div className="p-6">
          <pre className="bg-gray-100 p-4 rounded-lg text-sm font-mono h-64 overflow-auto whitespace-pre-wrap">
            {output || 'No output yet. Execute code to see results.'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TestRunner;
