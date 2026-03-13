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

    if (!myName) {
        listEl.innerHTML = `<div class="no-msg">Та нэвтэрч байж мессежээ харна уу.</div>`;
        return;
    }

    loadingEl.style.display = "block";
    listEl.innerHTML = "";

    try {
        // Supabase-ээс мессежийг татахдаа тухайн зарын нэрийг (title) хамт татаж авна
        let query = supabaseClient.from("messages").select(`*, ads(title)`);

        if (currentTab === 'received') {
            query = query.eq("receiver_name", myName);
        } else {
            query = query.eq("sender_name", myName);
        }

        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            listEl.innerHTML = `<div class="no-msg">Танд мессеж байхгүй байна.</div>`;
        } else {
            listEl.innerHTML = data.map(msg => `
                <div class="message-card">
                    <div class="msg-header">
                        <span>${currentTab === 'received' ? 'Илгээгч: ' + msg.sender_name : 'Хүлээн авагч: ' + msg.receiver_name}</span>
                        <span>${new Date(msg.created_at).toLocaleString('mn-MN')}</span>
                    </div>
                    <a href="detail.html?id=${msg.ad_id}" class="msg-title">Зарын нэр: ${msg.ads?.title || "Устсан зар"}</a>
                    <div class="msg-text">${msg.message_text}</div>
                </div>
            `).join("");
        }
    } catch (err) {
        console.error(err);
        listEl.innerHTML = `<div class="no-msg">Алдаа гарлаа: ${err.message}</div>`;
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