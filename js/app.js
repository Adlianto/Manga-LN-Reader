let currentSeriesId = null;
let currentSeriesObj = null;
let currentChapterIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
  renderHome();
  setupEventListeners();
});

function setupEventListeners() {
  const modalOverlay = document.getElementById('modalOverlay');
  const editModalOverlay = document.getElementById('editModalOverlay');
  const historyModalOverlay = document.getElementById('historyModalOverlay');
  const searchInput = document.getElementById('searchInput');

  // Modal Controls
  document.getElementById('btnOpenModal').addEventListener('click', () => modalOverlay.style.display = 'flex');
  document.getElementById('btnCancelModal').addEventListener('click', () => {
    modalOverlay.style.display = 'none';
    resetForm();
  });

  document.getElementById('btnSaveSeries').addEventListener('click', async () => {
    const title = document.getElementById('inputTitle').value.trim();
    const type = document.getElementById('inputType').value;
    const inputCoverFile = document.getElementById('inputCoverFile');
    const inputChapterFiles = document.getElementById('inputChapterFiles');

    const coverFile = (inputCoverFile && inputCoverFile.files && inputCoverFile.files[0]) ? inputCoverFile.files[0] : null;
    const chapterFiles = (inputChapterFiles && inputChapterFiles.files) ? Array.from(inputChapterFiles.files) : [];

    if (!title) return alert("Please enter a title!");

    const btnSave = document.getElementById('btnSaveSeries');
    btnSave.innerText = 'Creating...';
    btnSave.disabled = true;

    try {
      const res = await saveSeriesToDB(title, type, coverFile, chapterFiles);
      if (res && res.status === 'success') {
        modalOverlay.style.display = 'none';
        resetForm();
        renderHome();
      } else {
        alert("Failed to save: " + (res.message || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create new title.');
    } finally {
      btnSave.innerText = 'Save';
      btnSave.disabled = false;
    }
  });

  // Modal Histori
  document.getElementById('btnOpenHistory').addEventListener('click', () => {
    renderHistoryUI();
    historyModalOverlay.style.display = 'flex';
  });
  document.getElementById('btnCloseHistoryModal').addEventListener('click', () => historyModalOverlay.style.display = 'none');
  document.getElementById('btnClearHistory').addEventListener('click', () => {
    clearHistory();
    renderHistoryUI();
  });

  // Modal Edit Seri
  document.getElementById('btnOpenEditModal').addEventListener('click', async () => {
    const series = await getSeriesByIdDB(currentSeriesId);
    if (!series) return;
    document.getElementById('editTitleInput').value = series.title;
    document.getElementById('editTypeInput').value = series.type;
    document.getElementById('editCoverFileInput').value = '';
    editModalOverlay.style.display = 'flex';
  });

  document.getElementById('btnCancelEditModal').addEventListener('click', () => editModalOverlay.style.display = 'none');

  document.getElementById('btnSaveEditSeries').addEventListener('click', async () => {
    const newTitle = document.getElementById('editTitleInput').value.trim();
    const newType = document.getElementById('editTypeInput').value;
    const fileInput = document.getElementById('editCoverFileInput');
    const coverFile = fileInput.files[0] || null;

    const res = await editSeriesDB(currentSeriesId, newTitle, newType, coverFile);
    if (res && res.status === 'success') {
      const s = res.data;
      document.getElementById('detailTitle').innerText = s.title;
      document.getElementById('detailBadge').innerText = s.type;
      
      const unitLabel = s.type === 'Light Novel' ? 'Volume' : 'Chapter';
      document.getElementById('detailCount').innerText = `${s.chapters.length} ${unitLabel}`;
      document.getElementById('detailCoverContainer').innerHTML = createCoverHTML(s);
      
      editModalOverlay.style.display = 'none';
      renderHome();
    }
  });

  // Delete
  document.getElementById('btnDeleteSeries').addEventListener('click', () => {
    showCustomConfirm(
      'Delete Series',
      'Are you sure you want to delete this series? All related files will be permanently deleted!',
      async () => {
        await deleteSeriesDB(currentSeriesId);
        editModalOverlay.style.display = 'none';
        switchView('home');
        renderHome();
      }
    );
  });

  // Search
  if (searchInput) searchInput.addEventListener('input', (e) => renderHome(e.target.value));

  const btnUploadChapter = document.getElementById('btnUploadChapter');
  const chapterFileInput = document.getElementById('chapterFileInput');
  btnUploadChapter.addEventListener('click', () => chapterFileInput.click());

  chapterFileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    btnUploadChapter.innerText = `Uploading ${files.length} Files...`;
    btnUploadChapter.disabled = true;

    try {
      const res = await uploadChaptersToDB(currentSeriesId, files);
      if (res && res.status === 'success') {
        const unitLabel = res.data.type === 'Light Novel' ? 'Volume' : 'Chapter';
        document.getElementById('detailCount').innerText = `${res.data.chapters.length} ${unitLabel}`;
        renderChapters(res.data);
      }
    } finally {
      btnUploadChapter.innerHTML = '<i data-lucide="upload-cloud" class="w-4 h-4"></i> Upload';
      btnUploadChapter.disabled = false;
      chapterFileInput.value = '';
      if (window.lucide) lucide.createIcons();
    }
  });

  // Navigasi Chapter
  document.getElementById('btnPrevChapter').addEventListener('click', () => {
    if (currentSeriesObj && currentChapterIndex > 0) {
      readChapter(currentSeriesObj, currentChapterIndex - 1);
    }
  });

  document.getElementById('btnNextChapter').addEventListener('click', () => {
    if (currentSeriesObj && currentChapterIndex < currentSeriesObj.chapters.length - 1) {
      readChapter(currentSeriesObj, currentChapterIndex + 1);
    }
  });

  document.getElementById('btnBackToHome').addEventListener('click', () => switchView('home'));
  document.getElementById('btnBackToDetail').addEventListener('click', () => switchView('detail'));
}

function resetForm() {
  document.getElementById('inputTitle').value = '';
  document.getElementById('inputCoverFile').value = '';
  const inputChapterFiles = document.getElementById('inputChapterFiles');
  if (inputChapterFiles) inputChapterFiles.value = '';
}

async function openDetail(seriesId) {
  currentSeriesId = seriesId;
  const series = await getSeriesByIdDB(seriesId);
  if (!series) return;

  currentSeriesObj = series;

  const unitLabel = series.type === 'Light Novel' ? 'Volume' : 'Chapter';

  document.getElementById('detailTitle').innerText = series.title;
  document.getElementById('detailBadge').innerText = series.type;
  document.getElementById('detailCount').innerText = `${series.chapters.length} ${unitLabel}`;
  document.getElementById('detailCoverContainer').innerHTML = createCoverHTML(series);

  renderChapters(series);
  switchView('detail');
}

async function readChapter(series, chapterIndex) {
  if (!series || !series.chapters || !series.chapters[chapterIndex]) {
    console.error("Invalid chapter data:", series, chapterIndex);
    return;
  }

  currentSeriesObj = series;
  currentChapterIndex = chapterIndex;

  const chapter = series.chapters[chapterIndex];

  switchView('reader');

  const btnPrev = document.getElementById('btnPrevChapter');
  const btnNext = document.getElementById('btnNextChapter');
  const readerTitleDisplay = document.getElementById('readerTitleDisplay');

  if (btnPrev) {
    btnPrev.disabled = (chapterIndex === 0);
    btnPrev.style.opacity = (chapterIndex === 0) ? '0.4' : '1';
  }
  if (btnNext) {
    btnNext.disabled = (chapterIndex === series.chapters.length - 1);
    btnNext.style.opacity = (chapterIndex === series.chapters.length - 1) ? '0.4' : '1';
  }

  if (readerTitleDisplay) {
    const unitTag = series.type === 'Light Novel' ? 'Vol.' : 'Ch.';
    readerTitleDisplay.innerText = `${unitTag} ${chapterIndex + 1}`;
  }

  const viewer = document.getElementById('viewer');
  viewer.innerHTML = '<p style="text-align:center; color:#888;">Loading...</p>';

  window.scrollTo(0, 0);

try {
    // 🌟 Ganti jadi encodeURIComponent atau pastikan path-nya aman
    const fileUrl = chapter.fileUrl; // atau encodeURIComponent tergantung struktur database kamu
    const response = await fetch(chapter.fileUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP Status: ${response.status}`);
    }

    const fileBuffer = await response.arrayBuffer();

    if (series.type === 'Manga') {
      const images = await parseMangaContent(fileBuffer);
      viewer.innerHTML = '';
      images.forEach(img => {
        const imgEl = document.createElement('img');
        imgEl.src = img.url;
        imgEl.className = 'manga-img';
        viewer.appendChild(imgEl);
      });
    } else {
      const chaptersHtml = await parseEpubContent(fileBuffer);
      viewer.innerHTML = '';
      const container = document.createElement('div');
      container.className = 'epub-text';

      chaptersHtml.forEach(htmlStr => {
        const div = document.createElement('div');
        div.innerHTML = htmlStr;
        container.appendChild(div);
      });

      viewer.appendChild(container);
    }
  } catch (err) {
    console.error("Reader Error:", err);
    viewer.innerHTML = `<p style="text-align:center; color:red;">❌ Failed to read file from storage.<br><small style="color:#aaa;">${err.message}</small></p>`;
  }
}