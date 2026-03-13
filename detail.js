const ADS_KEY = "bh_ads";
const FAVORITES_KEY = "bh_favorites";
const THEME_KEY = "bh_theme";
const INBOX_KEY = "bayankhongor_inbox_messages";
const SESSION_KEY = "bh_session_user";
const CURRENT_USER_KEY = "bh_current_user";

const SUPABASE_URL = "https://dtxrbjppxyggjkpybdcu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YGhtBnurAg3otWaBMXKjvQ_TQRQkvc9";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function normalizePrice(value) {
  return Number(String(value || "").replaceAll(",", "").replaceAll("₮", "").trim()) || 0;
}

function formatPrice(value) {
  return normalizePrice(value).toLocaleString("en-US") + "₮";
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Огноо байхгүй";

  return date.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function maskPhone(phone) {
  const value = String(phone || "").trim();

  if (value.length < 4) {
    return "Утас байхгүй";
  }

  return value.slice(0, 4) + "****";
}

function getAdIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function getAdsFromStorage() {
  const savedAds = localStorage.getItem(ADS_KEY);
  if (!savedAds) return [];

  try {
    const parsed = JSON.parse(savedAds);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadAdsFromSupabase() {
  const { data, error } = await supabaseClient
    .from("ads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase detail ads load error:", error);
    return [];
  }

  return (data || []).map((ad) => ({
    id: ad.id,
    title: ad.title,
    price: Number(ad.price || 0),
    location: ad.location || "",
    category: ad.category || "",
    subcategory: ad.subcategory || "",
    description: ad.description || "",
    seller: ad.seller_name || "",
    phone: ad.seller_phone || "",
    status: ad.status || "Идэвхтэй",
    vip: Boolean(ad.vip),
    top: Boolean(ad.top),
    views: Number(ad.views || 0),
    createdAt: ad.created_at || new Date().toISOString(),
    images: Array.isArray(ad.images) ? ad.images : []
  }));
}

async function increaseViewCount() {
  return await loadAdsFromSupabase();
}

function getFavoriteIds() {
  const saved = localStorage.getItem(FAVORITES_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavoriteIds(ids) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

function getInboxMessages() {
  const saved = localStorage.getItem(INBOX_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isFavorite(adId) {
  return getFavoriteIds().includes(adId);
}

async function insertMessageToSupabase(messageRow) {
  const { error } = await supabaseClient
    .from("messages")
    .insert([messageRow]);

  if (error) {
    console.error("Supabase message insert error:", JSON.stringify(error, null, 2));
    throw error;
  }
}

const detailContainer = document.getElementById("detailContainer");
const favoriteBtn = document.getElementById("favoriteBtn");
const shareBtn = document.getElementById("shareBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const relatedAdsContainer = document.getElementById("relatedAdsContainer");
const sellerAdsContainer = document.getElementById("sellerAdsContainer");
const prevNextContainer = document.getElementById("prevNextContainer");
const contactModal = document.getElementById("contactModal");
const closeContactModal = document.getElementById("closeContactModal");
const modalSellerName = document.getElementById("modalSellerName");
const modalSellerPhone = document.getElementById("modalSellerPhone");
const buyerNameInput = document.getElementById("buyerNameInput");
const buyerMessageInput = document.getElementById("buyerMessageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const toastContainer = document.getElementById("toastContainer");
const detailAuthStatus = document.getElementById("detailAuthStatus");

function showToast(message, type = "info") {
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2500);
}

function getSessionUser() {
  const saved = localStorage.getItem(SESSION_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function getCurrentUsername() {
  const sessionUser = getSessionUser();

  if (sessionUser && sessionUser.name) {
    return String(sessionUser.name).trim();
  }

  if (sessionUser && sessionUser.phone) {
    return String(sessionUser.phone).trim();
  }

  return localStorage.getItem(CURRENT_USER_KEY) || "";
}

function isLoggedIn() {
  return Boolean(getCurrentUsername().trim());
}

function requireAuth(message = "Эхлээд нэвтэрнэ үү.") {
  if (isLoggedIn()) return true;

  showToast(message, "error");
  return false;
}

function syncDetailAuthStatus() {
  if (!detailAuthStatus) return;

  const username = getCurrentUsername();
  detailAuthStatus.textContent = username
    ? `Хэрэглэгч: ${username}`
    : "Хэрэглэгч: нэвтрээгүй";
}

function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    if (themeToggleBtn) themeToggleBtn.textContent = "Light mode";
  } else {
    document.body.classList.remove("dark-mode");
    if (themeToggleBtn) themeToggleBtn.textContent = "Dark mode";
  }
}

function toggleTheme() {
  const currentTheme = getSavedTheme();
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, newTheme);
  applyTheme(newTheme);
}

let phoneVisible = false;

function updateFavoriteButton(adId) {
  if (!favoriteBtn) return;

  if (isFavorite(adId)) {
    favoriteBtn.textContent = "❤ Хадгалсан";
  } else {
    favoriteBtn.textContent = "🤍 Хадгалах";
  }
}

function toggleFavorite(adId) {
  if (!requireAuth("Зар хадгалахын тулд нэвтэрнэ үү.")) return;

  const favoriteIds = getFavoriteIds();

  if (favoriteIds.includes(adId)) {
    const updated = favoriteIds.filter((id) => id !== adId);
    saveFavoriteIds(updated);
  } else {
    favoriteIds.push(adId);
    saveFavoriteIds(favoriteIds);
  }

  updateFavoriteButton(adId);
}

async function copyCurrentLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast("Линк хуулагдлаа", "success");
  } catch {
    showToast("Линк хуулах үед алдаа гарлаа", "error");
  }
}

function changeDetailImage(imageSrc) {
  const mainImage = document.getElementById("mainDetailImage");
  if (mainImage) {
    mainImage.src = imageSrc;
  }

  document.querySelectorAll(".detail-thumb").forEach((thumb) => {
    thumb.classList.toggle("active", thumb.getAttribute("src") === imageSrc);
  });
}

function getRelatedImageHTML(ad) {
  const firstImage = Array.isArray(ad.images) && ad.images.length > 0
    ? ad.images[0]
    : "";

  if (firstImage) {
    return `
      <div class="related-image-wrap">
        <img src="${firstImage}" alt="${ad.title}">
      </div>
    `;
  }

  return `
    <div class="related-image-wrap">
      <div class="related-no-image">Зураг байхгүй</div>
    </div>
  `;
}

function renderRelatedAds(currentAd, allAds) {
  if (!relatedAdsContainer) return;

  const currentCategory = String(currentAd.category || "").trim().toLowerCase();

  const relatedAds = allAds.filter((item) => {
    const itemCategory = String(item.category || "").trim().toLowerCase();
    return String(item.id) !== String(currentAd.id) && itemCategory === currentCategory;
  });

  if (relatedAds.length === 0) {
    relatedAdsContainer.innerHTML = `
      <div class="related-section">
        <div class="related-title">Ижил төстэй зарууд</div>
        <div class="not-found">Ижил ангиллын өөр зар олдсонгүй.</div>
      </div>
    `;
    return;
  }

  relatedAdsContainer.innerHTML = `
    <div class="related-section">
      <div class="related-title">Ижил төстэй зарууд</div>
      <div class="related-grid">
        ${relatedAds.slice(0, 3).map((ad) => `
          <div class="related-card">
            <a href="detail.html?id=${ad.id}">
              ${getRelatedImageHTML(ad)}
              <div class="related-content">
                <div class="related-name">${ad.title || "Гарчиггүй зар"}</div>
                <div class="related-price">${formatPrice(ad.price)}</div>
                <div class="related-location">${ad.location || "Байршилгүй"}</div>
              </div>
            </a>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderSellerAds(currentAd, allAds) {
  if (!sellerAdsContainer) return;

  const currentSeller = String(currentAd.seller || "").trim().toLowerCase();

  const sellerAds = allAds.filter((item) => {
    const itemSeller = String(item.seller || "").trim().toLowerCase();
    return String(item.id) !== String(currentAd.id) && itemSeller === currentSeller;
  });

  if (sellerAds.length === 0) {
    sellerAdsContainer.innerHTML = `
      <div class="seller-section">
        <div class="seller-title">Энэ хэрэглэгчийн бусад зарууд</div>
        <div class="not-found">Энэ хэрэглэгч өөр зар оруулаагүй байна.</div>
      </div>
    `;
    return;
  }

  sellerAdsContainer.innerHTML = `
    <div class="seller-section">
      <div class="seller-title">Энэ хэрэглэгчийн бусад зарууд</div>
      <div class="seller-grid">
        ${sellerAds.slice(0, 3).map((ad) => `
          <div class="seller-card">
            <a href="detail.html?id=${ad.id}">
              <div class="seller-image">
                ${Array.isArray(ad.images) && ad.images.length > 0
      ? `<img src="${ad.images[0]}" alt="${ad.title}">`
      : `<div>Зураг байхгүй</div>`}
              </div>
              <div class="seller-content">
                <div class="seller-name">${ad.title || "Гарчиггүй зар"}</div>
                <div class="seller-price">${formatPrice(ad.price)}</div>
              </div>
            </a>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderPrevNextAds(currentAd, allAds) {
  if (!prevNextContainer) return;

  const sortedAds = [...allAds].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const currentIndex = sortedAds.findIndex((item) => String(item.id) === String(currentAd.id));

  if (currentIndex === -1) {
    prevNextContainer.innerHTML = "";
    return;
  }

  const prevAd = currentIndex > 0 ? sortedAds[currentIndex - 1] : null;
  const nextAd = currentIndex < sortedAds.length - 1 ? sortedAds[currentIndex + 1] : null;

  if (!prevAd && !nextAd) {
    prevNextContainer.innerHTML = "";
    return;
  }

  prevNextContainer.innerHTML = `
    <div class="prev-next-box">
      ${prevAd ? `<a class="prev-next-link" href="detail.html?id=${prevAd.id}">← Өмнөх зар</a>` : ""}
      ${nextAd ? `<a class="prev-next-link" href="detail.html?id=${nextAd.id}">Дараагийн зар →</a>` : ""}
    </div>
  `;
}

if (closeContactModal && contactModal) {
  closeContactModal.onclick = function () {
    contactModal.classList.remove("show");
  };
}

if (contactModal) {
  contactModal.addEventListener("click", function (event) {
    if (event.target === contactModal) {
      contactModal.classList.remove("show");
    }
  });
}

if (sendMessageBtn) {
  sendMessageBtn.onclick = async function () {
    if (!requireAuth("Мессеж илгээхийн тулд нэвтэрнэ үү.")) return;

    const buyerName = getCurrentUsername();
    const buyerMessage = buyerMessageInput ? buyerMessageInput.value.trim() : "";
    const currentAdId = getAdIdFromUrl();

    if (!buyerMessage) {
      showToast("Мессежээ бичнэ үү", "error");
      return;
    }

    const ads = await loadAdsFromSupabase();
    const currentAd = ads.find((item) => String(item.id) === String(currentAdId));

    if (!currentAd) {
      showToast("Зар олдсонгүй.", "error");
      return;
    }

    try {
      await insertMessageToSupabase({
        ad_id: currentAd.id,
        ad_title: currentAd.title || "Гарчиггүй зар",
        seller_name: currentAd.seller || "Хэрэглэгч",
        buyer_name: buyerName,
        message: buyerMessage
      });


      showToast("Мессеж амжилттай илгээгдлээ", "success");

      if (contactModal) {
        contactModal.classList.remove("show");
      }

      if (buyerNameInput) buyerNameInput.value = "";
      if (buyerMessageInput) buyerMessageInput.value = "";
    } catch (error) {
      console.error("sendMessageBtn error:", JSON.stringify(error, null, 2));
      showToast(error?.message || "Supabase мессеж илгээхэд алдаа гарлаа.", "error");
    }
  };
}

async function renderAdDetail() {
  syncDetailAuthStatus();

  const adId = getAdIdFromUrl();
  const updatedAds = await increaseViewCount(adId);
  const ad = updatedAds.find((item) => String(item.id) === String(adId));
  const ads = updatedAds;

  phoneVisible = false;

  if (themeToggleBtn) {
    themeToggleBtn.style.display = "inline-block";
    themeToggleBtn.onclick = function () {
      toggleTheme();
    };
  }

  if (!ad) {
    if (favoriteBtn) favoriteBtn.style.display = "none";
    if (shareBtn) shareBtn.style.display = "none";
    if (relatedAdsContainer) relatedAdsContainer.innerHTML = "";
    if (sellerAdsContainer) sellerAdsContainer.innerHTML = "";
    if (prevNextContainer) prevNextContainer.innerHTML = "";

    detailContainer.innerHTML = `
      <div class="not-found">
        <h2>Зар олдсонгүй</h2>
        <p>Энэ зар устсан эсвэл байхгүй байна.</p>
      </div>
    `;
    return;
  }

  if (favoriteBtn) {
    favoriteBtn.style.display = "inline-block";
    updateFavoriteButton(adId);
    favoriteBtn.onclick = function () {
      toggleFavorite(adId);
    };
  }

  if (shareBtn) {
    shareBtn.style.display = "inline-block";
    shareBtn.onclick = function () {
      copyCurrentLink();
    };
  }

  const images = Array.isArray(ad.images) ? ad.images : (ad.image ? [ad.image] : []);
  const mainImage = images[0] || "";
  const specItems = [
    ["Ангилал", ad.category || "Бусад"],
    ["Төрөл", ad.subcategory || "-"],
    ["Статус", ad.status || "Идэвхтэй"],
    ["Байршил", ad.location || "Байршилгүй"],
    ["Зар оруулагч", ad.seller || "Хэрэглэгч"],
    ["Утас", maskPhone(ad.phone)],
    ["Нийтэлсэн", formatDate(ad.createdAt)],
    ["Үзэлт", String(ad.views || 0)],
    ["Зарын ID", String(ad.id)]
  ];

  detailContainer.innerHTML = `
    <div class="detail-topbar">
      <div class="detail-title-box">
        <div class="title">${ad.title || "Гарчиггүй зар"}</div>
        <div class="detail-submeta">
          ${ad.location || "Байршилгүй"}<br>
          Нийтэлсэн: ${formatDate(ad.createdAt)} · Зарын дугаар: ${ad.id}
        </div>
      </div>
    </div>

    <div class="detail-shell">
      <div class="detail-main">
        <div class="detail-card">
          ${mainImage ? `
            <div class="detail-image-wrap">
              ${ad.vip ? `<div class="vip-badge">VIP</div>` : ""}
              <img class="detail-image" id="mainDetailImage" src="${mainImage}" alt="${ad.title}">
            </div>
          ` : `
            <div class="detail-image-wrap">
              <div class="detail-no-image">Зураг байхгүй</div>
            </div>
          `}

          ${images.length ? `
            <div class="detail-thumbnails">
              ${images.map((img, index) => `
                <img
                  src="${img}"
                  alt="thumb-${index}"
                  class="detail-thumb ${index === 0 ? "active" : ""}"
                  onclick="changeDetailImage('${img.replaceAll("'", "\\'")}')"
                >
              `).join("")}
            </div>
          ` : ""}
        </div>

        <div class="detail-actions-inline">
          <button id="showPhoneBtn" class="favorite-btn" style="background:#ff2b1c;">Дугаар харах</button>
          <button id="openContactModalBtn" class="favorite-btn" style="background:#ff2b1c;">Чатлах</button>
        </div>

        <div class="detail-specs">
          <div class="detail-specs-grid">
            ${specItems.map(([label, value]) => `
              <div class="detail-spec-item">
                <div class="detail-spec-label">${label}</div>
                <div class="detail-spec-value">${value}</div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="detail-description-box">
          <div class="detail-description-title">Дэлгэрэнгүй мэдээлэл</div>
          <div class="description">${ad.description || "Тайлбар байхгүй"}</div>
        </div>
      </div>

      <aside class="detail-side">
        <div class="detail-side-card">
          <div class="detail-side-price">
            ${formatPrice(ad.price)}
            <span class="detail-side-location">${ad.location || "УБ хот"}</span>
          </div>

          <button id="sideShowPhoneBtn" class="detail-cta-btn phone">Дугаар харах</button>
          <button id="sideChatBtn" class="detail-cta-btn chat">Чатлах</button>

          <div class="detail-warning">
            Луйвраас үргэлж сэрэмжтэй байгаарай. Баталгаагүй урьдчилгаа бүү шилжүүлээрэй.
          </div>
        </div>

        <div class="detail-side-card">
          <div class="detail-seller-name">${ad.seller || "NNN"}</div>
          <div class="detail-seller-meta">
            Энэ хэрэглэгчийн идэвхтэй заруудыг доороос харж болно.
          </div>
        </div>
      </aside>
    </div>
  `;

  const phoneTextValue = ad.phone || "Утас байхгүй";
  const showPhoneBtn = document.getElementById("showPhoneBtn");
  const sideShowPhoneBtn = document.getElementById("sideShowPhoneBtn");
  const openContactModalBtn = document.getElementById("openContactModalBtn");
  const sideChatBtn = document.getElementById("sideChatBtn");

  function handlePhoneToggle() {
    if (!phoneVisible) {
      showToast(`Утас: ${phoneTextValue}`, "success");
      if (showPhoneBtn) showPhoneBtn.textContent = phoneTextValue;
      if (sideShowPhoneBtn) sideShowPhoneBtn.textContent = phoneTextValue;
      phoneVisible = true;
    } else {
      if (showPhoneBtn) showPhoneBtn.textContent = "Дугаар харах";
      if (sideShowPhoneBtn) sideShowPhoneBtn.textContent = "Дугаар харах";
      phoneVisible = false;
    }
  }

  if (showPhoneBtn) {
    showPhoneBtn.onclick = handlePhoneToggle;
  }

  if (sideShowPhoneBtn) {
    sideShowPhoneBtn.onclick = handlePhoneToggle;
  }

  function openChatModal() {
    if (!requireAuth("Худалдагчтай холбогдохын тулд нэвтэрнэ үү.")) return;

    if (contactModal) {
      contactModal.classList.add("show");
    }

    if (modalSellerName) {
      modalSellerName.textContent = ad.seller || "Хэрэглэгч";
    }

    if (modalSellerPhone) {
      modalSellerPhone.textContent = ad.phone || "Утас байхгүй";
    }

    if (buyerNameInput) {
      buyerNameInput.value = getCurrentUsername();
      buyerNameInput.readOnly = true;
    }

    if (buyerMessageInput) {
      buyerMessageInput.value = `Сайн байна уу, "${ad.title}" зарыг сонирхож байна.`;
    }
  }

  if (openContactModalBtn) {
    openContactModalBtn.onclick = openChatModal;
  }

  if (sideChatBtn) {
    sideChatBtn.onclick = openChatModal;
  }

  renderPrevNextAds(ad, ads);
  renderRelatedAds(ad, ads);
  renderSellerAds(ad, ads);
}

applyTheme(getSavedTheme());
renderAdDetail();
