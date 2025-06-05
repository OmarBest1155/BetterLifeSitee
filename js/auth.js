import { createUserWithEmailAndPassword, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from './firebase-config.js';

function showNotification(elementId, message, type) {
    const notification = document.getElementById(elementId);
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    if (type === 'error') {
        notification.classList.add('shake');
        setTimeout(() => notification.classList.remove('shake'), 500);
    }
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Check for remembered user
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
        const { email, password } = JSON.parse(rememberedUser);
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                window.location.href = 'betterlife.html';
            })
            .catch(() => {
                localStorage.removeItem('rememberedUser');
            });
    }

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const switchLinks = document.querySelectorAll('.switch-link');

    switchLinks.forEach(link => {
        link.addEventListener('click', () => {
            loginForm.classList.toggle('active');
            signupForm.classList.toggle('active');
        });
    });

    signupForm.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.querySelector('#signup-name').value;
        const email = document.querySelector('#signup-email').value;
        const password = document.querySelector('#signup-password');
        const confirmPassword = document.querySelector('#signup-confirm-password');

        if (password.value !== confirmPassword.value) {
            // Add error class to trigger animation
            password.classList.add('error');
            confirmPassword.classList.add('error');

            // Remove error class after animation completes
            setTimeout(() => {
                password.classList.remove('error');
                confirmPassword.classList.remove('error');
            }, 500);
            return;
        }
    });

    // Signup form handler
    const signupFormElement = document.getElementById('signup-form-element');
    signupFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;

        if (password !== confirmPassword) {
            showNotification('signup-notification', "Passwords don't match!", 'error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            showNotification('signup-notification', 'Account created successfully!', 'success');
            setTimeout(() => {
                loginForm.classList.add('active');
                signupForm.classList.remove('active');
            }, 1500);
        } catch (error) {
            let errorMessage = error.message;
            if (error.code === 'auth/weak-password') {
                errorMessage = 'Password Must Be Atleast 6 Characters!';
            }
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email Must Be Valid!';
            }
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Email Already In Use!';
            }
            showNotification('signup-notification', errorMessage, 'error');
        }
    });

    // Login form handler
    const loginFormElement = document.getElementById('login-form-element');
    loginFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        try {
            // Set persistence based on remember me
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // Store account info
            const userId = userCredential.user.uid;
            const accountData = {
                email: email,
                password: password
            };
            localStorage.setItem(`account_${userId}`, JSON.stringify(accountData));

            showNotification('login-notification', 'Logged in successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'betterlife.html';
            }, 1500);
        } catch (error) {
            let errorMessage = error.message;
            if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Wrong Email or Password!';
            }
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email Must Be Valid!';
            }
            showNotification('login-notification', errorMessage, 'error');
        }
    });
});
