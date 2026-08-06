// testing.ts
// Lightweight, dependency-free test harness for the model layer.
// No framework required — run all batches with:   npx tsx models/testing.ts
// Run a single batch by commenting out the others in ALL_BATCHES at the bottom,
// or by importing the batch function directly, e.g.:
//   import { testContainerContentPreservation } from "./testing";
//   testContainerContentPreservation();

import { Character } from "./character";
import { Ability } from "./ability";
import { Container, Weapon, Apparel, Tool, Accessory, Consumable } from "./item";
import { ItemInstance } from "./utils/itemInstance";
import { FiniteStorage, InfiniteStorage } from "./utils/storage";
import { Equipment } from "./utils/equipment";
import { ItemsInventory } from "./utils/itemsInventory";
import { AbilitiesGrimmoire } from "./utils/abilitiesGrimmoire";
import { AbilityInstance } from "./utils/abilityInstance";
import { Skill, SkillsScroll } from "./utils/skill";
import { Modifier } from "./utils/modifier";


// ---------------------------------------------------------------------------
// Tiny assertion harness
// ---------------------------------------------------------------------------

let batchPass = 0;
let batchFail = 0;
const failedBatches: string[] = [];

function assert(condition: boolean, message: string): void {
    if (condition) {
        batchPass++;
    } else {
        batchFail++;
        console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${message}`);
    }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
    assert(actual === expected, `${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function runBatch(name: string, fn: () => void): void {
    const passBefore = batchPass, failBefore = batchFail;
    console.log(`\n\x1b[1m▶ ${name}\x1b[0m`);
    try {
        fn();
    } catch (e) {
        batchFail++;
        console.error(`  \x1b[31m✗ THREW:\x1b[0m ${(e as Error).message}`);
    }
    const passed = batchPass - passBefore;
    const failed = batchFail - failBefore;
    if (failed > 0) failedBatches.push(name);
    const tag = failed > 0 ? "\x1b[31m" : "\x1b[32m";
    console.log(`  ${tag}${passed} passed, ${failed} failed\x1b[0m`);
}


// ---------------------------------------------------------------------------
// Batch: FiniteStorage — stacking, overflow, replacement
// ---------------------------------------------------------------------------

export function testFiniteStorageStacking(): void {
    runBatch("FiniteStorage: stacking, overflow, replacement", () => {
        const potion = new Consumable({ key: "potion", stack: 5 });
        const elixir = new Consumable({ key: "elixir", stack: 5 });

        // --- Merging within the stack limit ---
        const mergeStorage = new FiniteStorage(undefined, 3);
        const first = new ItemInstance(potion);
        first.currentStack = 3;
        const excedent1 = mergeStorage.add(first);
        assertEqual(excedent1, null, "3 potions into empty storage leaves no excedent");
        assertEqual(mergeStorage.slots[0]?.currentStack, 3, "slot 0 holds all 3 potions");

        // Exceeds stack limit (5): tops out slot 0, splits remainder into slot 1.
        const second = new ItemInstance(potion);
        second.currentStack = 3;
        const excedent2 = mergeStorage.add(second);
        assertEqual(excedent2, null, "overflow is absorbed into a new slot, no excedent returned");
        assertEqual(mergeStorage.slots[0]?.currentStack, 5, "slot 0 caps at the stack limit (5)");
        assertEqual(mergeStorage.slots[1]?.currentStack, 1, "the extra 1 potion spills into slot 1");

        // --- Storage genuinely full: every slot occupied by a non-matching, capped item ---
        const fullStorage = new FiniteStorage(undefined, 2);
        const capA = new ItemInstance(elixir);
        capA.currentStack = 5;
        const capB = new ItemInstance(new Consumable({ key: "gem", stack: 1 }));
        fullStorage.addToSlot(capA, 0);
        fullStorage.addToSlot(capB, 1);

        const overflow = new ItemInstance(potion); // different key, no empty slot, nothing to merge with
        overflow.currentStack = 2;
        const excedent3 = fullStorage.add(overflow);
        assertEqual(excedent3?.currentStack, 2, "add() returns the whole item back when storage is genuinely full");

        // --- removeBySlot behavior ---
        const removeStorage = new FiniteStorage(undefined, 1);
        const removable = new ItemInstance(potion);
        removable.currentStack = 5;
        removeStorage.addToSlot(removable, 0);

        const removedPartial = removeStorage.removeBySlot(0, 2);
        assertEqual(removedPartial?.currentStack, 2, "removeBySlot returns exactly the requested quantity");
        assertEqual(removeStorage.slots[0]?.currentStack, 3, "slot 0 still holds the remainder (5 - 2 = 3)");

        const removedAll = removeStorage.removeBySlot(0, 99);
        assertEqual(removedAll?.currentStack, 3, "removeBySlot caps the removed quantity to what's actually there");
        assertEqual(removeStorage.slots[0], null, "slot 0 is cleared once its stack hits 0");

        // --- addToSlot rejection / replacement ---
        const slotStorage = new FiniteStorage(undefined, 2);
        slotStorage.addToSlot(new ItemInstance(potion), 0);

        const rejected = slotStorage.addToSlot(new ItemInstance(elixir), 0, false);
        assertEqual(rejected?.reference.key, "elixir", "addToSlot rejects placing a different item without replaceExisting");
        assertEqual(slotStorage.slots[0]?.reference.key, "potion", "occupied slot 0 is untouched by the rejected placement");

        const evicted = slotStorage.addToSlot(new ItemInstance(elixir), 0, true);
        assertEqual(evicted?.reference.key, "potion", "replaceExisting evicts and returns the previous occupant");
        assertEqual(slotStorage.slots[0]?.reference.key, "elixir", "slot 0 now holds the new item");
    });
}


// ---------------------------------------------------------------------------
// Batch: InfiniteStorage (vault) — basic add/remove behavior
// ---------------------------------------------------------------------------

export function testInfiniteStorageBasics(): void {
    runBatch("InfiniteStorage: add / remove behavior", () => {
        const material = new Consumable({ key: "ore", stack: 999 });
        const vault = new InfiniteStorage();

        const first = new ItemInstance(material);
        first.currentStack = 10;
        vault.add(first);
        assertEqual(vault.content.length, 1, "first add creates a new content entry");

        const second = new ItemInstance(material);
        second.currentStack = 5;
        vault.add(second);
        assertEqual(vault.content.length, 1, "adding the same key merges into the existing entry (current design)");
        assertEqual(vault.content[0].currentStack, 15, "merged stack sums both quantities");

        const removedPartial = vault.removeByIndex(0, 4);
        assertEqual(removedPartial?.currentStack, 4, "removeByIndex returns exactly the requested quantity");
        assertEqual(vault.content[0].currentStack, 11, "remaining stack reflects the partial removal");

        const removedRest = vault.removeByIndex(0, 999);
        assertEqual(removedRest?.currentStack, 11, "removeByIndex caps to what's actually there");
        assertEqual(vault.content.length, 0, "entry is dropped once its stack hits 0");
    });
}


// ---------------------------------------------------------------------------
// Batch: Equipment — slot type validation
// ---------------------------------------------------------------------------

export function testEquipmentSlotValidation(): void {
    runBatch("Equipment: slot type validation", () => {
        const equipment = new Equipment();
        const sword = new ItemInstance(new Weapon({ key: "sword" }));
        const robe = new ItemInstance(new Apparel({ key: "robe" }));
        const hammer = new ItemInstance(new Tool({ key: "hammer" }));

        // Wrong kind for the slot: rejected, returns the instance unchanged, slot untouched.
        const rejected = equipment.setEquipment("APPAREL", sword);
        assertEqual(rejected?.reference.key, "sword", "setEquipment rejects a WEAPON in the APPAREL slot");
        assertEqual(equipment.apparel, null, "apparel slot stays empty after a rejected equip");

        // Correct kind: accepted, no previous occupant.
        const noPrevious = equipment.setEquipment("APPAREL", robe);
        assertEqual(noPrevious, null, "first equip into an empty slot returns null (nothing displaced)");
        assertEqual(equipment.apparel?.reference.key, "robe", "apparel slot now holds the robe");

        // Right hand: sword then swap for hammer, verify displaced item comes back.
        equipment.setEquipment("RIGHT_HAND", sword);
        const displaced = equipment.setEquipment("RIGHT_HAND", hammer);
        assertEqual(displaced?.reference.key, "sword", "equipping over an occupied slot returns the displaced item");
        assertEqual(equipment.rightHand?.reference.key, "hammer", "right hand now holds the hammer");

        // clearEquipment removes and returns.
        const cleared = equipment.clearEquipment("RIGHT_HAND");
        assertEqual(cleared?.reference.key, "hammer", "clearEquipment returns the removed item");
        assertEqual(equipment.rightHand, null, "right hand slot is empty after clearing");
    });
}


// ---------------------------------------------------------------------------
// Batch: Container content preservation across inventory moves
// (the scenario that originally prompted this test pass)
// ---------------------------------------------------------------------------

export function testContainerContentPreservation(): void {
    runBatch("ItemsInventory: container content preservation", () => {
        const inv = new ItemsInventory();
        const backpackTemplate = new Container({ key: "backpack", size: 5 });
        const potionTemplate = new Consumable({ key: "potion", stack: 5 });
        const swordTemplate = new Weapon({ key: "sword" });

        const backpack = new ItemInstance(backpackTemplate);
        const potion = new ItemInstance(potionTemplate);
        potion.currentStack = 2;

        // Place backpack in pocket, then equip it.
        inv.pocket.addToSlot(backpack, 0);
        inv.pocketToEquipment(0, "CONTAINER");
        assertEqual(inv.equipment.container?.reference.key, "backpack", "backpack is now equipped");

        // Put a potion inside the equipped container.
        inv.environmentToContainer(potion);
        assertEqual(
            inv.equipment.container?.storage?.slots[0]?.reference.key,
            "potion",
            "potion is stored inside the equipped container"
        );

        // Unequip: content must still be there.
        inv.equipmentToPocket("CONTAINER");
        assertEqual(inv.equipment.container, null, "container slot is empty after unequipping");
        const pocketedBackpack = inv.pocket.slots.find(s => s?.reference.key === "backpack");
        assertEqual(
            pocketedBackpack?.storage?.slots[0]?.reference.key,
            "potion",
            "potion survives moving the container from equipment back to pocket"
        );

        // Move the (still-full) backpack from pocket to vault.
        const pocketSlot = inv.pocket.slots.findIndex(s => s?.reference.key === "backpack");
        inv.pocketToStorage(pocketSlot, 1);
        assertEqual(inv.vault.content.length, 1, "backpack landed in the vault");
        assertEqual(
            inv.vault.content[0]?.storage?.slots[0]?.reference.key,
            "potion",
            "potion survives moving the container from pocket to vault"
        );

        // And back from vault to pocket.
        inv.storageToPocket(0, 1);
        const backInPocket = inv.pocket.slots.find(s => s?.reference.key === "backpack");
        assertEqual(
            backInPocket?.storage?.slots[0]?.reference.key,
            "potion",
            "potion survives moving the container from vault back to pocket"
        );

        // Re-equip, then stash an equipped weapon directly into the container.
        const backpackSlot = inv.pocket.slots.findIndex(s => s?.reference.key === "backpack");
        inv.pocketToEquipment(backpackSlot, "CONTAINER");
        const sword = new ItemInstance(swordTemplate);
        inv.equipment.setEquipment("RIGHT_HAND", sword);
        inv.equipmentToContainer("RIGHT_HAND");
        assertEqual(inv.equipment.rightHand, null, "right hand is empty after stashing the weapon");
        const containerSlots = inv.equipment.container?.storage?.slots ?? [];
        assertEqual(
            containerSlots.some(s => s?.reference.key === "sword"),
            true,
            "the stashed sword ends up inside the equipped container"
        );
        assertEqual(
            containerSlots.some(s => s?.reference.key === "potion"),
            true,
            "the original potion is still there too — nothing got overwritten"
        );

        // Self-nesting guard: trying to stash the container into itself must no-op.
        const containerRefBefore = inv.equipment.container;
        inv.equipmentToContainer("CONTAINER");
        assertEqual(inv.equipment.container, containerRefBefore, "container equip slot is untouched by equipmentToContainer('CONTAINER')");

        // Direct container<->pocket slot swap.
        const emptyPocketSlot = inv.pocket.slots.findIndex(s => s === null);
        inv.containerToPocket(0, emptyPocketSlot);
        const swappedIntoPocket = inv.pocket.slots[emptyPocketSlot];
        assertEqual(
            swappedIntoPocket?.reference.key === "potion" || swappedIntoPocket?.reference.key === "sword",
            true,
            "containerToPocket swap moves a real item into the target pocket slot"
        );
    });
}


// ---------------------------------------------------------------------------
// Batch: ItemInstance construction & clone independence
// ---------------------------------------------------------------------------

export function testItemInstanceConstruction(): void {
    runBatch("ItemInstance: construction & clone independence", () => {
        const backpackTemplate = new Container({ key: "backpack", size: 4 });
        const weaponTemplate = new Weapon({ key: "sword", durability: 50 });
        const accessoryTemplate = new Accessory({ key: "ring" });

        const backpackInstance = new ItemInstance(backpackTemplate);
        assertEqual(backpackInstance.storage?.size, 4, "container instance gets fresh storage sized to the template");

        const weaponInstance = new ItemInstance(weaponTemplate);
        assertEqual(weaponInstance.currentDurability, 50, "breakable instance inherits starting durability from its template");

        const accessoryInstance = new ItemInstance(accessoryTemplate);
        assertEqual(accessoryInstance.currentDurability, null, "non-breakable instance has no durability tracking");

        // Clone independence: mutating the clone must not affect the original.
        const original = new ItemInstance(backpackTemplate);
        const filler = new ItemInstance(new Consumable({ key: "potion", stack: 5 }));
        original.storage?.addToSlot(filler, 0);
        original.quirks.push({ name: "Lucky", description: null, effects: [] });

        const clone = new ItemInstance(original);
        clone.quirks.push({ name: "Cursed", description: null, effects: [] });
        clone.storage?.removeBySlot(0, 1);

        assertEqual(original.quirks.length, 1, "pushing a quirk onto the clone doesn't affect the original's quirks array");
        assertEqual(clone.quirks.length, 2, "the clone has its own independent quirks array");
        assertEqual(original.storage?.slots[0]?.reference.key, "potion", "emptying the clone's storage doesn't empty the original's storage");
    });
}


// ---------------------------------------------------------------------------
// Batch: Character effect accumulation (traits, equipment, quirks)
// ---------------------------------------------------------------------------

export function testCharacterEffectAccumulation(): void {
    runBatch("Character: effect accumulation (ADDER / MULTIPLIER / SETTER)", () => {
        const character = new Character();

        // No traits, no equipment: HEALTH = base(16) + rate(8)*variable(0) = 16.
        assertEqual(character.getMaxStatValue("HEALTH"), 16, "base HEALTH with no attributes/traits is 16");

        // ADDER trait.
        const toughTrait: Modifier = { name: "Tough", description: null, effects: [{ identifier: "HEALTH", mode: "ADDER", value: 10 }] };
        character.traits.push(toughTrait);
        assertEqual(character.getMaxStatValue("HEALTH"), 26, "ADDER trait adds flatly to the base value");

        // MULTIPLIER trait stacks with the ADDER: (base + adder) * multiplier.
        const hardyTrait: Modifier = { name: "Hardy", description: null, effects: [{ identifier: "HEALTH", mode: "MULTIPLIER", value: 2 }] };
        character.traits.push(hardyTrait);
        assertEqual(character.getMaxStatValue("HEALTH"), 52, "(base + adder) * multiplier = (16 + 10) * 2");

        // SETTER overrides everything else, and multiple setters take the minimum.
        character.traits.length = 0;
        character.traits.push({ name: "Frail", description: null, effects: [{ identifier: "HEALTH", mode: "SETTER", value: 8 }] });
        character.traits.push({ name: "MoreFrail", description: null, effects: [{ identifier: "HEALTH", mode: "SETTER", value: 5 }] });
        assertEqual(character.getMaxStatValue("HEALTH"), 5, "two SETTER effects resolve to the minimum of the two");
        character.traits.length = 0;

        // Equipped item's template traits (Wearable.traits) contribute.
        const armorTemplate = new Apparel({
            key: "plate",
            traits: [{ name: "Bulwark", description: null, effects: [{ identifier: "HEALTH", mode: "ADDER", value: 20 }] }],
        });
        character.inventory.equipment.setEquipment("APPAREL", new ItemInstance(armorTemplate));
        assertEqual(character.getMaxStatValue("HEALTH"), 36, "equipped item's template traits contribute (16 + 20)");

        // Instance-level quirks (independent of the template) also contribute.
        const ringInstance = new ItemInstance(new Accessory({ key: "ring" }));
        ringInstance.quirks.push({ name: "Blessed", description: null, effects: [{ identifier: "HEALTH", mode: "ADDER", value: 4 }] });
        character.inventory.equipment.setEquipment("ACCESSORY_1", ringInstance);
        assertEqual(character.getMaxStatValue("HEALTH"), 40, "equipped item's instance quirks stack on top of template traits (16 + 20 + 4)");

        // Equipped container's quirks now contribute too (per the confirmed fix).
        const containerInstance = new ItemInstance(new Container({ key: "backpack" }));
        containerInstance.quirks.push({ name: "Featherlight", description: null, effects: [{ identifier: "HEALTH", mode: "ADDER", value: 1 }] });
        character.inventory.equipment.setEquipment("CONTAINER", containerInstance);
        assertEqual(character.getMaxStatValue("HEALTH"), 41, "equipped container's quirks contribute too (16 + 20 + 4 + 1)");
    });
}


// ---------------------------------------------------------------------------
// Batch: Character.setStatValue bounds checking
// ---------------------------------------------------------------------------

export function testCharacterStatBounds(): void {
    runBatch("Character: setStatValue bounds checking", () => {
        const character = new Character(); // max HEALTH = 16

        character.setStatValue("HEALTH", 10);
        assertEqual(character.condition.health, 10, "a value within range is accepted");

        character.setStatValue("HEALTH", -1);
        assertEqual(character.condition.health, 10, "a negative value is rejected, previous value kept");

        character.setStatValue("HEALTH", 999);
        assertEqual(character.condition.health, 10, "a value above the max is rejected, previous value kept");

        character.setStatValue("HEALTH", 16);
        assertEqual(character.condition.health, 16, "the max value itself is accepted");

        character.setStatValue("HEALTH", 0);
        assertEqual(character.condition.health, 0, "zero is accepted");
    });
}


// ---------------------------------------------------------------------------
// Batch: AbilitiesGrimmoire — slot management
// ---------------------------------------------------------------------------

export function testAbilitiesGrimmoire(): void {
    runBatch("AbilitiesGrimmoire: slot management", () => {
        const grimmoire = new AbilitiesGrimmoire();
        const makeInstance = (key: string): AbilityInstance => ({
            reference: new Ability({ key }),
            currentCooldown: 0,
            currentDuration: 0,
        });

        // Fills empty slots in order.
        for (let i = 0; i < 6; i++) {
            const leftover = grimmoire.add(makeInstance(`ability-${i}`));
            assertEqual(leftover, null, `ability-${i} is placed with no leftover`);
        }
        assertEqual(grimmoire.slots.every(s => s !== null), true, "all 6 slots are filled");

        // Grimoire is full: add() hands the ability back.
        const overflow = makeInstance("ability-overflow");
        const leftover = grimmoire.add(overflow);
        assertEqual(leftover?.reference.key, "ability-overflow", "add() returns the ability unplaced when the grimoire is full");

        // addToSlot without replaceExisting rejects.
        const rejected = grimmoire.addToSlot(overflow, 0, false);
        assertEqual(rejected?.reference.key, "ability-overflow", "addToSlot rejects without replaceExisting on an occupied slot");
        assertEqual(grimmoire.slots[0]?.reference.key, "ability-0", "slot 0 is untouched by the rejected placement");

        // addToSlot with replaceExisting evicts and returns the previous occupant.
        const evicted = grimmoire.addToSlot(overflow, 0, true);
        assertEqual(evicted?.reference.key, "ability-0", "replaceExisting evicts and returns the displaced ability");
        assertEqual(grimmoire.slots[0]?.reference.key, "ability-overflow", "slot 0 now holds the new ability");

        // removeBySlot clears and returns.
        const removed = grimmoire.removeBySlot(0);
        assertEqual(removed?.reference.key, "ability-overflow", "removeBySlot returns the removed ability");
        assertEqual(grimmoire.slots[0], null, "slot 0 is empty after removal");
    });
}


// ---------------------------------------------------------------------------
// Batch: Skill progression (experience IS the level — no separate level/XP curve)
// ---------------------------------------------------------------------------

export function testSkillProgression(): void {
    runBatch("Skill: experience progression", () => {
        // Fresh skill starts at 0.
        const skillA = new Skill({ identifier: "SWORD_BRAWL" });
        assertEqual(skillA.currentExperience, 0, "a fresh skill starts at 0 experience");

        // Gaining experience accumulates directly — no level/threshold curve involved.
        skillA.adjustExperience(250);
        assertEqual(skillA.currentExperience, 250, "gaining 250 XP sets experience to 250 directly");
        skillA.adjustExperience(50);
        assertEqual(skillA.currentExperience, 300, "repeated gains accumulate additively");

        // Losing experience within what's held just decrements.
        skillA.adjustExperience(-100);
        assertEqual(skillA.currentExperience, 200, "losing 100 XP decrements directly (300 - 100 = 200)");

        // Floor at 0: losing more than currently held clamps rather than going negative.
        const skillB = new Skill({ identifier: "SWORD_BRAWL", currentExperience: 30 });
        skillB.adjustExperience(-50);
        assertEqual(skillB.currentExperience, 0, "losing more XP than held floors at 0 instead of going negative");

        // setExperience sets an absolute value (not additive).
        const skillC = new Skill({ identifier: "SWORD_BRAWL", currentExperience: 300 });
        skillC.setExperience(500);
        assertEqual(skillC.currentExperience, 500, "setExperience overwrites the current value directly");

        // Constructing with a negative starting value clamps to 0.
        const skillD = new Skill({ identifier: "SWORD_BRAWL", currentExperience: -40 });
        assertEqual(skillD.currentExperience, 0, "a negative starting experience is clamped to 0 by the constructor");
    });
}


// ---------------------------------------------------------------------------
// Batch: SkillsScroll — add/remove
// ---------------------------------------------------------------------------

export function testSkillsScroll(): void {
    runBatch("SkillsScroll: add / remove skills", () => {
        const scroll = new SkillsScroll();
        scroll.addSkill("SWORD_BRAWL");
        scroll.addSkill("BOW_BRAWL");
        assertEqual(scroll.skills.length, 2, "two skills added");
        assertEqual(scroll.skills[0].identifier, "SWORD_BRAWL", "skills are appended in order");

        scroll.removeSkill(0);
        assertEqual(scroll.skills.length, 1, "removeSkill removes by index");
        assertEqual(scroll.skills[0].identifier, "BOW_BRAWL", "the remaining skill is the one that wasn't removed");

        scroll.removeSkill(99); // out of range, should be a no-op
        assertEqual(scroll.skills.length, 1, "removeSkill with an out-of-range index is a no-op");
    });
}


// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const ALL_BATCHES: Array<() => void> = [
    testFiniteStorageStacking,
    testInfiniteStorageBasics,
    testEquipmentSlotValidation,
    testContainerContentPreservation,
    testItemInstanceConstruction,
    testCharacterEffectAccumulation,
    testCharacterStatBounds,
    testAbilitiesGrimmoire,
    testSkillProgression,
    testSkillsScroll,
];

export function runAll(): void {
    batchPass = 0;
    batchFail = 0;
    failedBatches.length = 0;

    for (const batch of ALL_BATCHES) batch();

    console.log(`\n${"=".repeat(50)}`);
    console.log(`TOTAL: ${batchPass} passed, ${batchFail} failed`);
    if (failedBatches.length > 0) {
        console.log(`Failed batches: ${failedBatches.join(", ")}`);
        process.exitCode = 1;
    }
}

runAll();
