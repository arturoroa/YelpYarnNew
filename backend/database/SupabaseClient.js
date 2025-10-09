import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_ANON_KEY:', supabaseKey ? 'exists' : 'missing');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseManager {
  constructor() {
    this.client = supabase;
  }

  async createUserSession(sessionData) {
    const { data, error } = await this.client
      .from('user_sessions')
      .insert({
        id: sessionData.id,
        username: sessionData.username,
        login_time: sessionData.loginTime || new Date().toISOString(),
        logout_time: sessionData.logoutTime || null,
        ip_address: sessionData.ipAddress || null,
        status: sessionData.status || 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserSession(id) {
    const { data, error } = await this.client
      .from('user_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getAllUserSessions() {
    const { data, error } = await this.client
      .from('user_sessions')
      .select('*')
      .order('login_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateUserSession(id, updates) {
    const updateData = {};

    if (updates.logoutTime !== undefined) {
      updateData.logout_time = updates.logoutTime;
    }

    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }

    const { data, error } = await this.client
      .from('user_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteAllUserSessions() {
    const { error } = await this.client
      .from('user_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw error;
    return { success: true };
  }

  async createSystemLog(logData) {
    const { data, error } = await this.client
      .from('system_logs')
      .insert({
        user_id: logData.userId || null,
        action: logData.action,
        details: logData.details || {},
        timestamp: logData.timestamp || new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSystemLogs(limit = 100) {
    const { data, error } = await this.client
      .from('system_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async deleteAllSystemLogs() {
    const { error } = await this.client
      .from('system_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw error;
    return { success: true };
  }

  async createEnvironment(envData) {
    const { data, error } = await this.client
      .from('environments')
      .insert({
        name: envData.name,
        integrations: envData.integrations || {}
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAllEnvironments() {
    const { data, error } = await this.client
      .from('environments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async deleteAllEnvironments() {
    const { error } = await this.client
      .from('environments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw error;
    return { success: true };
  }

  async deleteAllData() {
    console.log('Deleting all data from Supabase...');

    await this.deleteAllUserSessions();
    console.log('✓ Deleted all user sessions from Supabase');

    await this.deleteAllSystemLogs();
    console.log('✓ Deleted all system logs from Supabase');

    await this.deleteAllEnvironments();
    console.log('✓ Deleted all environments from Supabase');

    const { error: integrationsError } = await this.client
      .from('integrations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (integrationsError) throw integrationsError;
    console.log('✓ Deleted all integrations from Supabase');

    const { error: testSessionsError } = await this.client
      .from('test_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (testSessionsError) throw testSessionsError;
    console.log('✓ Deleted all test sessions from Supabase');

    const { error: yelpUsersError } = await this.client
      .from('yelp_users')
      .delete()
      .neq('username', 'aroa');
    if (yelpUsersError) throw yelpUsersError;
    console.log('✓ Deleted all yelp users except aroa from Supabase');

    return { success: true };
  }

  async ensureDefaultUser() {
    try {
      const { data: existingUser } = await this.client
        .from('yelp_users')
        .select('*')
        .eq('username', 'aroa')
        .maybeSingle();

      if (!existingUser) {
        const { error } = await this.client
          .from('yelp_users')
          .insert({
            username: 'aroa',
            email: 'aroa@example.com',
            config: {},
            is_active: true
          });

        if (error) {
          console.error('Error creating default user aroa:', error);
        } else {
          console.log('✓ Default user "aroa" created in Supabase');
        }
      } else {
        console.log('✓ Default user "aroa" already exists in Supabase');
      }
    } catch (error) {
      console.error('Error ensuring default user:', error);
    }
  }

  // System Users Methods
  async verifySystemUser(username, password) {
    const { data, error } = await this.client
      .from('system_users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getAllSystemUsers() {
    const { data, error } = await this.client
      .from('system_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getSystemUser(id) {
    const { data, error } = await this.client
      .from('system_users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createSystemUser(username, password, type, email) {
    const { data, error } = await this.client
      .from('system_users')
      .insert({
        username,
        password,
        type,
        email
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateSystemUser(id, updates) {
    const { data, error } = await this.client
      .from('system_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteSystemUser(id) {
    const { error } = await this.client
      .from('system_users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Integrations Methods
  async getAllIntegrations() {
    const { data, error } = await this.client
      .from('integrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getIntegration(id) {
    const { data, error } = await this.client
      .from('integrations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createIntegration(integrationData) {
    const { data, error } = await this.client
      .from('integrations')
      .insert({
        name: integrationData.name,
        type: integrationData.type,
        status: integrationData.status || 'disconnected',
        config: integrationData.config || {}
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateIntegration(id, updates) {
    const { data, error } = await this.client
      .from('integrations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteIntegration(id) {
    const { error } = await this.client
      .from('integrations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Yelp Users Methods
  async getAllYelpUsers() {
    const { data, error } = await this.client
      .from('yelp_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getYelpUser(id) {
    const { data, error } = await this.client
      .from('yelp_users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createYelpUser(userData) {
    const { data, error } = await this.client
      .from('yelp_users')
      .insert({
        username: userData.username,
        email: userData.email,
        config: userData.config || {},
        is_active: userData.is_active !== undefined ? userData.is_active : true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateYelpUser(id, updates) {
    const { data, error } = await this.client
      .from('yelp_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteYelpUser(id) {
    const { error } = await this.client
      .from('yelp_users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Test Sessions Methods
  async getAllTestSessions() {
    const { data, error } = await this.client
      .from('test_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getTestSession(id) {
    const { data, error } = await this.client
      .from('test_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createTestSession(sessionData) {
    const { data, error } = await this.client
      .from('test_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTestSession(id, updates) {
    const { data, error } = await this.client
      .from('test_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Environment methods
  async updateEnvironment(id, updates) {
    const { data, error } = await this.client
      .from('environments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteEnvironment(id) {
    const { error } = await this.client
      .from('environments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Export all data
  async exportAllData() {
    const [integrations, testSessions, yelpUsers, systemLogs, userSessions, environments] = await Promise.all([
      this.getAllIntegrations(),
      this.getAllTestSessions(),
      this.getAllYelpUsers(),
      this.getSystemLogs(1000),
      this.getAllUserSessions(),
      this.getAllEnvironments()
    ]);

    return {
      integrations,
      test_sessions: testSessions,
      yelp_users: yelpUsers,
      system_logs: systemLogs,
      user_sessions: userSessions,
      environments
    };
  }
}
