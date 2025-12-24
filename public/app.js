async function upload() {
  const file = document.getElementById("file").files[0];
  if (!file) return;

  const init = await fetch("/api/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      size: file.size
    })
  }).then(r => r.json());

  const chunkSize = init.chunkSize;
  const total = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < total; i++) {
    const slice = file.slice(i * chunkSize, (i + 1) * chunkSize);
    await fetch(`/api/chunk?uploadId=${init.uploadId}&index=${i}`, {
      method: "POST",
      body: slice
    });

    document.getElementById("progress").innerText =
      `Uploading ${Math.floor(((i + 1) / total) * 100)}%`;
  }

  const done = await fetch("/api/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uploadId: init.uploadId,
      storedName: init.storedName,
      total
    })
  }).then(r => r.json());

  document.getElementById("result").innerHTML = `
    <p>Upload Complete</p>
    <a href="${done.url}" target="_blank">${done.url}</a>
  `;
}
