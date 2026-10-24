/** Pure, side-effect-free arithmetic used by the local fixture. */
export function sum(a: number, b: number): { value: number } {
  return { value: a + b };
}
