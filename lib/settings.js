import { cache } from 'react';
import { db } from './supabase';

export const DEFAULT_SETTINGS = {
  school_name: "MI Terpadu Manba'ul 'Ulum Buntaran",
  school_address: '',
  program_name: 'PMBM (Penerimaan Murid Baru Madrasah)',
  logo_url: null,
  favicon_url: null,
  social_links: [],
  uniform_sizes: ['5', '6', '7', '7+', '8', 'S', 'S+', 'M', 'L', 'XL', 'XXL'],
  instagram_url: 'https://www.instagram.com/mimu.buntaran',
  tiktok_url: 'https://www.tiktok.com/@mimu.buntaran',
  whatsapp_group_link: '',
  committee_whatsapp: '6285163088163',
};

export const getSettings = cache(async function getSettings() {
  try {
    const { data } = await db().from('school_settings').select('*').eq('id', 1).maybeSingle();
    return { ...DEFAULT_SETTINGS, ...(data || {}) };
  } catch (e) {
    console.error('getSettings:', e.message);
    return DEFAULT_SETTINGS;
  }
});
