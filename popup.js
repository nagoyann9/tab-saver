const btn = document.getElementById("save");
const status = document.getElementById("status");

const pad = (n) => String(n).padStart(2, "0");

// ブックマークバーのフォルダIDを取得する（通常は "1"）
async function getBookmarksBarId() {
  const tree = await chrome.bookmarks.getTree();
  const root = tree[0];
  const bar = root.children.find((c) => c.id === "1") || root.children[0];
  return bar.id;
}

btn.addEventListener("click", async () => {
  btn.disabled = true;
  status.textContent = "処理中…";

  try {
    // 現在のウィンドウの全タブを取得
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // ブックマークとして保存できる http/https のタブだけ抽出
    const saveable = tabs.filter((t) => t.url && /^https?:\/\//.test(t.url));

    if (saveable.length === 0) {
      status.textContent = "保存できるタブがありません。";
      btn.disabled = false;
      return;
    }

    const barId = await getBookmarksBarId();

    // 同日付けの既存フォルダを探し、なければ新規作成
    const d = new Date();
    const todayPrefix =
      `${pad(d.getFullYear() % 100)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const wday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];

    const barChildren = await chrome.bookmarks.getChildren(barId);
    const existingFolder = barChildren.find(
      (c) => !c.url && c.title.startsWith(todayPrefix)
    );

    let parentId, label;
    if (existingFolder) {
      parentId = existingFolder.id;
      label = `「${existingFolder.title}」`;
    } else {
      const folder = await chrome.bookmarks.create({
        parentId: barId,
        title: `${todayPrefix}${wday}`,
      });
      parentId = folder.id;
      label = `「${folder.title}」`;
    }

    // 各タブをブックマークに登録
    for (const t of saveable) {
      await chrome.bookmarks.create({
        parentId,
        title: t.title || t.url,
        url: t.url,
      });
    }

    status.textContent = `${saveable.length} 件を ${label} に保存しました。`;

    // ウィンドウが消えないよう、新しいタブを1つ開いてから全タブを閉じる
    await chrome.tabs.create({});
    const idsToClose = tabs.map((t) => t.id).filter((id) => id !== undefined);
    await chrome.tabs.remove(idsToClose);
  } catch (e) {
    status.textContent = "エラー: " + e.message;
    btn.disabled = false;
  }
});
