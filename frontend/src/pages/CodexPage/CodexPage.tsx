// frontend/src/pages/CodexPage/CodexPage.tsx


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dbFetch as dbFetch, dbRegister } from '../../services/database';
import { supabase } from '../../services/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../utils/localizer';
import UserProtectedRoute from '../../components/UserProtectedRoute/UserProtectedRoute';
import { userValidation } from '../../utils/userValidation';
import { sync } from '../../utils/sync.ts';
import { useAuth } from '../../contexts/AuthContext';

import type { Entry, EntryCategory } from '../../../../models/entry.ts';
import { Ability } from '../../../../models/ability.ts';
import type { Item } from '../../../../models/item.ts';
import { ItemFactory } from '../../../../models/itemFactory.ts';
import { Character } from '../../../../models/character.ts';
import { Catalogue } from '../../../../models/catalogue.ts';

import AbilityWindow from './entryWindows/AbilityWindow.tsx';
import ItemWindow from './entryWindows/ItemWindow.tsx';
import CharacterWindow from './entryWindows/CharacterWindow.tsx';
import CatalogueWindow from './entryWindows/CatalogueWindow.tsx';

import styles from './CodexPage.module.css';


type Mode = 'vis' | 'cus';

interface EntryBio {
    key: string;
    name: string | null;
    category: EntryCategory;
}

const RECENT_STORAGE_KEY = 'codex-recent-keys';
const MAX_RECENT = 12;
const DEBOUNCE_MS = 300;
export const AUTOSAVE_DELAY = 300;
export const ALL_CATEGORIES: EntryCategory[] = [
    'CHARACTER', 'ABILITY', 'ITEM', 'CATALOGUE'
];

const loadRecent = (): EntryBio[] => {
    try { return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) ?? '[]'); }
    catch { return []; }
};
const saveRecent = (list: EntryBio[]) => localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(list));
const pushRecent = (entry: EntryBio): EntryBio[] => {
    const updated = [entry, ...loadRecent().filter(r => r.key !== entry.key)].slice(0, MAX_RECENT);
    saveRecent(updated);
    return updated;
};
const removeRecent = (key: string): EntryBio[] => {
    const updated = loadRecent().filter(r => r.key !== key);
    saveRecent(updated);
    return updated;
};

interface Props {
    initialMode?: Mode;
    showSwitch?:  boolean;
}

const CodexPage: React.FC<Props> = ({ initialMode = 'vis', showSwitch = true }) => {

    const { account, setAccount } = useAuth();
    const { language } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const urlMode = searchParams.get('m') as Mode | null;
    const urlKey  = searchParams.get('e');

    const [mode, setMode]  = useState<Mode>(urlMode ?? initialMode);
    const [pageEntry, setPageEntry] = useState<Entry | null>(null);
    const [isNewEntry, setIsNewEntry] = useState(false);
    const [loadingEntry, setLoadingEntry] = useState(false);
    const [recent, setRecent] = useState<EntryBio[]>(loadRecent);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<EntryBio[]>([]);
    const [searching, setSearching] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<EntryCategory[]>([]);

    const [sidebarHovered, setSidebarHovered] = useState(false);
    const [sidebarPinned, setSidebarPinned] = useState(false);
    const [pinnedExpanded, setPinnedExpanded] = useState(false);
    const sidebarExpanded = sidebarPinned ? pinnedExpanded : sidebarHovered;

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const isDirtyRef = useRef(false);
    const snapshotRef = useRef<(() => void) | null>(null);

    useEffect(() => {
 
        if (snapshotRef.current) { snapshotRef.current(); snapshotRef.current = null; }
        if (!pageEntry || isNewEntry) return;
    
        const key = pageEntry['key'];
    
        const channel = supabase
            .channel(`entry-watch:${key}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'entries',
                    filter: `id=eq.${key}`,
                },
                (payload) => {
                    if (isDirtyRef.current) return;
    
                    if (payload.eventType === 'DELETE') {
                        setPageEntry(null);
                        setIsNewEntry(false);
                        syncUrl(mode, null);
                        return;
                    }

                    const raw = (payload.new as any)?.data;
                    if (!raw) return;

                    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    setPageEntry(parsed as Entry);
                }
            )
            .subscribe((_status) => {

            });
    
        snapshotRef.current = () => supabase.removeChannel(channel);

        return () => {
            if (snapshotRef.current) { snapshotRef.current(); snapshotRef.current = null; }
        };
    
    }, [pageEntry?.['key'], isNewEntry]);

    useEffect(() => {
        if (!pageEntry || isNewEntry) return;
        setRecent(prev => {
            if (!prev.some(r => r.key === pageEntry['key'])) return prev;
            const updated = prev.map(r => r.key === pageEntry['key']
                ? { ...r, name: pageEntry['name'], category: pageEntry['category'] }
                : r);
            saveRecent(updated);
            return updated;
        });
    }, [pageEntry?.['key'], pageEntry?.['name'], pageEntry?.['category'], isNewEntry]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setDropdownOpen(false);
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (urlKey) loadEntry(urlKey);
    }, [urlKey]);

    useEffect(() => {
        if (urlMode && urlMode !== mode) setMode(urlMode);
    }, [urlMode]);

    const toggleMode = useCallback(() => {
        setMode(prev => {
            const next = prev === 'vis' ? 'cus' : 'vis';
            if (pageEntry) syncUrl(next, pageEntry['key']);
            return next;
        });
    }, [pageEntry]);

    useEffect(() => {
        if (!showSwitch) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== 'c') return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
            toggleMode();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [showSwitch, toggleMode]);

    const syncUrl = useCallback((m: Mode, key: string | null) => {
        if (!key) { navigate('/codex', { replace: true }); return; }
        navigate(`/codex?m=${m}&e=${key}`, { replace: true });
    }, [navigate]);

    const runSearch = useCallback(async (term: string, filters: EntryCategory[]) => {
        if (!term.trim()) { setResults([]); setDropdownOpen(false); return; }
        setSearching(true);
        try {
            let q = supabase.from('entries').select('id, name, category').ilike('name', `%${term}%`).limit(20);
            if (filters.length > 0) q = q.in('category', filters);
            const { data, error } = await q;
            if (error || !data) { setResults([]); return; }
            setResults(data.map(d => ({ key: d.id, name: d.name, category: d.category })));
            setDropdownOpen(true);
        } finally { setSearching(false); }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runSearch(query, activeFilters), DEBOUNCE_MS);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, activeFilters, runSearch]);

    const loadEntry = async (key: string) => {

        setLoadingEntry(true);

        const effectiveMode = urlMode ?? mode;

        let entry = await dbFetch(`entries/${key}`);
        if (!entry) {
            setRecent(prev => { const u = prev.filter(r => r.key !== key); saveRecent(u); return u; });
            setPageEntry(null);
            setIsNewEntry(false);
            syncUrl(effectiveMode, null);
            setLoadingEntry(false);
            return;
        }

        if (entry instanceof Character) entry = await sync(entry);

        const bio: EntryBio = { key: entry['key'], name: entry['name'], category: entry['category'] };
        setPageEntry(entry);
        setIsNewEntry(false);
        setRecent(pushRecent(bio));
        syncUrl(effectiveMode, key);
        setLoadingEntry(false);

    };

    const createNewEntry = () => {

        const newTool = new Ability();
        setPageEntry(newTool as unknown as Entry);
        setIsNewEntry(true);
        syncUrl(mode, null);

    };

    const handleEntrySaved = () => {

        if (!pageEntry) return;

        const bio: EntryBio = { key: pageEntry['key'], name: pageEntry['name'], category: pageEntry['category'] };
        setIsNewEntry(false);
        setRecent(pushRecent(bio));
        syncUrl(mode, pageEntry['key']);

    };

    const handleCategoryChange = (category: EntryCategory) => {

        if (!pageEntry) return;

        setPageEntry({ ...pageEntry, category: category } as Entry);

    };

    const handleEntryDeleted = async () => {

        if (!pageEntry) return;

        if (pageEntry['category'] === 'CHARACTER' && account?.user) {
            const currentCharacters = await dbFetch(`users/${account.user.id}/characters`) as string[] | null;
            const updatedCharacters = (currentCharacters ?? account.characters ?? []).filter(k => k !== pageEntry['key']);
            const ok = await dbRegister(`users/${account.user.id}`, { characters: updatedCharacters });
            if (ok) setAccount({ characters: updatedCharacters });
        }

        setRecent(removeRecent(pageEntry['key']));
        setPageEntry(null);
        setIsNewEntry(false);
        syncUrl(mode, null);

    };

    const typedPageEntry = React.useMemo(() => {
        if (!pageEntry) return null;
        switch (pageEntry['category']) {
            case 'ABILITY': return new Ability(pageEntry as any);
            case 'ITEM': return ItemFactory.instantiate(pageEntry);
            case 'CHARACTER': return new Character(pageEntry as any);
            case 'CATALOGUE': return new Catalogue(pageEntry as any);
            default: return null;
        }
    }, [pageEntry]);

    const renderSubPage = () => {

        if (!pageEntry) return null;

        const commonProps = {
            isNew: isNewEntry,
            customization: mode === 'cus',
            onCategoryChange: handleCategoryChange,
            onSaved: handleEntrySaved,
            onDeleted: handleEntryDeleted,
            onDirtyChange: (dirty: boolean) => { isDirtyRef.current = dirty; },
        };

        switch (pageEntry['category']) {
            case 'ABILITY': return <AbilityWindow ability={typedPageEntry as Ability} {...commonProps} />;
            case 'ITEM': return <ItemWindow item={typedPageEntry as Item} {...commonProps} />;
            case 'CHARACTER': return <CharacterWindow character={typedPageEntry as Character} {...commonProps} />;
            case 'CATALOGUE': return <CatalogueWindow catalogue={typedPageEntry as Catalogue} {...commonProps} />;
            default: return null;
        }

    };

    const selectFromSearch = (bio: EntryBio) => {
        setDropdownOpen(false);
        setQuery('');
        loadEntry(bio.key);
    };

    const selectFromRecent = (bio: EntryBio) => {
        loadEntry(bio.key);
    };

    const deleteFromRecent = (e: React.MouseEvent, key: string) => {
        e.stopPropagation();
        setRecent(removeRecent(key));
        if (pageEntry?.['key'] === key) { setPageEntry(null); setIsNewEntry(false); syncUrl(mode, null); }
    };

    const toggleFilter = (cat: EntryCategory) => {
        setActiveFilters(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    };

    const handleSearchSubmit = () => {
        if (results.length > 0) selectFromSearch(results[0]);
    };

    const SubPageContainer = () => <>
        <div className={styles.subpage}>
            <UserProtectedRoute validation={mode === 'vis' || userValidation(account, ['admin'], 'OR', pageEntry?.['key'] ?? '')} returnHome={false}>
                <>
                    {
                        loadingEntry ? 
                        <div className={styles.subpageLoading}>...</div>
                        : renderSubPage()
                    }
                </>
            </UserProtectedRoute>
        </div>
    </>

    const PinContainer = () => <>
        <button
            className={`${styles.pinBtn}${sidebarPinned ? ` ${styles.pinBtnActive}` : ''}`}
            onClick={() => { if(sidebarPinned){setSidebarPinned(false);} else{setSidebarPinned(true); setPinnedExpanded(sidebarHovered);}; }}
            title={sidebarPinned ? 'Unpin' : 'Pin current state'}
        >
            {sidebarPinned ? '◈' : '◇'}
        </button>
    </>

    const NewEntryButtonContainer = () => <>
        <button className={styles.newEntryBtn} onClick={createNewEntry}>
            + {t({ text: 'new-entry', language, mode: 'UPPERCASE' })}
        </button>
    </>

    const RecentEntriesListContainer = () => <>
        <div className={styles.recentsList}>
            {recent.length === 0 ? (
                <div className={styles.recentsEmpty}>—</div>
            ) : (
                recent.map(r => (
                    <div
                        key={r.key}
                        className={`${styles.recentItem}${pageEntry?.['key'] === r.key ? ` ${styles.recentItemActive}` : ''}`}
                        onClick={() => selectFromRecent(r)}
                    >
                        <div className={styles.recentItemContent}>
                            <span className={styles.recentName}>{r.name}</span>
                            {sidebarExpanded && (
                                <span className={styles.recentCategory}>
                                    {t({ text: r.category, language, mode: 'TITLECASE' })}
                                </span>
                            )}
                        </div>
                        {sidebarExpanded && (
                            <button
                                className={styles.recentRemove}
                                onClick={e => deleteFromRecent(e, r.key)}
                            >×</button>
                        )}
                    </div>
                ))
            )}
        </div>
    </>

    const ModeSwitchContainer = () => <>
        <button
            className={`${styles.modeSwitch}${mode === 'cus' ? ` ${styles.modeSwitchCus}` : ''}`}
            onClick={toggleMode}
            role="switch"
            aria-checked={mode === 'cus'}
        >
            <span className={styles.modeSwitchTrack}>
                <span className={`${styles.modeSwitchThumb}${mode === 'cus' ? ` ${styles.modeSwitchThumbOn}` : ''}`} />
            </span>
            {sidebarExpanded && (
                <span className={styles.modeSwitchLabel}>
                    {mode === 'vis'
                        ? t({ text: 'vis', language, mode: 'UPPERCASE' })
                        : t({ text: 'cus', language, mode: 'UPPERCASE' })
                    }
                </span>
            )}
        </button>
    </>

    const SearchContainer = () => <>
        <div className={styles.searchArea} ref={searchRef}>
            {sidebarExpanded && (
                <div className={styles.filterWrapper} ref={filterRef}>
                    <button
                        className={`${styles.filterBtn}${activeFilters.length > 0 ? ` ${styles.filterBtnActive}` : ''}`}
                        onClick={() => setFilterOpen(o => !o)}
                    >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        {activeFilters.length > 0 && (
                            <span className={styles.filterBadge}>{activeFilters.length}</span>
                        )}
                    </button>
                    {filterOpen && (
                        <div className={styles.filterDropdown}>
                            {ALL_CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    className={`${styles.filterOption}${activeFilters.includes(cat) ? ` ${styles.filterOptionActive}` : ''}`}
                                    onClick={() => toggleFilter(cat)}
                                >
                                    {t({ text: cat, language, mode: 'TITLECASE' })}
                                </button>
                            ))}
                            {activeFilters.length > 0 && (
                                <>
                                    <div className={styles.filterDivider} />
                                    <button className={styles.filterClear} onClick={() => setActiveFilters([])}>
                                        {t({ text: 'clear-filters', language, mode: 'PLAIN_FIRST_UPPER' })}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            <input
                className={styles.searchInput}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => { if (results.length > 0) setDropdownOpen(true); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit(); }}
                placeholder="..."
            />
            {searching && <span className={styles.searchSpinner} />}

            {sidebarExpanded && (
                <button
                    className={styles.searchSubmitBtn}
                    onClick={handleSearchSubmit}
                    disabled={results.length === 0}
                >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </button>
            )}

            {dropdownOpen && results.length > 0 && (
                <div className={styles.searchDropdown}>
                    {results.map(r => (
                        <button key={r.key} className={styles.searchOption} onClick={() => selectFromSearch(r)}>
                            <span className={styles.searchOptionName}>{r.name}</span>
                            {sidebarExpanded && (
                                <span className={styles.searchOptionCategory}>
                                    {t({ text: r.category, language, mode: 'TITLECASE' })}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    </>

    return (
        <div className={styles.page}>
            <div className={styles.sidebarWrapper}>
                <div className={`${styles.sidebar}${sidebarExpanded ? ` ${styles.sidebarExpanded}` : ''}`} onMouseEnter={() => setSidebarHovered(true)} onMouseLeave={() => setSidebarHovered(false)}>
                    <div className={styles.sidebarTop}>
                        {showSwitch && ModeSwitchContainer()}
                        {SearchContainer()}
                    </div>
                    {mode === 'cus' && sidebarExpanded && NewEntryButtonContainer()}
                    {RecentEntriesListContainer()}
                </div>
                {PinContainer()}
            </div>
            {SubPageContainer()}
        </div>
    );

};


export default CodexPage;