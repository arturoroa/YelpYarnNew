import { randomUUID } from 'crypto';

/**
 * Application database abstraction layer
 * Uses in-memory storage (works in all environments)
 * Can be replaced with SQLite in Node.js environments
 */
export class AppDatabase {
  constructor() {
    // In-memory storage
    this.integrations = new Map();
    this.testSessions = new Map();
    this.yelpUsers = new Map();

    this.initializeSampleData();
    console.log('✓ Application database initialized (in-memory)');
  }

  initializeSampleData() {
    // Add sample Yelp users
    const sampleUsers = [
      {
        id: '1',
        username: 'john_doe_yelp',
        email: 'john@example.com',
        config: { cookies: [{ name: 'session', value: 'abc123' }] },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        username: 'jane_smith_yelp',
        email: 'jane@example.com',
        config: { cookies: [{ name: 'session', value: 'def456' }] },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        username: 'test_user_yelp',
        email: 'test@example.com',
        config: { cookies: [{ name: 'session', value: 'ghi789' }] },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    sampleUsers.forEach(user => {
      this.yelpUsers.set(user.id, user);
    });
  }

  // ===== INTEGRATIONS =====

  getAllIntegrations() {
    const integrations = Array.from(this.integrations.values());
    return integrations.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getIntegration(id) {
    return this.integrations.get(id) || null;
  }

  createIntegration({ name, type, config, status = 'disconnected' }) {
    const id = randomUUID();
    const integration = {
      id,
      name,
      type,
      config: config || {},
      status,
      last_sync: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.integrations.set(id, integration);
    return integration;
  }

  updateIntegration(id, updates) {
    const integration = this.integrations.get(id);
    if (!integration) return null;

    const updated = {
      ...integration,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.integrations.set(id, updated);
    return updated;
  }

  deleteIntegration(id) {
    return this.integrations.delete(id);
  }

  // ===== TEST SESSIONS =====

  getAllTestSessions() {
    const sessions = Array.from(this.testSessions.values());
    return sessions.sort((a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
  }

  getTestSession(id) {
    return this.testSessions.get(id) || null;
  }

  createTestSession({ test_name, user_id, status = 'pending' }) {
    const id = randomUUID();
    const session = {
      id,
      test_name,
      status,
      user_id: user_id || null,
      started_at: new Date().toISOString(),
      completed_at: null,
      result: null,
      logs: null
    };

    this.testSessions.set(id, session);
    return session;
  }

  updateTestSession(id, updates) {
    const session = this.testSessions.get(id);
    if (!session) return null;

    const updated = {
      ...session,
      ...updates
    };

    this.testSessions.set(id, updated);
    return updated;
  }

  // ===== YELP USERS =====

  getAllYelpUsers() {
    const users = Array.from(this.yelpUsers.values());
    return users.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getYelpUser(id) {
    return this.yelpUsers.get(id) || null;
  }

  getYelpUserByUsername(username) {
    const users = Array.from(this.yelpUsers.values());
    return users.find(user => user.username === username) || null;
  }

  createYelpUser({ username, email, config, is_active = true }) {
    const id = randomUUID();
    const user = {
      id,
      username,
      email,
      config: config || {},
      is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.yelpUsers.set(id, user);
    return user;
  }

  updateYelpUser(id, updates) {
    const user = this.yelpUsers.get(id);
    if (!user) return null;

    const updated = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.yelpUsers.set(id, updated);
    return updated;
  }

  close() {
    // No-op for in-memory database
  }
}
