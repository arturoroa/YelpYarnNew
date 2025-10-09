import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
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
}
