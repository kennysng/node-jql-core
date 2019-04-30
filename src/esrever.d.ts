declare module 'esrever' {
  /**
   * A string representing the semantic version number.
   */
  const version: string

  /**
   * This function takes a string and returns the reversed version of that string, correctly accounting for Unicode combining marks and astral symbols.
   * @param input [string]
   */
  function reverse(input: string): string
}