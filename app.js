import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.WEDDING_CONFIG || {};
const bucket = "wedding-photos";
const maxPhotos = 10;
const maxFileSizeMB = 10;
const signedUrlDuration = 60 * 60;

const $ = (id) => document.getElementById(id);
const ui = {
  hero: $("hero"),
  monogram: $("monogram"),
  coupleNames: $("coupleNames"),
  weddingDate: $("weddingDate"),
  footerNames: $("footerNames"),
  gallerySubtitle: $("gallerySubtitle"),
  setupBanner: $("setupBanner"),
  gallery: $("gallery"),
  emptyState: $("emptyState"),
  galleryStatus: $("galleryStatus"),
  uploadDialog: $("uploadDialog"),
  uploadForm: $("uploadForm"),
  photoFiles: $("photoFiles"),
  previewList: $("previewList"),
  uploaderName: $("uploaderName"),
  caption: $("caption"),
  consent: $("consent"),
  uploadProgress: $("uploadProgress"),
  progressBar: $("progressBar"),
  progressText: $("progressText"),
  submitUploadBtn: $("submitUploadBtn"),
  formFeedback: $("formFeedback"),
  dropZone: $("dropZone"),
  lightbox: $("lightbox"),
  lightboxImage: $("lightboxImage"),
  lightboxCaption: $("lightboxCaption"),
  toast: $("toast")
};

const isConfigured =
  config.SUPABASE_URL &&
  config.SUPABASE_ANON_KEY &&
  !config.SUPABASE_URL.includes("WSTAW_") &&
  !config.SUPABASE_ANON_KEY.includes("WSTAW_");

const supabase = isConfigured
  ? createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;

function setPersonalization() {
  const names = config.COUPLE_NAMES || "Adam & Agnieszka";
  const date = config.WEDDING_DATE || "17 Lipca 2026";
  ui.coupleNames.textContent = names;
  ui.weddingDate.textContent = date;
  ui.footerNames.textContent = names;
  ui.gallerySubtitle.textContent = config.ALBUM_SUBTITLE || "Zdjęcia przesłane przez naszych najbliższych.";
  if (config.HERO_IMAGE) {
    ui.hero.style.backgroundImage = `url("${config.HERO_IMAGE}")`;
  }
  document.title = `${names} | Album Weselny`;
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.remove("hidden");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => ui.toast.classList.add("hidden"), 3200);
}

function openUpload() {
  ui.formFeedback.classList.add("hidden");
  ui.uploadDialog.showModal();
}

function closeUpload() {
  if (!ui.submitUploadBtn.disabled) ui.uploadDialog.close();
}

function setLoading(message = "") {
  ui.galleryStatus.textContent = message;
  ui.galleryStatus.classList.toggle("hidden", !message);
}

function formatCaption(photo) {
  const items = [photo.caption, photo.uploader_name && `fot. ${photo.uploader_name}`].filter(Boolean);
  return items.join(" · ");
}

function openLightbox(url, caption) {
  ui.lightboxImage.src = url;
  ui.lightboxImage.alt = caption || "Zdjęcie z albumu weselnego";
  ui.lightboxCaption.textContent = caption || "";
  ui.lightbox.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  ui.lightbox.classList.add("hidden");
  ui.lightboxImage.src = "";
  document.body.style.overflow = "";
}

function renderGallery(photos) {
  ui.gallery.replaceChildren();
  ui.emptyState.classList.toggle("hidden", photos.length > 0);
  photos.forEach((photo) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "photo-card";

    const image = document.createElement("img");
    image.src = photo.signedUrl;
    image.alt = photo.caption || "Moment z wesela";
    image.loading = "lazy";

    const meta = document.createElement("span");
    meta.className = "photo-meta";
    meta.textContent = formatCaption(photo) || "Zobacz zdjęcie";

    button.append(image, meta);
    button.addEventListener("click", () => openLightbox(photo.signedUrl, formatCaption(photo)));
    ui.gallery.appendChild(button);
  });
}

async function loadPhotos() {
  if (!supabase) {
    ui.setupBanner.classList.remove("hidden");
    ui.emptyState.classList.remove("hidden");
    return;
  }
  setLoading("Ładowanie zdjęć…");
  const { data, error } = await supabase
    .from("photos")
    .select("id, storage_path, caption, uploader_name, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    setLoading("");
    showToast("Nie udało się pobrać zdjęć.");
    console.error(error);
    return;
  }

  const photos = await Promise.all(
    data.map(async (photo) => {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(photo.storage_path, signedUrlDuration);
      if (signedError) return null;
      return { ...photo, signedUrl: signedData.signedUrl };
    })
  );

  renderGallery(photos.filter(Boolean));
  setLoading("");
}

function makePreview(files) {
  ui.previewList.replaceChildren();
  [...files].slice(0, maxPhotos).forEach((file) => {
    const img = document.createElement("img");
    img.alt = "Podgląd wybranego zdjęcia";
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.addEventListener("load", () => URL.revokeObjectURL(objectUrl), { once: true });
    ui.previewList.appendChild(img);
  });
}

async function compressImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("Dozwolone są tylko zdjęcia.");
  if (file.size > maxFileSizeMB * 1024 * 1024) {
    throw new Error(`Każde zdjęcie może mieć maksymalnie ${maxFileSizeMB} MB.`);
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  try {
    image.src = objectUrl;
    await image.decode();

    const maxSide = 2400;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(image, 0, 0, width, height);

    const compressed = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.84)
    );
    return compressed || file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadPhoto(file, uploaderName, caption) {
  const processed = await compressImage(file);
  const id = crypto.randomUUID();
  const path = `moments/${new Date().toISOString().slice(0, 10)}-${id}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, processed, {
      contentType: processed.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false
    });
  if (uploadError) throw uploadError;

  const { error: rowError } = await supabase.from("photos").insert({
    storage_path: path,
    uploader_name: uploaderName || null,
    caption: caption || null
  });
  if (rowError) throw rowError;
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!supabase) {
    ui.formFeedback.textContent = "Najpierw uzupełnij dane Supabase w pliku config.js.";
    ui.formFeedback.classList.remove("hidden");
    return;
  }

  const files = [...ui.photoFiles.files];
  if (!files.length) return;
  if (files.length > maxPhotos) {
    ui.formFeedback.textContent = `Możesz przesłać maksymalnie ${maxPhotos} zdjęć jednocześnie.`;
    ui.formFeedback.classList.remove("hidden");
    return;
  }

  ui.submitUploadBtn.disabled = true;
  ui.uploadProgress.classList.remove("hidden");
  ui.formFeedback.classList.add("hidden");

  try {
    for (let index = 0; index < files.length; index += 1) {
      ui.progressText.textContent = `Przesyłanie zdjęcia ${index + 1} z ${files.length}…`;
      ui.progressBar.style.width = `${Math.round((index / files.length) * 100)}%`;
      await uploadPhoto(files[index], ui.uploaderName.value.trim(), ui.caption.value.trim());
    }
    ui.progressBar.style.width = "100%";
    ui.progressText.textContent = "Gotowe!";
    await loadPhotos();
    ui.uploadForm.reset();
    ui.previewList.replaceChildren();
    setTimeout(() => {
      ui.uploadDialog.close();
      ui.uploadProgress.classList.add("hidden");
      ui.progressBar.style.width = "0";
    }, 450);
    showToast("Dziękujemy! Twój moment pojawił się w galerii ♡");
  } catch (error) {
    console.error(error);
    ui.formFeedback.textContent = "Nie udało się przesłać zdjęć. Spróbuj ponownie lub wybierz mniejsze pliki.";
    ui.formFeedback.classList.remove("hidden");
    ui.uploadProgress.classList.add("hidden");
  } finally {
    ui.submitUploadBtn.disabled = false;
  }
}

function enableRealtime() {
  if (!supabase) return;
  supabase
    .channel("new-wedding-photos")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "photos" }, () => loadPhotos())
    .subscribe();
}

$("openUploadBtn").addEventListener("click", openUpload);
$("secondUploadBtn").addEventListener("click", openUpload);
$("emptyUploadBtn").addEventListener("click", openUpload);
$("closeUploadBtn").addEventListener("click", closeUpload);
$("refreshBtn").addEventListener("click", loadPhotos);
$("closeLightboxBtn").addEventListener("click", closeLightbox);
ui.lightbox.addEventListener("click", (event) => { if (event.target === ui.lightbox) closeLightbox(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeLightbox(); });
ui.photoFiles.addEventListener("change", () => makePreview(ui.photoFiles.files));
ui.uploadForm.addEventListener("submit", handleSubmit);

["dragenter", "dragover"].forEach((name) =>
  ui.dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    ui.dropZone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((name) =>
  ui.dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    ui.dropZone.classList.remove("dragover");
  })
);
ui.dropZone.addEventListener("drop", (event) => {
  const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("image/"));
  const transfer = new DataTransfer();
  files.slice(0, maxPhotos).forEach((file) => transfer.items.add(file));
  ui.photoFiles.files = transfer.files;
  makePreview(transfer.files);
});

$("copyLinkBtn").addEventListener("click", async () => {
  try {
    if (navigator.share) {
      await navigator.share({ title: document.title, url: location.href });
    } else {
      await navigator.clipboard.writeText(location.href);
      showToast("Link do albumu skopiowany.");
    }
  } catch {
    /* użytkownik mógł zamknąć okno udostępniania */
  }
});

setPersonalization();
loadPhotos();
enableRealtime();
