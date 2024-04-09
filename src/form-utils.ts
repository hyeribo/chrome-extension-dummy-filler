const isTagElement = (element: any): element is cheerio.TagElement => {
  return element?.attribs !== undefined;
};

export const parseFormItem = (inputItems: cheerio.Cheerio) => {
  console.log("");
  const validItems: any[] = [];

  inputItems.toArray().map((element: cheerio.Element) => {
    if (isTagElement(element)) {
      const attr = element.attribs;
      if (attr.name) {
        validItems.push({ ...attr });
      }
    }
  });
};
