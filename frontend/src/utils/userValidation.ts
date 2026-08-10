// frontend/src/utils/userValidation.ts


import type { Account } from "../contexts/AuthContext";
import type { RoleType } from "../types/roleType";


export const userValidation = (
    account: Account | null,
    roles: RoleType[],
    mode: 'OR' | 'AND' | 'NOR' | 'NAND',
    key: string | null,
): boolean => {

    const roleValidation = roles.includes(account?.role || 'anon');
    const characterValidation = key ? (account?.characters.includes(key) || false) : false;

    switch(mode) {
        case 'OR': return roleValidation || characterValidation;
        case 'AND': return roleValidation && characterValidation;
        case 'NOR': return !(roleValidation || characterValidation);
        case 'NAND': return !(roleValidation && characterValidation);
        default: return false;
    }

}