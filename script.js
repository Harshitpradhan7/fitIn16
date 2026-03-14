
document.addEventListener('DOMContentLoaded', () => {
    // 1. Intersection Observer for Scroll Animations
    const fadeElements = document.querySelectorAll('.fade-up, .fade-in, .stagger-1, .stagger-2, .stagger-3, .stagger-4');

    // Config for observers
    const appearOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const appearOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            // Add visible class
            entry.target.classList.add('visible');

            // If it's a progress bar, trigger fill
            if (entry.target.querySelector('.progress-bar')) {
                entry.target.querySelector('.progress-bar').classList.add('fill-animation');
            }

            // Stop observing once animated
            observer.unobserve(entry.target);
        });
    }, appearOptions);

    // Start observing elements
    fadeElements.forEach(element => {
        appearOnScroll.observe(element);
    });

    // 2. Form Submission Handling
    const form = document.querySelector('#beta-form');
    const successMessage = document.querySelector('#success-message');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // --- 1. Basic Spam / Double-Submit Prevention ---
            const lastSubTime = localStorage.getItem('fitin16_last_submission');
            if (lastSubTime && (Date.now() - parseInt(lastSubTime) < (5 * 60 * 1000))) {
                alert("You're already on the list! Please check your email and WhatsApp.");
                return;
            }

            const submitBtn = form.querySelector('#submit-btn');

            // Add loading state
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>Saving...</span>';
            submitBtn.style.opacity = '0.8';
            submitBtn.disabled = true;

            try {
                const apiKey = import.meta.env?.SHEETDB_API_KEY;
                const formDataObj = {};
                new URLSearchParams(new FormData(form)).forEach((value, key) => {
                    let cleanedValue = value.trim();
                    // --- 2. Google Sheet Formula Injection Protection ---
                    // Prevent leading characters that trigger executable formulas in Google Sheets
                    if (['=', '+', '-', '@'].includes(cleanedValue.charAt(0))) {
                        cleanedValue = "'" + cleanedValue; // Prepends a quote to force it as string text
                    }
                    formDataObj[key] = cleanedValue;
                });

                // --- Form Validation ---
                if (!formDataObj.name || formDataObj.name.length < 2) {
                    throw new Error("Validation: Please enter a valid name.");
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(formDataObj.email)) {
                    throw new Error("Validation: Please enter a valid email address.");
                }
                const cleanPhone = formDataObj.whatsapp.replace(/[\s-]/g, '');
                if (!/^\+?[0-9]{8,15}$/.test(cleanPhone)) {
                    throw new Error("Validation: Please enter a valid WhatsApp number (8-15 digits), e.g., +1234567890.");
                }

                // --- 3. Profession Dropdown Tampering Check ---
                const validProfessions = ['engineer', 'manager', 'consultant', 'finance', 'startup', 'other'];
                if (!validProfessions.includes(formDataObj.profession)) {
                    throw new Error("Validation: Invalid profession selected.");
                }
                // -----------------------

                // Add date and time to match Google Sheet columns
                const now = new Date();
                formDataObj.date = now.toISOString();
                formDataObj.time = now.toLocaleTimeString();

                const headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                };

                // Only send auth header if the user actually configured an API key
                if (apiKey) {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }

                // SheetDB expects a JSON body with a 'data' array
                const response = await fetch("https://sheetdb.io/api/v1/zndh0qndlbig6", {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({ data: [formDataObj] })
                });

                // Check if SheetDB actually accepted it
                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`API Error ${response.status}: ${errText}`);
                }

                // Remove form, show success message
                form.classList.add('hidden');
                successMessage.classList.remove('hidden');

                // Record timestamp in local storage to prevent duplicate spam
                localStorage.setItem('fitin16_last_submission', Date.now().toString());

                // Redirect to WhatsApp Bot seamlessly
                const waPhone = "15551751595";
                const waText = encodeURIComponent("join");
                window.location.href = `https://wa.me/${waPhone}?text=${waText}`;

                // Reset form in background
                form.reset();
            } catch (error) {
                console.error("Submission failed:", error);
                submitBtn.innerHTML = originalText;
                submitBtn.style.opacity = '1';
                submitBtn.disabled = false;

                if (error.message.startsWith("Validation:")) {
                    alert(error.message.replace("Validation: ", ""));
                } else {
                    alert("Something went wrong. Please try again.");
                }
            }
        });
    }
});
