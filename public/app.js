function upload() {
  const fileInput = document.getElementById("file");
  const file = fileInput.files[0];
  if (!file) return alert("Select a file");

  const formData = new FormData();
  formData.append("file", file);

  const xhr = new XMLHttpRequest();

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      document.getElementById("progress-bar").style.width = percent + "%";
      document.getElementById("progress-text").innerText = `Uploading ${percent}%`;
    }
  };

  xhr.onload = () => {
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      document.getElementById("progress-text").innerText = "Upload complete";
      document.getElementById("result").innerHTML = `
        <a href="${data.url}" target="_blank">${data.url}</a>
      `;
    } else {
      document.getElementById("progress-text").innerText = "Upload failed";
    }
  };

  xhr.onerror = () => {
    document.getElementById("progress-text").innerText = "Upload error";
  };

  xhr.open("POST", "/upload");
  xhr.send(formData);
}
