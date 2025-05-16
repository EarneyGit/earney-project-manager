const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://mpuzbroregxvzhjqlrjo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wdXpicm9yZWd4dnpoanFscmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NDA2MzcsImV4cCI6MjA2MTAxNjYzN30.vDR3zD_OUXlrTtfW84Sauyrf16547bmfFX7CGyJAncw";

// Create a single supabase client for interacting with your database
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Example query to test connectivity
async function testConnection() {
  try {
    // Replace 'your_table' with an actual table in your database
    // This is just to test connectivity
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
    } else {
      console.log('Successfully connected to Supabase!');
      console.log('Data:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection(); 