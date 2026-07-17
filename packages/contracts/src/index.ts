export { systemContract, SystemInfoSchema, type SystemInfo } from "./system.js";
export {
  authContract,
  AuthStatusSchema,
  IdentitySchema,
  UsernameSchema,
  PasswordSchema,
  type AuthStatus,
  type Identity,
} from "./auth.js";
export { ErrorSchema, type ApiError } from "./error.js";
export {
  filesContract,
  FileObjectSchema,
  StorageAreaSchema,
  type FileObjectDto,
  type StorageArea,
} from "./files.js";
export { apiContract } from "./router.js";
