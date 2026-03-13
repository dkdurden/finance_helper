type ClassNameValue = string | number | false | null | undefined;

export function cn(...parts: ClassNameValue[]) {
  return parts.filter(Boolean).join(" ");
}