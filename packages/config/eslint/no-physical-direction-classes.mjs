/**
 * omnio/no-physical-direction-classes
 *
 * RTL is a first-class requirement (docs/architecture/04-frontend.md §5).
 * Physical direction utilities break mirrored layouts, so they are banned
 * in favor of logical ones. This rule scans string literals and template
 * strings for the banned Tailwind utilities and names the replacement.
 */

const BANNED = [
  [/(^|[\s"'`:])-?m[lr]-(?=\[|\d|px|auto)/, "ml-*/mr-* → ms-*/me-*"],
  [/(^|[\s"'`:])-?p[lr]-(?=\[|\d|px)/, "pl-*/pr-* → ps-*/pe-*"],
  [/(^|[\s"'`:])-?(left|right)-(?=\[|\d|px|auto|full)/, "left-*/right-* → start-*/end-*"],
  [/(^|[\s"'`:])text-(left|right)(?=$|[\s"'`])/, "text-left/text-right → text-start/text-end"],
  [/(^|[\s"'`:])rounded-([lr]|[tb][lr])(-|(?=$|[\s"'`]))/, "rounded-l/r/tl/… → rounded-s/e/ss/…"],
  [/(^|[\s"'`:])border-[lr](-|(?=$|[\s"'`]))/, "border-l/border-r → border-s/border-e"],
];

function check(context, node, value) {
  if (typeof value !== "string") return;
  for (const [pattern, fix] of BANNED) {
    if (pattern.test(value)) {
      context.report({
        node,
        messageId: "physical",
        data: { fix },
      });
      return;
    }
  }
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow physical direction Tailwind utilities; use logical properties so RTL works by construction",
    },
    messages: {
      physical:
        "Physical direction utility breaks RTL. Use the logical equivalent: {{fix}} (see docs/architecture/04-frontend.md §5).",
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        check(context, node, node.value);
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          check(context, quasi, quasi.value.raw);
        }
      },
    };
  },
};
