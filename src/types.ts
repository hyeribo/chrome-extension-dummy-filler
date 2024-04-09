export type ElementType =
  | "text"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "time";

export type ValueSetType = "fixed" | "auto";

export interface Item {
  type: ElementType;
  valueSetType: ValueSetType;
}
