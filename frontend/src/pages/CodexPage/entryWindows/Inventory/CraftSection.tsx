// frontend/src/pages/CodexPage/entryWindows/Inventory/CraftSection.tsx


import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { t } from '../../../../utils/localizer';
import { supabase } from '../../../../services/supabase';
import { getImageUrl } from '../../../../services/useImageUpload';
import { EntryFactory } from '../../../../../../models/entryFactory.ts';
import { Character } from '../../../../../../models/character.ts';
import { Catalogue, CRAFTING_GRID_SIZE, type Recipe, type CraftingRecipe } from '../../../../../../models/catalogue.ts';
import { type SourceLocation, sameLocation } from '../../../../../../models/utils/itemsInventory.ts';
import type { ItemInstance } from '../../../../../../models/utils/itemInstance.ts';
import type { Competence } from '../../../../../../models/utils/competence.ts';
import { Equipment } from '../../../../../../models/utils/equipment.ts';
import { Breakable } from '../../../../../../models/item.ts';
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

type EquipmentSlotKey = keyof typeof Equipment.EQUIPMENT_SLOTS;

const EQUIPMENT_SLOT_KEYS = Object.keys(Equipment.EQUIPMENT_SLOTS) as EquipmentSlotKey[];

const EQUIPMENT_FIELD_BY_SLOT: Record<EquipmentSlotKey, keyof Equipment> = {
    APPAREL: 'apparel',
    RIGHT_HAND: 'rightHand',
    LEFT_HAND: 'leftHand',
    ACCESSORY_1: 'accessory1',
    ACCESSORY_2: 'accessory2',
    CONTAINER: 'container',
};

const EQUIPMENT_SLOT_LABEL_KEYS: Record<EquipmentSlotKey, string> = {
    APPAREL: 'APPAREL',
    RIGHT_HAND: 'right-hand',
    LEFT_HAND: 'left-hand',
    ACCESSORY_1: 'accessory-1',
    ACCESSORY_2: 'accessory-2',
    CONTAINER: 'CONTAINER',
};

const chunk = <ItemT,>(arr: ItemT[], size: number): ItemT[][] => {
    const chunks: ItemT[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
};

const POCKET_ROW_SIZE = 6;
const CONTAINER_ROW_SIZE = 6;
const RECIPE_SEARCH_DEBOUNCE_MS = 300;
const TABLE_ORDER = ['CRAFTING', 'ALCHEMY', 'REPAIR'] as const;
type Table = typeof TABLE_ORDER[number];

interface ProjectionCellProps {
    instance: ItemInstance | null;
    editable: boolean;
    onDropHere: () => void;
    onClear: () => void;
    showName?: boolean;
}

const ProjectionCell: React.FC<ProjectionCellProps> = ({ instance, editable, onDropHere, onClear, showName }) => {

    const [dragOver, setDragOver] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [panelPos, setPanelPos] = useState<Anchor | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { ref: panelRef, style: panelStyle } = useClampedPosition(expanded ? panelPos : null);

    useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

    const openExpand = () => {
        if (!instance || showName) return;
        if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect) setPanelPos({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
        setExpanded(true);
    };
    const scheduleCloseExpand = () => {
        closeTimerRef.current = setTimeout(() => setExpanded(false), 150);
    };

    if (!instance) {
        return (
            <div className={sharedStyles.recipeSlotWrapper}>
                <div
                    className={`${sharedStyles.recipeSlotCell}${dragOver ? ` ${sharedStyles.recipeGroupDragOver}` : ''}`}
                    onDragOver={e => { if (editable) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                    onDragEnter={e => { if (editable) { e.preventDefault(); setDragOver(true); } }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); if (editable) onDropHere(); }}
                />
            </div>
        );
    }

    return (
        <div className={sharedStyles.recipeSlotWrapper} ref={wrapperRef} onMouseEnter={openExpand} onMouseLeave={scheduleCloseExpand}>
            <div className={sharedStyles.recipeSlotCell}>
                <img className={sharedStyles.recipeSlotImage} src={getImageUrl(instance.reference.image, 'ITEM')} alt={instance.reference.name || ''} draggable={false} />
                {editable && <button className={sharedStyles.recipeSlotRemove} onClick={onClear}>×</button>}
            </div>
            {showName && <div className={sharedStyles.recipeSlotName}>{instance.reference.name || '—'}</div>}
            {expanded && panelPos && (
                <div
                    className={styles.slotExpandPanel}
                    style={panelStyle}
                    ref={panelRef}
                    onMouseEnter={openExpand}
                    onMouseLeave={scheduleCloseExpand}
                >
                    <div className={styles.slotExpandName}>{instance.reference.name || '—'}</div>
                </div>
            )}
        </div>
    );

};

const CraftSection: React.FC<Props> = ({ character, customization, onChange }) => {

    const { language } = useLanguage();
    const inventory = character.inventory;
    const containerStorage = inventory.equipment.container?.storage ?? null;

    const [activeTable, setActiveTable] = useState<Table>('CRAFTING');
    const [craftingGrid, setCraftingGrid] = useState<Array<SourceLocation | null>>(new Array(CRAFTING_GRID_SIZE).fill(null));
    const [alchemyInputs, setAlchemyInputs] = useState<Array<SourceLocation>>([]);
    const [repairSlots, setRepairSlots] = useState<[SourceLocation | null, SourceLocation | null]>([null, null]);
    const [matchedCraftingRecipe, setMatchedCraftingRecipe] = useState<CraftingRecipe | null>(null);
    const [matchedAlchemyRecipe, setMatchedAlchemyRecipe] = useState<Recipe | null>(null);
    const [dragOverZone, setDragOverZone] = useState(false);

    const dragSourceRef = useRef<SourceLocation | null>(null);
    const craftDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const alchemyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setCraftingGrid(new Array(CRAFTING_GRID_SIZE).fill(null));
        setAlchemyInputs([]);
        setRepairSlots([null, null]);
        setMatchedCraftingRecipe(null);
        setMatchedAlchemyRecipe(null);
    }, [activeTable]);

    const gridKeySignature = craftingGrid.map(loc => (loc ? inventory.peekAtLocation(loc)?.reference.key ?? null : null)).join('|');
    useEffect(() => {
        if (activeTable !== 'CRAFTING') return;
        if (craftDebounceRef.current) clearTimeout(craftDebounceRef.current);
        if (craftingGrid.every(loc => loc === null)) { setMatchedCraftingRecipe(null); return; }
        craftDebounceRef.current = setTimeout(async () => {
            const currentKeys = craftingGrid.map(loc => (loc ? inventory.peekAtLocation(loc)?.reference.key ?? null : null));
            const { data, error } = await supabase.from('entries').select('data').eq('category', 'CATALOGUE');
            if (error || !data) { setMatchedCraftingRecipe(null); return; }
            const catalogues = data
                .map((row: any) => EntryFactory.instantiate(row.data) as Catalogue)
                .filter(catalogue => catalogue.kind === 'CRAFTING');
            const found = catalogues
                .flatMap(catalogue => catalogue.craftingRecipes)
                .find(recipe => recipe.grid.every((key, i) => key === currentKeys[i]));
            setMatchedCraftingRecipe(found ?? null);
        }, RECIPE_SEARCH_DEBOUNCE_MS);
        return () => { if (craftDebounceRef.current) clearTimeout(craftDebounceRef.current); };
    }, [gridKeySignature, activeTable]);

    const alchemySignature = alchemyInputs.map(loc => {
        const inst = inventory.peekAtLocation(loc);
        return inst ? `${inst.reference.key}:${inst.currentStack}` : 'null';
    }).join('|');
    useEffect(() => {
        if (activeTable !== 'ALCHEMY') return;
        if (alchemyDebounceRef.current) clearTimeout(alchemyDebounceRef.current);
        if (alchemyInputs.length === 0) { setMatchedAlchemyRecipe(null); return; }
        alchemyDebounceRef.current = setTimeout(async () => {
            const available: Record<string, number> = {};
            alchemyInputs.forEach(loc => {
                const inst = inventory.peekAtLocation(loc);
                if (!inst) return;
                available[inst.reference.key] = (available[inst.reference.key] ?? 0) + inst.currentStack;
            });
            const { data, error } = await supabase.from('entries').select('data').eq('category', 'CATALOGUE');
            if (error || !data) { setMatchedAlchemyRecipe(null); return; }
            const catalogues = data
                .map((row: any) => EntryFactory.instantiate(row.data) as Catalogue)
                .filter(catalogue => catalogue.kind === 'ALCHEMY');
            const found = catalogues
                .flatMap(catalogue => catalogue.recipes)
                .find(recipe => recipe.ingredients.length > 0 && recipe.ingredients.every(ing => (available[ing.referenceKey] ?? 0) >= ing.quantity));
            setMatchedAlchemyRecipe(found ?? null);
        }, RECIPE_SEARCH_DEBOUNCE_MS);
        return () => { if (alchemyDebounceRef.current) clearTimeout(alchemyDebounceRef.current); };
    }, [alchemySignature, activeTable]);

    const cycleTable = (dir: 1 | -1) => {
        const i = TABLE_ORDER.indexOf(activeTable);
        setActiveTable(TABLE_ORDER[(i + dir + TABLE_ORDER.length) % TABLE_ORDER.length]);
    };

    const handleDropOnGrid = (cellIndex: number) => {
        const source = dragSourceRef.current;
        dragSourceRef.current = null;
        if (!source) return;
        setCraftingGrid(prev => prev.map((loc, i) => i === cellIndex ? source : loc));
    };
    const clearGridCell = (cellIndex: number) => {
        setCraftingGrid(prev => prev.map((loc, i) => i === cellIndex ? null : loc));
    };

    const handleDropOnAlchemyZone = () => {
        const source = dragSourceRef.current;
        dragSourceRef.current = null;
        if (!source) return;
        setAlchemyInputs(prev => prev.some(loc => sameLocation(loc, source)) ? prev : [...prev, source]);
    };
    const clearAlchemyInput = (index: number) => {
        setAlchemyInputs(prev => prev.filter((_, i) => i !== index));
    };

    const handleDropOnRepair = (slotIndex: 0 | 1) => {
        const source = dragSourceRef.current;
        dragSourceRef.current = null;
        if (!source) return;
        setRepairSlots(prev => {
            const next: [SourceLocation | null, SourceLocation | null] = [...prev];
            if (sameLocation(prev[1 - slotIndex] as SourceLocation | null, source)) next[1 - slotIndex] = null;
            next[slotIndex] = source;
            return next;
        });
    };
    const clearRepairSlot = (slotIndex: 0 | 1) => {
        setRepairSlots(prev => {
            const next: [SourceLocation | null, SourceLocation | null] = [...prev];
            next[slotIndex] = null;
            return next;
        });
    };

    const craftGrid = () => {
        if (!matchedCraftingRecipe || !matchedCraftingRecipe.product) return;
        const consumptions = craftingGrid
            .filter((loc): loc is SourceLocation => !!loc)
            .map(loc => ({ location: loc, quantity: 1 }));
        const remainingByCell = craftingGrid.map(loc => {
            if (!loc) return 0;
            const uses = craftingGrid.filter(other => sameLocation(other, loc)).length;
            const available = inventory.peekAtLocation(loc)?.currentStack ?? 0;
            return available - uses;
        });
        inventory.craftFromLocations(consumptions, [matchedCraftingRecipe.product]);
        setCraftingGrid(prev => prev.map((loc, i) => (loc && remainingByCell[i] > 0) ? loc : null));
        onChange();
    };

    const craftAlchemy = () => {
        if (!matchedAlchemyRecipe) return;
        const consumptions: Array<{ location: SourceLocation; quantity: number }> = [];
        const remaining = alchemyInputs.map(loc => inventory.peekAtLocation(loc)?.currentStack ?? 0);
        matchedAlchemyRecipe.ingredients.forEach(ingredient => {
            let needed = ingredient.quantity;
            alchemyInputs.forEach((loc, i) => {
                if (needed <= 0) return;
                const inst = inventory.peekAtLocation(loc);
                if (!inst || inst.reference.key !== ingredient.referenceKey) return;
                const take = Math.min(needed, remaining[i]);
                if (take <= 0) return;
                consumptions.push({ location: loc, quantity: take });
                remaining[i] -= take;
                needed -= take;
            });
        });
        inventory.craftFromLocations(consumptions, matchedAlchemyRecipe.products);
        setAlchemyInputs(prev => prev.filter((_, i) => remaining[i] > 0));
        onChange();
    };

    const repairItemInstance = repairSlots[0] ? inventory.peekAtLocation(repairSlots[0]) : null;
    const repairMaterialInstance = repairSlots[1] ? inventory.peekAtLocation(repairSlots[1]) : null;
    const repairItem = repairItemInstance?.reference instanceof Breakable ? repairItemInstance.reference : null;
    const repairMaxDurability = repairItem?.durability ?? null;
    const repairMatch = repairItem && repairMaterialInstance && repairItemInstance!.currentDurability !== null
        ? repairItem.compositions.find(comp => comp.referenceKey === repairMaterialInstance.reference.key) ?? null
        : null;
    const repairValid = !!repairMatch
        && repairMaxDurability !== null && repairMaxDurability !== -1
        && repairItemInstance!.currentDurability! < repairMaxDurability;

    const performRepair = () => {
        if (!repairValid || !repairMatch || !repairSlots[0] || !repairSlots[1]) return;
        inventory.repairAtLocation(repairSlots[0], repairSlots[1], repairMatch.repairFactor);
        setRepairSlots(prev => [prev[0], prev[1] && inventory.peekAtLocation(prev[1]) ? prev[1] : null]);
        onChange();
    };

    const TableSwitcher = () => <>
        <div className={styles.tableSwitcher}>
            <button className={styles.tableSwitcherArrow} onClick={() => cycleTable(-1)}>‹</button>
            <div className={styles.tableSwitcherLabel}>{t({ text: activeTable, language, mode: 'UPPERCASE' })}</div>
            <button className={styles.tableSwitcherArrow} onClick={() => cycleTable(1)}>›</button>
        </div>
    </>

    const CompetenceInfo = (competence: Competence | null) => {
        if (!competence) return null;
        const current = character.scroll.skills.find(s => s.identifier === competence.skill)?.currentExperience ?? 0;
        const met = current >= competence.requiredExp;
        return (
            <div className={`${sharedStyles.craftCompetenceInfo}${met ? '' : ` ${sharedStyles.craftCompetenceInfoUnmet}`}`}>
                {t({ text: competence.skill, language, mode: 'UPPERCASE' })} {competence.requiredExp} {t({ text: 'required', language, mode: 'UPPERCASE' })} ({t({ text: 'current', language, mode: 'UPPERCASE' })}: {current})
            </div>
        );
    };

    const CraftingTable = () => <>
        <div className={`${sharedStyles.recipeFlow} ${sharedStyles.craftFlowTight} ${sharedStyles.craftFlowCenter}`}>
            <div className={sharedStyles.recipeGroup}>
                <div className={sharedStyles.sectionLabel}>{t({ text: 'ingredients', language, mode: 'UPPERCASE' })}</div>
                <div className={sharedStyles.craftingGrid}>
                    {craftingGrid.map((loc, i) => (
                        <ProjectionCell
                            key={i}
                            instance={loc ? inventory.peekAtLocation(loc) : null}
                            editable={customization}
                            onDropHere={() => handleDropOnGrid(i)}
                            onClear={() => clearGridCell(i)}
                        />
                    ))}
                </div>
            </div>

            <div className={sharedStyles.craftArrowGroup}>
                <div className={`${sharedStyles.sectionLabel} ${sharedStyles.recipeArrowSpacer}`}>&nbsp;</div>
                <div className={sharedStyles.recipeArrowCell}>
                    {matchedCraftingRecipe && customization ? (
                        <button
                            className={`${sharedStyles.recipeArrow} ${sharedStyles.craftArrowActive}`}
                            onClick={craftGrid}
                            title={t({ text: 'craft', language, mode: 'UPPERCASE' })}
                        >→</button>
                    ) : (
                        <div className={`${sharedStyles.recipeArrow} ${sharedStyles.craftArrowIdle}`}>→</div>
                    )}
                </div>
                {matchedCraftingRecipe && customization && (
                    <div className={sharedStyles.craftDifficultyInfo}>{matchedCraftingRecipe.difficulty}</div>
                )}
            </div>

            <div className={sharedStyles.recipeGroup}>
                <div className={sharedStyles.sectionLabel}>{t({ text: 'product', language, mode: 'UPPERCASE' })}</div>
                <div className={sharedStyles.recipeSlotRow}>
                    {matchedCraftingRecipe?.product ? (
                        <RecipeSlot
                            image={matchedCraftingRecipe.product.reference.image}
                            name={matchedCraftingRecipe.product.reference.name}
                            quantity={matchedCraftingRecipe.product.currentStack}
                        />
                    ) : (
                        <ProjectionCell instance={null} editable={false} onDropHere={() => {}} onClear={() => {}} />
                    )}
                </div>
                {matchedCraftingRecipe?.product && CompetenceInfo(matchedCraftingRecipe.competence)}
            </div>
        </div>
    </>

    const AlchemyTable = () => <>
        <div className={sharedStyles.recipeFlow}>
            <div className={sharedStyles.recipeGroup}>
                <div className={sharedStyles.sectionLabel}>{t({ text: 'ingredients', language, mode: 'UPPERCASE' })}</div>
                <div
                    className={`${sharedStyles.recipeSlotRow}${dragOverZone ? ` ${sharedStyles.recipeGroupDragOver}` : ''}`}
                    onDragOver={e => { if (customization && dragSourceRef.current) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                    onDragEnter={e => { if (customization && dragSourceRef.current) { e.preventDefault(); setDragOverZone(true); } }}
                    onDragLeave={() => setDragOverZone(false)}
                    onDrop={e => { e.preventDefault(); setDragOverZone(false); if (customization) handleDropOnAlchemyZone(); }}
                >
                    {alchemyInputs.map((loc, i) => {
                        const inst = inventory.peekAtLocation(loc);
                        if (!inst) return null;
                        return (
                            <RecipeSlot
                                key={i}
                                image={inst.reference.image}
                                name={inst.reference.name}
                                quantity={inst.currentStack}
                                editable={customization}
                                onRemove={() => clearAlchemyInput(i)}
                            />
                        );
                    })}
                    <ProjectionCell instance={null} editable={customization} onDropHere={handleDropOnAlchemyZone} onClear={() => {}} />
                </div>
            </div>

            <div className={sharedStyles.craftArrowGroup}>
                <div className={`${sharedStyles.sectionLabel} ${sharedStyles.recipeArrowSpacer}`}>&nbsp;</div>
                <div className={sharedStyles.recipeArrowCell}>
                    {matchedAlchemyRecipe && customization ? (
                        <button
                            className={`${sharedStyles.recipeArrow} ${sharedStyles.craftArrowActive}`}
                            onClick={craftAlchemy}
                            title={t({ text: 'craft', language, mode: 'UPPERCASE' })}
                        >→</button>
                    ) : (
                        <div className={`${sharedStyles.recipeArrow} ${sharedStyles.craftArrowIdle}`}>→</div>
                    )}
                </div>
                {matchedAlchemyRecipe && customization && (
                    <div className={sharedStyles.craftDifficultyInfo}>{matchedAlchemyRecipe.difficulty}</div>
                )}
            </div>

            <div className={sharedStyles.recipeGroup}>
                <div className={sharedStyles.sectionLabel}>{t({ text: 'products', language, mode: 'UPPERCASE' })}</div>
                {matchedAlchemyRecipe && (
                    <>
                        <div className={sharedStyles.recipeSlotRow}>
                            {matchedAlchemyRecipe.products.map((inst, i) => (
                                <RecipeSlot
                                    key={i}
                                    image={inst.reference.image}
                                    name={inst.reference.name}
                                    quantity={inst.currentStack}
                                />
                            ))}
                        </div>
                        {CompetenceInfo(matchedAlchemyRecipe.competence)}
                    </>
                )}
            </div>
        </div>
    </>

    const RepairTable = () => <>
        <div className={styles.repairSlots}>
            <ProjectionCell instance={repairItemInstance} editable={customization} onDropHere={() => handleDropOnRepair(0)} onClear={() => clearRepairSlot(0)} showName />
            <ProjectionCell instance={repairMaterialInstance} editable={customization} onDropHere={() => handleDropOnRepair(1)} onClear={() => clearRepairSlot(1)} showName />
        </div>
        {customization && (
            <div className={styles.repairBtnRow}>
                <button className={styles.repairBtn} disabled={!repairValid} onClick={performRepair}>
                    {t({ text: 'repair', language, mode: 'UPPERCASE' })}
                </button>
            </div>
        )}
    </>

    const PocketContainer = () => <>
        <div>
            <div className={sharedStyles.sectionLabel}>{t({ text: 'pocket', language, mode: 'UPPERCASE' })}</div>
            <div className={styles.slotRows}>
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
                                    onDragStart={() => { dragSourceRef.current = { type: 'pocket', slot }; }}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    </>

    const EquipmentContainer = () => <>
        <div>
            <div className={sharedStyles.sectionLabel}>{t({ text: 'equipment', language, mode: 'UPPERCASE' })}</div>
            <div className={styles.slotRow}>
                {EQUIPMENT_SLOT_KEYS.map(slotKey => {
                    const inst = inventory.equipment[EQUIPMENT_FIELD_BY_SLOT[slotKey]] as ItemInstance | null;
                    return (
                        <ItemSlotCell
                            key={slotKey}
                            instance={inst}
                            customization={customization}
                            topLabel={t({ text: EQUIPMENT_SLOT_LABEL_KEYS[slotKey], language, mode: 'TITLECASE' })}
                            draggable={customization && !!inst}
                            onDragStart={() => { dragSourceRef.current = { type: 'equipment', slot: slotKey }; }}
                        />
                    );
                })}
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
                                    onDragStart={() => { dragSourceRef.current = { type: 'container', slot }; }}
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
            <div>
                {TableSwitcher()}
                {activeTable === 'CRAFTING' && CraftingTable()}
                {activeTable === 'ALCHEMY' && AlchemyTable()}
                {activeTable === 'REPAIR' && RepairTable()}
            </div>
            <div>
                {PocketContainer()}
            </div>
            <div className={styles.equipmentContainerRow}>
                {EquipmentContainer()}
                {ContainerSection()}
            </div>
        </div>
    );

};


export default CraftSection;
