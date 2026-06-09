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

    trigger.addEventListener("click", () => portal.classList.add("active"));
    closeBtn.addEventListener("click", () => {
        portal.classList.remove("active");
        window.speechSynthesis.cancel();
    });

    function speakAILine(textToSpeak, originalUserQuery) {
        window.speechSynthesis.cancel();
        let cleanTxt = textToSpeak.replace(/<\/?[^>]+(>|$)/g, " ");
        
        const speechUtterance = new SpeechSynthesisUtterance(cleanTxt);
        speechUtterance.lang = /^[a-zA-Z0-9\s,.:?'-]+$/.test(originalUserQuery) ? "en-IN" : "hi-IN";
        
        speechUtterance.onstart = () => {
            avatarPane.classList.add("speaking");
            statusLabel.innerText = "Irfan's AI is speaking...";
        };
        speechUtterance.onend = () => {
            avatarPane.classList.remove("speaking");
            statusLabel.innerText = "Irfan's AI Ready";
        };
        window.speechSynthesis.speak(speechUtterance);
    }

    async function processPortalAI() {
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

            const data = await response.json();
            lBubble.innerHTML = data.text.replace(/\n/g, "<br>");
            speakAILine(lBubble.innerText, queryText);
        } catch (error) {
            lBubble.innerText = "Server connection error.";
        }
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    sendBtn.addEventListener("click", processPortalAI);
    chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") processPortalAI(); });
});