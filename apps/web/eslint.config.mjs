import { omnio } from "@omnio/config/eslint";

export default [...omnio(), { ignores: ["next-env.d.ts"] }];
