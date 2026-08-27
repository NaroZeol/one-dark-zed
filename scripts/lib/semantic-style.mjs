export function resolveSemanticStyle(bindings, token) {
  const modifiers = new Set(token.modifiers ?? []);

  return Object.entries(bindings)
    .map(([selector, style], index) => {
      const [selectorHead, language] = selector.split(":", 2);
      const [type, ...requiredModifiers] = selectorHead.split(".");
      const exactType = type !== "*";
      const matches =
        (!language || language === token.language) &&
        (!exactType || type === token.type) &&
        requiredModifiers.every((modifier) => modifiers.has(modifier));

      return {
        style,
        matches,
        // Modifier-qualified rules represent a more precise semantic role
        // than a base token type. Exact token and language matches break ties.
        specificity:
          requiredModifiers.length * 100 +
          (exactType ? 10 : 0) +
          (language ? 1 : 0),
        index,
      };
    })
    .filter(({ matches }) => matches)
    .sort(
      (left, right) =>
        right.specificity - left.specificity || right.index - left.index,
    )[0]?.style;
}
