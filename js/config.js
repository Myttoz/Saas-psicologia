// ============================================================================
// Configuração da nuvem (Supabase)
// Project URL: copiada de Project Settings → API (sem o final /rest/v1/).
// Chave anon: pública, pode ficar no site. A segurança é feita pela RLS no
// banco (ver supabase/schema.sql). NUNCA colocar a chave service_role aqui.
// ============================================================================

var CONFIG = {
  usarBackend: true,
  supabaseUrl: 'https://wrdkbafdzjsqonyidrwv.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZGtiYWZkempzcW9ueWlkcnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MTIyNDMsImV4cCI6MjExMDk4ODI0M30.sFhoybS6jwyPmcDgGo7UIb0XN__UPbpNnBGPjgbX0bo'
};
