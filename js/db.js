const API_URL = "api/api.php";
async function getAllSeriesFromDB() {
  try {
    const response = await fetch(`${API_URL}?action=get_all`);
    const data = await response.json();
    return data || [];
  } catch (err) {
    console.error("Gagal mengambil data dari API:", err);
    return [];
  }
}

async function getSeriesByIdDB(id) {
  const allSeries = await getAllSeriesFromDB();
  return allSeries.find((s) => s.id === id) || null;
}

async function saveSeriesToDB(title, type, coverFile, chapterFiles = []) {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("type", type);

  if (coverFile) {
    formData.append("cover", coverFile);
  }

  if (chapterFiles && chapterFiles.length > 0) {
    for (let i = 0; i < chapterFiles.length; i++) {
      formData.append("chapters[]", chapterFiles[i]);
    }
  }

  try {
    const response = await fetch(`${API_URL}?action=create_series`, {
      method: "POST",
      body: formData,
    });
    return await response.json();
  } catch (err) {
    console.error("Gagal membuat seri baru:", err);
  }
}

async function editSeriesDB(seriesId, title, type, coverFile) {
  const formData = new FormData();
  formData.append("series_id", seriesId);
  formData.append("title", title);
  formData.append("type", type);
  if (coverFile) formData.append("cover", coverFile);

  try {
    const response = await fetch(`${API_URL}?action=edit_series`, {
      method: "POST",
      body: formData,
    });
    return await response.json();
  } catch (err) {
    console.error("Gagal mengedit seri:", err);
  }
}

async function deleteSeriesDB(seriesId) {
  const formData = new FormData();
  formData.append("series_id", seriesId);

  try {
    const response = await fetch(`${API_URL}?action=delete_series`, {
      method: "POST",
      body: formData,
    });
    return await response.json();
  } catch (err) {
    console.error("Gagal menghapus seri:", err);
  }
}

async function uploadChaptersToDB(seriesId, files) {
  const formData = new FormData();
  formData.append("series_id", seriesId);

  for (let i = 0; i < files.length; i++) {
    formData.append("files[]", files[i]);
  }

  try {
    const response = await fetch(`${API_URL}?action=upload_chapter`, {
      method: "POST",
      body: formData,
    });
    return await response.json();
  } catch (err) {
    console.error("Gagal upload chapter:", err);
  }
}

async function deleteChapterDB(seriesId, chapterName) {
  const formData = new FormData();
  formData.append("series_id", seriesId);
  formData.append("chapter_name", chapterName);

  try {
    const response = await fetch(`${API_URL}?action=delete_chapter`, {
      method: "POST",
      body: formData,
    });
    return await response.json();
  } catch (err) {
    console.error("Gagal menghapus chapter:", err);
  }
}

function saveToHistory(seriesTitle, chapterName, seriesType, fileUrl) {
  let history = JSON.parse(localStorage.getItem("readHistory") || "[]");

  history = history.filter(
    (item) =>
      !(item.seriesTitle === seriesTitle && item.chapterName === chapterName),
  );

  history.unshift({
    seriesTitle,
    chapterName,
    seriesType,
    fileUrl,
    date: new Date().toLocaleDateString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  localStorage.setItem("readHistory", JSON.stringify(history.slice(0, 20)));
}

function getHistory() {
  return JSON.parse(localStorage.getItem("readHistory") || "[]");
}

function clearHistory() {
  localStorage.removeItem("readHistory");
}
