/**
 * Handles user login using Spring Security form login.
 * Sends credentials to /login endpoint.
 * Includes validation and error handling.
 */

// ═══════════════════════════════════════════════════════
// TAB SWITCHING (if needed in future)
// ═══════════════════════════════════════════════════════

function switchTab(tab, btn) {
    // panels
    document.getElementById('auth-signin').classList.toggle('active', tab === 'signin');
    document.getElementById('auth-signup').classList.toggle('active', tab === 'signup');
    // tab buttons
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
}

// ═══════════════════════════════════════════════════════
// EMAIL VALIDATION
// ═══════════════════════════════════════════════════════

function validateEmail() {
    const emailInput = document.getElementById("login-email");
    const errorIcon = document.getElementById("email-error-icon");
    const errorMsg = document.getElementById("email-error-msg");
    const email = emailInput.value.trim();

    // Simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
        showEmailError("Email is required");
        return false;
    } else if (!emailRegex.test(email)) {
        showEmailError("Please enter a valid email");
        return false;
    } else {
        clearEmailError();
        return true;
    }
}

function showEmailError(message) {
    const errorIcon = document.getElementById("email-error-icon");
    const errorMsg = document.getElementById("email-error-msg");
    const emailInput = document.getElementById("login-email");

    if (errorIcon) errorIcon.style.display = "inline-block";
    if (errorMsg) errorMsg.innerText = message;
    if (emailInput) emailInput.classList.add("error");
}

function clearEmailError() {
    const errorIcon = document.getElementById("email-error-icon");
    const errorMsg = document.getElementById("email-error-msg");
    const emailInput = document.getElementById("login-email");

    if (errorIcon) errorIcon.style.display = "none";
    if (errorMsg) errorMsg.innerText = "";
    if (emailInput) emailInput.classList.remove("error");
}

// ═══════════════════════════════════════════════════════
// PASSWORD VALIDATION
// ═══════════════════════════════════════════════════════

function validatePassword() {
    const passwordInput = document.getElementById("login-password");
    const errorIcon = document.getElementById("password-error-icon");
    const errorMsg = document.getElementById("password-error-msg");
    const password = passwordInput.value.trim();

    if (!password) {
        showPasswordError("Password is required");
        return false;
    }else {
        clearPasswordError();
        return true;
    }
}

function showPasswordError(message) {
    const errorIcon = document.getElementById("password-error-icon");
    const errorMsg = document.getElementById("password-error-msg");
    const passwordInput = document.getElementById("login-password");

    if (errorIcon) errorIcon.style.display = "inline-block";
    if (errorMsg) errorMsg.innerText = message;
    if (passwordInput) passwordInput.classList.add("error");
}

function clearPasswordError() {
    const errorIcon = document.getElementById("password-error-icon");
    const errorMsg = document.getElementById("password-error-msg");
    const passwordInput = document.getElementById("login-password");

    if (errorIcon) errorIcon.style.display = "none";
    if (errorMsg) errorMsg.innerText = "";
    if (passwordInput) passwordInput.classList.remove("error");
}

// ═══════════════════════════════════════════════════════
// VALIDATE AND LOGIN (Main Login Handler)
// ═══════════════════════════════════════════════════════

function validateAndLogin() {
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (isEmailValid && isPasswordValid) {
        login();
    }
}

// ═══════════════════════════════════════════════════════
// LOGIN FUNCTION
// ═══════════════════════════════════════════════════════

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
            showPopup("Check your email or password!");
        } else {
            showPopup("Something went wrong. Please try again.");
        }

    } catch (error) {
        console.error("Login error:", error);
        showPopup("Network error. Please check your connection.");
    }
}

// ═══════════════════════════════════════════════════════
// REGISTER USER
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// POPUP HANDLING
// ═══════════════════════════════════════════════════════

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
    if (popup) popup.style.display = "none";

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

// ═══════════════════════════════════════════════════════
// EMAIL VERIFICATION (OTP)
// ═══════════════════════════════════════════════════════

// Open verify popup
function openVerifyPopup() {
    const popup = document.getElementById("verify-popup");
    const otpFields = document.querySelectorAll(".verify-otp-field");

    // Clear all OTP input fields
    otpFields.forEach(input => input.value = "");

    // Show popup
    if (popup) popup.style.display = "flex";

    // Focus the first input
    if (otpFields.length > 0) {
        otpFields[0].focus();
    }
}

// Close verify popup
function closeVerifyPopup() {
    const popup = document.getElementById("verify-popup");
    if (popup) popup.style.display = "none";
}

// Close verify popup when clicking outside the box
document.addEventListener("DOMContentLoaded", function() {
    const verifyPopup = document.getElementById("verify-popup");
    if (verifyPopup) {
        verifyPopup.addEventListener("click", function(event) {
            if (event.target === verifyPopup) {
                closeVerifyPopup();
            }
        });
    }
});

// ═══════════════════════════════════════════════════════
// OTP INPUT HANDLING
// ═══════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", function() {
    const verifyOtpFields = document.querySelectorAll(".verify-otp-field");

    verifyOtpFields.forEach((field, index) => {
        field.addEventListener("input", (e) => {
            // Only allow digits
            e.target.value = e.target.value.replace(/[^0-9]/g, "");
            
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
});

// ═══════════════════════════════════════════════════════
// VERIFY OTP CODE
// ═══════════════════════════════════════════════════════

function verifyOtpCode() {
    let code = "";
    document.querySelectorAll(".verify-otp-field").forEach(f => code += f.value);

    if (code.length !== 4) {
        showPopup("Please enter all 4 digits");
        return;
    }

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

// ═══════════════════════════════════════════════════════
// RESEND OTP
// ═══════════════════════════════════════════════════════

function resendVerifyOtp() {
    const email = document.getElementById("email").value.trim();
    
    if (!email) {
        showPopup("Please enter your email first");
        return;
    }

    fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    })
    .then(res => res.json())
    .then(data => {
        showPopup(data.message || "Verification code resent to your email");
    })
    .catch(() => {
        showPopup("Failed to resend code. Please try again.");
    });
}

// ═══════════════════════════════════════════════════════
// PASSWORD VISIBILITY TOGGLE
// ═══════════════════════════════════════════════════════

function togglePasswordVisibility() {
    const passwordInput = document.getElementById("login-password");
    const toggleButton = document.getElementById("password-toggle");

    if (!passwordInput || !toggleButton) {
        console.error("Password input or toggle button not found");
        return;
    }

    const icon = toggleButton.querySelector("i");

    if (passwordInput.type === "password") {
        // Show password
        passwordInput.type = "text";
        if (icon) {
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
        }
        // Add active state styling
        toggleButton.classList.add("active");
        toggleButton.style.color = "#d4455c";
        toggleButton.style.opacity = "1";
    } else {
        // Hide password
        passwordInput.type = "password";
        if (icon) {
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        }
        // Remove active state styling
        toggleButton.classList.remove("active");
        toggleButton.style.color = "#999";
        toggleButton.style.opacity = "0.6";
    }
}

// ═══════════════════════════════════════════════════════
// CLEAR ERRORS ON INPUT (Real-time validation feedback)
// ═══════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", function() {
    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");

    if (emailInput) {
        emailInput.addEventListener("input", clearEmailError);
    }

    if (passwordInput) {
        passwordInput.addEventListener("input", clearPasswordError);
    }
});