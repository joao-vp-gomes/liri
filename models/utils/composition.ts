// models/utils/composition.ts
// Compositions are used to define the materials that an item is made of, and how they affect its repairability.


export interface Composition {
    referenceKey: string;
    repairFactor: number;
}
