type SQLValue = string | number | boolean | null | undefined;

export function sql(
  strings: TemplateStringsArray,
  ...values: SQLValue[]
): string {
  return strings
    .reduce((result, str, i) => {
      if (i >= values.length) return result + str;
      const val = values[i];
      if (val === null || val === undefined) return result + str + "NULL";
      if (typeof val === "number") return result + str + String(val);
      if (typeof val === "boolean") return result + str + (val ? "1" : "0");
      return result + str + `'${String(val).replace(/'/g, "''")}'`;
    }, "")
    .trim();
}
