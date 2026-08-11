// frontend/src/pages/CodexPage/entryWindows/CharacterWindow.tsx


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';
import { dbRegister, dbDeregister } from '../../../services/database';
import { Character } from '../../../../../models/character.ts';
import type { EntryCategory } from '../../../../../models/entry.ts';
import type { AttributesConstellation } from '../../../../../models/utils/attributesConstellation.ts';
import type { EffectMode } from '../../../../../models/utils/effect.ts';
import { SKILL_IDENTIFIER_SUGGESTIONS } from '../../../../../models/utils/skill.ts';
import { getImageUrl, useImageUpload } from '../../../services/useImageUpload';
import NumberFieldCard from './NumberFieldCard';
import StatBar from './StatBar';
import InventorySection from './Inventory/InventorySection';
import CraftSection from './Inventory/CraftSection';
import { ALL_CATEGORIES, AUTOSAVE_DELAY } from '../CodexPage';

import styles from './entryWindows.module.css';


interface Props {
    character: Character;
    customization: boolean;
    isNew: boolean;
    onCategoryChange: (cat: EntryCategory) => void;
    onSaved: () => void;
    onDeleted: () => void;
    onDirtyChange?: (dirty: boolean) => void;
}

const REALTIME_ECHO_GRACE_MS = 800;
const ASPECT_GROUPS: { identifier: string; labelKey: string }[][] = [
    [{ identifier: 'SLASHING', labelKey: 'SLASH' }, { identifier: 'PIERCING', labelKey: 'PIERCE' }, { identifier: 'BLUDGEONING', labelKey: 'BLUDGEON' }],
    [{ identifier: 'WITHER', labelKey: 'WITHER' }, { identifier: 'DELIRIUM', labelKey: 'DELIRIUM' }, { identifier: 'TAINT', labelKey: 'TAINT' }, { identifier: 'POISON', labelKey: 'POISON' }],
    [{ identifier: 'ARCANE', labelKey: 'ARCANE' }],
];
const ASPECT_KINDS = ['RESISTANCE', 'PROTECTION'] as const;
interface AttributeSpec {
    field: keyof AttributesConstellation;
    labelKey: string;
    identifier: string;
}
const PATH_GROUPS: { path: AttributeSpec; attributes: AttributeSpec[] }[] = [
    { path: { field: 'warriorPath', labelKey: 'WARRIOR_PATH', identifier: 'WARRIOR_PATH' }, attributes: [
        { field: 'prowess', labelKey: 'PROWESS', identifier: 'PROWESS' },
        { field: 'strength', labelKey: 'STRENGTH', identifier: 'STRENGTH' },
        { field: 'lethality', labelKey: 'LETHALITY', identifier: 'LETHALITY' },
        { field: 'constitution', labelKey: 'CONSTITUTION', identifier: 'CONSTITUTION' },
        { field: 'temper', labelKey: 'TEMPER', identifier: 'TEMPER' },
        { field: 'instinct', labelKey: 'INSTINCT', identifier: 'INSTINCT' },
    ] },
    { path: { field: 'roguePath', labelKey: 'ROGUE_PATH', identifier: 'ROGUE_PATH' }, attributes: [
        { field: 'stealth', labelKey: 'STEALTH', identifier: 'STEALTH' },
        { field: 'precision', labelKey: 'PRECISION', identifier: 'PRECISION' },
        { field: 'dexterity', labelKey: 'DEXTERITY', identifier: 'DEXTERITY' },
        { field: 'breath', labelKey: 'BREATH', identifier: 'BREATH' },
        { field: 'metabolism', labelKey: 'METABOLISM', identifier: 'METABOLISM' },
        { field: 'shivers', labelKey: 'SHIVERS', identifier: 'SHIVERS' },
    ] },
    { path: { field: 'sagePath', labelKey: 'SAGE_PATH', identifier: 'SAGE_PATH' }, attributes: [
        { field: 'brewing', labelKey: 'BREWING', identifier: 'BREWINGS' },
        { field: 'engineering', labelKey: 'ENGINEERING', identifier: 'ARTIFICES' },
        { field: 'erudition', labelKey: 'ERUDITION', identifier: 'ERUDITION' },
        { field: 'intellect', labelKey: 'INTELLECT', identifier: 'INTELLECT' },
        { field: 'composure', labelKey: 'COMPOSURE', identifier: 'COMPOSURE' },
        { field: 'insight', labelKey: 'INSIGHT', identifier: 'INSIGHT' },
    ] },
    { path: { field: 'poetPath', labelKey: 'POET_PATH', identifier: 'POET_PATH' }, attributes: [
        { field: 'drama', labelKey: 'DRAMA', identifier: 'DRAMA' },
        { field: 'rhetoric', labelKey: 'RHETORIC', identifier: 'RHETORIC' },
        { field: 'threat', labelKey: 'THREAT', identifier: 'THREAT' },
        { field: 'charisma', labelKey: 'CHARISMA', identifier: 'CHARISMA' },
        { field: 'attunement', labelKey: 'ATTUNEMENT', identifier: 'ATTUNEMENT' },
        { field: 'empathy', labelKey: 'EMPATHY', identifier: 'EMPATHY' },
    ] },
];
const TABS = ['inventory', 'stats', 'attributes', 'craft'] as const;
type Tab = typeof TABS[number];

const CharacterWindow: React.FC<Props> = ({ character: initialCharacter, customization, isNew, onCategoryChange, onSaved, onDeleted, onDirtyChange }) => {

    const { language } = useLanguage();
    const { uploading, triggerUpload, deleteImage } = useImageUpload();

    const [character, setCharacter] = useState<Character>(() => new Character(initialCharacter));
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [pendingDelete, setPendingDelete] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [tempTag, setTempTag] = useState('');
    const [activeTab, setActiveTab] = useState<Tab | null>(null);

    const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDirtyRef = useRef(false);
    const isFirstRender = useRef(true);
    const categoryRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (isDirtyRef.current) return;
        setCharacter(new Character(initialCharacter));
        setSaveStatus('idle');
        setPendingDelete(false);
    }, [initialCharacter]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!customization) setActiveTab(prev => prev === 'craft' ? null : prev);
    }, [customization]);

    const scheduleAutosave = useCallback((updated: Character) => {
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
        const ok = await dbRegister(`entries/${character.key}`, character);
        if (ok) { setSaveStatus('saved'); onSaved(); }
        else setSaveStatus('error');
    };

    const update = () => {
        const updated = new Character(character);
        setCharacter(updated);
        scheduleAutosave(updated);
    };

    const handleDelete = async () => {
        if (!pendingDelete) { setPendingDelete(true); return; }
        const ok = await dbDeregister(`entries/${character.key}`);
        if (ok) onDeleted();
    };

    const NameContainer = () => (
        customization ? (
            <input
                className={styles.nameInput}
                value={character.name || ''}
                onChange={e => { character.name = e.target.value.toUpperCase(); update(); }}
                placeholder={t({ text: 'name', language, mode: 'UPPERCASE' })}
            />
        ) : (<div className={styles.nameDisplay}>{character.name || '—'}</div>)
    )

    const DescriptionContainer = () => (
        customization ?
        (
            <textarea
                className={styles.descriptionInput}
                value={character.description || ''}
                onChange={e => { character.description = e.target.value.toUpperCase(); update(); }}
                placeholder={t({ text: 'description', language, mode: 'PLAIN_FIRST_UPPER' })}
            />
        ) : (<div className={styles.descriptionDisplay}>{character.description || '—'}</div>)
    )

    const ImageContainer = () => <>
            <div
                className={`${styles.imageContainer}${customization ? ` ${styles.imageContainerClickable}` : ''}`}
                onClick={() => { if (!customization) return; triggerUpload(character.key, path => { character.image = path; update(); }); }}
            >
                <img className={styles.imageImg} src={getImageUrl(character.image, character.category)} alt={character.name || ''} />
                {customization && (
                    <div className={styles.imageOverlay}>
                        {uploading ? '...' : '↑'}
                    </div>
                )}
                {customization && character.image && (
                    <button
                        className={styles.imageDeleteBtn}
                        onClick={e => {
                            e.stopPropagation();
                            deleteImage(character.image!, () => { character.image = null; update(); });
                        }}
                        title="Remove image"
                    >×</button>
                )}
            </div>
    </>

    const KeyContainer = () => <>
        <div className={styles.keyLabel}>{character.key}</div>
    </>

    const CategoryContainer = () => <>
        <div className={styles.categoryDropdown} ref={categoryRef}>
            <button
                className={styles.categoryBtn}
                onClick={customization ? () => setCategoryOpen(o => !o) : undefined}
                disabled={!customization}
            >
                {t({ text: character.category, language, mode: 'TITLECASE' })}
                {customization && <span className={styles.dropdownCaret}>▾</span>}
            </button>
            {categoryOpen && (
                <div className={styles.dropdownMenu}>
                    {ALL_CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            className={`${styles.dropdownOption}${cat === character.category ? ` ${styles.dropdownOptionActive}` : ''}`}
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
            {character.tags.map((tag, i) => (
                <div key={i} className={styles.tag}>
                    <span>{tag}</span>
                    {customization && <button className={styles.tagRemove} onClick={() => { character.tags.splice(i, 1); update(); }}>×</button>}
                </div>
            ))}
            {customization && (
                isAddingTag ? (
                    <input
                        autoFocus
                        className={styles.tagInput}
                        value={tempTag}
                        onChange={e => setTempTag(e.target.value.toUpperCase())}
                        onBlur={() => { if(tempTag.trim()) { character.tags.push(tempTag.trim()); update(); } setIsAddingTag(false); setTempTag(''); }}
                        onKeyDown={e => { if(e.key === 'Enter') e.currentTarget.blur(); if(e.key === 'Escape') { setTempTag(''); setIsAddingTag(false); } }}
                    />
                ) : (
                    <button className={styles.tagAdd} onClick={() => setIsAddingTag(true)}>+</button>
                )
            )}
        </div>
    </>

    const ConditionContainer = () => <>
        <div>
            <div className={styles.sectionLabel}>
                {t({ text: 'condition', language, mode: 'UPPERCASE' })}
            </div>
            <div className={styles.statsBarsColumn}>
                <StatBar
                    large
                    label={t({ text: 'HEALTH', language, mode: 'UPPERCASE' })}
                    value={character.condition.health}
                    maxValue={character.getMaxStatValue('HEALTH')}
                    customization={customization}
                    onChange={v => { character.setStatValue('HEALTH', v); update(); }}
                    className={styles.statColorHealth}
                />
                <div className={styles.statBarGroup}>
                    <StatBar
                        label={t({ text: 'ENERGY', language, mode: 'UPPERCASE' })}
                        value={character.condition.energy}
                        maxValue={character.getMaxStatValue('ENERGY')}
                        customization={customization}
                        onChange={v => { character.setStatValue('ENERGY', v); update(); }}
                        className={styles.statColorEnergy}
                    />
                    <StatBar
                        label={t({ text: 'FOCUS', language, mode: 'UPPERCASE' })}
                        value={character.condition.focus}
                        maxValue={character.getMaxStatValue('FOCUS')}
                        customization={customization}
                        onChange={v => { character.setStatValue('FOCUS', v); update(); }}
                        className={styles.statColorFocus}
                    />
                    <StatBar
                        label={t({ text: 'ANIMA', language, mode: 'UPPERCASE' })}
                        value={character.condition.anima}
                        maxValue={character.getMaxStatValue('ANIMA')}
                        customization={customization}
                        onChange={v => { character.setStatValue('ANIMA', v); update(); }}
                        className={styles.statColorAnima}
                    />
                </div>
            </div>
        </div>
    </>

    const StatsContainer = () => <>
        <div>
            <div className={styles.sectionLabel}>
                {t({ text: 'stats', language, mode: 'UPPERCASE' })}
            </div>
            <div className={`${styles.fieldsList} ${styles.fieldsListCentered}`}>
                <div className={styles.fieldCard}>
                    <div className={styles.fieldName}>{t({ text: 'MOVEMENT', language, mode: 'UPPERCASE' })}</div>
                    <div className={styles.fieldValueDisplay}>{character.getMaxStatValue('MOVEMENT')}</div>
                </div>
                <div className={styles.fieldCard}>
                    <div className={styles.fieldName}>{t({ text: 'RANGE', language, mode: 'UPPERCASE' })}</div>
                    <div className={styles.fieldValueDisplay}>{character.getMaxStatValue('RANGE')}</div>
                </div>
            </div>
            <div className={styles.aspectColumns}>
                {ASPECT_KINDS.map(kind => (
                    <div className={styles.aspectColumn} key={kind}>
                        <div className={styles.aspectColumnHeader}>
                            {t({ text: kind === 'RESISTANCE' ? 'resistance' : 'protection', language, mode: 'UPPERCASE' })}
                        </div>
                        {ASPECT_GROUPS.map((group, i) => (
                            <div className={styles.aspectRow} key={i}>
                                {group.map(({ identifier, labelKey }) => (
                                    <div className={styles.fieldCard} key={identifier}>
                                        <div className={styles.fieldName}>{t({ text: labelKey, language, mode: 'UPPERCASE' })}</div>
                                        <div className={styles.fieldValueDisplay}>{character.accumulateEffect(`${identifier}_${kind}`, 0)}</div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    </>

    const renderAttributeField = (spec: AttributeSpec, onChange: (value: number) => void, pathBonus: number = 0, isPath: boolean = false) => {
        const base = character.constellation[spec.field];
        const total = character.accumulateEffect(spec.identifier, base) + pathBonus;
        const delta = total - base;
        return (
            <NumberFieldCard
                key={spec.field}
                label={t({ text: spec.labelKey, language, mode: 'UPPERCASE' })}
                value={base}
                viewValue={total}
                suffix={delta !== 0 ? `(${delta > 0 ? '+' : ''}${delta})` : undefined}
                customization={customization}
                onChange={onChange}
                min={isPath ? undefined : 0}
                className={`${styles.attributeFieldCard}${isPath ? ` ${styles.pathFieldCard}` : ''}`}
            />
        );
    };

    const AttributesContainer = () => <>
        <div>
            <div className={styles.sectionLabel}>
                {t({ text: 'attributes', language, mode: 'UPPERCASE' })}
            </div>
            <div className={styles.pathRows}>
                {PATH_GROUPS.map(group => {
                    const pathBase = character.constellation[group.path.field];
                    const pathTotal = character.accumulateEffect(group.path.identifier, pathBase);
                    return (
                        <div className={styles.fieldsList} key={group.path.field}>
                            {renderAttributeField(group.path, v => { character.constellation[group.path.field] = v; update(); }, 0, true)}
                            {group.attributes.map(attr => renderAttributeField(attr, v => { character.constellation[attr.field] = v; update(); }, pathTotal))}
                        </div>
                    );
                })}
            </div>
        </div>
    </>

    const TraitsContainer = () => {
        if (!customization && character.traits.length === 0) return null;
        return (
            <div className={styles.modifiersSection}>
                <div className={styles.sectionLabel}>{t({ text: 'traits', language, mode: 'UPPERCASE' })}</div>
                <div className={styles.modifiersList}>
                    {character.traits.map((trait, traitIndex) => (
                        <div key={traitIndex} className={styles.modifierCard}>
                            {customization ? (
                                <input className={styles.modifierNameInput} value={trait.name}
                                    onChange={e => { character.traits[traitIndex].name = e.target.value.toUpperCase(); update(); }}
                                    placeholder={t({ text: 'name', language, mode: 'UPPERCASE' })} />
                            ) : <div className={styles.modifierNameDisplay}>{trait.name || '—'}</div>}

                            {customization ? (
                                <textarea className={styles.modifierDescInput} value={trait.description || ''}
                                    onChange={e => { character.traits[traitIndex].description = e.target.value.toUpperCase(); update(); }}
                                    placeholder={t({ text: 'description', language, mode: 'PLAIN_FIRST_UPPER' })} />
                            ) : <div className={styles.modifierDescDisplay}>{trait.description || '—'}</div>}

                            {customization && (
                                <div className={styles.effectsList}>
                                    {trait.effects.map((effect, effectIndex) => (
                                        <div key={effectIndex} className={styles.effectRow}>

                                            <input className={styles.effectIdentifierInput} value={effect.identifier}
                                                onChange={e => { character.traits[traitIndex].effects[effectIndex].identifier = e.target.value.toUpperCase(); update(); }}
                                                placeholder={t({ text: 'identifier', language: language, mode: 'LOWERCASE' })} />

                                            <select className={styles.effectKindSelect} value={effect.mode}
                                                onChange={e => { character.traits[traitIndex].effects[effectIndex].mode = e.target.value as EffectMode; update(); }}>
                                                <option value="ADDER">{t({ text: 'ADDER', language: language, mode: 'UPPERCASE' })}</option>
                                                <option value="MULTIPLIER">{t({ text: 'MULTIPLIER', language: language, mode: 'UPPERCASE' })}</option>
                                                <option value="SETTER">{t({ text: 'SETTER', language: language, mode: 'UPPERCASE' })}</option>
                                            </select>

                                            <div className={styles.effectValueControls}>
                                                <button onClick={() => { character.traits[traitIndex].effects[effectIndex].value--; update(); }}>−</button>
                                                <span>{effect.value}</span>
                                                <button onClick={() => { character.traits[traitIndex].effects[effectIndex].value++; update(); }}>+</button>
                                            </div>

                                            <button className={styles.effectRemove} onClick={() => { character.traits[traitIndex].effects.splice(effectIndex, 1); update(); }}>×</button>

                                        </div>
                                    ))}
                                    <button className={styles.addEffectBtn} onClick={() => { character.traits[traitIndex].effects.push({ identifier: '', mode: 'ADDER', value: 0 }); update(); }}>
                                        + {t({ text: 'effect', language, mode: 'UPPERCASE' })}
                                    </button>
                                </div>
                            )}
                            {customization && <button className={styles.modifierRemove} onClick={() => { character.traits.splice(traitIndex, 1); update(); }}>×</button>}
                        </div>
                    ))}
                    {customization && (
                        <button className={styles.addModifierBtn} onClick={() => { character.traits.push({ name: '', description: '', effects: [] }); update(); }}>
                            + {t({ text: 'trait', language, mode: 'UPPERCASE' })}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const SkillsContainer = () => {
        if (!customization && character.scroll.skills.length === 0) return null;
        return (
            <div className={styles.modifiersSection}>
                <div className={styles.sectionLabel}>{t({ text: 'skills', language, mode: 'UPPERCASE' })}</div>
                <div className={styles.modifiersList}>
                    {character.scroll.skills.map((skill, skillIndex) => (
                        <div key={skillIndex} className={styles.modifierCard}>
                            {customization && (
                                <button className={styles.modifierRemove} onClick={() => { character.scroll.removeSkill(skillIndex); update(); }}>×</button>
                            )}
                            {customization ? (
                                <select
                                    className={styles.identifierSelect}
                                    value={skill.identifier}
                                    onChange={e => { character.scroll.skills[skillIndex].identifier = e.target.value; update(); }}
                                >
                                    {!(SKILL_IDENTIFIER_SUGGESTIONS as readonly string[]).includes(skill.identifier) && (
                                        <option value={skill.identifier}>{t({ text: skill.identifier, language, mode: 'TITLECASE' })}</option>
                                    )}
                                    {SKILL_IDENTIFIER_SUGGESTIONS.map(suggestion => (
                                        <option key={suggestion} value={suggestion}>{t({ text: suggestion, language, mode: 'TITLECASE' })}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className={styles.modifierNameDisplay}>{t({ text: skill.identifier, language, mode: 'TITLECASE' })}</div>
                            )}
                            <NumberFieldCard
                                label={t({ text: 'current-experience', language, mode: 'UPPERCASE' })}
                                value={skill.currentExperience}
                                customization={customization}
                                onChange={v => { character.scroll.skills[skillIndex].currentExperience = Math.max(0, v); update(); }}
                                min={0}
                            />
                        </div>
                    ))}
                    {customization && (
                        <button className={styles.addModifierBtn} onClick={() => { character.scroll.addSkill(SKILL_IDENTIFIER_SUGGESTIONS[0]); update(); }}>
                            + {t({ text: 'skill', language, mode: 'UPPERCASE' })}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const VISIBLE_TABS = customization ? TABS : TABS.filter(tabKey => tabKey !== 'craft');

    const TabsContainer = () => <>
        <div className={styles.tabRow}>
            {VISIBLE_TABS.map(tabKey => (
                <button
                    key={tabKey}
                    className={`${styles.tabBtn}${activeTab === tabKey ? ` ${styles.tabBtnActive}` : ''}`}
                    onClick={() => setActiveTab(prev => prev === tabKey ? null : tabKey)}
                >
                    {t({ text: tabKey, language, mode: 'UPPERCASE' })}
                </button>
            ))}
        </div>
    </>

    const TabContentContainer = () => {
        if (activeTab === 'inventory') return <InventorySection character={character} customization={customization} onChange={update} />;
        if (activeTab === 'stats') return StatsContainer();
        if (activeTab === 'attributes') return <>
            {AttributesContainer()}
            <div className={styles.traitsSkillsRow}>
                <div className={styles.traitsSkillsColumn}>{TraitsContainer()}</div>
                <div className={styles.traitsSkillsColumn}>{SkillsContainer()}</div>
            </div>
        </>;
        if (activeTab === 'craft') return <CraftSection character={character} customization={customization} onChange={update} />;
        return null;
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
            {ConditionContainer()}
            {TabsContainer()}
            {TabContentContainer()}
            {customization ? Footer() : null}
        </div>
    );

};


export default CharacterWindow;
