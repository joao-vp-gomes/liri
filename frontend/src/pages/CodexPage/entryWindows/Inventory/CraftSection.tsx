// frontend/src/pages/CodexPage/entryWindows/Inventory/CraftSection.tsx


import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { t } from '../../../../utils/localizer';
import { supabase } from '../../../../services/supabase';
import { EntryFactory } from '../../../../../../models/entryFactory.ts';
import { Character } from '../../../../../../models/character.ts';
import { Catalogue, type Recipe } from '../../../../../../models/catalogue.ts';
import ItemSlotCell from './ItemSlotCell';
import RecipeSlot from '../RecipeSlot';
import { useClampedPosition, type Anchor } from '../../../../utils/useClampedPosition';

import sharedStyles from '../entryWindows.module.css';
import styles from './Inventory.module.css';


interface Props {
    character: Character;
    customization: boolean;
    onChange: () => void;
}

type WorkbenchDragSource =
    | { kind: 'pocket'; slot: number }
    | { kind: 'container'; slot: number }
    | { kind: 'workbench'; index: number };

interface PendingTransfer {
    target: 'workbench' | 'pocket';
    source: WorkbenchDragSource;
    name: string | null;
    available: number;
    quantity: number;
    pos: Anchor;
}

const chunk = <ItemT,>(arr: ItemT[], size: number): ItemT[][] => {
    const chunks: ItemT[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
};

const POCKET_ROW_SIZE = 6;
const CONTAINER_ROW_SIZE = 6;
const RECIPE_SEARCH_DEBOUNCE_MS = 300;

const CraftSection: React.FC<Props> = ({ character, customization, onChange }) => {

    const { language } = useLanguage();
    const inventory = character.inventory;
    const containerStorage = inventory.equipment.container?.storage ?? null;

    const [matchedRecipe, setMatchedRecipe] = useState<Recipe | null>(null);
    const [ingredientsDragOver, setIngredientsDragOver] = useState(false);
    const [pocketDragOver, setPocketDragOver] = useState(false);
    const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);

    const dragSourceRef = useRef<WorkbenchDragSource | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { ref: pendingTransferRef, style: pendingTransferStyle } = useClampedPosition(pendingTransfer?.pos ?? null);

    useEffect(() => {
        if (!pendingTransfer) return;
        const handler = (e: MouseEvent) => {
            if (pendingTransferRef.current && !pendingTransferRef.current.contains(e.target as Node)) setPendingTransfer(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [pendingTransfer]);

    const workbenchSignature = inventory.workbench.content.map(i => `${i.reference.key}:${i.currentStack}`).join('|');

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (inventory.workbench.content.length === 0) { setMatchedRecipe(null); return; }
        debounceRef.current = setTimeout(async () => {
            const available: Record<string, number> = {};
            inventory.workbench.content.forEach(inst => {
                available[inst.reference.key] = (available[inst.reference.key] ?? 0) + inst.currentStack;
            });
            const { data, error } = await supabase.from('entries').select('data').eq('category', 'CATALOGUE');
            if (error || !data) { setMatchedRecipe(null); return; }
            const catalogues = data
                .map((row: any) => EntryFactory.instantiate(row.data) as Catalogue)
                .filter(catalogue => catalogue.kind !== 'PURCHASE');
            const found = catalogues
                .flatMap(catalogue => catalogue.recipes)
                .find(recipe => recipe.ingredients.length > 0 && recipe.ingredients.every(ing => (available[ing.referenceKey] ?? 0) >= ing.quantity));
            setMatchedRecipe(found ?? null);
        }, RECIPE_SEARCH_DEBOUNCE_MS);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [workbenchSignature]);

    const performTransfer = (target: 'workbench' | 'pocket', source: WorkbenchDragSource, quantity: number) => {
        if (target === 'workbench') {
            if (source.kind === 'pocket') inventory.pocketToWorkbench(source.slot, quantity);
            else if (source.kind === 'container') inventory.containerToWorkbench(source.slot, quantity);
        } else if (source.kind === 'workbench') {
            inventory.workbenchToPocket(source.index, quantity);
        }
        onChange();
    };

    const stageTransfer = (target: 'workbench' | 'pocket', source: WorkbenchDragSource, pos: Anchor) => {
        let inst = null;
        if (source.kind === 'pocket') inst = inventory.pocket.slots[source.slot];
        else if (source.kind === 'container') inst = containerStorage?.slots[source.slot] ?? null;
        else inst = inventory.workbench.content[source.index];
        if (!inst) return;
        if (inst.currentStack <= 1) { performTransfer(target, source, 1); return; }
        setPendingTransfer({ target, source, name: inst.reference.name, available: inst.currentStack, quantity: inst.currentStack, pos });
    };

    const handleDropOnWorkbench = (pos: Anchor) => {
        const source = dragSourceRef.current;
        dragSourceRef.current = null;
        if (!source || source.kind === 'workbench') return;
        if (source.kind === 'container' && !containerStorage) return;
        stageTransfer('workbench', source, pos);
    };

    const handleDropOnPocket = (pos: Anchor) => {
        const source = dragSourceRef.current;
        dragSourceRef.current = null;
        if (!source || source.kind !== 'workbench') return;
        stageTransfer('pocket', source, pos);
    };

    const confirmTransfer = () => {
        if (!pendingTransfer) return;
        performTransfer(pendingTransfer.target, pendingTransfer.source, pendingTransfer.quantity);
        setPendingTransfer(null);
    };

    const craft = () => {
        if (!matchedRecipe) return;
        inventory.craft(matchedRecipe.ingredients, matchedRecipe.products);
        onChange();
    };

    const CraftFlowContainer = () => <>
        <div className={sharedStyles.recipeFlow}>
            <div className={sharedStyles.recipeGroup}>
                <div className={sharedStyles.sectionLabel}>{t({ text: 'ingredients', language, mode: 'UPPERCASE' })}</div>
                <div
                    className={`${sharedStyles.recipeSlotRow}${ingredientsDragOver ? ` ${sharedStyles.recipeGroupDragOver}` : ''}`}
                    onDragOver={e => { if (customization && dragSourceRef.current && dragSourceRef.current.kind !== 'workbench') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                    onDragEnter={e => { if (customization && dragSourceRef.current && dragSourceRef.current.kind !== 'workbench') { e.preventDefault(); setIngredientsDragOver(true); } }}
                    onDragLeave={() => setIngredientsDragOver(false)}
                    onDrop={e => { e.preventDefault(); setIngredientsDragOver(false); if (customization) handleDropOnWorkbench({ top: e.clientY, bottom: e.clientY, left: e.clientX, right: e.clientX }); }}
                >
                    {inventory.workbench.content.map((inst, i) => (
                        <RecipeSlot
                            key={`${inst.reference.key}-${i}`}
                            image={inst.reference.image}
                            name={inst.reference.name}
                            quantity={inst.currentStack}
                            draggable={customization}
                            onDragStart={() => { dragSourceRef.current = { kind: 'workbench', index: i }; }}
                        />
                    ))}
                    <div className={sharedStyles.recipeSlotWrapper}>
                        <div className={sharedStyles.recipeSlotCell} />
                    </div>
                </div>
            </div>

            {matchedRecipe && customization ? (
                <button
                    className={`${sharedStyles.recipeArrow} ${sharedStyles.recipeArrowButton}`}
                    onClick={craft}
                    title={t({ text: 'craft', language, mode: 'UPPERCASE' })}
                >→</button>
            ) : (
                <div className={sharedStyles.recipeArrow}>→</div>
            )}

            <div className={sharedStyles.recipeGroup}>
                <div className={sharedStyles.sectionLabel}>{t({ text: 'products', language, mode: 'UPPERCASE' })}</div>
                {matchedRecipe && (
                    <>
                        <div className={sharedStyles.recipeSlotRow}>
                            {matchedRecipe.products.map((inst, i) => (
                                <RecipeSlot
                                    key={i}
                                    image={inst.reference.image}
                                    name={inst.reference.name}
                                    quantity={inst.currentStack}
                                />
                            ))}
                        </div>
                        {matchedRecipe.competence && (() => {
                            const competence = matchedRecipe.competence;
                            const current = character.scroll.skills.find(s => s.identifier === competence.skill)?.currentExperience ?? 0;
                            const met = current >= competence.requiredExp;
                            return (
                                <div className={`${sharedStyles.craftCompetenceInfo}${met ? '' : ` ${sharedStyles.craftCompetenceInfoUnmet}`}`}>
                                    {t({ text: competence.skill, language, mode: 'UPPERCASE' })} {competence.requiredExp} {t({ text: 'required', language, mode: 'UPPERCASE' })} ({t({ text: 'current', language, mode: 'UPPERCASE' })}: {current})
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>
        </div>

        {pendingTransfer && (
            <div className={sharedStyles.recipeQuantityPanel} style={pendingTransferStyle} ref={pendingTransferRef}>
                <div className={sharedStyles.recipeQuantityName}>{pendingTransfer.name}</div>
                <div className={sharedStyles.recipeQuantityControls}>
                    <button onClick={() => setPendingTransfer(p => p && ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}>−</button>
                    <span>{pendingTransfer.quantity}</span>
                    <button onClick={() => setPendingTransfer(p => p && ({ ...p, quantity: Math.min(p.available, p.quantity + 1) }))}>+</button>
                    <button className={sharedStyles.recipeQuantityConfirm} onClick={confirmTransfer}>✓</button>
                </div>
            </div>
        )}
    </>

    const PocketContainer = () => <>
        <div>
            <div className={sharedStyles.sectionLabel}>{t({ text: 'pocket', language, mode: 'UPPERCASE' })}</div>
            <div
                className={`${styles.slotRows}${pocketDragOver ? ` ${sharedStyles.recipeGroupDragOver}` : ''}`}
                onDragOver={e => { if (customization && dragSourceRef.current?.kind === 'workbench') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                onDragEnter={e => { if (customization && dragSourceRef.current?.kind === 'workbench') { e.preventDefault(); setPocketDragOver(true); } }}
                onDragLeave={() => setPocketDragOver(false)}
                onDrop={e => { e.preventDefault(); setPocketDragOver(false); if (customization) handleDropOnPocket({ top: e.clientY, bottom: e.clientY, left: e.clientX, right: e.clientX }); }}
            >
                {chunk(inventory.pocket.slots, POCKET_ROW_SIZE).map((row, rowIndex) => (
                    <div className={styles.slotRow} key={rowIndex}>
                        {row.map((inst, colIndex) => {
                            const slot = rowIndex * POCKET_ROW_SIZE + colIndex;
                            return (
                                <ItemSlotCell
                                    key={slot}
                                    instance={inst}
                                    customization={customization}
                                    topLabel={String(slot + 1)}
                                    draggable={customization && !!inst}
                                    onDragStart={() => { dragSourceRef.current = { kind: 'pocket', slot }; }}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    </>

    const ContainerSection = () => containerStorage && <>
        <div className={styles.containerBlock}>
            <div className={sharedStyles.sectionLabel}>{t({ text: 'CONTAINER', language, mode: 'UPPERCASE' })}</div>
            <div className={styles.slotRows}>
                {chunk(containerStorage.slots, CONTAINER_ROW_SIZE).map((row, rowIndex) => (
                    <div className={styles.slotRow} key={rowIndex}>
                        {row.map((inst, colIndex) => {
                            const slot = rowIndex * CONTAINER_ROW_SIZE + colIndex;
                            return (
                                <ItemSlotCell
                                    key={slot}
                                    instance={inst}
                                    customization={customization}
                                    topLabel={String(slot + 1)}
                                    draggable={customization && !!inst}
                                    onDragStart={() => { dragSourceRef.current = { kind: 'container', slot }; }}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    </>

    return (
        <div className={styles.inventoryMain}>
            {CraftFlowContainer()}
            <div className={styles.equipmentContainerRow}>
                {PocketContainer()}
                {ContainerSection()}
            </div>
        </div>
    );

};


export default CraftSection;
