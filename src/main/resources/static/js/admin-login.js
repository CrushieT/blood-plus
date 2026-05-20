/**
 * CNPH Blood Bank — Request Portal
 * admin-login.js
 *
 * Handles: login via Spring Security, field validation,
 * password toggle, OTP flow, popup management,
 * scroll-reveal animations, nav scroll effect,
 * submit loading state, Enter-key support.
 */

// ═══════════════════════════════════════════════════════
// TAB SWITCHING (if needed in future)
// ═══════════════════════════════════════════════════════

function switchTab(tab, btn) {
    document.getElementById('auth-signin').classList.toggle('active', tab === 'signin');
    document.getElementById('auth-signup').classList.toggle('active', tab === 'signup');
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
}

// ═══════════════════════════════════════════════════════
// EMAIL VALIDATION
// ═══════════════════════════════════════════════════════

function validateEmail() {
    const emailInput = document.getElementById("login-email");
    const email = emailInput ? emailInput.value.trim() : '';
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
    const errorIcon  = document.getElementById("email-error-icon");
    const errorMsg   = document.getElementById("email-error-msg");
    const emailInput = document.getElementById("login-email");

    if (errorIcon)  errorIcon.style.display  = "inline-block";
    if (errorMsg)   errorMsg.innerText        = message;
    if (emailInput) emailInput.classList.add("error");
}

function clearEmailError() {
    const errorIcon  = document.getElementById("email-error-icon");
    const errorMsg   = document.getElementById("email-error-msg");
    const emailInput = document.getElementById("login-email");

    if (errorIcon)  errorIcon.style.display  = "none";
    if (errorMsg)   errorMsg.innerText        = "";
    if (emailInput) emailInput.classList.remove("error");
}

// ═══════════════════════════════════════════════════════
// PASSWORD VALIDATION
// ═══════════════════════════════════════════════════════

function validatePassword() {
    const passwordInput = document.getElementById("login-password");
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!password) {
        showPasswordError("Password is required");
        return false;
    } else {
        clearPasswordError();
        return true;
    }
}

function showPasswordError(message) {
    const errorIcon     = document.getElementById("password-error-icon");
    const errorMsg      = document.getElementById("password-error-msg");
    const passwordInput = document.getElementById("login-password");

    if (errorIcon)     errorIcon.style.display  = "inline-block";
    if (errorMsg)      errorMsg.innerText        = message;
    if (passwordInput) passwordInput.classList.add("error");
}

function clearPasswordError() {
    const errorIcon     = document.getElementById("password-error-icon");
    const errorMsg      = document.getElementById("password-error-msg");
    const passwordInput = document.getElementById("login-password");

    if (errorIcon)     errorIcon.style.display  = "none";
    if (errorMsg)      errorMsg.innerText        = "";
    if (passwordInput) passwordInput.classList.remove("error");
}

// ═══════════════════════════════════════════════════════
// VALIDATE AND LOGIN (Main Login Handler)
// ═══════════════════════════════════════════════════════

function validateAndLogin() {
    const isEmailValid    = validateEmail();
    const isPasswordValid = validatePassword();

    if (isEmailValid && isPasswordValid) {
        login();
    }
}

// ═══════════════════════════════════════════════════════
// LOGIN FUNCTION
// ═══════════════════════════════════════════════════════

async function login() {
    const email    = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const submitBtn = document.querySelector(".submit");

    // Loading state
    if (submitBtn) {
        submitBtn.disabled    = true;
        submitBtn.innerHTML   = '<i class="fas fa-circle-notch fa-spin" style="margin-right:8px"></i>Signing In…';
        submitBtn.style.opacity = '0.85';
    }

    try {
        const response = await fetch("/api/auth/login", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ email, password }),
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
            resetSubmitButton(submitBtn);
        } else {
            showPopup("Something went wrong. Please try again.");
            resetSubmitButton(submitBtn);
        }

    } catch (error) {
        console.error("Login error:", error);
        showPopup("Network error. Please check your connection.");
        resetSubmitButton(submitBtn);
    }
}

function resetSubmitButton(btn) {
    if (!btn) return;
    btn.disabled      = false;
    btn.innerHTML     = 'Sign In';
    btn.style.opacity = '1';
}

// ═══════════════════════════════════════════════════════
// REGISTER USER
// ═══════════════════════════════════════════════════════

function registerUser() {
    const username = document.getElementById("username")  ? document.getElementById("username").value  : '';
    const email    = document.getElementById("email")     ? document.getElementById("email").value     : '';
    const password = document.getElementById("password")  ? document.getElementById("password").value  : '';

    fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username, email, password })
    })
    .then(response => response.json())
    .then(data => {
        showPopup(data.message);
        if (data.verifyRequired) {
            openVerifyPopup();
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
    const popup        = document.getElementById("login-popup");
    const popupMessage = document.getElementById("login-popupMessage");

    if (!popup || !popupMessage) {
        alert(message);
        return;
    }

    popupMessage.innerText = message;
    popup.style.display    = "flex";
}

function closePopup() {
    const popup = document.getElementById("login-popup");
    if (popup) popup.style.display = "none";

    const username        = document.getElementById("username");
    const email           = document.getElementById("email");
    const password        = document.getElementById("password");
    const responseMessage = document.getElementById("responseMessage");

    if (username)        username.value        = "";
    if (email)           email.value           = "";
    if (password)        password.value        = "";
    if (responseMessage) responseMessage.innerText = "";
}

// ═══════════════════════════════════════════════════════
// EMAIL VERIFICATION (OTP)
// ═══════════════════════════════════════════════════════

function openVerifyPopup() {
    const popup     = document.getElementById("verify-popup");
    const otpFields = document.querySelectorAll(".verify-otp-field");

    otpFields.forEach(input => input.value = "");
    if (popup) popup.style.display = "flex";
    if (otpFields.length > 0) otpFields[0].focus();
}

function closeVerifyPopup() {
    const popup = document.getElementById("verify-popup");
    if (popup) popup.style.display = "none";
}

// ═══════════════════════════════════════════════════════
// OTP INPUT HANDLING
// ═══════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", function () {
    // OTP auto-advance
    const verifyOtpFields = document.querySelectorAll(".verify-otp-field");
    verifyOtpFields.forEach((field, index) => {
        field.addEventListener("input", (e) => {
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

    // Close verify popup on backdrop click
    const verifyPopup = document.getElementById("verify-popup");
    if (verifyPopup) {
        verifyPopup.addEventListener("click", function (event) {
            if (event.target === verifyPopup) closeVerifyPopup();
        });
    }

    // Close login popup on backdrop click
    const loginPopup = document.getElementById("login-popup");
    if (loginPopup) {
        loginPopup.addEventListener("click", function (event) {
            if (event.target === loginPopup) closePopup();
        });
    }

    // Enter key triggers login from password field
    const passwordInput = document.getElementById("login-password");
    if (passwordInput) {
        passwordInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") validateAndLogin();
        });
    }

    const emailInput = document.getElementById("login-email");
    if (emailInput) {
        emailInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                const pwInput = document.getElementById("login-password");
                if (pwInput) pwInput.focus();
            }
        });
        emailInput.addEventListener("input", clearEmailError);
    }

    if (passwordInput) {
        passwordInput.addEventListener("input", clearPasswordError);
    }

    // ─── Scroll reveal ───────────────────────────────────
    const revealEls = document.querySelectorAll(".reveal");
    if (revealEls.length > 0) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12 }
        );
        revealEls.forEach(el => observer.observe(el));
    }

    // ─── Nav scroll shadow ────────────────────────────────
    const nav = document.querySelector("nav");
    if (nav) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 40) {
                nav.classList.add("nav-scrolled");
            } else {
                nav.classList.remove("nav-scrolled");
            }
        }, { passive: true });
    }

    // ─── Blood chip stagger on strip enter ───────────────
    const btChips = document.querySelectorAll(".bt-chip");
    if (btChips.length > 0) {
        const stripObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        btChips.forEach((chip, i) => {
                            chip.style.animationDelay = `${i * 60}ms`;
                            chip.classList.add("chip-visible");
                        });
                        stripObserver.disconnect();
                    }
                });
            },
            { threshold: 0.3 }
        );
        const strip = document.querySelector(".blood-strip");
        if (strip) stripObserver.observe(strip);
    }
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
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
            email: document.getElementById("email") ? document.getElementById("email").value : '',
            code:  code
        })
    })
    .then(res => res.json())
    .then(data => {
        closeVerifyPopup();
        if (data.verified) {
            showPopup("Registered successfully!");
        } else {
            showPopup(data.message);
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
    const emailEl = document.getElementById("email");
    const email   = emailEl ? emailEl.value.trim() : '';

    if (!email) {
        showPopup("Please enter your email first");
        return;
    }

    fetch("/api/auth/resend-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email })
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
    const toggleButton  = document.getElementById("password-toggle");

    if (!passwordInput || !toggleButton) {
        console.error("Password input or toggle button not found");
        return;
    }

    const icon = toggleButton.querySelector("i");

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        if (icon) { icon.classList.remove("fa-eye"); icon.classList.add("fa-eye-slash"); }
        toggleButton.classList.add("active");
        toggleButton.style.color   = "#1F5FBF";
        toggleButton.style.opacity = "1";
    } else {
        passwordInput.type = "password";
        if (icon) { icon.classList.remove("fa-eye-slash"); icon.classList.add("fa-eye"); }
        toggleButton.classList.remove("active");
        toggleButton.style.color   = "";
        toggleButton.style.opacity = "";
    }
}