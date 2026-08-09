document.addEventListener("DOMContentLoaded", () => {

    // 🌟 Backend se EJS ke through aane wala global config use hoga
    const saleConfigMaster = window.backendSaleConfig || { isActive: false, listingsSaleConfig: {} };

    function getListingSaleConfig(listingId) {
        if (!saleConfigMaster.isActive) return null;
        const config = saleConfigMaster.listingsSaleConfig[listingId];
        if (!config) return null;

        // 🌟 Robust date parsing to handle timezone issues correctly
        const startTime = new Date(config.saleStartDateTime).getTime();
        const targetEndTime = startTime + (Number(config.saleDurationHours) * 60 * 60 * 1000);
        const now = Date.now();

        // Debugging ke liye console mein check kar sakte hain
        console.log(`Listing ID: ${listingId} | Now: ${now} | Start: ${startTime} | End: ${targetEndTime} | Active: ${now >= startTime && now <= targetEndTime}`);

        if (now >= startTime && now <= targetEndTime) {
            return { ...config, targetEndTime };
        }
        return null;
    }

    const checkInInput = document.getElementById("checkIn");
    const checkOutInput = document.getElementById("checkOut");
    const buttonPriceSpan = document.getElementById("button-price");
    const basePriceElement = document.getElementById("listing-price");

    const basePrice = basePriceElement ? parseFloat(basePriceElement.innerText) : 0;
    window.finalCalculatedPrice = Math.round(basePrice);

    function getCurrentListingIdFromShowPage() {
        const cartForm = document.querySelector("form[action*='/cart/add/']");
        if (!cartForm) return null;
        const actionUrl = cartForm.getAttribute("action").split("?");
        return actionUrl[0].split("/").pop().trim();
    }

    const currentListingId = getCurrentListingIdFromShowPage();
    const activeItemConfig = currentListingId ? getListingSaleConfig(currentListingId) : null;

    function calculateDiscount(price, config) {
        if (!config || price <= 0) return price;
        let savings = config.discountType === 'percentage' ? price * (config.discountValue / 100) : config.discountValue;
        return Math.max(0, price - savings);
    }

    const badgeLabel = activeItemConfig ? (activeItemConfig.discountType === "percentage" ? `${activeItemConfig.discountValue}% OFF` : `₹${activeItemConfig.discountValue} OFF`) : "";

    // FRONT PAGE OVERLAY BADGE
    function applyDiscountsAndTimersToFrontPage() {
        if (!saleConfigMaster.isActive) return;

        const allLinks = document.querySelectorAll("a");
        allLinks.forEach(link => {
            const urlPath = link.getAttribute("href");
            if (!urlPath || !urlPath.includes("/listings/")) return;

            const parts = urlPath.split("?");
            const pathSegments = parts[0].split("/");
            const listingId = pathSegments.filter(p => p.trim().length > 0).pop().trim();

            const itemConfig = getListingSaleConfig(listingId);
            if (itemConfig) {
                const cardImg = link.querySelector(".card-img-top, img");
                if (cardImg && !link.querySelector('.sale-ribbon-tag')) {
                    const parentDiv = cardImg.parentElement;
                    if (parentDiv) parentDiv.style.position = "relative";

                    const itemBadgeLabel = itemConfig.discountType === "percentage" ? `${itemConfig.discountValue}% OFF` : `₹${itemConfig.discountValue} OFF`;

                    const badgeContainer = document.createElement("div");
                    badgeContainer.className = "sale-ribbon-tag";
                    badgeContainer.dataset.endtime = itemConfig.targetEndTime;
                    badgeContainer.style.cssText = "position: absolute; top: 15px; left: 15px; background-color: rgba(230, 57, 70, 0.95); color: #ffffff; padding: 6px 12px; font-size: 11px; font-weight: bold; border-radius: 4px; z-index: 10; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 2px;";

                    badgeContainer.innerHTML = `
                        <div>💥<i>Discount</i>.. ${itemBadgeLabel}</div>
                        <div class="sale-countdown-clock" style="font-size: 10px; color: #ffe3e3; font-family: monospace;">Loading...</div>
                    `;
                    if (parentDiv) parentDiv.appendChild(badgeContainer);
                }
            }
        });

        const ribbonTags = document.querySelectorAll(".sale-ribbon-tag");
        if (ribbonTags.length === 0) return;

        const timerInterval = setInterval(() => {
            const now = Date.now();
            ribbonTags.forEach(tag => {
                const targetEndTime = parseInt(tag.dataset.endtime);
                const timeRemaining = targetEndTime - now;
                const clock = tag.querySelector(".sale-countdown-clock");

                if (timeRemaining <= 0) {
                    tag.remove();
                    return;
                }

                const hours = String(Math.floor((timeRemaining / (1000 * 60 * 60)) % 24)).padStart(2, '0');
                const minutes = String(Math.floor((timeRemaining / (1000 * 60)) % 60)).padStart(2, '0');
                const seconds = String(Math.floor((timeRemaining / 1000) % 60)).padStart(2, '0');

                if (clock) {
                    clock.innerText = `⏱ ${hours}h ${minutes}m ${seconds}s`;
                }
            });
        }, 1000);
    }

    // SHOW PAGE CONTROLLER DECORATION
    function applyDiscountToShowPageUI() {
        if (!activeItemConfig || basePrice <= 0) return;

        const pricePerDay = calculateDiscount(basePrice, activeItemConfig);
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
        const pricePerDay = activeItemConfig ? calculateDiscount(basePrice, activeItemConfig) : basePrice;

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

        const emptyCheckInHandler = () => {
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

        checkInInput.addEventListener("input", emptyCheckInHandler);
        checkInInput.addEventListener("change", emptyCheckInHandler);
        checkOutInput.addEventListener("change", updateShowPageTotalPrice);
    }
});