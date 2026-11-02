
/** Removes // and block comments plus trailing commas, respecting string literals. */
export function stripJsonc(input: string): string {
    const source = input.replace(/^\uFEFF/, "");
    let out = "";
    let i = 0;
    let inString = false;
  
    while (i < source.length) {
      const c = source[i];
      const n = source[i + 1];
  
      if (inString) {
        out += c;
        if (c === "\\") {
          out += n ?? "";
          i += 2;
          continue;
        }
        if (c === '"') inString = false;
        i++;
      } else if (c === '"') {
        inString = true;
        out += c;
        i++;
      } else if (c === "/" && n === "/") {
        while (i < source.length && source[i] !== "\n") i++;
      } else if (c === "/" && n === "*") {
        i += 2;
        while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
        i += 2;
      } else {
        out += c;
        i++;
      }
    }
    return removeTrailingCommas(out);
  }
  
  function removeTrailingCommas(s: string): string {
    let result = "";
    let inString = false;
  
    for (let j = 0; j < s.length; j++) {
      const c = s[j];
      if (inString) {
        result += c;
        if (c === "\\") {
          j++;
          result += s[j] ?? "";
        } else if (c === '"') {
          inString = false;
        }
        continue;
      }
      if (c === '"') {
        inString = true;
        result += c;
        continue;
      }
      if (c === ",") {
        let k = j + 1;
        while (/\s/.test(s[k] ?? "")) k++;
        if (s[k] === "}" || s[k] === "]") continue;
      }
      result += c;
    }
    return result;
  }