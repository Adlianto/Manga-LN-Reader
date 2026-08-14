let jszipLoadedPromise = null;

function ensureJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (!jszipLoadedPromise) {
    jszipLoadedPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "js/jszip.min.js";
      s.onload = () => resolve(window.JSZip);
      s.onerror = (err) => {
        jszipLoadedPromise = null;
        reject(err);
      };
      document.body.appendChild(s);
    });
  }
  return jszipLoadedPromise;
}

const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|webp)$/i;
const EPUB_TEXT_REGEX = /\.(html|xhtml)$/i;

async function parseMangaContent(fileBuffer) {
  await ensureJSZip();
  const zip = new JSZip();
  const contents = await zip.loadAsync(fileBuffer);
  const imageEntries = [];

  contents.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir && IMAGE_EXT_REGEX.test(relativePath)) {
      imageEntries.push({ name: relativePath, entry: zipEntry });
    }
  });

  imageEntries.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );

  return Promise.all(
    imageEntries.map(async (item) => {
      const blob = await item.entry.async("blob");
      return {
        name: item.name,
        url: URL.createObjectURL(blob)
      };
    })
  );
}

async function parseEpubContent(fileBuffer) {
  await ensureJSZip();
  const zip = new JSZip();
  const contents = await zip.loadAsync(fileBuffer);
  const htmlFiles = [];

  contents.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir && EPUB_TEXT_REGEX.test(relativePath)) {
      if (!relativePath.includes("toc") && !relativePath.includes("nav")) {
        htmlFiles.push(zipEntry);
      }
    }
  });

  htmlFiles.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );

  const parser = new DOMParser();
  return Promise.all(
    htmlFiles.map(async (zipEntry) => {
      const textHTML = await zipEntry.async("string");
      const doc = parser.parseFromString(textHTML, "text/html");
      return doc.body ? doc.body.innerHTML : textHTML;
    })
  );
}