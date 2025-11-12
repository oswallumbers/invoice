// settings.js

// Firebase Configuration - MUST BE THE SAME AS IN index.html
const firebaseConfig = {
    apiKey: "AIzaSyB3kV13liQQRDX28l4ZaVAWbwfxJquI_Lw",
    authDomain: "export-oswal.firebaseapp.com",
    projectId: "export-oswal",
    storageBucket: "export-oswal.appspot.com",
    messagingSenderId: "838014812507",
    appId: "1:838014812507:web:135be4e953435a25019a7e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const displayNameInput = document.getElementById('displayName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const departmentInput = document.getElementById('department');
const saveProfileBtn = document.getElementById('saveProfileBtn');

let currentUserId = null;

// This function runs when the page loads
window.onload = function() {
    // 1. Get the logged-in user's ID from localStorage
    currentUserId = localStorage.getItem('userId');
    
    if (!currentUserId) {
        // If no user is logged in, redirect to the login page
        alert('You are not logged in!');
        window.location.href = 'index.html';
        return;
    }
    
    // 2. Fetch the user's data from Firestore
    loadUserProfile();
};

// Function to load user data into the form
async function loadUserProfile() {
    try {
        const userDoc = await db.collection('users').doc(currentUserId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            // Populate the form fields with data from Firestore
            displayNameInput.value = userData.displayName || '';
            emailInput.value = userData.email || '';
            phoneInput.value = userData.phone || '';
            departmentInput.value = userData.department || '';
        } else {
            console.error('User document not found!');
            alert('Could not find your user profile.');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Failed to load your profile data.');
    }
}

// Event listener for the save button
saveProfileBtn.addEventListener('click', async () => {
    // Get the new values from the form
    const updatedData = {
        displayName: displayNameInput.value,
        email: emailInput.value,
        phone: phoneInput.value,
        department: departmentInput.value
    };

    try {
        // Update the document in Firestore
        await db.collection('users').doc(currentUserId).update(updatedData);
        
        // Also update the username in localStorage for the dashboard header
        localStorage.setItem('userName', updatedData.displayName);

        alert('Profile updated successfully!');
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile. Please try again.');
    }
});