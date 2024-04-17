import { InputRadioOption, InputSelectOption } from "./types";

const number = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const text = (inputProps: { [key: string]: any }) => {
  const alphabet = [
    "a",
    "b",
    "c",
    "d",
    "-",
    "_",
    "e",
    "f",
    "g",
    "h",
    "-",
    "_",
    "i",
    "j",
    "k",
    "l",
    "-",
    "_",
    "m",
    "n",
    "o",
    "p",
    "-",
    "_",
    "q",
    "r",
    "s",
    "t",
    "-",
    "_",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
  ];
  const { maxlength = 20 } = inputProps;
  const length = number(maxlength < 10 ? maxlength : 10, maxlength);
  const result = new Array(length).fill(null);
  result.forEach((_, i) => {
    result[i] = alphabet[number(0, 35)];
  });
  return result.join("");
};

const date = () => {
  const year = number(2000, 2024);
  const month = number(1, 12);
  const day = number(1, 28);
  return `${year}-${month}-${day}`;
};

const time = () => {
  const hour = number(0, 23).toString().padStart(2, "0");
  const minute = number(0, 59).toString().padStart(2, "0");
  return `${hour}:${minute}`;
};

const radio = (options: InputRadioOption[] = []) => {
  const randomOption = options[number(0, options.length - 1)];
  return {
    option: randomOption,
    value: randomOption?.inputProps?.value,
  };
};

const checkbox = () => {
  return 1 === number(0, 1);
};

const select = (options: InputSelectOption[] = []) => {
  const randomOption = options[number(0, options.length - 1)];
  return {
    option: randomOption,
    value: randomOption?.value,
  };
};

export default {
  text,
  number,
  date,
  time,
  radio,
  checkbox,
  select,
};
