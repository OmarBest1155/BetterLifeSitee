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
