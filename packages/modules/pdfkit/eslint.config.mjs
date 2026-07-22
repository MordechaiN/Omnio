import { omnio } from "@omnio/config/eslint";

// `spikes/` holds throwaway engine-feasibility scripts (Node, console output);
// they are removed before deploy and are not part of the shipped module.
export default [{ ignores: ["spikes/**"] }, ...omnio()];
