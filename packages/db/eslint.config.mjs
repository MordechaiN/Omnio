import { omnio } from "@omnio/config/eslint";

export default [{ ignores: ["generated/**"] }, ...omnio()];
