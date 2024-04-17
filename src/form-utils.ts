import { isNil } from "lodash";

import {
  ElementType,
  Labels,
  ReturnInputItemByType,
  InputRadio,
  InputRadioOption,
  InputCheckbox,
  InputSelect,
  TypeDictionary,
} from "./types";

const isInputElement = (element: any): element is cheerio.TagElement => {
  return (
    element.name === "input" &&
    !!element?.attribs?.type &&
    !!element?.attribs?.name
  );
};

const isSelectElement = (element: any): element is cheerio.TagElement => {
  return element.name === "select" && !!element?.attribs?.name;
};

const isLabelElement = (element: any): element is cheerio.TagElement => {
  return element.name === "label" && !!element?.attribs?.for;
};

export const parseFormItem = ({
  inputs,
  labels,
}: {
  inputs: cheerio.Cheerio;
  labels: cheerio.Cheerio;
}): ReturnInputItemByType<ElementType>[] => {
  const validItems: ReturnInputItemByType<ElementType>[] = [];
  const validLabels: Labels = labels
    .toArray()
    .reduce((acc: Labels, element: cheerio.Element): Labels => {
      if (isLabelElement(element)) {
        const { attribs, children } = element;
        acc[attribs.for] = attribs.for;
        if (typeof children?.[0]?.data === "string") {
          acc[attribs.for] = children?.[0]?.data;
        }
      }
      return acc;
    }, {});

  const itemIndexMap: { [name: string]: number } = {};
  inputs.toArray().forEach((element: cheerio.Element): void => {
    if (isInputElement(element)) {
      const { attribs } = element;
      const { name, type } = attribs;
      const label = validLabels[name] || name;

      if (type === "radio") {
        const radioOption: InputRadioOption = {
          type: "radio",
          name,
          label: `${validLabels[attribs.id] || attribs.name} (${
            attribs.value
          })`,
          inputProps: {
            ...attribs,
          },
        };
        if (itemIndexMap[name] === undefined) {
          itemIndexMap[name] = validItems.length;
          validItems.push({
            type,
            name,
            valueSetType: "auto",
            isUsed: true,
            label: name,
            options: [radioOption],
          });
        } else {
          const index = itemIndexMap[name];
          (validItems[index] as InputRadio).options.push(radioOption);
        }
      } else {
        if (isNil(itemIndexMap[name])) {
          itemIndexMap[name] = validItems.length;
          validItems.push({
            type: type as Exclude<ElementType, "radio" | "select">,
            name,
            valueSetType: "auto",
            isUsed: true,
            label,
            inputProps: {
              ...attribs,
            },
          });
        }
      }
    }
    if (isSelectElement(element)) {
      const { attribs, children } = element;
      const { name } = attribs;
      const label = validLabels[name] || name;

      const options = (children as cheerio.TagElement[]).map((child) => {
        return {
          name,
          label: child.children?.[0]?.data,
          value: child.attribs?.value,
        };
      });
      validItems.push({
        type: "select",
        name,
        valueSetType: "auto",
        isUsed: true,
        label,
        inputProps: {
          ...attribs,
        },
        options,
      });
    }
  });
  return validItems;
};

const generateRadioString = (inputRadio: InputRadio) => {
  let inputRadioString = "";
  inputRadio.options.forEach((option) => {
    inputRadioString += `
      <div class="df__radio-group">
        <input type="radio" id="${option.inputProps.id}" name="${option.inputProps.name}" value="${option.inputProps.value}" />
        <label for="${option.inputProps.id}">${option.label}</label>
      </div>
    `;
  });
  return inputRadioString;
};

const generateCheckboxString = (checkbox: InputCheckbox) => {
  const checkboxString = `
    <div class="df__checkbox-group">
      <input type="checkbox" id="${checkbox.inputProps.id}" name="${checkbox.inputProps.name}" value="${checkbox.inputProps.value}" />
      <label for="${checkbox.inputProps.id}">${checkbox.label}</label>
    </div>
  `;
  return checkboxString;
};

const generateSelectString = (select: InputSelect) => {
  let selectString = "<select>";
  select.options.forEach((option) => {
    selectString += `
      <option value="${option.value}">${option.label}</option>
    `;
  });
  selectString += "</select>";
  return selectString;
};

export const generateInputString = (
  input: ReturnInputItemByType<ElementType>,
  index: number
): string => {
  if (!input.name) return "";

  const generatorByType: TypeDictionary<(arg?: any) => string> = {
    text: () => `<input type="text" />`,
    number: () => `<input type="number" />`,
    date: () => `<input type="date" />`,
    time: () => `<input type="time" />`,
    radio: generateRadioString,
    checkbox: generateCheckboxString,
    select: generateSelectString,
  };

  const inputString =
    generatorByType[input.type]?.(input) ?? generatorByType["text"]!();

  const formGroupString = `
    <div data-index="${index}" class="df__form-group">
      <div class="df__form-group__title">
        <label title="${input.name}">${input.label}</label>
        <span class="df__form-group__type">(${input.type})</span>
      </div>
      <div class="df__form-item-wrapper">
        <select data-value-set-type-index="${index}" class="df__value-set-type" name="valueSetType-${input.name}">
          <option value="auto" selected>auto</option>
          <option value="fixed">fixed</option>
        </select>
        ${inputString}
      </div>
    </div>
  `;

  return formGroupString;
};
