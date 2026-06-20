/**
 * Custom ESLint rule: design-tokens/min-font-size
 *
 * The type scale in src/app/globals.css defines --fs-caption (0.75rem / 12px)
 * as the FLOOR — text must never render smaller than that. The convention is
 * to use the --fs-* tokens (var(--fs-caption) etc.); this rule catches the
 * common slip of hard-coding an inline `fontSize` below the floor.
 *
 * It analyses inline-style object literals only:
 *   fontSize: 11            -> 11px   (flagged)
 *   fontSize: '11px'        -> 11px   (flagged)
 *   fontSize: '0.6rem'      -> 9.6px  (flagged)
 *   fontSize: 12            -> 12px   (ok)
 *   fontSize: 'var(--fs-…)' -> token  (ignored — not analysable)
 *   fontSize: clamp(...)    -> ignored
 *
 * Dynamic values (identifiers, ternaries, template literals, calc/var/%/em)
 * are intentionally left alone — the rule only fires when it can prove the
 * value is a fixed length under 12px.
 */

export const FLOOR_PX = 12;
const REM_PX = 16; // 1rem === 16px (globals.css :root keeps the browser default)

/** Resolve a style-value AST node to a pixel number, or null if not analysable. */
export function toPx(node) {
  if (!node || node.type !== "Literal") return null;

  if (typeof node.value === "number") return node.value; // React treats bare numbers as px
  if (typeof node.value !== "string") return null;

  const v = node.value.trim();
  let m;
  if ((m = /^(-?[\d.]+)px$/.exec(v))) return parseFloat(m[1]);
  if ((m = /^(-?[\d.]+)rem$/.exec(v))) return parseFloat(m[1]) * REM_PX;
  return null; // em, %, var(), clamp(), calc(), keywords, etc.
}

/** @type {import('eslint').Rule.RuleModule} */
const minFontSize = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow inline fontSize below the --fs-caption floor (12px); use a --fs-* token instead",
    },
    schema: [],
    messages: {
      below:
        "Inline fontSize {{value}} ({{px}}px) is below the 12px floor (--fs-caption). Use a --fs-* token or a value ≥ 12px.",
    },
  },
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode();
    return {
      Property(node) {
        const key = node.key;
        const name =
          key.type === "Identifier"
            ? key.name
            : key.type === "Literal"
              ? key.value
              : null;
        if (name !== "fontSize" && name !== "font-size") return;

        const px = toPx(node.value);
        if (px !== null && px < FLOOR_PX) {
          context.report({
            node: node.value,
            messageId: "below",
            data: { value: source.getText(node.value), px: String(px) },
          });
        }
      },
    };
  },
};

export default {
  rules: { "min-font-size": minFontSize },
};
