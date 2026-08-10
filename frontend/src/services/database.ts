// frontend/src/services/database.ts


import { supabase } from './supabase';
import { EntryFactory } from '../../../models/entryFactory.ts';
import { Entry } from '../../../models/entry.ts';


// HELPERS: ───────────────────────────────────────────────────────────────────────────────────────────────────────────

const parsePath = (path: string) => {
    const parts = path.split('/').filter(Boolean);
    const table = parts[0];
    const id    = parts[1] ?? null;
    const field = parts.slice(2);
    return { table, id, field };
};


// FETCH(SELECT): ─────────────────────────────────────────────────────────────────────────────────────────────────────

export const dbFetch = async (path: string): Promise<any> => {
    const { table, id, field } = parsePath(path);
    try {
        if (!id) {
            const { data, error } = await supabase.from(table).select('*');
            if (error) return null;
            if (table === 'entries') return data.map((d: any) => EntryFactory.instantiate(d.data));
            return data;
        }
        const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
        if (error || !data) return null;
        if (table === 'entries') {
            const entry = EntryFactory.instantiate(data.data);
            if (!field.length) return entry;
            return field.reduce((obj, key) => obj?.[key] ?? null, entry as any);
        }
        if (!field.length) return data;
        return field.reduce((obj, key) => obj?.[key] ?? null, data as any);
    } catch { return null; }
};


// REGISTER(INSERT, UPDATE): ──────────────────────────────────────────────────────────────────────────────────────────

export const dbRegister = async (path: string, data: any): Promise<boolean> => {
    const { table, id } = parsePath(path);
    try {
        if (table === 'entries') {
            const entry = data as Entry;
            const row = {
                id: entry['key'],
                category: entry['category'],
                name: entry['name'],
                data: JSON.parse(JSON.stringify(entry)),
            };
            const { error } = await supabase.from(table).upsert(row);
            return !error;
        }
        const row = id ? { id, ...data } : data;
        const { error } = await supabase.from(table).upsert(row);
        return !error;
    } catch { return false; }
};


// DEREGISTER(DELETE): ────────────────────────────────────────────────────────────────────────────────────────────────

export const dbDeregister = async (path: string): Promise<boolean> => {
    const { table, id } = parsePath(path);
    if (!id) return false;
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        return !error;
    } catch { return false; }
};