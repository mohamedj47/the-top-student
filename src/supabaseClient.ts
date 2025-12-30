import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://baoxsvfcwzupyoaajrbm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhb3hzdmZjd3p1cHlvYWFqcmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODU3ODIsImV4cCI6MjA4MjY2MTc4Mn0.RPX8FVarN3GH3Db4Dj8FEgY1ZnTaFRBd4DR-j5mHcpk';

export const supabase = createClient(supabaseUrl, supabaseKey);
