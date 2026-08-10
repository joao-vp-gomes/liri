// frontend/src/pages/CodexPage/entryWindows/Inventory/InventorySection.tsx


import React, { useRef, useState, useEffect } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { t } from '../../../../utils/localizer';
import { dbFetch } from '../../../../services/database';
import { transfer } from '../../../../utils/transfer.ts';
import { Character } from '../../../../../../models/character.ts';
import { Item } from '../../../../../../models/item.ts';
import { Ability } from '../../../../../../models/ability.ts';
import { ItemInstance } from '../../../../../../models/utils/itemInstance.ts';
import type { AbilityInstance } from '../../../../../../models/utils/abilityInstance.ts';
import { Equipment } from '../../../../../../models/utils/equipment.ts';
import type { FiniteStorage } from '../../../../../../models/utils/storage.ts';
import ItemSlotCell, { type SlotAction } from './ItemSlotCell';
import AbilitySlotCell from './AbilitySlotCell';

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

const CONTAINER_ROW_SIZE = 6;
const POCKET_ROW_SIZE = 6;

type DragSource =
    | { kind: 'pocket'; slot: number }
    | { kind: 'container'; slot: number }
    | { kind: 'equipment'; slotKey: EquipmentSlotKey }
    | { kind: 'vault'; index: number };

const swapFiniteSlots = (storageA: FiniteStorage, indexA: number, storageB: FiniteStorage, indexB: number) => {
    const tmp = storageA.slots[indexA];
    storageA.slots[indexA] = storageB.slots[indexB];
    storageB.slots[indexB] = tmp;
};

interface VaultRowProps {
    name: string;
    amount: number;
    customization: boolean;
    sendLabel: string;
    onSend: (quantity: number) => void;
    dropLabel: string;
    onDrop: (quantity: number) => void;
    draggable?: boolean;
    onDragStart?: () => void;
}

const VaultRow: React.FC<VaultRowProps> = ({ name, amount, customization, sendLabel, onSend, dropLabel, onDrop, draggable, onDragStart }) => {

    const [pendingAction, setPendingAction] = useState<'send' | 'drop' | null>(null);
    const [quantity, setQuantity] = useState(amount);
    useEffect(() => { setQuantity(amount); setPendingAction(null); }, [amount]);

    const confirm = () => {
        if (pendingAction === 'send') onSend(quantity);
        else if (pendingAction === 'drop') onDrop(quantity);
        setPendingAction(null);
    };

    return (
        <div
            className={styles.vaultRow}
            draggable={!!draggable}
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'liri-slot'); onDragStart?.(); }}
        >
            <span className={styles.vaultName}>{name || '—'}</span>
            <span className={styles.vaultAmount}>{amount}</span>
            {customization && (
                pendingAction ? (
                    <div className={styles.vaultQuantityRow}>
                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                        <span>{quantity}</span>
                        <button onClick={() => setQuantity(q => Math.min(amount, q + 1))}>+</button>
                        <button className={styles.vaultConfirmBtn} onClick={confirm}>✓</button>
                    </div>
                ) : (
                    <>
                        <button className={styles.vaultSendBtn} onClick={() => amount === 1 ? onSend(1) : setPendingAction('send')}>
                            {sendLabel}
                        </button>
                        <button className={styles.vaultDropBtn} onClick={() => amount === 1 ? onDrop(1) : setPendingAction('drop')}>
                            {dropLabel}
                        </button>
                    </>
                )
            )}
        </div>
    );

};

const InventorySection: React.FC<Props> = ({ character, customization, onChange }) => {

    const { language } = useLanguage();
    const inventory = character.inventory;
    const grimmoire = character.grimmoire;
    const containerStorage = inventory.equipment.container?.storage ?? null;

    const characterRef = useRef(character);
    characterRef.current = character;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const dragSourceRef = useRef<DragSource | null>(null);
    const [vaultDragOver, setVaultDragOver] = useState(false);

    const abilityDragSourceRef = useRef<number | null>(null);
    const handleDropOnGrimmoire = (targetSlot: number) => {
        const sourceSlot = abilityDragSourceRef.current;
        abilityDragSourceRef.current = null;
        if (sourceSlot === null || sourceSlot === targetSlot) return;
        const tmp = grimmoire.slots[sourceSlot];
        grimmoire.slots[sourceSlot] = grimmoire.slots[targetSlot];
        grimmoire.slots[targetSlot] = tmp;
        onChange();
    };

    const handleDropOnPocket = (targetSlot: number) => {
        const source = dragSourceRef.current;
        dragSourceRef.current = null;
        if (!source) return;
        if (source.kind === 'pocket') {
            if (source.slot === targetSlot) return;
            swapFiniteSlots(inventory.pocket, source.slot, inventory.pocket, targetSlot);
        } else if (source.kind === 'container') {
            if (!containerStorage) return;
            inventory.containerToPocket(source.slot, targetSlot);
        } else if (source.kind === 'equipment') {
            inventory.equipmentToPocket(source.slotKey);
        } else if (source.kind === 'vault') {
            const inst = inventory.vault.content[source.index];
            if (!inst) return;
            inventory.storageToPocket(source.index, inst.currentStack);
        }
        onChange();
    };

    const handleDropOnContainer = (targetSlot: number) => {
        const source = dragSourceRef.current;
        dragSourceRef.current = null;
        if (!source || !containerStorage) return;
        if (source.kind === 'container') {
            if (source.slot === targetSlot) return;
            swapFiniteSlots(containerStorage, source.slot, containerStorage, targetSlot);
        } else if (source.kind === 'pocket') {
            inventory.pocketToContainer(source.slot, targetSlot);
        } else if (source.kind === 'equipment') {
            inventory.equipmentToContainer(source.slotKey);
        } else if (source.kind === 'vault') {
            const inst = inventory.vault.content[source.index];
            if (!inst) return;
            inventory.storageToContainer(source.index, inst.currentStack);
        }
        onChange();
    };

    const handleDropOnEquipment = (targetSlotKey: EquipmentSlotKey) => {
        const source = dragSourceRef.current;
        dragSourceRef.current = null;
        if (!source) return;
        if (source.kind === 'pocket') {
            inventory.pocketToEquipment(source.slot, targetSlotKey);
        } else if (source.kind === 'container') {
            if (!containerStorage) return;
            inventory.containerToEquipment(source.slot, targetSlotKey);
        } else {
            return;
        }
        onChange();
    };

    const handleDropOnVault = () => {
        const source = dragSourceRef.current;
        dragSourceRef.current = null;
        if (!source) return;
        if (source.kind === 'pocket') {
            const inst = inventory.pocket.slots[source.slot];
            if (!inst) return;
            inventory.pocketToStorage(source.slot, inst.currentStack);
        } else if (source.kind === 'container') {
            if (!containerStorage) return;
            const inst = containerStorage.slots[source.slot];
            if (!inst) return;
            inventory.containerToStorage(source.slot, inst.currentStack);
        } else {
            return;
        }
        onChange();
    };

    const getValidEquipmentSlots = (kind: string): EquipmentSlotKey[] =>
        EQUIPMENT_SLOT_KEYS.filter(slotKey => (Equipment.EQUIPMENT_SLOTS[slotKey] as readonly string[]).includes(kind));

    const sendPocketToContainer = (slot: number, inst: ItemInstance, quantity: number) => {
        const key = inst.reference.key;
        inventory.pocketToStorage(slot, quantity);
        const vaultIndex = inventory.vault.content.findIndex(c => c.reference.key === key);
        if (vaultIndex !== -1) inventory.storageToContainer(vaultIndex, quantity);
        onChange();
    };

    const sendContainerToPocket = (slot: number, inst: ItemInstance, quantity: number) => {
        const key = inst.reference.key;
        inventory.containerToStorage(slot, quantity);
        const vaultIndex = inventory.vault.content.findIndex(c => c.reference.key === key);
        if (vaultIndex !== -1) inventory.storageToPocket(vaultIndex, quantity);
        onChange();
    };

    const sendVaultToPocket = (index: number, quantity: number) => {
        inventory.storageToPocket(index, quantity);
        onChange();
    };

    const dropFromVault = (index: number, quantity: number) => {
        inventory.storageToEnvironment(index, quantity);
        onChange();
    };

    const addItemToPocket = async (slot: number, key: string) => {
        const entry = await dbFetch(`entries/${key}`);
        if (!(entry instanceof Item)) return;
        characterRef.current.inventory.environmentToPocket(new ItemInstance(entry), slot);
        onChangeRef.current();
    };

    const addItemToContainer = async (slot: number, key: string) => {
        const entry = await dbFetch(`entries/${key}`);
        if (!(entry instanceof Item)) return;
        characterRef.current.inventory.environmentToContainer(new ItemInstance(entry), slot);
        onChangeRef.current();
    };

    const transferFromPocket = async (slot: number, targetKey: string, quantity: number) => {
        const inv = characterRef.current.inventory;
        const removed = inv.pocket.removeBySlot(slot, quantity);
        if (!removed) return;
        const ok = await transfer(targetKey, removed);
        if (!ok) inv.pocket.addToSlot(removed, slot, true);
        onChangeRef.current();
    };

    const transferFromContainer = async (slot: number, targetKey: string, quantity: number) => {
        const storage = characterRef.current.inventory.equipment.container?.storage ?? null;
        if (!storage) return;
        const removed = storage.removeBySlot(slot, quantity);
        if (!removed) return;
        const ok = await transfer(targetKey, removed);
        if (!ok) storage.addToSlot(removed, slot, true);
        onChangeRef.current();
    };

    const transferFromEquipment = async (slotKey: EquipmentSlotKey, targetKey: string) => {
        const inv = characterRef.current.inventory;
        const removed = inv.equipment.clearEquipment(slotKey);
        if (!removed) return;
        const ok = await transfer(targetKey, removed);
        if (!ok) inv.equipment.setEquipment(slotKey, removed);
        onChangeRef.current();
    };

    const insertAbility = async (slot: number, key: string) => {
        const entry = await dbFetch(`entries/${key}`);
        if (!(entry instanceof Ability)) return;
        const instance: AbilityInstance = { reference: entry, currentCooldown: 0, currentDuration: 0 };
        characterRef.current.grimmoire.addToSlot(instance, slot, true);
        onChangeRef.current();
    };

    const removeAbility = (slot: number) => {
        grimmoire.removeBySlot(slot);
        onChange();
    };

    const editPocketInstance = (slot: number, patch: Partial<ItemInstance>) => {
        const inst = inventory.pocket.slots[slot];
        if (!inst) return;
        Object.assign(inst, patch);
        onChange();
    };
    const editEquipmentInstance = (slotKey: EquipmentSlotKey, patch: Partial<ItemInstance>) => {
        const inst = inventory.equipment[EQUIPMENT_FIELD_BY_SLOT[slotKey]] as ItemInstance | null;
        if (!inst) return;
        Object.assign(inst, patch);
        onChange();
    };
    const editContainerInstance = (slot: number, patch: Partial<ItemInstance>) => {
        if (!containerStorage) return;
        const inst = containerStorage.slots[slot];
        if (!inst) return;
        Object.assign(inst, patch);
        onChange();
    };

    const pocketActions = (slot: number, inst: ItemInstance): SlotAction[] => {
        const actions: SlotAction[] = getValidEquipmentSlots(inst.reference.kind).map(slotKey => ({
            label: `${t({ text: 'equip', language, mode: 'UPPERCASE' })} — ${t({ text: EQUIPMENT_SLOT_LABEL_KEYS[slotKey], language, mode: 'TITLECASE' })}`,
            onClick: () => { inventory.pocketToEquipment(slot, slotKey); onChange(); },
            usesQuantity: false,
        }));
        actions.push({
            label: t({ text: 'send-to-storage', language, mode: 'UPPERCASE' }),
            onClick: quantity => { inventory.pocketToStorage(slot, quantity); onChange(); },
        });
        if (containerStorage) {
            actions.push({
                label: t({ text: 'send-to-container', language, mode: 'UPPERCASE' }),
                onClick: quantity => sendPocketToContainer(slot, inst, quantity),
            });
        }
        actions.push({
            label: t({ text: 'drop', language, mode: 'UPPERCASE' }),
            onClick: quantity => { inventory.pocketToEnvironment(slot, quantity); onChange(); },
            danger: true,
        });
        return actions;
    };

    const equipmentActions = (slotKey: EquipmentSlotKey): SlotAction[] => [
        {
            label: t({ text: 'unequip', language, mode: 'UPPERCASE' }),
            onClick: () => { inventory.equipmentToPocket(slotKey); onChange(); },
            usesQuantity: false,
        },
        {
            label: t({ text: 'drop', language, mode: 'UPPERCASE' }),
            onClick: () => { inventory.equipmentToEnvironment(slotKey); onChange(); },
            usesQuantity: false,
            danger: true,
        },
    ];

    const containerActions = (slot: number, inst: ItemInstance): SlotAction[] => [
        {
            label: t({ text: 'send-to-pocket', language, mode: 'UPPERCASE' }),
            onClick: quantity => sendContainerToPocket(slot, inst, quantity),
        },
        {
            label: t({ text: 'send-to-storage', language, mode: 'UPPERCASE' }),
            onClick: quantity => { inventory.containerToStorage(slot, quantity); onChange(); },
        },
        {
            label: t({ text: 'drop', language, mode: 'UPPERCASE' }),
            onClick: quantity => { inventory.containerToEnvironment(slot, quantity); onChange(); },
            danger: true,
        },
    ];

    const AbilitiesContainer = () => <>
        <div>
            <div className={sharedStyles.sectionLabel}>{t({ text: 'grimmoire', language, mode: 'UPPERCASE' })}</div>
            <div className={styles.slotRow}>
                {grimmoire.slots.map((inst, i) => (
                    <AbilitySlotCell
                        key={i}
                        instance={inst}
                        customization={customization}
                        topLabel={String(i + 1)}
                        onInsert={key => insertAbility(i, key)}
                        onRemove={() => removeAbility(i)}
                        draggable={customization && !!inst}
                        onDragStart={() => { abilityDragSourceRef.current = i; }}
                        onDropHere={() => handleDropOnGrimmoire(i)}
                    />
                ))}
            </div>
        </div>
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
                                    actions={inst ? pocketActions(slot, inst) : []}
                                    onAddItem={!inst ? (key => addItemToPocket(slot, key)) : undefined}
                                    onEditDurability={v => editPocketInstance(slot, { currentDurability: v })}
                                    onEditStack={v => editPocketInstance(slot, { currentStack: v })}
                                    onEditQuirks={q => editPocketInstance(slot, { quirks: q })}
                                    onTransfer={inst ? ((targetKey, quantity) => transferFromPocket(slot, targetKey, quantity)) : undefined}
                                    draggable={customization && !!inst}
                                    onDragStart={() => { dragSourceRef.current = { kind: 'pocket', slot }; }}
                                    onDropHere={() => handleDropOnPocket(slot)}
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
                            actions={inst ? equipmentActions(slotKey) : []}
                            onEditDurability={v => editEquipmentInstance(slotKey, { currentDurability: v })}
                            onEditQuirks={q => editEquipmentInstance(slotKey, { quirks: q })}
                            onTransfer={inst ? ((targetKey) => transferFromEquipment(slotKey, targetKey)) : undefined}
                            draggable={customization && !!inst}
                            onDragStart={() => { dragSourceRef.current = { kind: 'equipment', slotKey }; }}
                            onDropHere={() => handleDropOnEquipment(slotKey)}
                        />
                    );
                })}
            </div>
        </div>
    </>

    const ContainerContainer = () => containerStorage && <>
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
                                    actions={inst ? containerActions(slot, inst) : []}
                                    onAddItem={!inst ? (key => addItemToContainer(slot, key)) : undefined}
                                    onEditDurability={v => editContainerInstance(slot, { currentDurability: v })}
                                    onEditStack={v => editContainerInstance(slot, { currentStack: v })}
                                    onEditQuirks={q => editContainerInstance(slot, { quirks: q })}
                                    onTransfer={inst ? ((targetKey, quantity) => transferFromContainer(slot, targetKey, quantity)) : undefined}
                                    draggable={customization && !!inst}
                                    onDragStart={() => { dragSourceRef.current = { kind: 'container', slot }; }}
                                    onDropHere={() => handleDropOnContainer(slot)}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    </>

    const VaultContainer = () => <>
        <div
            className={`${styles.vaultBlock}${vaultDragOver ? ` ${styles.vaultBlockDragOver}` : ''}`}
            onDragOver={e => { if (customization && dragSourceRef.current) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
            onDragEnter={e => { if (customization && dragSourceRef.current) { e.preventDefault(); setVaultDragOver(true); } }}
            onDragLeave={() => setVaultDragOver(false)}
            onDrop={e => { e.preventDefault(); setVaultDragOver(false); if (customization) handleDropOnVault(); }}
        >
            <div className={sharedStyles.sectionLabel}>{t({ text: 'vault', language, mode: 'UPPERCASE' })}</div>
            <div className={styles.vaultList}>
                {inventory.vault.content.length === 0 && (
                    <div className={styles.vaultEmpty}>{t({ text: 'empty', language, mode: 'PLAIN_FIRST_UPPER' })}</div>
                )}
                {inventory.vault.content.map((inst, i) => (
                    <VaultRow
                        key={`${inst.reference.key}-${i}`}
                        name={inst.reference.name || ''}
                        amount={inst.currentStack}
                        customization={customization}
                        sendLabel={t({ text: 'send-to-pocket', language, mode: 'UPPERCASE' })}
                        onSend={quantity => sendVaultToPocket(i, quantity)}
                        dropLabel={t({ text: 'drop', language, mode: 'UPPERCASE' })}
                        onDrop={quantity => dropFromVault(i, quantity)}
                        draggable={customization}
                        onDragStart={() => { dragSourceRef.current = { kind: 'vault', index: i }; }}
                    />
                ))}
            </div>
        </div>
    </>

    return (
        <div className={styles.inventoryMain}>
            {AbilitiesContainer()}
            <div className={styles.pocketVaultRow}>
                {PocketContainer()}
                {VaultContainer()}
            </div>
            <div className={styles.equipmentContainerRow}>
                {EquipmentContainer()}
                {ContainerContainer()}
            </div>
        </div>
    );

};


export default InventorySection;
