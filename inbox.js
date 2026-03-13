const SUPABASE_URL = "https://dtxrbjppxyggjkpybdcu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YGhtBnurAg3otWaBMXKjvQ_TQRQkvc9";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Нэвтэрсэн хэрэглэгчийн нэрийг авах
function getCurrentUsername() {
    const saved = localStorage.getItem("bh_session_user");
    if (!saved) return "";
    try {
        const user = JSON.parse(saved);
        return (user.name || user.phone || "").trim();
    } catch { return ""; }
}

let currentTab = 'received';

async function loadMessages() {
    const myName = getCurrentUsername();
    const listEl = document.getElementById("messageList");
    const loadingEl = document.getElementById("loading");

    if (!myName) {
        listEl.innerHTML = `<div class="no-msg">Та нэвтрээгүй байна.</div>`;
        return;
    }

    loadingEl.style.display = "block";
    listEl.innerHTML = "";

    try {
        // Одоохондоо шүүлтүүр хийхгүйгээр БҮХ мессежийг татаж туршъя
        const { data, error } = await supabaseClient
            .from("messages")
            .select(`*, ads(title)`)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Зөвхөн надад хамаатайг нь шүүх
        const myMessages = data.filter(msg => {
            if (currentTab === 'received') {
                return msg.receiver_name === myName;
            } else {
                return msg.sender_name === myName;
            }
        });

        if (myMessages.length === 0) {
            listEl.innerHTML = `<div class="no-msg">Танд мессеж олдсонгүй. <br> <small>Нэр: ${myName}</small></div>`;
        } else {
            listEl.innerHTML = myMessages.map(msg => `
                <div class="message-card">
                    <div class="msg-header">
                        <span>${currentTab === 'received' ? 'Хэнээс: ' + msg.sender_name : 'Хэнд: ' + msg.receiver_name}</span>
                        <span>${new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <div class="msg-title">Зар: ${msg.ads?.title || "Гарчиггүй"}</div>
                    <div class="msg-text">${msg.message_text}</div>
                </div>
            `).join("");
        }
    } catch (err) {
        console.error(err);
        listEl.innerHTML = `<div class="no-msg">Алдаа гарлаа.</div>`;
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

loadMessages();