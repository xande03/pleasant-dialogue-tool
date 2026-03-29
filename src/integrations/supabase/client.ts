import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qilfwtzkzwwtwaxvdctv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MsU4zlEAX-X-CunDEYyqPg_otls-VX3";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
