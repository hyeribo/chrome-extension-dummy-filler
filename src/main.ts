import $ from "jquery";
import { load } from "cheerio";
import _ from "lodash";

import {
  ActionType,
  ElementType,
  ReturnInputItemByType,
  ValueSetType,
} from "./types";
import { parseFormItem, generateInputString } from "./form-utils";
import random from "./random";

class Main {
  tabId?: number;
  items: ReturnInputItemByType<ElementType>[] = [];
  scanArea: string = "";
  isScanAreaSelected: boolean = false;
  $parent!: cheerio.Root;
  $itemContainer!: JQuery<HTMLElement>;

  constructor() {
    this.init();
  }

  async init() {
    await this.setTabId();
    chrome.runtime.connect({ name: "popup" });
    chrome.runtime.onMessage.addListener((message, sender) =>
      this.handleReceivedMessage(message, sender)
    );

    this.$itemContainer = $("#df__form-items");
    this.addEventListeners();
    this.dispatchLoadScanArea();
    this.loadStorageData();
  }

  async setTabId() {
    const tab = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    this.tabId = tab[0].id;
  }

  addEventListeners() {
    $("#df__btn--select-area").on("click", () => this.handleSelectArea());
    $("#df__btn--clear-area").on("click", () => this.handleClearArea());
    $("#df__btn--scan-items").on("click", () => this.handleScanItems());
    $("#df__btn--clear-items").on("click", () => this.handleClearItems());
    $("#df__btn--generate").on("click", () => this.handleGenerate());
    $("#df__btn--apply").on("click", () => this.handleApply());
    $("#df__form-items").on("change", (e) => this.handleChangeFormItem(e));
  }

  async loadStorageData() {
    const storageData = await chrome.storage.local.get({
      items: [],
    });
    console.log("storageData", storageData);
    const { items } = storageData;
    this.items = items;
    if (items.length > 0) {
      this.changeViewByAction({ type: "POPUP/SET_SCANNED_ITEMS" });
    }
  }

  save() {
    chrome.storage.local.set({
      items: this.items,
    });
  }

  changeViewByAction(action: { type: ActionType }) {
    console.log(action);
    const btnSelectArea = $("#df__btn--select-area");
    const btnClearArea = $("#df__btn--clear-area");
    const btnClearItems = $("#df__btn--clear-items");
    const btnBottom = $(".df__bottom");
    const msgScanResult = $(".df__msg--scan-result");

    switch (action.type) {
      case "POPUP/START_SELECT_AREA":
        btnSelectArea.addClass("active");
        btnSelectArea.text("Selecting...");
        break;
      case "POPUP/FINISH_SELECT_AREA":
        btnSelectArea.removeClass("active");
        btnSelectArea.text("Area Selected");
        btnSelectArea.prop("disabled", true);
        btnClearArea.prop("disabled", false);
        break;
      case "POPUP/CLEAR_AREA":
        btnSelectArea.text("Select Area");
        btnSelectArea.prop("disabled", false);
        btnClearArea.prop("disabled", true);
        break;
      case "POPUP/SET_SCANNED_ITEMS":
        if (this.items.length) {
          msgScanResult.text(`Scanned items: ${this.items.length}`);
          btnClearItems.prop("disabled", false);
          btnBottom.removeClass("display-none");
          this.drawItems();
        } else {
          msgScanResult.text("There are no scanned form items.");
          btnClearItems.prop("disabled", true);
          btnBottom.addClass("display-none");
          this.emptyItems();
        }
        break;
      case "POPUP/CLEAR_ITEMS":
        msgScanResult.text("");
        btnClearItems.prop("disabled", true);
        btnBottom.addClass("display-none");
        this.emptyItems();
        break;
      case "POPUP/GENERATE":
        break;
      case "POPUP/APPLY":
        break;
    }
  }

  // --- event handler START ---
  handleSelectArea() {
    this.changeViewByAction({ type: "POPUP/START_SELECT_AREA" });
    this.dispatchSetScanArea();
  }

  handleClearArea() {
    this.changeViewByAction({ type: "POPUP/CLEAR_AREA" });
    this.dispatchClearScanArea();
  }

  handleScanItems() {
    const inputs: cheerio.Cheerio = this.$parent("input,select");
    const labels: cheerio.Cheerio = this.$parent("label");
    const validItems: ReturnInputItemByType<ElementType>[] = parseFormItem({
      inputs,
      labels,
    });
    console.log("validItems", validItems);
    this.items = validItems;
    this.save();

    this.changeViewByAction({ type: "POPUP/SET_SCANNED_ITEMS" });
  }

  handleClearItems() {
    this.items = [];
    this.save();

    this.changeViewByAction({ type: "POPUP/CLEAR_ITEMS" });
  }

  handleGenerate() {
    console.log("generate");
    this.items.forEach((item, i) => {
      if (item.type === "text") {
        const randomValue = random.text(item.inputProps);
        console.log("text :: ", item.name, randomValue);
      } else if (item.type === "number") {
        const randomValue = random.number(
          item.inputProps.min || 0,
          item.inputProps.max || 1000
        );
        console.log("number :: ", item.name, randomValue);
      } else if (item.type === "date") {
        const randomValue = random.date();
        console.log("date :: ", item.name, randomValue);
      } else if (item.type === "time") {
        const randomValue = random.time();
        console.log("time :: ", item.name, randomValue);
      } else if (item.type === "radio") {
        const randomValue = random.radio(item.options);
        console.log("radio :: ", item.name, randomValue);
      } else if (item.type === "checkbox") {
        const randomValue = random.checkbox();
        console.log("checkbox :: ", item.name, randomValue);
      } else if (item.type === "select") {
        const randomValue = random.select(item.options);
        console.log("select :: ", item.name, randomValue);
      }
    });
    this.changeViewByAction({ type: "POPUP/GENERATE" });
  }

  handleApply() {
    console.log("apply");
    this.changeViewByAction({ type: "POPUP/APPLY" });
  }

  handleChangeFormItem(
    e: JQuery.ChangeEvent<HTMLElement, undefined, HTMLElement, HTMLElement>
  ) {
    const target = e.target as HTMLInputElement;
    const changedFormGroup =
      $(target).parent().closest(".df__form-group")?.[0] ?? null;
    const { index, type, name } = changedFormGroup.dataset;
    console.log("changed =>", { index, type, name });

    const isValueSetType = target.dataset.valueSetType === "true";
    if (isValueSetType) {
      this.items[+index!].valueSetType = target.value as ValueSetType;
      this.save();
      return;
    } else {
    }
  }
  // --- event handler END ---

  drawItems() {
    if (!this.items?.length) {
      return;
    }
    this.items.forEach?.((item: ReturnInputItemByType<ElementType>) => {
      const inputString = generateInputString(item);
      this.$itemContainer.append(inputString);
    });
  }

  emptyItems() {
    this.$itemContainer.empty();
  }

  handleGenerateData() {
    console.log("handleGenerateData =>", this.items);
  }

  handleApplyData() {
    console.log("handleApplyData =>", this.items);
  }

  // --- dispatch START ---
  dispatchLoadScanArea() {
    function fn() {
      const selectedArea = document.getElementsByClassName("df__scan-area");
      chrome.runtime.sendMessage(chrome.runtime.id, {
        type: "PARENT/LOAD_AREA",
        innerHTML: selectedArea[0]
          ? selectedArea[0]?.innerHTML
          : document.body.innerHTML,
        isScanAreaSelected: !!selectedArea[0],
      });
    }
    if (this.tabId) {
      chrome.scripting.executeScript({
        target: { tabId: this.tabId },
        func: fn,
      });
    }
  }

  dispatchSetScanArea() {
    function fn() {
      const handleClick = (e: any) => {
        e.target.classList.add("df__scan-area");
        chrome.runtime.sendMessage(chrome.runtime.id, {
          type: "PARENT/SELECT_AREA",
          innerHTML: e.target.innerHTML,
        });
        setTimeout(() => {
          document.removeEventListener("click", handleClick);
        }, 200);
      };
      document.addEventListener("click", handleClick);
    }
    if (this.tabId) {
      chrome.scripting.insertCSS({
        target: { tabId: this.tabId },
        files: ["df-hover.css", "df-inject.css"],
      });
      chrome.scripting.executeScript({
        target: { tabId: this.tabId },
        func: fn,
      });
    }
  }

  dispatchClearScanArea() {
    function fn() {
      const selectedArea = document.getElementsByClassName("df__scan-area");
      if (selectedArea[0]) {
        selectedArea[0].classList.remove("df__scan-area");
      }
      chrome.runtime.sendMessage(chrome.runtime.id, {
        type: "PARENT/CLEAR_SCAN_AREA",
        innerHTML: document.body.innerHTML,
      });
    }
    if (this.tabId) {
      chrome.scripting.executeScript({
        target: { tabId: this.tabId },
        func: fn,
      });
    }
  }
  // --- dispatch END ---

  handleReceivedMessage(message: any, sender: any) {
    console.log(message);

    switch (message.type) {
      case "PARENT/LOAD_AREA":
        this.scanArea = message.innerHTML;
        this.isScanAreaSelected = message.isScanAreaSelected;
        this.$parent = load(message.innerHTML);
        if (message.isScanAreaSelected) {
          this.changeViewByAction({ type: "POPUP/FINISH_SELECT_AREA" });
        }
        break;
      case "PARENT/SELECT_AREA":
        if (!message.innerHTML) return;
        chrome.scripting.removeCSS({
          target: { tabId: sender.tab.id },
          files: ["df-hover.css"],
        });
        this.scanArea = message.innerHTML;
        this.isScanAreaSelected = true;
        this.$parent = load(message.innerHTML);
        this.changeViewByAction({ type: "POPUP/FINISH_SELECT_AREA" });
        break;
      case "PARENT/CLEAR_SCAN_AREA":
        this.scanArea = message.innerHTML;
        this.isScanAreaSelected = false;
        this.$parent = load(message.innerHTML);
        break;
    }
  }
}

window.addEventListener("DOMContentLoaded", function () {
  new Main();
});
