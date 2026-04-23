/**
 * Handles user login using Spring Security form login.
 * Sends credentials to /login endpoint.
 */

function switchTab(tab, btn) {
      // panels
      document.getElementById('auth-signin').classList.toggle('active', tab === 'signin');
      document.getElementById('auth-signup').classList.toggle('active', tab === 'signup');
      // tab buttons
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
    }
    
async function login() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const text = await response.text();
        console.log("Server response:", text);

        if (text === "LOGIN_SUCCESS_HOSPITAL") {
            window.location.href = "../hospital/hospital-dashboard.html";
        } else if (text === "LOGIN_SUCCESS_ADMIN") {
            window.location.href = "../admin/admin_dashboard.html";
        } else if (text === "LOGIN_SUCCESS_STAFF") {
            window.location.href = "../admin/admin_dashboard.html";
        } else if (text === "LOGIN_FAILED") {
            alert("Invalid email or password!");
        } else {
            alert("Something went wrong. Please try again.");
        }

    } catch (error) {
        console.error("Login error:", error);
        alert("Network error. Please check your connection.");
    }
}
 

function registerUser() {
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
    })
    .then(response => response.json())
    .then(data => {
        showPopup(data.message);

        if (data.verifyRequired) {
            openVerifyPopup(); // only open if backend says verification is needed
        }
    })
    .catch(error => {
        showPopup("Registration failed: " + error.message);
    });
}

function showPopup(message) {
    const popup = document.getElementById("login-popup");
    const popupMessage = document.getElementById("login-popupMessage");

    if (!popup || !popupMessage) {
        alert(message); // fallback
        return;
    }

    popupMessage.innerText = message;
    popup.style.display = "flex";
}

function closePopup() {
    // Hide the popup
    const popup = document.getElementById("login-popup");
    popup.style.display = "none";

    // Clear input fields
    const username = document.getElementById("username");
    const email = document.getElementById("email");
    const password = document.getElementById("password");

    if (username) username.value = "";
    if (email) email.value = "";
    if (password) password.value = "";

    // Clear any response message
    const responseMessage = document.getElementById("responseMessage");
    if (responseMessage) responseMessage.innerText = "";
}


// Open verify popup
function openVerifyPopup() {
    const popup = document.getElementById("verify-popup");
    const otpFields = document.querySelectorAll(".verify-otp-field");

    // Clear all OTP input fields
    otpFields.forEach(input => input.value = "");

    // Show popup
    popup.style.display = "flex";

    // Focus the first input
    if (otpFields.length > 0) {
        otpFields[0].focus();
    }
}

// Close verify popup
function closeVerifyPopup() {
    document.getElementById("verify-popup").style.display = "none";
}



// Close when clicking outside the box
document.getElementById("verify-popup").addEventListener("click", function(event) {
    if (event.target === document.getElementById("verify-popup")) {
        closeVerifyPopup();
    }
});


// OTP input handling
const verifyOtpFields = document.querySelectorAll(".verify-otp-field");

verifyOtpFields.forEach((field, index) => {
    field.addEventListener("input", (e) => {
        if (e.target.value.length === 1 && index < verifyOtpFields.length - 1) {
            verifyOtpFields[index + 1].focus();
        }
    });

    field.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !field.value && index > 0) {
            verifyOtpFields[index - 1].focus();
        }
    });
});

// Verify OTP function
function verifyOtpCode() {
    let code = "";
    document.querySelectorAll(".verify-otp-field").forEach(f => code += f.value);

    fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: document.getElementById("email").value,
            code: code
        })
    })
    .then(res => res.json())
    .then(data => {
        closeVerifyPopup();           // close verification popup first
        if (data.verified) {          // backend should return { verified: true/false, message: "..." }
            showPopup("Registered successfully!");  // new popup after successful verification
        } else {
            showPopup(data.message);  // show error if verification failed
        }
    })
    .catch(() => {
        showPopup("Verification failed");
    });
}


// Resend OTP
function resendVerifyOtp() {
    alert("Verification code resent to your email.");
}