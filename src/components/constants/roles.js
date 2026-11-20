export const ADMIN = 'ADMIN';
export const WAIVER = 'WAIVER';
export const STATIC = 'STATIC';
export const SUPER = 'SUPER';

export function officialAccountRoles(roles) {
    const next = { ...roles };
    const value = next[ADMIN];
    if (value === true || value === 1 || (typeof value === 'string' && ['admin', 'true', '1'].includes(value.trim().toLowerCase()))) {
        next[ADMIN] = true;
    } else {
        delete next[ADMIN];
    }
    return next;
}
