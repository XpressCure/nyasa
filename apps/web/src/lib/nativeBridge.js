export function isAndroidApp() {
  return typeof window !== "undefined" && Boolean(window.NyasaAndroid?.getPlatform);
}

export function downloadInAndroid(url, fileName, authToken = "") {
  if (!isAndroidApp() || !window.NyasaAndroid?.downloadUrl) return false;
  const absoluteUrl = new URL(url, window.location.origin).toString();
  window.NyasaAndroid.downloadUrl(absoluteUrl, fileName, authToken);
  return true;
}

export function saveTextFileInAndroid(fileName, mimeType, content) {
  if (!isAndroidApp() || !window.NyasaAndroid?.saveBase64File) return false;

  const bytes = new TextEncoder().encode(content);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  window.NyasaAndroid.saveBase64File(fileName, mimeType, window.btoa(binary));
  return true;
}

export function shareInAndroid(title, text) {
  if (!isAndroidApp() || !window.NyasaAndroid?.shareText) return false;
  window.NyasaAndroid.shareText(title, text);
  return true;
}
