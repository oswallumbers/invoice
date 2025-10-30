document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const pinInput = document.getElementById('pin-input');
    const errorMessage = document.getElementById('error-message');

    // --- Set your secret PIN here ---
    const CORRECT_PIN = '1234'; 

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent the form from submitting normally
        
        const enteredPin = pinInput.value;

        if (enteredPin === CORRECT_PIN) {
            // If the PIN is correct, redirect to the main page.
            console.log('Login successful. Redirecting...');
            window.location.href = 'index.html'; 
        } else {
            // If the PIN is incorrect, show an error message.
            errorMessage.textContent = 'Invalid PIN. Please try again.';
            
            // Shake the form for visual feedback
            loginForm.classList.add('animate-shake'); 
            
            // Clear the input after a short delay
            setTimeout(() => {
                pinInput.value = '';
                loginForm.classList.remove('animate-shake'); // Remove shake animation class
            }, 800);
        }
    });

    // Add a simple shake animation using CSS for better user experience
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .animate-shake {
            animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
        }
    `;
    document.head.appendChild(style);
});
