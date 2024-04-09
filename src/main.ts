import $ from "jquery";
import * as cheerio from "cheerio";
import _ from "lodash";

import { Item, InputItem } from "./types";

class Main {
  tabId?: number;
  items: InputItem[] = [];
  scanArea: string = "";
  isScanAreaSet: boolean = false;
  $cheerio!: cheerio.Root;

  constructor() {
    this.init();
  }

  async init() {
    chrome.runtime.connect({ name: "popup" });
    chrome.runtime.onMessage.addListener((message, sender) =>
      this.handleReceivedMessage(message, sender)
    );
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
  }

  scanItems() {
    console.log("this", this);
    const inputItems: cheerio.Cheerio = this.$cheerio("input");
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

    console.log("inputItems", inputItems.length);
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

  generateTextInput(name: string) {
    console.log("generateTextInput =====>", name);
    if (!name) return;
    const formGroup = `
      <div class="df__form-group">
        <label>${name}: </label>
        <div class="df__form-item-wrapper">
          <select name="valueSetType-${name}">
            <option value="auto" selected>auto</option>
            <option value="fixed">fixed</option>
          </select>
          <input />
        </div>
      </div>
    `;

    console.log("df__form-items", this.$cheerio("#df__form-items"));
    this.$cheerio("#df__form-items").text(formGroup);
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
    console.log("setItems", items);
    this.items = items;
    $(".df__msg--scan-result").text(`Number of items: ${items.length}`);

    if (this.items.length) {
      this.generateTextInput(this.items[0].name);
    }
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
      this.$cheerio = cheerio.load(message.innerHTML);
      this.loadSyncData();
    } else if (message.type === "SET_SCAN_AREA") {
      if (!message.innerHTML) return;
      chrome.scripting.removeCSS({
        target: { tabId: sender.tab.id },
        files: ["df-hover.css"],
      });
      this.$cheerio = cheerio.load(this.scanArea);
      this.setScanArea(message.innerHTML);
    } else if (message.type === "CLEAR_SCAN_AREA") {
      this.clearScanArea();
    } else if (message.type === "SCAN_ITEMS") {
      if (!message.innerHTML) return;
      if (!this.isScanAreaSet) {
        this.scanArea = message.innerHTML;
      }

      this.$cheerio = cheerio.load(this.scanArea);
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
