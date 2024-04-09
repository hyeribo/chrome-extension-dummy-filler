import $ from "jquery";
import * as cheerio from "cheerio";
import _ from "lodash";

import { Item } from "./types";

class Main {
  items: Item[] = [];
  scanArea: string = "";
  isScanAreaSet: boolean = false;

  constructor() {
    this.init();
  }

  init() {
    chrome.runtime.connect({ name: "popup" });
    chrome.runtime.onMessage.addListener((message, sender) =>
      this.handleReceivedMessage(message, sender)
    );

    this.load();
    $("#df__btn--select-area").on("click", () => this.handleSelectArea());
    $("#df__btn--clear-area").on("click", () => this.clearScanArea());
    $("#df__btn--scan-items").on("click", () => this.handleFindFormItems());
    $("#df__btn--clear-items").on("click", () => this.clearItems());
  }

  async load() {
    const syncData = await chrome.storage.sync.get({
      items: [],
      scanArea: "",
      isScanAreaSet: false,
    });
    console.log("syncData", syncData);

    const { items, scanArea, isScanAreaSet } = syncData;
    this.items = items;
    this.scanArea = scanArea;
    this.isScanAreaSet = isScanAreaSet;

    if (isScanAreaSet) {
      $("#df__btn--clear-area").removeClass("display-none");
      $(".df__msg--select-area").text("Scan area set.");
    } else {
      $("#df__btn--select-area").removeClass("display-none");
      $(".df__msg--select-area").text("Scan area not set.");
    }
  }

  async handleSelectArea() {
    const tab = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tabId = tab[0].id;

    function highlightHoverElement() {
      const handleClick = (e: any) => {
        chrome.runtime.sendMessage(chrome.runtime.id, {
          type: "SET_SECTION",
          innerHTML: e.target.innerHTML,
        });
        setTimeout(() => {
          document.removeEventListener("click", handleClick);
        }, 200);
      };
      document.addEventListener("click", handleClick);
    }

    if (tabId) {
      chrome.scripting.insertCSS({
        target: { tabId },
        files: ["inject.css"],
      });
      chrome.scripting.executeScript({
        target: { tabId },
        func: highlightHoverElement,
      });
    }
  }

  setScanArea(scanArea: string) {
    console.log("scanArea", scanArea);
    this.scanArea = scanArea;
    this.isScanAreaSet = true;
    $("#df__btn--select-area").addClass("display-none");
    $("#df__btn--clear-area").removeClass("display-none");
    $(".df__msg--select-area").text("Scan area set.");

    this.save();
  }

  clearScanArea() {
    this.scanArea = "";
    this.isScanAreaSet = false;
    $("#df__btn--select-area").removeClass("display-none");
    $("#df__btn--clear-area").addClass("display-none");
    $(".df__msg--select-area").text("Scan area not set.");

    this.save();
  }

  setItems(items: cheerio.Cheerio) {
    console.log("inputItems ===>", items);
    // this.items = items;
    $(".df__msg--scan-result").text(`Number of items: ${items.length}`);
    this.save();
  }

  clearItems() {
    this.items = [];
    $(".df__msg--scan-result").text("Number of items: 0");
    this.save();
  }

  async handleFindFormItems() {
    const tab = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tabId = tab[0].id;

    const findFormItems = () => {
      const documentHtml = document.body.innerHTML;
      const innerHTML = documentHtml.toString();
      chrome.runtime.sendMessage(chrome.runtime.id, {
        type: "LOAD_DOCUMENT",
        innerHTML,
      });
    };

    if (tabId) {
      chrome.scripting.executeScript({
        target: { tabId },
        func: findFormItems,
      });
    }
  }

  handleReceivedMessage(message: any, sender: any) {
    if (message.type === "SET_SECTION") {
      if (!message.innerHTML) return "Select area failed.";
      chrome.scripting.removeCSS({
        target: { tabId: sender.tab.id },
        files: ["inject.css"],
      });
      this.setScanArea(message.innerHTML);
    } else if (message.type === "LOAD_DOCUMENT") {
      if (!message.innerHTML) return "Load DOM failed.";
      if (!this.isScanAreaSet) {
        this.scanArea = message.innerHTML;
      }

      const $cheerio = cheerio.load(this.scanArea);
      const inputItems: cheerio.Cheerio = $cheerio("input");
      this.setItems(inputItems);

      if (inputItems?.length) {
      } else {
        console.log("no inputItems");
      }
    }
  }

  save() {
    chrome.storage.sync.set({
      items: this.items,
      isScanAreaSet: this.isScanAreaSet,
      scanArea: this.isScanAreaSet ? this.scanArea : "",
    });
  }
}

window.addEventListener("DOMContentLoaded", function () {
  new Main();
});
