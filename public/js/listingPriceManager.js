document.addEventListener("DOMContentLoaded", () => {

    // =========================================================================
    // 1. HARDCODED CONFIGURATION (Aapki perfect chalne wali settings)
    // =========================================================================
    const itemsOnSale = [
        "69ad64276bbf82a43be76746", // Kashmir Stay ID
        "69ad65f66bbf82a43be76768"  // forest resty ID
    ];

    const discountType = "percentage"; 
    const discountValue = 10;          // 10% Discount

    // Aaj ki current date ke hisab se live dynamic timing start sequence
    const saleStartDateTime = "2026-08-08T18:44:00"; 
    const saleDurationHours = 10;                     

    // =========================================================================
    // 2. TIMERS & PRICE CALCULATION ENGINE
    // =========================================================================
    const startTime = new Date(saleStartDateTime).getTime();
    const targetEndTime = startTime + (saleDurationHours * 60 * 60 * 1000);

    function isSaleCurrentlyActive() {
        const now = Date.now();
        return (now >= startTime && now <= targetEndTime);
    }

    const checkInInput = document.getElementById("checkIn");
    const checkOutInput = document.getElementById("checkOut");
    const buttonPriceSpan = document.getElementById("button-price");
    const basePriceElement = document.getElementById("listing-price");

    const basePrice = basePriceElement ? parseFloat(basePriceElement.innerText) : 0;
    
    // Global dynamic currency state register tracker
    window.finalCalculatedPrice = Math.round(basePrice);

    function calculateDiscount(price) {
        if (!isSaleCurrentlyActive() || price <= 0) return price;
        let savings = discountType === 'percentage' ? price * (discountValue / 100) : discountValue;
        return Math.max(0, price - savings);
    }

    const badgeLabel = discountType === "percentage" ? `${discountValue}% OFF` : `₹${discountValue} OFF`;

    // FRONT PAGE OVERLAY BADGE
    function applyDiscountsAndTimersToFrontPage() {
        if (!isSaleCurrentlyActive() || itemsOnSale.length === 0) return;

        const allLinks = document.querySelectorAll("a");
        allLinks.forEach(link => {
            const urlPath = link.getAttribute("href");
            if (!urlPath || !urlPath.includes("/listings/")) return;

            const parts = urlPath.split("?");
            const pathSegments = parts[0].split("/");
            const listingId = pathSegments.filter(p => p.trim().length > 0).pop().trim();

            if (itemsOnSale.includes(listingId)) {
                const cardImg = link.querySelector(".card-img-top, img");
                if (cardImg && !link.querySelector('.sale-ribbon-tag')) {
                    const parentDiv = cardImg.parentElement;
                    if (parentDiv) parentDiv.style.position = "relative";

                    const badgeContainer = document.createElement("div");
                    badgeContainer.className = "sale-ribbon-tag";
                    badgeContainer.style.cssText = "position: absolute; top: 15px; left: 15px; background-color: rgba(230, 57, 70, 0.95); color: #ffffff; padding: 6px 12px; font-size: 11px; font-weight: bold; border-radius: 4px; z-index: 10; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 2px;";

                    badgeContainer.innerHTML = `
                        <div>💥 SALE ${badgeLabel}</div>
                        <div class="sale-countdown-clock" style="font-size: 10px; color: #ffe3e3; font-family: monospace;">Loading...</div>
                    `;
                    if (parentDiv) parentDiv.appendChild(badgeContainer);
                }
            }
        });

        const clockElements = document.querySelectorAll(".sale-countdown-clock");
        if (clockElements.length === 0) return;

        const timerInterval = setInterval(() => {
            const now = Date.now();
            const timeRemaining = targetEndTime - now;

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                document.querySelectorAll(".sale-ribbon-tag").forEach(el => el.remove());
                return;
            }

            const hours = String(Math.floor((timeRemaining / (1000 * 60 * 60)) % 24)).padStart(2, '0');
            const minutes = String(Math.floor((timeRemaining / (1000 * 60)) % 60)).padStart(2, '0');
            const seconds = String(Math.floor((timeRemaining / 1000) % 60)).padStart(2, '0');

            clockElements.forEach(clock => {
                clock.innerText = `⏱ ${hours}h ${minutes}m ${seconds}s`;
            });
        }, 1000);
    }

    // SHOW PAGE CONTROLLER DECORATION
    function getCurrentListingIdFromShowPage() {
        const cartForm = document.querySelector("form[action*='/cart/add/']");
        if (!cartForm) return null;
        const actionUrl = cartForm.getAttribute("action").split("?");
        return actionUrl[0].split("/").pop().trim();
    }

    function isCurrentItemOnSale() {
        const currentId = getCurrentListingIdFromShowPage();
        return currentId ? (itemsOnSale.includes(currentId) && isSaleCurrentlyActive()) : false;
    }

    function applyDiscountToShowPageUI() {
        if (!isCurrentItemOnSale() || basePrice <= 0) return;

        const pricePerDay = calculateDiscount(basePrice);
        const paragraphs = document.querySelectorAll("p");
        
        paragraphs.forEach(p => {
            if (p.textContent.includes("/ day") && p.textContent.includes("₹")) {
                p.innerHTML = `
                    <span style="text-decoration: line-through; color: gray;">₹ ${basePrice.toLocaleString("en-IN")}</span>
                    <strong style="color: green; margin-left: 10px;">₹ ${Math.round(pricePerDay).toLocaleString("en-IN")}</strong> / day
                    <span style="background-color: #28a745; color: white; padding: 3px 8px; font-size: 12px; font-weight: bold; border-radius: 4px; margin-left: 10px; display: inline-block; vertical-align: middle;">
                        ${badgeLabel} (⏱ Live Sale)
                    </span>
                `;
            }
        });
    }

    function getLocalDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function updateShowPageTotalPrice() {
        const pricePerDay = isCurrentItemOnSale() ? calculateDiscount(basePrice) : basePrice;

        if (checkInInput && checkOutInput && checkInInput.value && checkOutInput.value) {
            const checkInDate = new Date(checkInInput.value);
            const checkOutDate = new Date(checkOutInput.value);

            if (checkOutDate > checkInDate) {
                const totalNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24));
                window.finalCalculatedPrice = Math.round(pricePerDay * totalNights);
                if (buttonPriceSpan) buttonPriceSpan.innerText = window.finalCalculatedPrice.toLocaleString("en-IN") + ` (${totalNights})`;
                return;
            }
        }
        
        window.finalCalculatedPrice = Math.round(pricePerDay);
        if (buttonPriceSpan) buttonPriceSpan.innerText = window.finalCalculatedPrice.toLocaleString("en-IN");
    }

    applyDiscountsAndTimersToFrontPage();

    if (checkInInput && checkOutInput) {
        applyDiscountToShowPageUI();
        updateShowPageTotalPrice();

        const todayStr = getLocalDateString(new Date());
        checkInInput.min = todayStr;

        const handleCheckInChange = () => {
            if (checkInInput.value) {
                checkOutInput.removeAttribute("disabled");
                checkOutInput.disabled = false;
                
                const nextDay = new Date(checkInInput.value);
                nextDay.setDate(nextDay.getDate() + 1);
                checkOutInput.min = getLocalDateString(nextDay);
                
                if (checkOutInput.value && checkOutInput.value <= checkInInput.value) {
                    checkOutInput.value = "";
                }
            } else {
                checkOutInput.setAttribute("disabled", "true");
                checkOutInput.disabled = true;
                checkOutInput.value = "";
            }
            updateShowPageTotalPrice();
        };

        checkInInput.addEventListener("input", handleCheckInChange);
        checkInInput.addEventListener("change", handleCheckInChange);
        checkOutInput.addEventListener("change", updateShowPageTotalPrice);
    }
});
