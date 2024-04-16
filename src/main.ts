import $ from "jquery";
import { load } from "cheerio";
import _ from "lodash";

import { ActionType, ElementType, ReturnInputItemByType } from "./types";
import { parseFormItem, generateInputString } from "./form-utils";

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

    this.addEventListeners();
    this.dispatchLoadScanArea();
    this.loadSyncData();
    this.$itemContainer = $("#df__form-items");
  }

  action(message: { type: ActionType }) {
    console.log("ACTIONS/POPUP", message);
    const btnSelectArea = $("#df__btn--select-area");
    const btnClearArea = $("#df__btn--clear-area");
    const btnBottom = $(".df__btn-container--apply");
    const msgScanResult = $(".df__msg--scan-result");

    switch (message.type) {
      case "POPUP/START_SELECT_AREA":
        btnSelectArea.addClass("active");
        btnSelectArea.text("Selecting...");
        this.dispatchSetScanArea();
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
        this.dispatchClearScanArea();
        break;
      case "POPUP/SCAN_ITEMS":
        const inputs: cheerio.Cheerio = this.$parent("input");
        const labels: cheerio.Cheerio = this.$parent("label");
        const validItems: ReturnInputItemByType<ElementType>[] = parseFormItem({
          inputs,
          labels,
        });
        this.items = validItems;
        this.save();

        this.action({ type: "POPUP/SET_SCANNED_ITEMS" });
        break;
      case "POPUP/SET_SCANNED_ITEMS":
        if (this.items.length) {
          msgScanResult.text(`Scanned items: ${this.items.length}`);
          btnBottom.removeClass("display-none");
          this.drawItems();
        } else {
          msgScanResult.text("There are no scanned form items.");
          btnBottom.addClass("display-none");
          this.emptyItems();
        }
        break;
      case "POPUP/CLEAR_ITEMS":
        msgScanResult.text("");
        btnBottom.addClass("display-none");
        this.items = [];
        this.emptyItems();
        this.save();
        break;
      case "POPUP/GENERATE":
        this.handleGenerateData();
        break;
      case "POPUP/APPLY":
        this.handleApplyData();
        break;
    }
  }

  async setTabId() {
    const tab = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    this.tabId = tab[0].id;
  }

  async loadSyncData() {
    const syncData = await chrome.storage.sync.get({
      items: [],
    });
    console.log("syncData", syncData);
    const { items } = syncData;
    this.items = items;

    this.action({ type: "POPUP/SET_SCANNED_ITEMS" });
    // this.setItems(items);
  }

  addEventListeners() {
    $("#df__btn--select-area").on("click", () =>
      this.action({ type: "POPUP/START_SELECT_AREA" })
    );
    $("#df__btn--clear-area").on("click", () =>
      this.action({ type: "POPUP/CLEAR_AREA" })
    );
    $("#df__btn--scan-items").on("click", () =>
      this.action({ type: "POPUP/SCAN_ITEMS" })
    );
    $("#df__btn--clear-items").on("click", () =>
      this.action({ type: "POPUP/CLEAR_ITEMS" })
    );
    $("#df__btn--generate").on("click", () =>
      this.action({ type: "POPUP/GENERATE" })
    );
    $("#df__btn--apply").on("click", () =>
      this.action({ type: "POPUP/APPLY" })
    );
    $("#df__form-items").on("change", (e) => this.handleChangeItemValue(e));
  }

  handleChangeItemValue(
    e: JQuery.ChangeEvent<HTMLElement, undefined, HTMLElement, HTMLElement>
  ) {
    console.log("form item changed ===>", e);
    const changedItemIndex = e.target.dataset.valueSetTypeIndex;
    if (!changedItemIndex) return;
    const index = +changedItemIndex;
    console.log("form item changed index ===>", index);
    // console.log("form item changed ===> value", e.target.value);
    // items[index].name
  }

  setScanArea(scanArea: string) {
    this.scanArea = scanArea;
    this.isScanAreaSelected = true;
  }

  setItems(items: ReturnInputItemByType<ElementType>[]) {
    console.log("setItems ==>", items);
    if (!items?.length) {
      this.items = [];
    } else {
      this.items = items;
      this.items.forEach?.(
        (item: ReturnInputItemByType<ElementType>, i: number) => {
          const inputString = generateInputString(item, i);
          this.$itemContainer.append(inputString);
        }
      );
    }
  }

  drawItems() {
    console.log("drawItems");
    if (!this.items?.length) {
      return;
    }
    this.items.forEach?.(
      (item: ReturnInputItemByType<ElementType>, i: number) => {
        const inputString = generateInputString(item, i);
        this.$itemContainer.append(inputString);
      }
    );
  }

  emptyItems() {
    console.log("emptyItems");
    this.$itemContainer.empty();
  }

  handleGenerateData() {
    console.log("handleGenerateData =>", this.items);
  }

  handleApplyData() {
    console.log("handleApplyData =>", this.items);
  }

  // --- dispatch events to parent ---
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

  handleReceivedMessage(message: any, sender: any) {
    console.log("ACTIONS/PARENT", message);

    switch (message.type) {
      case "PARENT/LOAD_AREA":
        this.scanArea = message.innerHTML;
        this.isScanAreaSelected = message.isScanAreaSelected;
        this.$parent = load(message.innerHTML);
        if (message.isScanAreaSelected) {
          this.action({ type: "POPUP/FINISH_SELECT_AREA" });
        }
        break;
      case "PARENT/SELECT_AREA":
        if (!message.innerHTML) return;
        chrome.scripting.removeCSS({
          target: { tabId: sender.tab.id },
          files: ["df-hover.css"],
        });
        this.setScanArea(message.innerHTML);
        this.$parent = load(message.innerHTML);
        this.action({ type: "POPUP/FINISH_SELECT_AREA" });
        break;
      case "PARENT/CLEAR_SCAN_AREA":
        this.scanArea = message.innerHTML;
        this.isScanAreaSelected = false;
        this.$parent = load(message.innerHTML);
        break;
    }

    // if (message.type === "PARENT/LOAD_AREA") {
    //   if (message.isScanAreaSelected) {
    //     this.setScanArea(message.innerHTML);
    //   } else {
    //     this.clearScanArea();
    //   }
    //   this.$parent = load(message.innerHTML);
    //   this.loadSyncData();
    // } else if (message.type === "PARENT/SELECT_AREA") {
    //   if (!message.innerHTML) return;
    //   chrome.scripting.removeCSS({
    //     target: { tabId: sender.tab.id },
    //     files: ["df-hover.css"],
    //   });
    //   this.setScanArea(message.innerHTML);
    //   this.$parent = load(message.innerHTML);
    //   this.action({ type: "POPUP/FINISH_SELECT_AREA" });
    // } else if (message.type === "PARENT/CLEAR_SCAN_AREA") {
    //   this.clearScanArea();
    // }
  }

  save() {
    chrome.storage.sync.set({
      items: [],
      // items: this.items,
    });
  }
}

window.addEventListener("DOMContentLoaded", function () {
  new Main();
});
