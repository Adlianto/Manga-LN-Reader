let confirmCallback = null;

function refreshIcons(container = null) {
  if (window.lucide) {
    requestAnimationFrame(() => {
      try {
        if (container && container instanceof HTMLElement) {
          lucide.createIcons({ root: container });
        } else {
          lucide.createIcons();
        }
      } catch (e) {
        lucide.createIcons();
      }
    });
  }
}

function showCustomConfirm(title, message, callback) {
  const titleEl = document.getElementById("confirmTitleText");
  const msgEl = document.getElementById("confirmMessage");
  if (titleEl) titleEl.innerText = title;
  if (msgEl) msgEl.innerText = message;

  confirmCallback = callback;

  const overlay = document.getElementById("confirmModalOverlay");
  if (overlay) overlay.style.display = "flex";
  refreshIcons(overlay);
}

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("confirmModalOverlay");
  document.getElementById("btnCancelConfirm")?.addEventListener("click", () => {
    if (overlay) overlay.style.display = "none";
    confirmCallback = null;
  });

  document.getElementById("btnOkConfirm")?.addEventListener("click", () => {
    if (overlay) overlay.style.display = "none";
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });

  refreshIcons();
});

function switchView(targetView) {
  document.getElementById("homeView").style.display = targetView === "home" ? "block" : "none";
  document.getElementById("detailView").style.display = targetView === "detail" ? "block" : "none";
  document.getElementById("readerView").style.display = targetView === "reader" ? "block" : "none";

  if (targetView !== "reader") {
    cleanViewerMemory();
  }
  refreshIcons();
}

function cleanViewerMemory() {
  const viewer = document.getElementById("viewer");
  if (!viewer) return;

  const currentImages = viewer.querySelectorAll("img.manga-img");
  currentImages.forEach((img) => {
    if (img.src.startsWith("blob:")) {
      URL.revokeObjectURL(img.src);
    }
  });
  viewer.innerHTML = "";
}

function escapeHTML(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createCoverHTML(series) {
  const safeTitle = escapeHTML(series?.title);
  if (series?.coverUrl) {
    return `<img src="${series.coverUrl}" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-300" alt="${safeTitle}" />`;
  }
  const icon = series?.type === "Manga" ? "image" : "book-open";
  return `
    <div class="w-full h-full flex flex-col justify-center items-center bg-mono-dark/30 p-3 text-center">
      <i data-lucide="${icon}" class="w-8 h-8 text-mono-light mb-2"></i>
      <div class="font-semibold text-xs text-mono-light line-clamp-2">${safeTitle}</div>
    </div>
  `;
}

async function renderHome() {
  const searchInput = document.getElementById("searchInput");
  const filterTypeInput = document.getElementById("filterType");
  const seriesGrid = document.getElementById("seriesGrid");
  if (!seriesGrid) return;

  const keyword = searchInput?.value.toLowerCase().trim() || "";
  const filterType = filterTypeInput?.value || "All";

  const allSeries = await getAllSeriesFromDB();

  const filtered = allSeries.filter((item) => {
    const matchesKeyword = item.title.toLowerCase().includes(keyword);
    const matchesType = filterType === "All" || item.type === filterType;
    return matchesKeyword && matchesType;
  });

  if (filtered.length === 0) {
    seriesGrid.innerHTML =
      '<p class="col-span-full text-center py-12 text-sm font-medium text-mono-light/50 border border-dashed border-mono-dark/60 rounded-xl">No titles found.</p>';
    refreshIcons();
    return;
  }

  const fragment = document.createDocumentFragment();

  filtered.forEach((item) => {
    const count = item.chapters?.length || 0;
    const unitLabel = item.type === "Light Novel" ? "Volume" : "Chapter";
    const safeTitle = escapeHTML(item.title);

    const card = document.createElement("div");
    card.className =
      "group cursor-pointer flex flex-col gap-2.5 p-2 rounded-2xl border border-transparent hover:border-mono-light/40 hover:bg-mono-dark/10 transition-all duration-300";

    card.innerHTML = `
      <div class="w-full h-64 bg-mono-dark/20 rounded-xl overflow-hidden relative shadow-md">
        ${createCoverHTML(item)}
      </div>
      <div class="flex flex-col gap-0.5 px-1">
        <div class="flex justify-between items-start gap-1">
          <div class="font-bold text-sm text-white group-hover:text-mono-light transition-colors line-clamp-2 leading-snug flex-1">${safeTitle}</div>
          <button class="btn-edit-card p-1 text-mono-light/40 hover:text-white hover:bg-mono-dark/50 rounded-md transition-all shrink-0 -mr-1 -mt-0.5" title="Edit Series" aria-label="Edit Series">
            <i data-lucide="more-vertical" class="w-4 h-4"></i>
          </button>
        </div>
        <div class="text-[12px] font-medium text-mono-light/40">${count} ${unitLabel}</div>
      </div>
    `;

    card.addEventListener("click", () => openDetail(item.id));

    card.querySelector(".btn-edit-card").addEventListener("click", (e) => {
      e.stopPropagation();
      currentSeriesId = item.id;
      document.getElementById("editTitleInput").value = item.title;
      document.getElementById("editTypeInput").value = item.type;
      document.getElementById("editCoverFileInput").value = "";
      document.getElementById("editModalOverlay").style.display = "flex";
      refreshIcons(document.getElementById("editModalOverlay"));
    });

    fragment.appendChild(card);
  });

  seriesGrid.innerHTML = "";
  seriesGrid.appendChild(fragment);

  refreshIcons();
}

function renderChapters(series) {
  const chapterList = document.getElementById("chapterList");
  if (!chapterList) return;

  const unitLabel = series.type === "Light Novel" ? "Volume" : "Chapter";
  const chapterSectionTitle = document.getElementById("chapterSectionTitle");
  if (chapterSectionTitle) chapterSectionTitle.innerText = `${unitLabel} List`;

  if (!series.chapters || series.chapters.length === 0) {
    chapterList.innerHTML = `<p class="text-center py-8 text-xs font-medium text-mono-light/50 border border-dashed border-mono-dark/60 rounded-xl">No ${unitLabel.toLowerCase()}s found. Click "Upload" to add files!</p>`;
    refreshIcons();
    return;
  }

  const sortedChapters = [...series.chapters].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
  );

  const fragment = document.createDocumentFragment();

  sortedChapters.forEach((ch, index) => {
    const item = document.createElement("div");
    item.className =
      "bg-mono-dark/20 border border-mono-dark/60 rounded-lg p-3.5 flex justify-between items-center cursor-pointer hover:bg-mono-dark/40 hover:border-mono-light/50 transition-all group";
    item.innerHTML = `
      <span class="font-medium text-xs sm:text-sm break-all text-mono-light/80 group-hover:text-white">
        ${escapeHTML(ch.name)}
      </span>
      <button class="btn-del-ch text-mono-light/30 hover:text-red-400 p-1.5 hover:bg-red-950/40 rounded-md transition-all" title="Delete ${unitLabel}" aria-label="Delete chapter">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    `;

    item.addEventListener("click", () => {
      saveToHistory(series.id, series.title, ch.name, series.type, ch.fileUrl);
      readChapter(series, index);
    });

    item.querySelector(".btn-del-ch").addEventListener("click", (e) => {
      e.stopPropagation();
      showCustomConfirm("Delete File", `Are you sure you want to delete ${unitLabel.toLowerCase()} "${ch.name}"?`, async () => {
        const res = await deleteChapterDB(series.id, ch.name);
        if (res?.status === "success") {
          renderChapters(res.data);
          const countEl = document.getElementById("detailCount");
          if (countEl) countEl.innerText = `${res.data.chapters.length} ${unitLabel}`;
        }
      });
    });

    fragment.appendChild(item);
  });

  chapterList.innerHTML = "";
  chapterList.appendChild(fragment);
  refreshIcons(chapterList);
}

function renderHistoryUI() {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;

  const history = getHistory();
  if (history.length === 0) {
    historyList.innerHTML = '<p class="text-center py-6 text-xs text-mono-light/50">No reading history yet.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  history.forEach((item) => {
    const div = document.createElement("div");
    div.className =
      "bg-mono-dark/20 border border-mono-dark/60 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:border-mono-light/50 transition-all";
    div.innerHTML = `
      <div class="pr-2">
        <div class="font-bold text-xs text-white truncate">${escapeHTML(item.seriesTitle)}</div>
        <div class="text-[11px] text-mono-light/70 truncate mt-0.5">${escapeHTML(item.chapterName)}</div>
        <div class="text-[9px] text-mono-light font-semibold mt-1">${item.date}</div>
      </div>
      <button class="bg-mono-light text-mono-black font-bold px-2.5 py-1 rounded-lg text-[10px] shrink-0 flex items-center gap-1">
        Read <i data-lucide="arrow-right" class="w-3 h-3"></i>
      </button>
    `;
    div.addEventListener("click", async () => {
      document.getElementById("historyModalOverlay").style.display = "none";
      const allSeries = await getAllSeriesFromDB();
      const series = allSeries.find((s) => s.id === item.seriesId || s.title === item.seriesTitle);
      if (series) {
        const chIndex = series.chapters.findIndex((c) => c.name === item.chapterName);
        readChapter(series, chIndex >= 0 ? chIndex : 0);
      }
    });
    fragment.appendChild(div);
  });

  historyList.innerHTML = "";
  historyList.appendChild(fragment);
  refreshIcons(historyList);
}
