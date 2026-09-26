// ============================================
// SUPABASE CLIENT
// ============================================

const SUPABASE_URL = 'https://ubbzkxxmgfvvyvfjfcmo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_miE5iopycXLfLa_XPektzQ_c-GanKnt';

// Переменная называется supa, чтобы не конфликтовать с глобальной supabase из CDN
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('[supabase.js] клиент создан');