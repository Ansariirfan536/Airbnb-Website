
(() => {
    'use strict'
    const forms = document.querySelectorAll('.needs-validation')
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault()
                event.stopPropagation()
            }
            form.classList.add('was-validated')
        }, false)
    })
})()

document.addEventListener("DOMContentLoaded", () => {
    const portal = document.getElementById("ai-teacher-portal");
    const trigger = document.getElementById("genius-chat-trigger");
    const closeBtn = document.getElementById("portal-close-trigger");
    const chatInput = document.getElementById("portal-chat-input");
    const sendBtn = document.getElementById("portal-send-trigger");
    const chatBody = document.getElementById("portal-chat-body");
    const avatarPane = document.getElementById("avatar-image-pane");
    const statusLabel = document.getElementById("voice-status-label");

   
    if (trigger && portal) {
        trigger.addEventListener("click", () => portal.classList.add("active"));
    }
    
    if (closeBtn && portal) {
        closeBtn.addEventListener("click", () => {
            portal.classList.remove("active");
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        });
    }

    function speakAILine(textToSpeak, originalUserQuery) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        
        let cleanTxt = textToSpeak.replace(/<\/?[^>]+(>|$)/g, " ");
        const speechUtterance = new SpeechSynthesisUtterance(cleanTxt);
        speechUtterance.lang = /^[a-zA-Z0-9\s,.:?'-]+$/.test(originalUserQuery) ? "en-IN" : "hi-IN";
        
        speechUtterance.onstart = () => {
            if (avatarPane) avatarPane.classList.add("speaking");
            if (statusLabel) statusLabel.innerText = "Irfan's AI is speaking...";
        };
        speechUtterance.onend = () => {
            if (avatarPane) avatarPane.classList.remove("speaking");
            if (statusLabel) statusLabel.innerText = "Irfan's AI Ready";
        };
        window.speechSynthesis.speak(speechUtterance);
    }

    async function processPortalAI() {
        if (!chatInput || !chatBody) return;
        
        const queryText = chatInput.value.trim();
        if (queryText === "") return;

        const uBubble = document.createElement("div");
        uBubble.className = "portal-bubble user-p";
        uBubble.innerText = queryText;
        chatBody.appendChild(uBubble);
        chatInput.value = "";
        
        const lBubble = document.createElement("div");
        lBubble.className = "portal-bubble bot-p";
        lBubble.innerHTML = "<i>Analyzing listings...</i>";
        chatBody.appendChild(lBubble);

        const activeCards = Array.from(document.querySelectorAll('.card, .listing-item'));
        const catalogContext = activeCards.map(c => ({
            title: c.querySelector('.card-title')?.innerText || 'Stay',
            price: c.querySelector('.card-text')?.innerText || 'Price info',
            href: c.querySelector('a')?.href || '#'
        }));

        try {
            const response = await fetch('/api/chat', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: queryText, context: catalogContext })
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            lBubble.innerHTML = data.text ? data.text.replace(/\n/g, "<br>") : "No response text.";
            speakAILine(lBubble.innerText, queryText);
        } catch (error) {
            lBubble.innerText = "Server connection error.";
        }
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    if (sendBtn) {
        sendBtn.addEventListener("click", processPortalAI);
    }
    
    if (chatInput) {
        chatInput.addEventListener("keypress", (e) => { 
            if (e.key === "Enter") processPortalAI(); 
        });
    }
});