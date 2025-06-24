window.addEventListener('load', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('hide-loading');
        
        setTimeout(() => {
            loadingScreen.remove();
            window.location.href = 'auth.html';
        }, 500);
    }, 7000);
});

document.addEventListener('DOMContentLoaded', () => {
    // Create update screen
    const updateScreen = document.createElement('div');
    updateScreen.id = 'update-screen';

    // Create gradient background
    const gradientBg = document.createElement('div');
    gradientBg.className = 'gradient-bg';
    updateScreen.appendChild(gradientBg);

    // Create particles container
    const particles = document.createElement('div');
    particles.className = 'particles';
    updateScreen.appendChild(particles);

    // Add particles
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 6}s`;
        particles.appendChild(particle);
    }

    // Create bubbles
    for (let i = 0; i < 15; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.style.setProperty('--left', `${Math.random() * 100}%`);
        bubble.style.setProperty('--duration', `${4 + Math.random() * 4}s`);
        bubble.style.width = `${20 + Math.random() * 30}px`;
        bubble.style.height = bubble.style.width;
        bubble.style.animationDelay = `${Math.random() * 2}s`;
        updateScreen.appendChild(bubble);
    }

    // Create title
    const title = document.createElement('div');
    title.className = 'update-title';
    title.textContent = 'New Update';
    updateScreen.appendChild(title);

    // Create version
    const version = document.createElement('div');
    version.className = 'update-version';
    version.textContent = 'Update 3';
    updateScreen.appendChild(version);

    // Add to body
    document.body.appendChild(updateScreen);

    // Remove after animation
    setTimeout(() => {
        updateScreen.classList.add('fade-out');
        setTimeout(() => {
            updateScreen.remove();
        }, 800);
    }, 3000);
});
