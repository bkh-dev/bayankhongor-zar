// --- ТОХИРГОО ---
const SUPABASE_URL = "https://dtxrbjppxyggjkpybdcu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YGhtBnurAg3otWaBMXKjvQ_TQRQkvc9";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SESSION_KEY = "bh_session_user";

function getCurrentUsername() {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return "";
    try {
        const user = JSON.parse(saved);
        return user.name || user.phone || "";
    } catch { return ""; }
}

let currentTab = 'received';

async function loadMessages() {
    const myName = getCurrentUsername();
    const listEl = document.getElementById("messageList");
    const loadingEl = document.getElementById("loading");

    // ШАЛГАХ 1: Таны нэвтэрсэн нэр юу байна?
    console.log("Миний нэр (localStorage-аас):", myName);

    if (!myName) {
        listEl.innerHTML = `<div class="no-msg">Та нэвтрээгүй байна. LocalStorage шалгана уу.</div>`;
        return;
    }

    loadingEl.style.display = "block";

    try {
        // ШАЛГАХ 2: Эхлээд шүүлтүүргүйгээр бүх мессежийг татаж үзэх
        console.log("Supabase-ээс өгөгдөл татаж байна...");
        let { data, error } = await supabaseClient
            .from("messages")
            .select(`*, ads(title)`);

        if (error) throw error;

        console.log("Нийт олдсон мессежүүд (бүх хэрэглэгчийн):", data);

        // ШАЛГАХ 3: Таны нэрээр шүүх (Гар аргаар)
        const myMessages = data.filter(msg => {
            if (currentTab === 'received') {
                return String(msg.receiver_name).trim() === String(myName).trim();
            } else {
                return String(msg.sender_name).trim() === String(myName).trim();
            }
        });

        console.log("Шүүж дууссаны дараах мессежүүд:", myMessages);

        if (myMessages.length === 0) {
            listEl.innerHTML = `<div class="no-msg">
                Танд мессеж олдсонгүй.<br>
                <small>Таны нэр: "${myName}"</small><br>
                <small>Supabase-д байгаа нэрүүдтэй таарахгүй байна.</small>
            </div>`;
        } else {
            listEl.innerHTML = myMessages.map(msg => `
                <div class="message-card">
                    <div class="msg-header">
                        <span>${currentTab === 'received' ? 'Хэнээс: ' + msg.sender_name : 'Хэнд: ' + msg.receiver_name}</span>
                        <span>${new Date(msg.created_at).toLocaleString('mn-MN')}</span>
                    </div>
                    <div class="msg-title">Зарын нэр: ${msg.ads?.title || "Гарчиггүй зар"}</div>
                    <div class="msg-text">${msg.message_text}</div>
                </div>
            `).join("");
        }
    } catch (err) {
        console.error("Алдаа гарлаа:", err);
        listEl.innerHTML = `<div class="no-msg">Алдаа: ${err.message}</div>`;
    } finally {
        loadingEl.style.display = "none";
    }
}

function switchTab(tab) {
    currentTab = tab;
    document.getElementById("receivedBtn").classList.toggle("active", tab === 'received');
    document.getElementById("sentBtn").classList.toggle("active", tab === 'sent');
    loadMessages();
}

// Хуудас нээгдэхэд ажиллуулах
loadMessages();
if (currentTab === 'received' && data.length > 0) {
    // Надад ирсэн бүх уншаагүй мессежүүдийг "Уншсан" болгох
    await supabaseClient
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_name', myName)
        .eq('is_read', false);
}