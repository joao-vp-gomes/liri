// frontend/src/contexts/AuthContext.tsx


import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import type { User } from '@supabase/supabase-js';
import type { RoleType } from '../types/roleType';


const MAX_RETRIES = 3;
const REALTIME_ECHO_GRACE_MS = 800;

export interface Account {
    user: User | null;
    role: RoleType | null;
    name: string | null;
    image: number | null;
    characters: string[];
}

interface AuthContextType {
    account: Account | null;
    setAccount: (data: Partial<Account>) => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    account: null, setAccount: () => {}, loading: true
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {

    const [account, setAccount] = useState<Account | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const lastLocalWriteRef = useRef(0);

    const setAccountPartially = (data: Partial<Account>) => {
        lastLocalWriteRef.current = Date.now();
        setAccount(d => (
            d 
            ? { ...d, ...data } 
            : { user: null, role: null, name: null, image: null, characters: [], ...data }
        ));
    };

    const loadUserData = async (id: string, retries = MAX_RETRIES): Promise<void> => {

        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (data) {
            setAccountPartially({
                role: data.role,
                name: data.name,
                image: data.image,
                characters: data.characters ?? [],
            });
        } 
        else if (retries > 0) setTimeout(() => loadUserData(id, retries - 1), 500);
        else await supabase.auth.signOut();
        
    };

    useEffect(() => {

        let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

        const setupRealtime = (id: string) => {

            realtimeChannel = supabase
                .channel(`users:${id}`)
                .on('postgres_changes', {
                    event:  '*',
                    schema: 'public',
                    table:  'users',
                    filter: `id=eq.${id}`
                }, async (payload) => {
                    if (payload.eventType === 'DELETE') {
                        await supabase.auth.signOut();
                        return;
                    }
                    if (Date.now() - lastLocalWriteRef.current < REALTIME_ECHO_GRACE_MS) return;
                    const data = payload.new as Account;
                    setAccountPartially({
                        role: data.role,
                        name: data.name,
                        image: data.image,
                        characters: data.characters ?? [],
                    });
                })
                .subscribe();
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setAccountPartially({ user: session.user });
                loadUserData(session.user.id).then(() => {
                    setupRealtime(session.user!.id);
                    setLoading(false);
                });
            } else setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {

            if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }

            if (session?.user) {
                setAccountPartially({ user: session.user });
                loadUserData(session.user.id).then(() => {
                    setupRealtime(session.user!.id);
                });
            } else {
                console.log('ACCESS DENIED');
                setAccount(null);
                setLoading(false);
            }

        });

        return () => {
            subscription.unsubscribe();
            if (realtimeChannel) supabase.removeChannel(realtimeChannel);
        };

    }, []);

    return (
        <AuthContext.Provider value={{ account, setAccount: setAccountPartially, loading }}>
            {children}
        </AuthContext.Provider>
    );

};


export const useAuth = () => useContext(AuthContext);