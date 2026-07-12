import { omnio } from "@omnio/config/eslint";

export default [...omnio(), { ignores: ["storybook-static/**"] }];
