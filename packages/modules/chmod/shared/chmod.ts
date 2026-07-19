/**
 * Unix file-mode conversions between the three common representations:
 * a 3-digit octal string ("754"), a 9-character symbolic string ("rwxr-xr--"),
 * and a per-role permission structure.
 */

export type Role = "owner" | "group" | "others";
export type Permission = "read" | "write" | "execute";

export type Mode = Record<Role, Record<Permission, boolean>>;

export const ROLES: readonly Role[] = ["owner", "group", "others"];
export const PERMISSIONS: readonly Permission[] = ["read", "write", "execute"];

const BITS: Record<Permission, number> = { read: 4, write: 2, execute: 1 };
const LETTERS: Record<Permission, string> = { read: "r", write: "w", execute: "x" };

export function emptyMode(): Mode {
  return {
    owner: { read: false, write: false, execute: false },
    group: { read: false, write: false, execute: false },
    others: { read: false, write: false, execute: false },
  };
}

export function modeToOctal(mode: Mode): string {
  return ROLES.map((role) =>
    PERMISSIONS.reduce((sum, p) => sum + (mode[role][p] ? BITS[p] : 0), 0),
  ).join("");
}

export function modeToSymbolic(mode: Mode): string {
  return ROLES.map((role) =>
    PERMISSIONS.map((p) => (mode[role][p] ? LETTERS[p] : "-")).join(""),
  ).join("");
}

/** Parse a 3-digit octal mode ("754"). Returns null when malformed. */
export function octalToMode(octal: string): Mode | null {
  if (!/^[0-7]{3}$/.test(octal)) return null;
  const mode = emptyMode();
  ROLES.forEach((role, index) => {
    const digit = Number(octal[index]);
    for (const p of PERMISSIONS) mode[role][p] = (digit & BITS[p]) !== 0;
  });
  return mode;
}

/** Parse a 9-character symbolic mode ("rwxr-xr--"). Returns null when malformed. */
export function symbolicToMode(symbolic: string): Mode | null {
  if (!/^([r-][w-][x-]){3}$/.test(symbolic)) return null;
  const mode = emptyMode();
  ROLES.forEach((role, roleIndex) => {
    PERMISSIONS.forEach((p, permIndex) => {
      mode[role][p] = symbolic[roleIndex * 3 + permIndex] !== "-";
    });
  });
  return mode;
}
