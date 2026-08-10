// frontend/src/components/FloatingSearch/FloatingSearch.tsx


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../utils/localizer';
import type { EntryCategory } from '../../../../models/entry';

import styles from './FloatingSearch.module.css';


export interface FloatingSearchResult {
    key: string;
    name: string;
    category: EntryCategory;
}

const DEBOUNCE_MS = 250;

interface Props {
    categories?: EntryCategory[]; // EMPTY = ALL
    onSelect: (result: FloatingSearchResult) => void;
    onClose: () => void;
    anchorRef?: React.RefObject<HTMLElement>; 
    placeholder?: string;
}

const FloatingSearch: React.FC<Props> = ({ categories = [], onSelect, onClose, placeholder }) => {

    const { language } = useLanguage();

    const [query, setQuery]       = useState('');
    const [results, setResults]   = useState<FloatingSearchResult[]>([]);
    const [searching, setSearching] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef    = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => { 
        inputRef.current?.focus();
     }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const runSearch = useCallback(async (term: string) => {
        if (!term.trim()) { setResults([]); return; }
        setSearching(true);
        try {
            let q = supabase
                .from('entries')
                .select('id, name, category')
                .ilike('name', `%${term}%`)
                .limit(15);
            if (categories.length > 0) q = q.in('category', categories);
            const { data, error } = await q;
            if (error || !data) { setResults([]); return; }
            setResults(data.map(d => ({ key: d.id, name: d.name, category: d.category })));
        } finally { setSearching(false); }
    }, [categories]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, runSearch]);

    // COMPONENTS: --------------------------------------------------------------------------------------------------------------

    const InputRowContainer = () => <>
        <div className={styles.inputRow}>
            <input
                ref={inputRef}
                className={styles.input}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={placeholder ?? t({ text: 'search-entries', language, mode: 'PLAIN_FIRST_UPPER' })}
            />
            {searching && <span className={styles.spinner} />}
            <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
    </>

    const ResultsListContainer = () => <>
        <div className={styles.results}>
            {results.map(r => (
                <button
                    key={r.key}
                    className={styles.result}
                    onClick={() => { onSelect(r); onClose(); }}
                >
                    <span className={styles.resultName}>{r.name}</span>
                    <span className={styles.resultCategory}>
                        {t({ text: r.category, language, mode: 'TITLECASE' })}
                    </span>
                </button>
            ))}
        </div>
    </>

    // --------------------------------------------------------------------------------------------------------------------------

    return (
        <div className={styles.container} ref={containerRef}>
            {InputRowContainer()}
            {(results.length>0) && ResultsListContainer()}
            {query.trim() && !searching && results.length === 0 && (<div className={styles.empty}>—</div>)}
        </div>
    );

};


export default FloatingSearch;