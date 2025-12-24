async function upload() {
  const fileInput = document.getElementById("file");
  const file = fileInput.files[0];
  if (!file) return alert("Select a file");

  const formData = new FormData();
  formData.append("file", file);

  document.getElementById("progress").innerText = "Uploading...";

  const res = await fetch("/upload", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (!data.success) {
    document.getElementById("progress").innerText = "Upload failed";
    return;
  }

  document.getElementById("progress").innerText = "Upload complete";
  document.getElementById("result").innerHTML = `
    <a href="${data.url}" target="_blank">${data.url}</a>
  `;
}
