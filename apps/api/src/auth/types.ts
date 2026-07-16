import type { Request } from "express";

/** The minimal identity the guard attaches to every authenticated request. */
export interface AuthedUser {
  id: string;
  username: string;
}

export type AuthedRequest = Request & { omnioUser?: AuthedUser };
