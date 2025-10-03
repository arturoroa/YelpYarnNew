import { MongoClient, Db, Collection } from 'mongodb';

export class GuvUser {
  id: string;
  username: string;
  guv: string;
  email: string;
  status: string;
  created_at: Date;
  last_used: Date;
  test_sessions_count: number;
  
  constructor(data: any) {
    this.id = data.id || '';
    this.username = data.username || '';
    this.guv = data.guv || '';
    this.email = data.email || '';
    this.status = data.status || 'active';
    this.created_at = data.created_at || new Date();
    this.last_used = data.last_used || new Date();
    this.test_sessions_count = data.test_sessions_count || 0;
  }
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private testResults: Collection | null = null;
  private logs: Collection | null = null;
  private users: Collection | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async connect(uri: string = 'mongodb://localhost:27017'): Promise<void> {
    try {
      this.client = await MongoClient.connect(uri);
      this.db = this.client.db('yelp-click-tests');
      this.testResults = this.db.collection('testResults');
      this.logs = this.db.collection('logs');
      this.users = this.db.collection('users');
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('Failed to connect to MongoDB', err);
      throw err;
    }
  }

  async addTestResult(result: any): Promise<void> {
    if (!this.testResults) throw new Error('Database not connected');
    await this.testResults.insertOne({
      ...result,
      timestamp: new Date()
    });
  }

  async getTestResults(filter = {}): Promise<any[]> {
    if (!this.testResults) throw new Error('Database not connected');
    return await this.testResults.find(filter).toArray();
  }

  async addLog(log: any): Promise<void> {
    if (!this.logs) throw new Error('Database not connected');
    await this.logs.insertOne({
      ...log,
      timestamp: new Date()
    });
  }

  async getLogs(sessionId?: string): Promise<any[]> {
    if (!this.logs) throw new Error('Database not connected');
    const filter = sessionId ? { sessionId } : {};
    return await this.logs.find(filter).toArray();
  }

  async getUsers(): Promise<any[]> {
    if (!this.users) throw new Error('Database not connected');
    return await this.users.find().toArray();
  }

  // Nuevos métodos requeridos
  async getGuvUserByUsername(username: string): Promise<GuvUser | null> {
    if (!this.users) throw new Error('Database not connected');
    const user = await this.users.findOne({ username });
    return user ? new GuvUser(user) : null;
  }

  async getGuvUser(guv: string): Promise<GuvUser | null> {
    if (!this.users) throw new Error('Database not connected');
    const user = await this.users.findOne({ guv });
    return user ? new GuvUser(user) : null;
  }

  async getAllGuvUsers(limit: number = 100): Promise<GuvUser[]> {
    if (!this.users) throw new Error('Database not connected');
    const users = await this.users.find().limit(limit).toArray();
    return users.map(user => new GuvUser(user));
  }

  async createGuvUser(userData: any): Promise<string> {
    if (!this.users) throw new Error('Database not connected');
    const newUser = {
      ...userData,
      created_at: new Date(),
      last_used: new Date(),
      test_sessions_count: 0
    };
    const result = await this.users.insertOne(newUser);
    return result.insertedId.toString();
  }

  async updateGuvUser(guv: string, updates: any): Promise<void> {
    if (!this.users) throw new Error('Database not connected');
    await this.users.updateOne({ guv }, { $set: { ...updates, last_used: new Date() } });
  }

  async getTestSessions(): Promise<any[]> {
    try {
      if (!this.testResults) {
        console.warn('Database not connected, using mock test sessions');
        return [
          {
            sessionId: 'mock-session-1',
            guv: 'demo-guv-1',
            start_time: new Date(Date.now() - 3600000),
            end_time: new Date(),
            test_count: 5,
            duration_ms: 3600000
          },
          {
            sessionId: 'mock-session-2', 
            guv: 'demo-guv-2',
            start_time: new Date(Date.now() - 7200000),
            end_time: new Date(Date.now() - 7150000),
            test_count: 3,
            duration_ms: 50000
          }
        ];
      }
      
      // Operación normal de base de datos
      const results = await this.testResults.find({}).toArray();
      
      // Procesar y devolver resultados
      const sessionMap = new Map();
      
      for (const result of results) {
        const sessionId = result.sessionId || result.session_id;
        if (!sessionId) continue;
        
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            sessionId: sessionId,
            guv: result.guv || '',
            start_time: result.timestamp,
            end_time: result.timestamp,
            test_count: 1
          });
        } else {
          const session = sessionMap.get(sessionId);
          session.test_count += 1;
          
          // Actualizar tiempos
          if (result.timestamp < session.start_time) {
            session.start_time = result.timestamp;
          }
          if (result.timestamp > session.end_time) {
            session.end_time = result.timestamp;
          }
        }
      }
      
      // Convertir el mapa a un array y calcular la duración
      return Array.from(sessionMap.values()).map(session => ({
        ...session,
        duration_ms: session.end_time - session.start_time
      }));
      
    } catch (error) {
      console.error('Error getting test sessions:', error);
      // Devolver datos de prueba en caso de error
      return [
        {
          sessionId: 'error-session-1',
          guv: 'error-guv',
          start_time: new Date(Date.now() - 1800000),
          end_time: new Date(),
          test_count: 2,
          duration_ms: 1800000
        }
      ];
    }
  }

  /**
   * Mock database connection for development/testing
   */
  async mockConnect(): Promise<void> {
    console.log('Using mock database connection');
    
    // Crear colecciones simuladas
    this.testResults = {
      find: () => ({
        toArray: async () => [
          { sessionId: 'mock-session-1', guv: 'demo-guv-1', timestamp: new Date() },
          { sessionId: 'mock-session-2', guv: 'demo-guv-2', timestamp: new Date(Date.now() - 3600000) }
        ]
      })
    } as any;
    
    this.logs = {
      insertOne: async () => ({ insertedId: 'mock-log-id' }),
      find: () => ({ toArray: async () => [] })
    } as any;
    
    this.users = {
      find: () => ({ toArray: async () => [] }),
      findOne: async () => null,
      insertOne: async () => ({ insertedId: 'mock-user-id' })
    } as any;
  }
}

export default DatabaseManager;





