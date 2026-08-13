async function parseMangaContent(fileBuffer) {
  const zip = new JSZip();
  const contents = await zip.loadAsync(fileBuffer);
  const imagePromises = [];

  contents.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir && relativePath.match(/\.(jpg|jpeg|png|webp)$/i)) {
      imagePromises.push(
        zipEntry.async("blob").then((blob) => ({
          name: relativePath,
          url: URL.createObjectURL(blob),
        })),
      );
    }
  });

  const images = await Promise.all(imagePromises);
  images.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
  return images;
}

async function parseEpubContent(fileBuffer) {
  const zip = new JSZip();
  const contents = await zip.loadAsync(fileBuffer);
  const htmlFiles = [];

  contents.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir && relativePath.match(/\.(html|xhtml)$/i)) {
      if (!relativePath.includes("toc") && !relativePath.includes("nav")) {
        htmlFiles.push(zipEntry);
      }
    }
  });

  htmlFiles.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

  const chaptersHtml = [];
  for (const zipEntry of htmlFiles) {
    const textHTML = await zipEntry.async("string");
    const parser = new DOMParser();
    const doc = parser.parseFromString(textHTML, "text/html");
    const bodyContent = doc.body ? doc.body.innerHTML : textHTML;
    chaptersHtml.push(bodyContent);
  }

  return chaptersHtml;
}
