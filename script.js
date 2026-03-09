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
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('#submit-btn');
            
            // Add loading state
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>Saving...</span>';
            submitBtn.style.opacity = '0.8';
            submitBtn.disabled = true;
            
            // Simulate network request (In real app, fetch/axios to API/Google Sheets)
            setTimeout(() => {
                // Remove form, show success
                form.classList.add('hidden');
                successMessage.classList.remove('hidden');
                
                // Add analytics event mock
                console.log('Event: Sign Up Form Submitted');
                console.log({
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    whatsapp: document.getElementById('whatsapp').value,
                    profession: document.getElementById('profession').value
                });
                
            }, 1200);
        });
    }
});
