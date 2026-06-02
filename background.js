const pad = (n) => String(n).padStart(2, "0");

async function getBookmarksBarId() {
  const tree = await chrome.bookmarks.getTree();
  const root = tree[0];
  const bar = root.children.find((c) => c.id === "1") || root.children[0];
  return bar.id;
}

chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const saveable = tabs.filter((t) => t.url && /^https?:\/\//.test(t.url));

  if (saveable.length === 0) return;

  const barId = await getBookmarksBarId();

  const d = new Date();
  const todayPrefix =
    `${pad(d.getFullYear() % 100)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const wday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];

  const barChildren = await chrome.bookmarks.getChildren(barId);
  const existingFolder = barChildren.find(
    (c) => !c.url && c.title.startsWith(todayPrefix)
  );

  let parentId;
  if (existingFolder) {
    parentId = existingFolder.id;
  } else {
    const folder = await chrome.bookmarks.create({
      parentId: barId,
      title: `${todayPrefix}${wday}`,
    });
    parentId = folder.id;
  }

  for (const t of saveable) {
    await chrome.bookmarks.create({
      parentId,
      title: t.title || t.url,
      url: t.url,
    });
  }

  await chrome.tabs.create({});
  const idsToClose = tabs.map((t) => t.id).filter((id) => id !== undefined);
  await chrome.tabs.remove(idsToClose);
});
