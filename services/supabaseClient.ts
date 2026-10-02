import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mqmibsjedlkdwlgftdei.supabase.co'.trim();
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbWlic2plZGxrZHdsZ2Z0ZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDM3MzUsImV4cCI6MjA4MDE3OTczNX0.UVQAVjdqyT-3p10KzTe-O8JRWoSafZNgd7eV4uM-0E8'.trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);