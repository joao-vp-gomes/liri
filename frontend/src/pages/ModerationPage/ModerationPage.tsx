// frontend/src/pages/ModerationPage/ModerationPage.tsx


import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../utils/localizer';
import MemberCard, { type UserDoc } from './components/MemberCard';
import AnonCard, { type AnonDoc } from './components/AnonCard';
import CreateMemberCard from './components/CreateMemberCard';

import styles from './ModerationPage.module.css';


const ModerationPage: React.FC = () => {

    const { language } = useLanguage();
    const [members, setMembers] = useState<UserDoc[]>([]);
    const [anons, setAnons] = useState<AnonDoc[]>([]);

    useEffect(() => {
        const channel = supabase
            .channel('users-moderation')
            .on('postgres_changes', {
                event:  '*',
                schema: 'public',
                table:  'users',
            }, () => { loadUsers(); })
            .subscribe();
        loadUsers();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const loadUsers = async () => {
        const { data } = await supabase.from('users').select('*');
        if (!data) return;

        const ms: UserDoc[] = [];
        const as_: AnonDoc[] = [];
        const fixes: Promise<any>[] = [];

        data.forEach(d => {
            if (d.role === 'anon') {
                as_.push({ uid: d.id, name: d.name, created_at: d.created_at });
            } else if (d.role === 'member') {
                ms.push({ uid: d.id, name: d.name, role: d.role, image: d.image, characters: d.characters });
            } else if (d.role === 'admin') {
                // IGNORING
            } else {
                fixes.push(Promise.resolve(supabase.from('users').update({ role: 'member' }).eq('id', d.id)));
                ms.push({ uid: d.id, name: d.name, role: 'member', image: d.image, characters: d.characters });
            }
        });

        await Promise.all(fixes);
        setMembers(ms);
        setAnons(as_);
    };

    return (
        <>
            <div className={styles.page}>

                <div className={styles.pageTitle}>{t({text: 'moderation', language: language, mode: 'TITLECASE'})}</div>
                
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>
                        {t({ text: 'members', language, mode: 'UPPERCASE' })}
                    </div>
                    <div className={styles.cardList}>
                        {members.map(u => <MemberCard key={u.uid} user={u} />)}
                        <CreateMemberCard />
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionTitle}>
                        {t({ text: 'anonymous', language, mode: 'UPPERCASE' })}
                    </div>
                    <div className={styles.cardList}>
                        {anons.length === 0
                            ? <div className={styles.empty}>{t({ text: 'no-anonymous', language, mode: 'PLAIN_FIRST_UPPER' })}</div>
                            : anons.map(u => <AnonCard key={u.uid} user={u} />)
                        }
                    </div>
                </div>

            </div>
        </>
    );

};

export default ModerationPage;