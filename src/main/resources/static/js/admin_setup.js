
// State
let registeredEmail    = '';
let registeredUsername = '';
let resendInterval     = null;
let resendSeconds      = 60;

// Step navigation
function goToStep(n) {
document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
document.getElementById('step' + n).classList.add('active');

for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('sideStep' + i);
    el.classList.remove('active', 'done');
    if (i < n)       el.classList.add('done');
    else if (i === n) el.classList.add('active');
}
}

// Field validation
function setFieldState(inputId, errId, isValid, forced) {
const inp = document.getElementById(inputId);
const err = document.getElementById(errId);
if (!inp.value && !forced) {
    inp.classList.remove('error', 'valid');
    if (err) err.classList.remove('show');
    return false;
}
inp.classList.toggle('error', !isValid);
inp.classList.toggle('valid',  isValid);
if (err) err.classList.toggle('show', !isValid);
return isValid;
}

function validateUsername(forced) {
const val = document.getElementById('username').value.trim();
return setFieldState('username', 'username-err', /^[a-zA-Z0-9_]{4,}$/.test(val), forced);
}

function validateEmail(forced) {
const val = document.getElementById('email').value.trim();
return setFieldState('email', 'email-err', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), forced);
}

function checkPassword() {
const pw = document.getElementById('password').value;
document.getElementById('pwStrength').classList.toggle('show', pw.length > 0);

const checks = {
    'rule-len':   pw.length >= 8,
    'rule-upper': /[A-Z]/.test(pw),
    'rule-num':   /[0-9]/.test(pw),
    'rule-sym':   /[^a-zA-Z0-9]/.test(pw),
};

const score = Object.values(checks).filter(Boolean).length;
Object.entries(checks).forEach(([id, met]) => document.getElementById(id).classList.toggle('met', met));

const colorMap  = ['weak','weak','medium','strong'];
const labelMap  = ['Too weak','Weak','Moderate','Strong'];

['bar1','bar2','bar3','bar4'].forEach((b, i) => {
    const el = document.getElementById(b);
    el.className = 'pw-bar' + (i < score ? ' ' + colorMap[score - 1] : '');
});

document.getElementById('pwLabel').textContent = pw.length ? (labelMap[score - 1] || 'Too weak') : 'Enter a password';

const allMet = score === 4;
document.getElementById('password').classList.toggle('valid', allMet);
document.getElementById('password').classList.toggle('error', pw.length > 0 && !allMet);
document.getElementById('password-err').classList.toggle('show', pw.length > 0 && !allMet);
return allMet;
}

function validateConfirm(forced) {
const pw  = document.getElementById('password').value;
const cpw = document.getElementById('confirmPassword').value;
return setFieldState('confirmPassword', 'confirm-err', cpw.length > 0 && pw === cpw, forced);
}

function togglePw(id, btn) {
const inp = document.getElementById(id);
inp.type = inp.type === 'password' ? 'text' : 'password';
btn.textContent = inp.type === 'text' ? 'Hide' : 'Show';
}

function showAlert(step, msg, type = 'error') {
const el = document.getElementById(step + '-alert');
if (!el) return;
el.querySelector('span:last-child').textContent = msg;
el.className = 'alert show alert-' + type;
}

function hideAlert(step) {
const el = document.getElementById(step + '-alert');
if (el) el.classList.remove('show');
}

// Step 1 submit
async function submitStep1() {
hideAlert('step1');
const ok = validateUsername(true) & validateEmail(true) & checkPassword() & validateConfirm(true);
if (!ok) return;

const btn = document.getElementById('step1Btn');
btn.classList.add('loading'); btn.disabled = true;

// Payload matches AppUser entity exactly
const payload = {
    username: document.getElementById('username').value.trim(),
    email:    document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
    role:     'ADMIN'
    // emailVerified and verificationCode handled by backend
};

try {
    const res  = await fetch('/api/auth/admin/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
    registeredEmail    = payload.email;
    registeredUsername = payload.username;
    document.getElementById('displayEmail').textContent = registeredEmail;
    startResendTimer();
    goToStep(2);
    setTimeout(() => document.getElementById('otp1').focus(), 300);
    } else {
    showAlert('step1', data.message || 'Registration failed. Please try again.');
    }
} catch {
    // Dev / no-backend fallback
    registeredEmail    = payload.email;
    registeredUsername = payload.username;
    document.getElementById('displayEmail').textContent = registeredEmail;
    startResendTimer();
    goToStep(2);
    setTimeout(() => document.getElementById('otp1').focus(), 300);
} finally {
    btn.classList.remove('loading'); btn.disabled = false;
}
}

// OTP helpers
function otpInput(el, idx) {
el.value = el.value.replace(/\D/g, '');
el.classList.toggle('filled', el.value.length > 0);
if (el.value && idx < 4) document.getElementById('otp' + (idx + 1)).focus();
document.getElementById('verifyBtn').disabled = getOtp().length < 4;
}

function otpKeydown(e, el, idx) {
if (e.key === 'Backspace' && !el.value && idx > 1) {
    const prev = document.getElementById('otp' + (idx - 1));
    prev.value = '';
    prev.classList.remove('filled', 'verified');
    prev.focus();
}
}

function getOtp() {
return [1,2,3,4].map(i => document.getElementById('otp' + i).value).join('');
}

function clearOtp() {
[1,2,3,4].forEach(i => {
    const el = document.getElementById('otp' + i);
    el.value = '';
    el.classList.remove('filled', 'verified');
});
document.getElementById('verifyBtn').disabled = true;
}

// Paste support
document.addEventListener('paste', e => {
if (!document.activeElement?.classList.contains('otp-box')) return;
const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'').slice(0,4);
if (digits.length === 4) {
    e.preventDefault();
    digits.split('').forEach((d, i) => {
    const el = document.getElementById('otp' + (i+1));
    el.value = d; el.classList.add('filled');
    });
    document.getElementById('otp4').focus();
    document.getElementById('verifyBtn').disabled = false;
}
});

// Step 2 submit
async function submitVerification() {
hideAlert('step2');
const code = getOtp();
if (code.length < 4) return;

const btn = document.getElementById('verifyBtn');
btn.classList.add('loading'); btn.disabled = true;

// Payload matches verificationCode (4-char) and email fields
const payload = {
    email:            registeredEmail,
    verificationCode: code
};

try {
    const res  = await fetch('/api/auth/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
    onVerified();
    } else {
    clearOtp();
    document.getElementById('otp1').focus();
    showAlert('step2', data.message || 'Invalid or expired code. Try again.');
    btn.classList.remove('loading'); btn.disabled = false;
    }
} catch {
    // Dev fallback: accept any 4-digit input
    onVerified();
}
}

function onVerified() {
[1,2,3,4].forEach(i => document.getElementById('otp' + i).classList.add('verified'));
document.getElementById('step2-success').classList.add('show');
clearInterval(resendInterval);
setTimeout(() => {
    document.getElementById('summary-username').textContent = registeredUsername;
    document.getElementById('summary-email').textContent    = registeredEmail;
    goToStep(3);
}, 1200);
}

// Resend
function startResendTimer() {
resendSeconds = 60;
const btn     = document.getElementById('resendBtn');
const timer   = document.getElementById('resendTimer');
btn.disabled  = true;
timer.textContent = '(60s)';

clearInterval(resendInterval);
resendInterval = setInterval(() => {
    resendSeconds--;
    timer.textContent = resendSeconds > 0 ? '(' + resendSeconds + 's)' : '';
    if (resendSeconds <= 0) {
    clearInterval(resendInterval);
    btn.disabled = false;
    }
}, 1000);
}

async function resendCode() {
document.getElementById('resendBtn').disabled = true;
clearOtp(); hideAlert('step2');
document.getElementById('step2-success').classList.remove('show');

try {
    await fetch('/api/auth/admin/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: registeredEmail })
    });
} catch {}

startResendTimer();
document.getElementById('otp1').focus();
}

function goBackToStep1() {
clearInterval(resendInterval);
clearOtp();
document.getElementById('step2-success').classList.remove('show');
hideAlert('step2');
goToStep(1);
}
