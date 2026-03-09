
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
                    formDataObj[key] = value;
                });

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

                // Remove form, show success
                form.classList.add('hidden');
                successMessage.classList.remove('hidden');

                // Alert as requested in raw snippet
                alert("Thanks! You're on the early access list.");
                form.reset();
            } catch (error) {
                console.error("Submission failed:", error);
                submitBtn.innerHTML = originalText;
                submitBtn.style.opacity = '1';
                submitBtn.disabled = false;
                alert("Something went wrong. Please try again.");
            }
        });
    }
});
