let confirmCallback = null;

function showCustomConfirm(title, message, callback) {
  const titleEl = document.getElementById("confirmTitleText");
  const msgEl = document.getElementById("confirmMessage");
  if (titleEl) titleEl.innerText = title;
  if (msgEl) msgEl.innerText = message;

  confirmCallback = callback;

  const overlay = document.getElementById("confirmModalOverlay");
  if (overlay) overlay.style.display = "flex";
  if (window.lucide) lucide.git createIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  const btnCancel = document.getElementById("btnCancelConfirm");
  const btnOk = document.getElementById("btnOkConfirm");

  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      document.getElementById("confirmModalOverlay").style.display = "none";
      confirmCallback = null;
    });
  }

  if (btnOk) {
    btnOk.addEventListener("click", () => {
      document.getElementById("confirmModalOverlay").style.display = "none";
      if (confirmCallback) confirmCallback();
      confirmCallback = null;
    });
  }
});

function switchView(targetView) {
  document.getElementById("homeView").style.display =
    targetView === "home" ? "block" : "none";
  document.getElementById("detailView").style.display =
    targetView === "detail" ? "block" : "none";
  document.getElementById("readerView").style.display =
    targetView === "reader" ? "block" : "none";

  if (targetView !== "reader") {
    document.getElementById("viewer").innerHTML = "";
  }
}

// ==============================================================================================================================
// Render Cover

function createCoverHTML(series) {
  if (series && series.coverUrl) {
    return `<img src="${series.coverUrl}" class="w-full h-full object-cover transition-transform duration-300" alt="Cover" onError="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-full h-full flex flex-col justify-center items-center bg-mono-dark/30 p-3 text-center\\'><i data-lucide=\\'book-open\\' class=\\'w-8 h-8 text-mono-light mb-2\\'></i><div class=\\'font-semibold text-xs text-mono-light line-clamp-2\\'>${series.title}</div></div>';" />`;
  } else {
    const icon = series.type === "Manga" ? "image" : "book-open";
    return `
      <div class="w-full h-full flex flex-col justify-center items-center bg-mono-dark/30 p-3 text-center">
        <i data-lucide="${icon}" class="w-8 h-8 text-mono-light mb-2"></i>
        <div class="font-semibold text-xs text-mono-light line-clamp-2">${series.title}</div>
      </div>
    `;
  }
}

// ==============================================================================================================================
// RENDER Home

async function renderHome() {
  const searchInput = document.getElementById("searchInput");
  const filterTypeInput = document.getElementById("filterType");

  const keyword = searchInput ? searchInput.value.toLowerCase() : "";
  const filterType = filterTypeInput ? filterTypeInput.value : "All";

  const seriesGrid = document.getElementById("seriesGrid");
  if (!seriesGrid) return;
  seriesGrid.innerHTML = "";

  const allSeries = await getAllSeriesFromDB();

  const filtered = allSeries.filter((item) => {
    const matchesKeyword = item.title.toLowerCase().includes(keyword);
    const matchesType = filterType === "All" ? true : item.type === filterType;
    return matchesKeyword && matchesType;
  });

  if (filtered.length === 0) {
    seriesGrid.innerHTML =
      '<p class="col-span-full text-center py-12 text-sm font-medium text-mono-light/50 border border-dashed border-mono-dark/60 rounded-xl">No titles found.</p>';
    if (window.lucide) lucide.createIcons();
    return;
  }

  filtered.forEach((item) => {
    const count = item.chapters ? item.chapters.length : 0;
    const unitLabel = item.type === "Light Novel" ? "Volume" : "Chapter";
    const countDisplay = `${count} ${unitLabel}`;

    const card = document.createElement("div");
    card.className =
      "group cursor-pointer flex flex-col gap-2.5 p-2 rounded-2xl border border-transparent hover:border-mono-light/40 hover:bg-mono-dark/10 transition-all duration-300";

    card.innerHTML = `
      <div class="w-full h-64 bg-mono-dark/20 rounded-xl overflow-hidden relative shadow-md">
        ${createCoverHTML(item)}
      </div>
      <div class="flex flex-col gap-0.5 px-1">
        <div class="flex justify-between items-start gap-1">
          <div class="font-bold text-sm text-white group-hover:text-mono-light transition-colors line-clamp-2 leading-snug flex-1">${item.title}</div>
          <button class="btn-edit-card p-1 text-mono-light/40 hover:text-white hover:bg-mono-dark/50 rounded-md transition-all shrink-0 -mr-1 -mt-0.5" title="Edit Series">
            <i data-lucide="more-vertical" class="w-4 h-4"></i>
          </button>
        </div>
        <div class="text-[12px] font-medium text-mono-light/40">${countDisplay}</div>
      </div>
    `;

    card.addEventListener("click", () => openDetail(item.id));

    const btnEdit = card.querySelector(".btn-edit-card");
    btnEdit.addEventListener("click", async (e) => {
      e.stopPropagation();
      currentSeriesId = item.id;

      document.getElementById("editTitleInput").value = item.title;
      document.getElementById("editTypeInput").value = item.type;
      document.getElementById("editCoverFileInput").value = "";

      document.getElementById("editModalOverlay").style.display = "flex";
      if (window.lucide) lucide.createIcons();
    });

    seriesGrid.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

// ==============================================================================================================================
// Render List
function renderChapters(series) {
  const chapterList = document.getElementById("chapterList");
  if (!chapterList) return;
  chapterList.innerHTML = "";

  const unitLabel = series.type === "Light Novel" ? "Volume" : "Chapter";

  const chapterSectionTitle = document.getElementById("chapterSectionTitle");
  if (chapterSectionTitle) {
    chapterSectionTitle.innerText = `${unitLabel} List`;
  }

  if (!series.chapters || series.chapters.length === 0) {
    chapterList.innerHTML = `<p class="text-center py-8 text-xs font-medium text-mono-light/50 border border-dashed border-mono-dark/60 rounded-xl">No ${unitLabel.toLowerCase()}s found. Click "Upload" to add files!</p>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  series.chapters.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

  series.chapters.forEach((ch, index) => {
    const item = document.createElement("div");
    item.className =
      "bg-mono-dark/20 border border-mono-dark/60 rounded-lg p-3.5 flex justify-between items-center cursor-pointer hover:bg-mono-dark/40 hover:border-mono-light/50 transition-all group";
    item.innerHTML = `
      <span class="font-medium text-xs sm:text-sm break-all text-mono-light/80 group-hover:text-white">
        ${ch.name}
      </span>
      <button class="btn-del-ch text-mono-light/30 hover:text-red-400 p-1.5 hover:bg-red-950/40 rounded-md transition-all" title="Delete ${unitLabel}">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    `;

    item.addEventListener("click", () => {
      saveToHistory(series.title, ch.name, series.type, ch.fileUrl);
      readChapter(series, index);
    });

    item.querySelector(".btn-del-ch").addEventListener("click", async (e) => {
      e.stopPropagation();

      showCustomConfirm(
        "Delete File",
        `Are you sure you want to delete ${unitLabel.toLowerCase()} "${ch.name}"?`,
        async () => {
          const res = await deleteChapterDB(series.id, ch.name);
          if (res && res.status === "success") {
            renderChapters(res.data);
            const countLabel =
              res.data.type === "Light Novel" ? "Volume" : "Chapter";
            const countEl = document.getElementById("detailCount");
            if (countEl)
              countEl.innerText = `${res.data.chapters.length} ${countLabel}`;
          }
        },
      );
    });

    chapterList.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();
}

// ==============================================================================================================================
// Render History
function renderHistoryUI() {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;
  historyList.innerHTML = "";

  const history = getHistory();

  if (history.length === 0) {
    historyList.innerHTML =
      '<p class="text-center py-6 text-xs text-mono-light/50">No reading history yet.</p>';
    if (window.lucide) lucide.createIcons();
    return;
  }

  history.forEach((item) => {
    const div = document.createElement("div");
    div.className =
      "bg-mono-dark/20 border border-mono-dark/60 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:border-mono-light/50 transition-all";
    div.innerHTML = `
      <div class="pr-2">
        <div class="font-bold text-xs text-white truncate">${item.seriesTitle}</div>
        <div class="text-[11px] text-mono-light/70 truncate mt-0.5">${item.chapterName}</div>
        <div class="text-[9px] text-mono-light font-semibold mt-1">${item.date}</div>
      </div>
      <button class="bg-mono-light text-mono-black font-bold px-2.5 py-1 rounded-lg text-[10px] shrink-0 flex items-center gap-1">
        Read <i data-lucide="arrow-right" class="w-3 h-3"></i>
      </button>
    `;
    div.addEventListener("click", async () => {
      document.getElementById("historyModalOverlay").style.display = "none";
      const allSeries = await getAllSeriesFromDB();
      const series = allSeries.find((s) => s.title === item.seriesTitle);
      if (series) {
        const chIndex = series.chapters.findIndex(
          (c) => c.name === item.chapterName,
        );
        readChapter(series, chIndex >= 0 ? chIndex : 0);
      }
    });
    historyList.appendChild(div);
  });

  if (window.lucide) lucide.createIcons();
}
