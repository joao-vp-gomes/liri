// frontend/src/components/HomePageButtons/CharactersButton.tsx


import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';
import { dbFetch as dbFetch, dbRegister, dbDeregister } from '../../../services/database';
import { Character } from '../../../../../models/character.ts';

import styles from '../HomePage.module.css';


const MAX_CHARACTERS = 3;

interface CharacterOption {
    key: string;
    name: string;
}

const CharacterButton: React.FC = () => {

    const navigate = useNavigate();
    const { account, setAccount } = useAuth();
    const { language } = useLanguage();

    const characterKeys = account?.characters ?? [];

    const [characters, setCharacters] = useState<CharacterOption[]>([]);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        let cancelled = false;

        if (characterKeys.length === 0) { setCharacters([]); return; }

        const load = async () => {
            const results = await Promise.all(characterKeys.map(async key => {
                const entry = await dbFetch(`entries/${key}`);
                return { key, name: entry?.name as string | null | undefined };
            }));
            if (cancelled) return;

            setCharacters(
                results
                    .filter(r => r.name != null)
                    .map(r => ({ key: r.key, name: r.name as string }))
            );

            const staleKeys = results.filter(r => r.name == null).map(r => r.key);
            if (staleKeys.length > 0 && account?.user) {
                const cleanedKeys = characterKeys.filter(k => !staleKeys.includes(k));
                const ok = await dbRegister(`users/${account.user.id}`, { characters: cleanedKeys });
                if (ok && !cancelled) setAccount({ characters: cleanedKeys });
            }
        };
        load();

        return () => { cancelled = true; };
    }, [characterKeys]);

    const options: (CharacterOption | 'new')[] = [
        ...characters,
        ...(characters.length < MAX_CHARACTERS ? ['new' as const] : []),
    ];

    const [index, setIndex] = useState(0);
    const current = options[Math.min(index, options.length - 1)];
    const isNew = current === 'new';

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIndex(i => (i - 1 + options.length) % options.length);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIndex(i => (i + 1) % options.length);
    };

    const handleCreateCharacter = async () => {
        if (!account?.user || creating) return;

        setCreating(true);

        const character = new Character();
        character.name = character.key;
        const savedEntry = await dbRegister(`entries/${character.key}`, character);
        if (!savedEntry) { setCreating(false); return; }

        const currentCharacters = await dbFetch(`users/${account.user.id}/characters`) as string[] | null;
        const updatedCharacters = [...(currentCharacters ?? characterKeys), character.key];

        const savedUser = await dbRegister(`users/${account.user.id}`, { characters: updatedCharacters });
        if (!savedUser) {
            await dbDeregister(`entries/${character.key}`);
            setCreating(false);
            return;
        }

        setAccount({ characters: updatedCharacters });
        navigate(`/codex?m=cus&e=${encodeURIComponent(character.key)}`);
    };

    const handleClick = () => {
        if (isNew) { handleCreateCharacter(); return; }
        navigate(`/codex?m=cus&e=${(current as CharacterOption).key}`);
    };

    return (
        <div className={styles.arrowedButtonContainer}>
            {options.length > 1 && (<div className={styles.arrow} onClick={handlePrev}>‹</div>)}

            <button className={styles.largeButton} onClick={handleClick} disabled={creating}>
                {isNew
                    ? <span>{creating ? '…' : t({ text: 'new-character', language, mode: 'UPPERCASE' })}</span>
                    : <span>{(current as CharacterOption).name.toUpperCase()}</span>
                }
            </button>

            {options.length > 1 && (<div className={styles.arrow} onClick={handleNext}>›</div>)}
        </div>
    );

};

export default CharacterButton;
