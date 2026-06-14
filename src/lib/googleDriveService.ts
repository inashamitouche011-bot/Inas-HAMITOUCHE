export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
}

/**
 * List files matching document types in user's Google Drive
 */
export async function listDriveFiles(accessToken: string): Promise<GoogleDriveFile[]> {
  const query = encodeURIComponent(
    "trashed = false and (mimeType = 'application/pdf' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType = 'image/jpeg' or mimeType = 'image/png' or name contains '.xlsx' or name contains '.xls' or name contains '.pdf')"
  );
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, mimeType, size, createdTime)&orderBy=modifiedTime desc`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Failed to list Google Drive files:", errText);
    throw new Error("Impossible de lister les fichiers depuis votre compte Google Drive.");
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Download a file from Google Drive and convert to a File object
 */
export async function downloadDriveFile(accessToken: string, fileId: string, fileName: string, mimeType: string): Promise<File> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Failed to download file from Google Drive:", errText);
    throw new Error("Erreur de téléchargement du fichier depuis Google Drive.");
  }

  const blob = await response.blob();
  return new File([blob], fileName, { type: mimeType });
}

/**
 * Upload a binary blob file to Google Drive
 */
export async function uploadFileToDrive(
  accessToken: string,
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<{ id: string; name: string }> {
  // Step 1: Create metadata record on Drive
  const metaRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: fileName,
      mimeType: mimeType,
    }),
  });

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    console.error("Google Drive metadata creation error:", errText);
    throw new Error("Erreur lors de la création du fichier sur Google Drive.");
  }

  const metaData = await metaRes.json();
  const fileId = metaData.id;

  // Step 2: Upload raw binary content to the created file ID
  const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": mimeType,
    },
    body: blob,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error("Google Drive media upload error:", errText);
    throw new Error("Erreur lors du transfert du fichier vers Google Drive.");
  }

  return { id: fileId, name: fileName };
}
