// frontend/src/services/adminActions.ts


import { supabase } from './supabase';


const call = async (action: string, payload: Record<string, any>): Promise<boolean> => {

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`,
        {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ action, payload })
        }
    );

    return res.ok;

};

export const deleteUser  = (uid: string) => call('delete-user',   { uid });
export const createUser = (email: string, password: string, name: string, image: number) => call('create-user', { email, password, name, image })