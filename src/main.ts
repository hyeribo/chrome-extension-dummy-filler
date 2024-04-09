import $ from "jquery";
import * as cheerio from "cheerio";
import _ from "lodash";

import { Item, InputItem } from "./types";
// import form

class Main {
  tabId?: number;
  items: InputItem[] = [];
  scanArea: string = "";
  isScanAreaSet: boolean = false;
  $cheerio!: cheerio.Root;
  $parent!: cheerio.Root;

  constructor() {
    this.init();
  }

  async init() {
    chrome.runtime.connect({ name: "popup" });
    chrome.runtime.onMessage.addListener((message, sender) =>
      this.handleReceivedMessage(message, sender)
    );
    this.$cheerio = cheerio.load(document.body.innerHTML);

    await this.setTabId();
    this.loadSelectedScanArea();
    this.addEventListeners();
  }

  async setTabId() {
    const tab = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    this.tabId = tab[0].id;
  }

  async loadSelectedScanArea() {
    function getScanArea() {
      const selectedArea = document.getElementsByClassName("df__scan-area");
      chrome.runtime.sendMessage(chrome.runtime.id, {
        type: "LOAD_SCAN_AREA",
        innerHTML: selectedArea[0]
          ? selectedArea[0]?.innerHTML
          : document.body.innerHTML,
        isScanAreaSet: !!selectedArea[0],
      });
    }
    if (this.tabId) {
      chrome.scripting.executeScript({
        target: { tabId: this.tabId },
        func: getScanArea,
      });
    }
  }

  async loadSyncData() {
    const syncData = await chrome.storage.sync.get({
      items: [],
    });
    console.log("syncData", syncData);
    const { items } = syncData;
    this.items = items;
    this.setItems(items);
  }

  addEventListeners() {
    $("#df__btn--select-area").on("click", () => this.handleSelectScanArea());
    $("#df__btn--clear-area").on("click", () => this.handleClearScanArea());
    $("#df__btn--scan-items").on("click", () => this.handleScanItems());
    $("#df__btn--clear-items").on("click", () => this.clearItems());
    $("#df__form-items").on("change", (e) => this.handleChangeItemValue(e));
  }

  scanItems() {
    const inputItems: cheerio.Cheerio = this.$parent("input");
    const validItems: any[] = [];

    const isTagElement = (element: any): element is cheerio.TagElement => {
      return element?.attribs !== undefined;
    };

    inputItems.toArray().map((element: cheerio.Element) => {
      if (isTagElement(element)) {
        const attr = element.attribs;
        if (attr.name) {
          validItems.push({ ...attr });
        }
      }
    });

    console.log("inputItems", inputItems);
    console.log("validItems", validItems.length, validItems);
    this.setItems(validItems);
  }

  async handleSelectScanArea() {
    function highlightHoverElement() {
      const handleClick = (e: any) => {
        e.target.classList.add("df__scan-area");
        chrome.runtime.sendMessage(chrome.runtime.id, {
          type: "SET_SCAN_AREA",
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
        func: highlightHoverElement,
      });
    }
  }

  async handleClearScanArea() {
    function removeSelectedAreaClass() {
      const selectedArea = document.getElementsByClassName("df__scan-area");
      if (selectedArea[0]) {
        selectedArea[0].classList.remove("df__scan-area");
      }
      chrome.runtime.sendMessage(chrome.runtime.id, {
        type: "CLEAR_SCAN_AREA",
      });
    }
    if (this.tabId) {
      chrome.scripting.executeScript({
        target: { tabId: this.tabId },
        func: removeSelectedAreaClass,
      });
    }
  }

  generateTextInput(inputItem: InputItem) {
    if (!inputItem.name) return;

    const formItemByType: any = {
      text: `<input type="text" />`,
      number: `<input type="number" />`,
      date: `<input type="date" />`,
    };

    const formGroup = `
      <div class="df__form-group">
        <label>${inputItem.name}: (${inputItem.type})</label>
        <div class="df__form-item-wrapper">
          <select class="df__value-set-type" name="valueSetType-${
            inputItem.name
          }">
            <option value="auto" selected>auto</option>
            <option value="fixed">fixed</option>
          </select>
          ${formItemByType[inputItem.type] || formItemByType.text}
        </div>
      </div>
    `;

    $("#df__form-items").append(formGroup);
  }

  handleChangeItemValue(e: JQuery.Event) {
    console.log("form item changed ===>", e);
  }

  setScanArea(scanArea: string) {
    this.scanArea = scanArea;
    this.isScanAreaSet = true;
    $("#df__btn--select-area").addClass("display-none");
    $("#df__btn--clear-area").removeClass("display-none");
    $(".df__msg--select-area").text("Scan area set.");
  }

  clearScanArea() {
    this.scanArea = "";
    this.isScanAreaSet = false;
    $("#df__btn--select-area").removeClass("display-none");
    $("#df__btn--clear-area").addClass("display-none");
    $(".df__msg--select-area").text("Scan area not set.");
  }

  setItems(items: any[]) {
    this.items = items;
    $(".df__msg--scan-result").text(`Number of items: ${items.length}`);

    this.items.forEach?.((item) => {
      this.generateTextInput(item);
    });
    this.save();
  }

  clearItems() {
    this.items = [];
    $(".df__msg--scan-result").text("Number of items: 0");
    this.save();
  }

  async handleScanItems() {
    const loadDocument = () => {
      const documentHtml = document.body.innerHTML;
      const innerHTML = documentHtml.toString();
      chrome.runtime.sendMessage(chrome.runtime.id, {
        type: "SCAN_ITEMS",
        innerHTML,
      });
    };

    if (this.tabId) {
      chrome.scripting.executeScript({
        target: { tabId: this.tabId },
        func: loadDocument,
      });
    }
  }

  handleReceivedMessage(message: any, sender: any) {
    if (message.type === "LOAD_SCAN_AREA") {
      if (message.isScanAreaSet) {
        this.setScanArea(message.innerHTML);
      } else {
        this.clearScanArea();
      }
      this.$parent = cheerio.load(message.innerHTML);
      this.loadSyncData();
    } else if (message.type === "SET_SCAN_AREA") {
      if (!message.innerHTML) return;
      chrome.scripting.removeCSS({
        target: { tabId: sender.tab.id },
        files: ["df-hover.css"],
      });
      this.setScanArea(message.innerHTML);
      this.$parent = cheerio.load(message.innerHTML);
    } else if (message.type === "CLEAR_SCAN_AREA") {
      this.clearScanArea();
    } else if (message.type === "SCAN_ITEMS") {
      if (!message.innerHTML) return;
      if (!this.isScanAreaSet) {
        this.scanArea = message.innerHTML;
      }
      this.$parent = cheerio.load(message.innerHTML);
      this.scanItems();
    }
  }

  save() {
    chrome.storage.sync.set({
      items: this.items,
    });
  }
}

window.addEventListener("DOMContentLoaded", function () {
  new Main();
});
