// frontend/src/pages/CodexPage/entryWindows/AbilityWindow.tsx


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';
import { dbRegister, dbDeregister } from '../../../services/database';
import { Ability } from '../../../../../models/ability.ts';
import type { EntryCategory } from '../../../../../models/entry.ts';
import type { EffectMode } from '../../../../../models/utils/effect.ts';
import type { Stat, StatsCondition } from '../../../../../models/utils/statsCondition.ts';
import { SKILL_IDENTIFIER_SUGGESTIONS } from '../../../../../models/utils/skill.ts';
import { getImageUrl, useImageUpload } from '../../../services/useImageUpload';
import NumberFieldCard from './NumberFieldCard';
import { ALL_CATEGORIES, AUTOSAVE_DELAY } from '../CodexPage';

import styles from './entryWindows.module.css';


interface Props {
    ability: Ability;
    customization: boolean;
    isNew: boolean;
    onCategoryChange: (cat: EntryCategory) => void;
    onSaved: () => void;
    onDeleted: () => void;
    onDirtyChange?: (dirty: boolean) => void;
}

const REALTIME_ECHO_GRACE_MS = 800;
const ACTION_TYPES: Ability['actionType'][] = ['PRIMARY_ACTION', 'SECONDARY_ACTION', 'REACTION'];
const COST_STATS: Stat[] = ['HEALTH', 'ENERGY', 'FOCUS', 'ANIMA'];
const COST_KEYS = ['startCost', 'durationCost', 'finishCost'] as const;
type CostKey = typeof COST_KEYS[number];
const COST_LABELS: Record<CostKey, string> = {
    startCost: 'start-cost',
    durationCost: 'duration-cost',
    finishCost: 'finish-cost',
};

const withInitializedCosts = (a: Ability): Ability => {
    if (a.startCost === null) a.startCost = {};
    if (a.durationCost === null) a.durationCost = {};
    if (a.finishCost === null) a.finishCost = {};
    return a;
};

const AbilityWindow: React.FC<Props> = ({ ability: initialAbility, customization, isNew, onCategoryChange, onSaved, onDeleted, onDirtyChange }) => {

    const { language } = useLanguage();
    const { uploading, triggerUpload, deleteImage } = useImageUpload();

    const [ability, setAbility] = useState<Ability>(() => withInitializedCosts(new Ability(initialAbility)));
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [pendingDelete, setPendingDelete] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [tempTag, setTempTag] = useState('');

    const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDirtyRef = useRef(false);
    const isFirstRender = useRef(true);
    const categoryRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (isDirtyRef.current) return;
        setAbility(withInitializedCosts(new Ability(initialAbility)));
        setSaveStatus('idle');
        setPendingDelete(false);
    }, [initialAbility]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const scheduleAutosave = useCallback((updated: Ability) => {
        if (!customization || isNew) return;
        if (autosaveRef.current) clearTimeout(autosaveRef.current);
        isDirtyRef.current = true;
        onDirtyChange?.(true);
        setSaveStatus('saving');
        autosaveRef.current = setTimeout(async () => {
            const ok = await dbRegister(`entries/${updated.key}`, updated);
            setTimeout(() => { isDirtyRef.current = false; onDirtyChange?.(false); }, REALTIME_ECHO_GRACE_MS);
            setSaveStatus(ok ? 'saved' : 'error');
        }, AUTOSAVE_DELAY);
    }, [customization, isNew, onDirtyChange]);

    const handleFirstSave = async () => {
        setSaveStatus('saving');
        const ok = await dbRegister(`entries/${ability.key}`, ability);
        if (ok) { setSaveStatus('saved'); onSaved(); }
        else setSaveStatus('error');
    };

    const update = () => {
        const updated = new Ability(ability);
        setAbility(updated);
        scheduleAutosave(updated);
    };

    const handleDelete = async () => {
        if (!pendingDelete) { setPendingDelete(true); return; }
        const ok = await dbDeregister(`entries/${ability.key}`);
        if (ok) onDeleted();
    };

    const NameContainer = () => (
        customization ? (
            <input
                className={styles.nameInput}
                value={ability.name || ''}
                onChange={e => { ability.name = e.target.value; update(); }}
                placeholder={t({ text: 'name', language, mode: 'UPPERCASE' })}
            />
        ) : (<div className={styles.nameDisplay}>{ability.name || '—'}</div>)
    )

    const DescriptionContainer = () => (
        customization ?
        (
            <textarea
                className={styles.descriptionInput}
                value={ability.description || ''}
                onChange={e => { ability.description = e.target.value; update(); }}
                placeholder={t({ text: 'description', language, mode: 'PLAIN_FIRST_UPPER' })}
            />
        ) : (<div className={styles.descriptionDisplay}>{ability.description || '—'}</div>)
    )

    const ImageContainer = () => <>
            <div
                className={`${styles.imageContainer}${customization ? ` ${styles.imageContainerClickable}` : ''}`}
                onClick={() => { if (!customization) return; triggerUpload(ability.key, path => { ability.image = path; update(); }); }}
            >
                <img className={styles.imageImg} src={getImageUrl(ability.image, ability.category)} alt={ability.name || ''} />
                {customization && (
                    <div className={styles.imageOverlay}>
                        {uploading ? '...' : '↑'}
                    </div>
                )}
                {customization && ability.image && (
                    <button
                        className={styles.imageDeleteBtn}
                        onClick={e => {
                            e.stopPropagation();
                            deleteImage(ability.image!, () => { ability.image = null; update(); });
                        }}
                        title="Remove image"
                    >×</button>
                )}
            </div>
    </>

    const KeyContainer = () => <>
        <div className={styles.keyLabel}>{ability.key}</div>
    </>

    const CategoryContainer = () => <>
        <div className={styles.categoryDropdown} ref={categoryRef}>
            <button
                className={styles.categoryBtn}
                onClick={customization ? () => setCategoryOpen(o => !o) : undefined}
                disabled={!customization}
            >
                {t({ text: ability.category, language, mode: 'TITLECASE' })}
                {customization && <span className={styles.dropdownCaret}>▾</span>}
            </button>
            {categoryOpen && (
                <div className={styles.dropdownMenu}>
                    {ALL_CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            className={`${styles.dropdownOption}${cat === ability.category ? ` ${styles.dropdownOptionActive}` : ''}`}
                            onClick={() => { setCategoryOpen(false); onCategoryChange(cat); }}
                        >
                            {t({ text: cat, language, mode: 'TITLECASE' })}
                        </button>
                    ))}
                </div>
            )}
        </div>
    </>

    const TagsContainer = () => <>
        <div className={styles.tagsRow}>
            {ability.tags.map((tag, i) => (
                <div key={i} className={styles.tag}>
                    <span>{tag}</span>
                    {customization && <button className={styles.tagRemove} onClick={() => { ability.tags.splice(i, 1); update(); }}>×</button>}
                </div>
            ))}
            {customization && (
                isAddingTag ? (
                    <input
                        autoFocus
                        className={styles.tagInput}
                        value={tempTag}
                        onChange={e => setTempTag(e.target.value)}
                        onBlur={() => { if(tempTag.trim()) { ability.tags.push(tempTag.trim()); update(); } setIsAddingTag(false); setTempTag(''); }}
                        onKeyDown={e => { if(e.key === 'Enter') e.currentTarget.blur(); if(e.key === 'Escape') { setTempTag(''); setIsAddingTag(false); } }}
                    />
                ) : (
                    <button className={styles.tagAdd} onClick={() => setIsAddingTag(true)}>+</button>
                )
            )}
        </div>
    </>

    const TimingContainer = () => <>
        <div>
            <div className={styles.sectionLabel}>
                {t({ text: 'timing', language, mode: 'UPPERCASE' })}
            </div>
            <div className={styles.fieldsList}>
                <div className={styles.fieldCard}>
                    <div className={styles.fieldName}>{t({ text: 'action-type', language, mode: 'UPPERCASE' })}</div>
                    {customization ? (
                        <select
                            className={styles.identifierSelect}
                            value={ability.actionType}
                            onChange={e => { ability.actionType = e.target.value as Ability['actionType']; update(); }}
                        >
                            {ACTION_TYPES.map(actionType => (
                                <option key={actionType} value={actionType}>{t({ text: actionType, language, mode: 'UPPERCASE' })}</option>
                            ))}
                        </select>
                    ) : (
                        <div className={styles.fieldValueDisplay}>{t({ text: ability.actionType, language, mode: 'UPPERCASE' })}</div>
                    )}
                </div>
                <NumberFieldCard
                    label={t({ text: 'cooldown', language, mode: 'UPPERCASE' })}
                    value={ability.cooldown}
                    customization={customization}
                    onChange={v => { ability.cooldown = v; update(); }}
                    min={-1}
                    infiniteAt={-1}
                />
                <NumberFieldCard
                    label={t({ text: 'duration', language, mode: 'UPPERCASE' })}
                    value={ability.duration}
                    customization={customization}
                    onChange={v => { ability.duration = v; update(); }}
                    min={-1}
                    infiniteAt={-1}
                />
            </div>
        </div>
    </>

    const columnHasNonZeroValue = (costKey: CostKey): boolean => {
        const cost = ability[costKey]!;
        return COST_STATS.some(stat => (cost[stat.toLowerCase() as keyof StatsCondition] ?? 0) !== 0);
    };

    const CostsContainer = () => {
        if (!customization && !COST_KEYS.some(columnHasNonZeroValue)) return null;
        return (
        <div>
            <div className={styles.sectionLabel}>
                {t({ text: 'costs', language, mode: 'UPPERCASE' })}
            </div>
            <div className={styles.costsColumns}>
                {COST_KEYS.map(costKey => {
                    const cost = ability[costKey]!;
                    if (!customization && !columnHasNonZeroValue(costKey)) return null;
                    return (
                        <div key={costKey} className={styles.costsColumn}>
                            <div className={styles.costsColumnHeader}>
                                {t({ text: COST_LABELS[costKey], language, mode: 'UPPERCASE' })}
                            </div>
                            {COST_STATS.map(stat => {
                                const field = stat.toLowerCase() as keyof StatsCondition;
                                const value = cost[field] ?? 0;
                                if (!customization && value === 0) return null;
                                return (
                                    <NumberFieldCard
                                        key={stat}
                                        label={t({ text: stat, language, mode: 'UPPERCASE' })}
                                        value={value}
                                        customization={customization}
                                        onChange={v => { cost[field] = v; update(); }}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
        );
    };

    const CompetencesContainer = () => {
        if (!customization && ability.competences.length === 0) return null;
        return (
            <div className={styles.modifiersSection}>
                <div className={styles.sectionLabel}>{t({ text: 'competences', language, mode: 'UPPERCASE' })}</div>
                <div className={styles.modifiersList}>
                    {ability.competences.map((competence, competenceIndex) => (
                        <div key={competenceIndex} className={styles.modifierCard}>
                            {customization && (
                                <button className={styles.modifierRemove} onClick={() => { ability.competences.splice(competenceIndex, 1); update(); }}>×</button>
                            )}
                            {customization ? (
                                <select
                                    className={styles.identifierSelect}
                                    value={competence.skill}
                                    onChange={e => { ability.competences[competenceIndex].skill = e.target.value; update(); }}
                                >
                                    {!(SKILL_IDENTIFIER_SUGGESTIONS as readonly string[]).includes(competence.skill) && (
                                        <option value={competence.skill}>{t({ text: competence.skill, language, mode: 'TITLECASE' })}</option>
                                    )}
                                    {SKILL_IDENTIFIER_SUGGESTIONS.map(suggestion => (
                                        <option key={suggestion} value={suggestion}>{t({ text: suggestion, language, mode: 'TITLECASE' })}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className={styles.modifierNameDisplay}>{t({ text: competence.skill, language, mode: 'TITLECASE' })}</div>
                            )}
                            <div className={styles.fieldsList}>
                                <NumberFieldCard
                                    label={t({ text: 'required-exp', language, mode: 'UPPERCASE' })}
                                    value={competence.requiredExp}
                                    customization={customization}
                                    onChange={v => { competence.requiredExp = v; update(); }}
                                    min={0}
                                    step={10}
                                />
                                <NumberFieldCard
                                    label={t({ text: 'experience-contribution', language, mode: 'UPPERCASE' })}
                                    value={competence.experienceContribution}
                                    customization={customization}
                                    onChange={v => { competence.experienceContribution = v; update(); }}
                                    min={0}
                                />
                            </div>
                        </div>
                    ))}
                    {customization && (
                        <button
                            className={styles.addModifierBtn}
                            onClick={() => { ability.competences.push({ skill: SKILL_IDENTIFIER_SUGGESTIONS[0], requiredExp: 0, experienceContribution: 0 }); update(); }}
                        >
                            + {t({ text: 'competence', language, mode: 'UPPERCASE' })}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const TraitsContainer = () => {
        if (!customization && ability.traits.length === 0) return null;
        return (
        <div className={styles.modifiersSection}>
            <div className={styles.sectionLabel}>{t({ text: 'traits', language, mode: 'UPPERCASE' })}</div>
            <div className={styles.modifiersList}>
                {ability.traits.map((trait, traitIndex) => (
                    <div key={traitIndex} className={styles.modifierCard}>
                        {customization ? (
                            <input className={styles.modifierNameInput} value={trait.name}
                                onChange={e => { ability.traits[traitIndex].name = e.target.value; update(); }}
                                placeholder={t({ text: 'name', language, mode: 'UPPERCASE' })} />
                        ) : <div className={styles.modifierNameDisplay}>{trait.name || '—'}</div>}

                        {customization ? (
                            <textarea className={styles.modifierDescInput} value={trait.description || ''}
                                onChange={e => { ability.traits[traitIndex].description = e.target.value; update(); }}
                                placeholder={t({ text: 'description', language, mode: 'PLAIN_FIRST_UPPER' })} />
                        ) : <div className={styles.modifierDescDisplay}>{trait.description || '—'}</div>}

                        {customization && (
                            <div className={styles.effectsList}>
                                {trait.effects.map((effect, effectIndex) => (
                                    <div key={effectIndex} className={styles.effectRow}>

                                        <input className={styles.effectIdentifierInput} value={effect.identifier}
                                            onChange={e => { ability.traits[traitIndex].effects[effectIndex].identifier = e.target.value; update(); }}
                                            placeholder={t({ text: 'identifier', language: language, mode: 'LOWERCASE'})} />

                                        <select className={styles.effectKindSelect} value={effect.mode}
                                            onChange={e => { ability.traits[traitIndex].effects[effectIndex].mode = e.target.value as EffectMode; update(); }}>
                                            <option value="ADDER">{t({ text: 'ADDER', language: language, mode: 'UPPERCASE'})}</option>
                                            <option value="MULTIPLIER">{t({ text: 'MULTIPLIER', language: language, mode: 'UPPERCASE'})}</option>
                                            <option value="SETTER">{t({ text: 'SETTER', language: language, mode: 'UPPERCASE'})}</option>
                                        </select>

                                        <div className={styles.effectValueControls}>
                                            <button onClick={() => { ability.traits[traitIndex].effects[effectIndex].value--; update(); }}>−</button>
                                            <span>{effect.value}</span>
                                            <button onClick={() => { ability.traits[traitIndex].effects[effectIndex].value++; update(); }}>+</button>
                                        </div>

                                        <button className={styles.effectRemove} onClick={() => { ability.traits[traitIndex].effects.splice(effectIndex, 1); update(); }}>×</button>

                                    </div>
                                ))}
                                <button className={styles.addEffectBtn} onClick={() => { ability.traits[traitIndex].effects.push({ identifier: '', mode: 'ADDER', value: 0 }); update(); }}>
                                    + {t({ text: 'effect', language, mode: 'UPPERCASE' })}
                                </button>
                            </div>
                        )}
                        {customization && <button className={styles.modifierRemove} onClick={() => { ability.traits.splice(traitIndex, 1); update(); }}>×</button>}
                    </div>
                ))}
                {customization && (
                    <button className={styles.addModifierBtn} onClick={() => { ability.traits.push({ name: '', description: '', effects: [] }); update(); }}>
                        + {t({ text: 'trait', language, mode: 'UPPERCASE' })}
                    </button>
                )}
            </div>
        </div>
        );
    };

    const Footer = () => <>
        <div className={styles.footer}>
            <span className={`${styles.saveStatus} ${styles[saveStatus]}`}>
                {saveStatus === 'saving' && t({ text: 'saving', language, mode: 'UPPERCASE' })}
                {saveStatus === 'saved' && t({ text: 'saved', language, mode: 'UPPERCASE' })}
                {saveStatus === 'error' && t({ text: 'save-error', language, mode: 'UPPERCASE' })}
            </span>
            {isNew ? (
                <button className={styles.saveBtn} onClick={handleFirstSave}>
                    {t({ text: 'save', language, mode: 'UPPERCASE' })}
                </button>
            ) : (
                <>
                    <button
                        className={`${styles.deleteBtn}${pendingDelete ? ` ${styles.deleteBtnConfirm}` : ''}`}
                        onClick={handleDelete}
                    >
                        {pendingDelete ? t({ text: 'confirm-delete', language, mode: 'UPPERCASE' }) : t({ text: 'delete', language, mode: 'UPPERCASE' })}
                    </button>
                    {pendingDelete && (
                        <button className={styles.cancelBtn} onClick={() => setPendingDelete(false)}>
                            {t({ text: 'cancel', language, mode: 'UPPERCASE' })}
                        </button>
                    )}
                </>
            )}
        </div>
    </>

    return (
        <div className={styles.page}>
            <div className={styles.topRow}>
                <div className={styles.imageCol}>
                    {ImageContainer()}
                    {KeyContainer()}
                </div>
                <div className={styles.nameDescCol}>
                    <div className={styles.nameRow}>
                        {NameContainer()}
                        {CategoryContainer()}
                    </div>
                    {DescriptionContainer()}
                </div>
            </div>
            {TagsContainer()}
            {TimingContainer()}
            {CostsContainer()}
            {CompetencesContainer()}
            {TraitsContainer()}
            {customization ? Footer() : null}
        </div>
    );

};


export default AbilityWindow;
