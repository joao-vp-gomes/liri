import { generateKey } from "./utils/key";


export type EntryCategory = 'ENTRY' | 'CHARACTER' | 'ITEM' | 'ABILITY' | 'RECIPE';
export class Entry {

    public key: string;
    public category: EntryCategory;
    public name: string | null;
    public image: string | null;
    public description: string | null;
    public tags: Array<string>;

    constructor(source?: Partial<Entry>) {
        this.key = source?.key ?? generateKey();
        this.category = 'ENTRY';
        this.name = source?.name ?? null;
        this.image = source?.image ?? null;
        this.description = source?.description ?? null;
        this.tags = source?.tags ? [...source.tags] : new Array();
    }

 }