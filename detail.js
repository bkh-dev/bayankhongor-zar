/**
 * BAYANKHONGOR.MN - Detail Page JavaScript
 * Gemini AI-аар сайжруулав.
 */

// --- ТОГТМОЛ УТГУУД ---
const ADS_KEY = "bh_ads";
const FAVORITES_KEY = "bh_favorites";
const THEME_KEY = "bh_theme";
const INBOX_KEY = "bayankhongor_inbox_messages";
const SESSION_KEY = "bh_session_user";
const CURRENT_USER_KEY = "bh_current_user";

const SUPABASE_URL = "https://dtxrbjppxyggjkpybdcu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YGhtBnurAg3otWaBMXKjvQ_TQRQkvc9";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ЭЛЕМЕНТҮҮД ---
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

// --- ТУСЛАХ ФУНКЦҮҮД ---
function normalizePrice(value) {
  return Number(String(value || "").replaceAll(",", "").replaceAll("₮", "").trim()) || 0;
}

function formatPrice(value) {
  return normalizePrice(value).toLocaleString("en-US") + "₮";
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Огноо байхгүй";
  return date.toLocaleDateString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function maskPhone(phone) {
  const value = String(phone || "").trim();
  return value.length < 4 ? "Утас байхгүй" : value.slice(0, 4) + "****";
}

function getAdIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function showToast(message, type = "info") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// --- ХЭРЭГЛЭГЧИЙН ХЭСЭГ ---
function getSessionUser() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function getCurrentUsername() {
  const sessionUser = getSessionUser();
  if (sessionUser?.name) return String(sessionUser.name).trim();
  if (sessionUser?.phone) return String(sessionUser.phone).trim();
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
  detailAuthStatus.textContent = username ? `Хэрэглэгч: ${username}` : "Хэрэглэгч: нэвтрээгүй";
}

// --- ХАДГАЛСАН ЗАРУУД (FAVORITES) ---
function getFavoriteIds() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch { return []; }
}

function toggleFavorite(adId) {
  if (!requireAuth("Зар хадгалахын тулд нэвтэрнэ үү.")) return;
  let favoriteIds = getFavoriteIds();
  if (favoriteIds.includes(adId)) {
    favoriteIds = favoriteIds.filter(id => id !== adId);
  } else {
    favoriteIds.push(adId);
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
  updateFavoriteButton(adId);
}

function updateFavoriteButton(adId) {
  if (!favoriteBtn) return;
  favoriteBtn.textContent = getFavoriteIds().includes(adId) ? "❤ Хадгалсан" : "🤍 Хадгалах";
}

// --- ЗУРАГ СОЛИХ ---
window.changeDetailImage = function (imageSrc) {
  const mainImage = document.getElementById("mainDetailImage");
  if (mainImage) mainImage.src = imageSrc;
  document.querySelectorAll(".detail-thumb").forEach(thumb => {
    thumb.classList.toggle("active", thumb.getAttribute("src") === imageSrc);
  });
};

// --- ҮНДСЭН FUNCTIONS ---
async function renderAdDetail() {
  syncDetailAuthStatus();
  const adId = getAdIdFromUrl();
  if (!adId) {
    showNotFound();
    return;
  }

  detailContainer.innerHTML = `<div class="not-found"><p>Ачаалж байна...</p></div>`;

  try {
    // 1. Бүх зарыг татах
    const { data: allAdsRaw, error: allAdsError } = await supabaseClient
      .from("ads")
      .select("*")
      .order("created_at", { ascending: false });

    if (allAdsError) throw allAdsError;

    const allAds = (allAdsRaw || []).map(a => ({
      id: a.id,
      title: a.title || "Гарчиггүй зар",
      price: Number(a.price || 0),
      location: a.location || "Байршилгүй",
      category: a.category || "Бусад",
      subcategory: a.subcategory || "",
      description: a.description || "Тайлбар байхгүй",
      seller: a.seller_name || "Хэрэглэгч",
      phone: a.seller_phone || "",
      status: a.status || "Идэвхтэй",
      vip: Boolean(a.vip),
      views: Number(a.views || 0),
      createdAt: a.created_at,
      images: Array.isArray(a.images) ? a.images : []
    }));

    const ad = allAds.find(item => String(item.id) === String(adId));
    if (!ad) {
      showNotFound();
      return;
    }

    // 2. Үзэлт нэмэх
    await supabaseClient.from("ads").update({ views: ad.views + 1 }).eq("id", ad.id);

    // 3. Контент гаргах
    renderMainContent(ad);
    renderPrevNextAds(ad, allAds);
    renderRelatedAds(ad, allAds);
    renderSellerAds(ad, allAds);

    // 4. Listeners тохируулах
    setupEventListeners(ad);

  } catch (err) {
    console.error("Fetch Error:", err);
    showNotFound("Алдаа гарлаа. Дахин оролдоно уу.");
  }
}

function renderMainContent(ad) {
  const images = ad.images.length > 0 ? ad.images : [];
  const mainImage = images[0] || "";

  const specItems = [
    ["Ангилал", ad.category],
    ["Төрөл", ad.subcategory || "-"],
    ["Статус", ad.status],
    ["Байршил", ad.location],
    ["Зар оруулагч", ad.seller],
    ["Утас", maskPhone(ad.phone)],
    ["Нийтэлсэн", formatDate(ad.createdAt)],
    ["Үзэлт", ad.views + 1],
    ["ID", ad.id]
  ];

  detailContainer.innerHTML = `
        <div class="detail-topbar">
            <div class="detail-title-box">
                <h1 class="title">${ad.title}</h1>
                <div class="detail-submeta">${ad.location} · ${formatDate(ad.createdAt)}</div>
            </div>
        </div>
        <div class="detail-shell">
            <div class="detail-main">
                <div class="detail-card">
                    <div class="detail-image-wrap">
                        ${ad.vip ? '<div class="vip-badge">VIP</div>' : ''}
                        ${mainImage ? `<img class="detail-image" id="mainDetailImage" src="${mainImage}">` : '<div class="detail-no-image">Зураг байхгүй</div>'}
                    </div>
                    ${images.length > 1 ? `
                        <div class="detail-thumbnails">
                            ${images.map((img, i) => `<img src="${img}" class="detail-thumb ${i === 0 ? 'active' : ''}" onclick="changeDetailImage('${img}')">`).join("")}
                        </div>
                    ` : ""}
                </div>
                <div class="detail-actions-inline">
                    <button id="showPhoneBtn" class="favorite-btn" style="background:#ff2b1c;">Дугаар харах</button>
                    <button id="openContactModalBtn" class="favorite-btn" style="background:#2563eb;">Чатлах</button>
                </div>
                <div class="detail-specs">
                    <div class="detail-specs-grid">
                        ${specItems.map(([l, v]) => `<div class="detail-spec-item"><div class="detail-spec-label">${l}</div><div class="detail-spec-value">${v}</div></div>`).join("")}
                    </div>
                </div>
                <div class="detail-description-box">
                    <div class="detail-description-title">Тайлбар</div>
                    <div class="description">${ad.description.replace(/\n/g, '<br>')}</div>
                </div>
            </div>
            <aside class="detail-side">
                <div class="detail-side-card">
                    <div class="detail-side-price">${formatPrice(ad.price)}</div>
                    <button id="sideShowPhoneBtn" class="detail-cta-btn phone">Дугаар харах</button>
                    <button id="sideChatBtn" class="detail-cta-btn chat" style="background:#2563eb;">Чатлах</button>
                    <div class="detail-warning">⚠️ Урьдчилгаа мөнгө бүү шилжүүлээрэй!</div>
                </div>
                <div class="detail-side-card">
                    <div class="detail-seller-name">${ad.seller}</div>
                    <div class="detail-seller-meta">Энэ хэрэглэгчийн бусад зарууд доор харагдаж байна.</div>
                </div>
            </aside>
        </div>
    `;
}

function setupEventListeners(ad) {
  let phoneHidden = true;
  const phoneNum = ad.phone || "Утас байхгүй";

  const handlePhone = () => {
    if (phoneHidden && ad.phone) {
      document.querySelectorAll("#showPhoneBtn, #sideShowPhoneBtn").forEach(btn => {
        btn.innerHTML = `📞 <a href="tel:${phoneNum}" style="color:white; text-decoration:none">${phoneNum}</a>`;
      });
      phoneHidden = false;
    } else if (!ad.phone) {
      showToast("Утасны дугаар бүртгэгдээгүй байна", "error");
    }
  };

  if (document.getElementById("showPhoneBtn")) document.getElementById("showPhoneBtn").onclick = handlePhone;
  if (document.getElementById("sideShowPhoneBtn")) document.getElementById("sideShowPhoneBtn").onclick = handlePhone;

  const openChat = () => {
    if (!requireAuth()) return;
    contactModal.classList.add("show");
    modalSellerName.textContent = ad.seller;
    modalSellerPhone.textContent = ad.phone;
    buyerNameInput.value = getCurrentUsername();
    buyerMessageInput.value = `Сайн байна уу, "${ad.title}" зарыг сонирхож байна.`;
  };

  if (document.getElementById("openContactModalBtn")) document.getElementById("openContactModalBtn").onclick = openChat;
  if (document.getElementById("sideChatBtn")) document.getElementById("sideChatBtn").onclick = openChat;

  if (favoriteBtn) {
    updateFavoriteButton(ad.id);
    favoriteBtn.onclick = () => toggleFavorite(ad.id);
  }
  if (shareBtn) shareBtn.onclick = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Линк хуулагдлаа", "success");
  };
  if (themeToggleBtn) themeToggleBtn.onclick = toggleTheme;
}

// --- RELATED & OTHER ADS ---
function renderRelatedAds(currentAd, allAds) {
  if (!relatedAdsContainer) return;
  const related = allAds.filter(a => a.category === currentAd.category && a.id !== currentAd.id).slice(0, 3);
  relatedAdsContainer.innerHTML = `<div class="related-section"><div class="related-title">Ижил төстэй зарууд</div><div class="related-grid">${related.length ? related.map(ad => `
        <div class="related-card"><a href="detail.html?id=${ad.id}">
            <div class="related-image-wrap">${ad.images[0] ? `<img src="${ad.images[0]}">` : 'Зураггүй'}</div>
            <div class="related-content">
                <div class="related-name">${ad.title}</div>
                <div class="related-price">${formatPrice(ad.price)}</div>
            </div>
        </a></div>`).join("") : "Олдсонгүй"}</div></div>`;
}

function renderSellerAds(currentAd, allAds) {
  if (!sellerAdsContainer) return;
  const others = allAds.filter(a => a.seller === currentAd.seller && a.id !== currentAd.id).slice(0, 3);
  sellerAdsContainer.innerHTML = `<div class="seller-section"><div class="seller-title">Энэ хэрэглэгчийн бусад зарууд</div><div class="seller-grid">${others.length ? others.map(ad => `
        <div class="seller-card"><a href="detail.html?id=${ad.id}">
            <div class="seller-image">${ad.images[0] ? `<img src="${ad.images[0]}">` : 'Зураггүй'}</div>
            <div class="seller-content">
                <div class="seller-name">${ad.title}</div>
                <div class="seller-price">${formatPrice(ad.price)}</div>
            </div>
        </a></div>`).join("") : "Өөр зар байхгүй"}</div></div>`;
}

function renderPrevNextAds(currentAd, allAds) {
  if (!prevNextContainer) return;
  const sorted = [...allAds].sort((a, b) => Number(a.id) - Number(b.id));
  const idx = sorted.findIndex(a => String(a.id) === String(currentAd.id));
  const prev = sorted[idx - 1], next = sorted[idx + 1];
  prevNextContainer.innerHTML = `<div class="prev-next-box">
        ${prev ? `<a href="detail.html?id=${prev.id}">← Өмнөх</a>` : ""}
        ${next ? `<a href="detail.html?id=${next.id}">Дараагийн →</a>` : ""}
    </div>`;
}

// --- THEME & UTILS ---
function getSavedTheme() { return localStorage.getItem(THEME_KEY) || "light"; }
function applyTheme(theme) {
  document.body.classList.toggle("dark-mode", theme === "dark");
  if (themeToggleBtn) themeToggleBtn.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
}
function toggleTheme() {
  const newTheme = getSavedTheme() === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, newTheme);
  applyTheme(newTheme);
}

function showNotFound(msg = "Зар олдсонгүй") {
  detailContainer.innerHTML = `<div class="not-found"><h2>${msg}</h2><p>Энэ зар устсан эсвэл байхгүй байна.</p><a href="index.html">Нүүр хуудас руу буцах</a></div>`;
}

// --- CONTACT MODAL ---
if (closeContactModal) closeContactModal.onclick = () => contactModal.classList.remove("show");
window.onclick = (e) => { if (e.target === contactModal) contactModal.classList.remove("show"); };

if (sendMessageBtn) {
  sendMessageBtn.onclick = async function () {
    if (!requireAuth("Мессеж илгээхийн тулд нэвтэрнэ үү.")) return;

    const msgText = buyerMessageInput ? buyerMessageInput.value.trim() : "";
    if (!msgText) {
      showToast("Мессежээ бичнэ үү", "error");
      return;
    }

    // Зарын мэдээллийг авах (Худалдагчийн нэр хэрэгтэй)
    const adId = getAdIdFromUrl();

    // Түр хүлээлгэх төлөв
    sendMessageBtn.disabled = true;
    sendMessageBtn.textContent = "Илгээж байна...";

    try {
      // 1. Одоогийн зарын мэдээллийг дахин шалгаж худалдагчийн нэрийг авах
      const { data: adData } = await supabaseClient
        .from("ads")
        .select("seller_name")
        .eq("id", adId)
        .single();

      // 2. Supabase-рүү мессежийг илгээх
      const { error } = await supabaseClient
        .from("messages")
        .insert([{
          ad_id: adId,
          sender_name: getCurrentUsername(),
          receiver_name: adData?.seller_name || "Хэрэглэгч",
          message_text: msgText
        }]);

      if (error) throw error;

      showToast("Мессеж амжилттай илгээгдлээ", "success");

      // Модалыг хаах, цэвэрлэх
      if (contactModal) contactModal.classList.remove("show");
      if (buyerMessageInput) buyerMessageInput.value = "";

    } catch (error) {
      console.error("Message error:", error);
      showToast("Мессеж илгээхэд алдаа гарлаа", "error");
    } finally {
      sendMessageBtn.disabled = false;
      sendMessageBtn.textContent = "Илгээх";
    }
  };
}

// ЭХЛҮҮЛЭХ
applyTheme(getSavedTheme());
renderAdDetail();