export type ActionType =
  | "POPUP/START_SELECT_AREA"
  | "POPUP/FINISH_SELECT_AREA"
  | "POPUP/CLEAR_AREA"
  | "POPUP/SCAN_ITEMS"
  | "POPUP/SET_SCANNED_ITEMS"
  | "POPUP/CLEAR_ITEMS"
  | "POPUP/GENERATE"
  | "POPUP/APPLY";

export type ElementType =
  | "text"
  | "number"
  | "date"
  | "time"
  | "radio"
  | "checkbox"
  | "select";

export type TypeDictionary<T> = {
  [type in ElementType]?: T;
};

export type ValueSetType = "auto" | "fixed" | "disabled";

export interface InputItem<T extends ElementType> {
  index: number;
  type: T;
  valueSetType: ValueSetType;
  isUsed: boolean;
  name: string;
  label: string;
  inputProps: {
    [attr: string]: any;
  };
}
export interface InputRadioOption {
  type: "radio";
  name: string;
  label: string;
  inputProps: {
    [attr: string]: any;
  };
}

export interface InputSelectOption {
  name: string;
  label?: string;
  value?: any;
}

export interface InputText extends InputItem<"text"> {}
export interface InputNumber extends InputItem<"number"> {}
export interface InputSelect extends InputItem<"select"> {
  options: InputSelectOption[];
}
export interface InputRadio extends Omit<InputItem<"radio">, "inputProps"> {
  options: InputRadioOption[];
}
export interface InputCheckbox extends InputItem<"checkbox"> {}
export interface InputDate extends InputItem<"date"> {}
export interface InputTime extends InputItem<"time"> {}

export type ReturnInputItemByType<T extends ElementType> = T extends "text"
  ? InputText
  : T extends "number"
  ? InputNumber
  : T extends "select"
  ? InputSelect
  : T extends "radio"
  ? InputRadio
  : T extends "checkbox"
  ? InputCheckbox
  : T extends "date"
  ? InputDate
  : T extends "time"
  ? InputTime
  : InputItem<T>;

export interface InputItems
  extends TypeDictionary<ReturnInputItemByType<ElementType>[]> {}

export interface Labels {
  [name: string]: string;
}
