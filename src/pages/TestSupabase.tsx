import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getFreshClient } from '@/integrations/supabase/refresh-client';
import { runColumnMigration } from '@/integrations/supabase/migration';
import { setupDatabase } from '@/setupDatabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { ProjectStatus, ProjectPriority } from '@/types/project';

const TestSupabase = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [projectsCount, setProjectsCount] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isFixingSchema, setIsFixingSchema] = useState(false);
  const [isRefreshingSchema, setIsRefreshingSchema] = useState(false);
  const [freshClient, setFreshClient] = useState(null);
  const [isRunningMigration, setIsRunningMigration] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().slice(11, 19)} - ${message}`]);
  };

  const checkConnection = async () => {
    try {
      addLog('Testing Supabase connection...');
      setStatus('checking');
      setError(null);
      
      const { data, error } = await supabase.from('profiles').select('count');
      
      if (error) {
        addLog(`Connection error: ${error.message}`);
        setStatus('error');
        setError(error.message);
        return false;
      }
      
      addLog('Connection successful!');
      setStatus('connected');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Connection failed: ${errorMessage}`);
      setStatus('error');
      setError(errorMessage);
      return false;
    }
  };

  const runSetupDatabase = async () => {
    try {
      addLog('Setting up database...');
      const result = await setupDatabase();
      addLog(`Database setup ${result ? 'successful' : 'failed'}`);
      
      if (result) {
        toast({
          title: 'Database setup',
          description: 'Database tables created successfully',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Database setup failed',
          description: 'Could not setup database tables',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Database setup error: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Database setup error',
        description: errorMessage,
      });
    }
  };

  const checkProjectsTable = async () => {
    try {
      addLog('Checking projects table...');
      const { data, error } = await supabase.from('projects').select('count');
      
      if (error) {
        addLog(`Projects table error: ${error.message}`);
        toast({
          variant: 'destructive',
          title: 'Projects table error',
          description: error.message,
        });
        return;
      }
      
      const count = data?.[0]?.count || 0;
      setProjectsCount(count);
      addLog(`Projects table exists! Count: ${count}`);
      toast({
        title: 'Projects table',
        description: `Found ${count} projects in the database`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error checking projects table: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Error checking projects table',
        description: errorMessage,
      });
    }
  };

  // Create a fresh Supabase client
  const recreateClient = () => {
    try {
      addLog('Creating a fresh Supabase client...');
      const client = getFreshClient();
      setFreshClient(client);
      addLog('Fresh client created successfully');
      toast({
        title: 'Client refreshed',
        description: 'Created a new Supabase client with fresh schema cache',
      });
      return client;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error creating fresh client: ${errorMessage}`);
      return null;
    }
  };

  // Original createTestProject function with standard client
  const createTestProject = async () => {
    try {
      setIsCreatingProject(true);
      addLog('Creating test project with standard client...');
      
      const projectId = uuidv4();
      const newProject = {
        id: projectId,
        name: `Test Project ${new Date().toISOString().slice(0, 16)}`,
        clientName: 'Test Client',
        startTime: new Date().toISOString(),
        status: ProjectStatus.NOT_STARTED,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        priority: ProjectPriority.MEDIUM,
        budget: 1000,
        advancePayment: 300,
        partialPayments: 0,
        pendingPayment: 700
      };
      
      // First try to insert the project with standard client
      addLog(`Inserting project with ID: ${projectId} using standard client`);
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([newProject])
        .select()
        .single();
      
      if (projectError) {
        addLog(`Error creating project with standard client: ${projectError.message}`);
        toast({
          variant: 'destructive',
          title: 'Project creation failed',
          description: projectError.message,
        });
        setIsCreatingProject(false);
        return;
      }
      
      addLog(`Project created successfully with standard client: ${projectData.id}`);
      
      // Now add a project member with standard client
      const projectMember = {
        project_id: projectId,
        user_id: uuidv4() // Just a random user ID for testing
      };
      
      addLog('Adding project member with standard client...');
      const { error: memberError } = await supabase
        .from('project_members')
        .insert([projectMember]);
      
      if (memberError) {
        addLog(`Error adding project member with standard client: ${memberError.message}`);
        toast({
          variant: 'destructive',
          title: 'Project member creation failed',
          description: memberError.message,
        });
        setIsCreatingProject(false);
        return;
      }
      
      addLog('Project member added successfully with standard client');
      
      // Check projects count
      await checkProjectsTable();
      
      toast({
        title: 'Test project created',
        description: 'A test project was successfully created with standard client',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error creating test project with standard client: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Error creating test project',
        description: errorMessage,
      });
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Create test project with fresh client to avoid schema cache issues
  const createTestProjectWithFreshClient = async () => {
    try {
      setIsCreatingProject(true);
      addLog('Creating test project with fresh client...');
      
      // Get a fresh client or create one if not already available
      const client = freshClient || recreateClient();
      if (!client) {
        throw new Error('Failed to get a fresh Supabase client');
      }
      
      const projectId = uuidv4();
      const newProject = {
        id: projectId,
        name: `Test Project ${new Date().toISOString().slice(0, 16)}`,
        clientName: 'Test Client',
        startTime: new Date().toISOString(),
        status: ProjectStatus.NOT_STARTED,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        priority: ProjectPriority.MEDIUM,
        budget: 1000,
        advancePayment: 300,
        partialPayments: 0,
        pendingPayment: 700
      };
      
      // First try to insert the project with the fresh client
      addLog(`Inserting project with ID: ${projectId} using fresh client`);
      const { data: projectData, error: projectError } = await client
        .from('projects')
        .insert([newProject])
        .select()
        .single();
      
      if (projectError) {
        addLog(`Error creating project with fresh client: ${projectError.message}`);
        toast({
          variant: 'destructive',
          title: 'Project creation failed',
          description: projectError.message,
        });
        setIsCreatingProject(false);
        return;
      }
      
      addLog(`Project created successfully with fresh client: ${projectData.id}`);
      
      // Now add a project member with the fresh client
      const projectMember = {
        project_id: projectId,
        user_id: uuidv4() // Just a random user ID for testing
      };
      
      addLog('Adding project member with fresh client...');
      const { error: memberError } = await client
        .from('project_members')
        .insert([projectMember]);
      
      if (memberError) {
        addLog(`Error adding project member with fresh client: ${memberError.message}`);
        toast({
          variant: 'destructive',
          title: 'Project member creation failed',
          description: memberError.message,
        });
        setIsCreatingProject(false);
        return;
      }
      
      addLog('Project member added successfully with fresh client');
      
      // Check projects count with the standard client to avoid confusion
      await checkProjectsTable();
      
      toast({
        title: 'Test project created',
        description: 'A test project was successfully created with fresh client',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error creating test project with fresh client: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Error creating test project',
        description: errorMessage,
      });
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Force refresh the Supabase client by recreating it
  const refreshSupabaseClient = async () => {
    try {
      setIsRefreshingSchema(true);
      addLog('Refreshing Supabase client schema cache...');
      
      // Force reload the page to refresh the client
      // This is the most reliable way to clear the schema cache
      addLog('Reloading the application to refresh schema cache...');
      
      // Create a small delay to allow logs to be seen
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      // Note: We don't need to set isRefreshingSchema to false since we're reloading
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error refreshing schema cache: ${errorMessage}`);
      setIsRefreshingSchema(false);
    }
  };

  const fixDatabaseSchema = async () => {
    try {
      setIsFixingSchema(true);
      addLog('Checking and fixing database schema...');
      
      // Direct SQL approach to check columns and add if needed
      const directSql = `
        DO $$
        BEGIN
          -- Check and add advancePayment column
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'projects' AND column_name = 'advancePayment'
          ) THEN
            ALTER TABLE projects ADD COLUMN "advancePayment" NUMERIC DEFAULT 0;
            RAISE NOTICE 'Added advancePayment column';
          END IF;
          
          -- Check and add partialPayments column
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'projects' AND column_name = 'partialPayments'
          ) THEN
            ALTER TABLE projects ADD COLUMN "partialPayments" NUMERIC DEFAULT 0;
            RAISE NOTICE 'Added partialPayments column';
          END IF;
          
          -- Check and add pendingPayment column
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'projects' AND column_name = 'pendingPayment'
          ) THEN
            ALTER TABLE projects ADD COLUMN "pendingPayment" NUMERIC DEFAULT 0;
            RAISE NOTICE 'Added pendingPayment column';
          END IF;
          
          -- Check and add budget column
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'projects' AND column_name = 'budget'
          ) THEN
            ALTER TABLE projects ADD COLUMN "budget" NUMERIC DEFAULT 0;
            RAISE NOTICE 'Added budget column';
          END IF;
        END;
        $$;
      `;
      
      addLog('Executing SQL to ensure all columns exist...');
      const { error: sqlError } = await supabase.rpc('execute_sql', { sql: directSql });
      
      if (sqlError) {
        addLog(`Error executing SQL: ${sqlError.message}`);
        
        // Try individual column additions if the PL/pgSQL block fails
        addLog('Trying individual column additions...');
        const columns = ['advancePayment', 'partialPayments', 'pendingPayment', 'budget'];
        
        for (const col of columns) {
          const { error: colError } = await supabase.rpc('execute_sql', { 
            sql: `ALTER TABLE projects ADD COLUMN IF NOT EXISTS "${col}" NUMERIC DEFAULT 0;` 
          });
          
          if (colError) {
            addLog(`Error adding ${col}: ${colError.message}`);
          } else {
            addLog(`Successfully added or confirmed ${col} column`);
          }
        }
      } else {
        addLog('SQL executed successfully to add any missing columns');
      }
      
      toast({
        title: 'Schema fixed',
        description: 'Database schema has been updated. Please refresh the schema cache.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error fixing database schema: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Schema fix error',
        description: errorMessage,
      });
    } finally {
      setIsFixingSchema(false);
    }
  };
  
  const createProjectsTable = async () => {
    try {
      addLog('Creating projects table with all required columns...');
      const { error } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS projects (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            "clientName" TEXT NOT NULL,
            "startTime" TEXT NOT NULL,
            status TEXT NOT NULL,
            deadline TEXT NOT NULL,
            priority TEXT NOT NULL,
            budget NUMERIC DEFAULT 0,
            "advancePayment" NUMERIC DEFAULT 0,
            "partialPayments" NUMERIC DEFAULT 0,
            "pendingPayment" NUMERIC DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
        `
      });
      
      if (error) {
        addLog(`Error creating projects table: ${error.message}`);
        return false;
      }
      
      addLog('Projects table created successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error creating projects table: ${errorMessage}`);
      return false;
    }
  };

  const runMigration = async () => {
    try {
      setIsRunningMigration(true);
      addLog('Running database migration...');
      
      const success = await runColumnMigration();
      
      if (success) {
        addLog('Migration completed successfully');
        toast({
          title: 'Migration successful',
          description: 'Database columns have been added successfully',
        });
      } else {
        addLog('Migration had some errors - check console');
        toast({
          variant: 'destructive',
          title: 'Migration issues',
          description: 'There were some issues with the migration. Check logs for details.',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error during migration: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Migration error',
        description: errorMessage,
      });
    } finally {
      setIsRunningMigration(false);
    }
  };

  // Create a dedicated test for the problematic fields
  const testAdvancePaymentField = async () => {
    try {
      addLog('Testing advanced payment field specifically...');
      
      // Get a fresh client
      const client = getFreshClient();
      addLog('Created fresh client for advancePayment test');
      
      // Create a test project with all the financial fields
      const projectId = uuidv4();
      const testProject = {
        id: projectId,
        name: `Financial Test ${new Date().toISOString().slice(0, 16)}`,
        clientName: 'Financial Client',
        startTime: new Date().toISOString(),
        status: ProjectStatus.NOT_STARTED,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: ProjectPriority.MEDIUM,
        budget: 1000,
        advancePayment: 300,
        partialPayments: 100,
        pendingPayment: 600,
        assignedTo: ['User1', 'User2']
      };
      
      // First check if the column exists
      addLog('Testing if advancePayment column exists directly...');
      const { data: columnData, error: columnError } = await client
        .from('projects')
        .select('advancePayment')
        .limit(1);
        
      if (columnError) {
        addLog(`Error confirming advancePayment column: ${columnError.message}`);
        toast({
          variant: 'destructive',
          title: 'Column check failed',
          description: columnError.message,
        });
        return;
      }
      
      addLog('AdvancePayment column exists and is accessible');
      
      // Now insert the project
      addLog(`Inserting project with ID: ${projectId} with advancePayment field`);
      const { data: projectData, error: projectError } = await client
        .from('projects')
        .insert([testProject])
        .select()
        .single();
      
      if (projectError) {
        addLog(`Error in advancePayment test: ${projectError.message}`);
        toast({
          variant: 'destructive',
          title: 'Financial test failed',
          description: projectError.message,
        });
        return;
      }
      
      addLog(`Financial test successful! Project ID: ${projectData.id}`);
      addLog(`Project created with advancePayment: ${projectData.advancePayment}`);
      
      toast({
        title: 'Financial test successful',
        description: 'Project created with all financial fields including advancePayment',
      });
      
      // Check projects count after the test
      await checkProjectsTable();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error in advancePayment test: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Financial test error',
        description: errorMessage,
      });
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <span className="font-bold">Status: </span>
              {status === 'checking' && <span className="text-yellow-500">Checking...</span>}
              {status === 'connected' && <span className="text-green-500">Connected</span>}
              {status === 'error' && <span className="text-red-500">Error</span>}
            </div>
            
            {error && (
              <div className="text-red-500 mb-4">
                <span className="font-bold">Error: </span>
                {error}
              </div>
            )}
            
            {projectsCount !== null && (
              <div className="mb-4">
                <span className="font-bold">Projects Count: </span>
                {projectsCount}
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 mb-3">
              <Button onClick={checkConnection}>Test Connection</Button>
              <Button onClick={runSetupDatabase}>Setup Database</Button>
              <Button onClick={checkProjectsTable}>Check Projects Table</Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <Button 
                onClick={createTestProject} 
                disabled={isCreatingProject || status !== 'connected'}
                className="bg-green-500 hover:bg-green-600"
              >
                Create Project (Standard)
              </Button>
              
              <Button 
                onClick={createTestProjectWithFreshClient}
                disabled={isCreatingProject || status !== 'connected'}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                Create Project (Fresh Client)
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <Button 
                onClick={fixDatabaseSchema}
                disabled={isFixingSchema || status !== 'connected'}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                {isFixingSchema ? 'Fixing Schema...' : 'Fix Database Schema'}
              </Button>
              
              <Button 
                onClick={runMigration}
                disabled={isRunningMigration || status !== 'connected'}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {isRunningMigration ? 'Running Migration...' : 'Run Column Migration'}
              </Button>
              
              <Button 
                onClick={refreshSupabaseClient}
                disabled={isRefreshingSchema}
                className="bg-purple-500 hover:bg-purple-600"
              >
                {isRefreshingSchema ? 'Refreshing...' : 'Refresh Schema Cache'}
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={recreateClient}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Create Fresh Client
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={testAdvancePaymentField}
                variant="outline"
              >
                Test AdvancePayment
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 p-2 rounded h-80 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {log}
                </div>
              ))}
            </div>
            <div className="mt-2">
              <Button variant="outline" onClick={() => setLogs([])}>Clear Logs</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestSupabase; 