// Where we will expose all the data we retrieve from storage.sync.
const options = {
  type: ["text", "number", "select", "radio", "checkbox", "date", "time"],
  valueSetType: ["fixed", "auto"],
};

const itemDefaultOptionsByType = {
  input: { type: "input", valueSetType: "auto" },
};

const storageCache = { count: 0 };

const initStorageCache = chrome.storage.sync.get().then((items) => {
  // Copy the data retrieved from storage into storageCache.
  Object.assign(storageCache, items);
});

const saveOptions = () => {
  const color = document.getElementById("color").value;
  const likesColor = document.getElementById("like").checked;

  chrome.storage.sync.set(
    { favoriteColor: color, likesColor: likesColor },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById("status");
      status.textContent = "Options saved.";
      setTimeout(() => {
        status.textContent = "";
      }, 750);
    }
  );
};

const restoreOptions = () => {
  chrome.storage.sync.get({ items: [] }, ({ items }) => {
    console.log("items", items);
    // document.getElementById("color").value = items.favoriteColor;
    // document.getElementById("like").checked = items.likesColor;
  });
};

chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${oldValue}", new value is "${newValue}".`
    );
  }
});

document.addEventListener("DOMContentLoaded", restoreOptions);
// document.getElementById("save").addEventListener("click", saveOptions);
