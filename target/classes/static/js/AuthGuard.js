(async function guard() {
    try {
        const path        = window.location.pathname;
        const isSetupPage = path === "/admin-setup.html";
        const isPublicPage = path === "/admin-login.html" ||
                             path === "/" ||
                             path === "/blood-request.html";

        // ── System status check first ────────────────────────────────────────
        const statusRes  = await fetch("/api/auth/system-status");
        const statusData = await statusRes.json();

        // Not initialized → redirect to setup (unless already on setup page)
        if (!statusData.initialized && !isSetupPage) {
            window.location.href = "/admin-setup.html";
            return;
        }

        // Already initialized but visiting setup page → redirect to login
        if (statusData.initialized && isSetupPage) {
            window.location.href = "/blood-request.html";
            return;
        }

        // Setup page — show it
        if (isSetupPage) {
            document.body.style.visibility = "visible";
            return;
        }

        // ── Auth check ───────────────────────────────────────────────────────
        const response = await fetch("/api/auth/me", { credentials: "include" });

        // ── Public page ──────────────────────────────────────────────────────
                // 🟢 PUBLIC PAGE → NEVER REDIRECT
        if (isPublicPage) {
            document.body.style.visibility = "visible";

            // Optional: redirect if already logged in
            if (response.ok) {
                const data = await response.json();
                if (data.role === "HOSPITAL") {
                    window.location.href = "/hospital/hospital_dashboard.html";
                } else if (data.role === "ADMIN") {
                    window.location.href = "/admin/admin_dashboard.html";
                }
            }

            return; // 🚨 IMPORTANT: STOP HERE
        }

        // ── Protected pages ──────────────────────────────────────────────────
        if (response.status === 401 || response.status === 403 || response.status === 500) {
            window.location.href = "/blood-request.html";
            return;
        }

        const data = await response.json();

        if (!data.role) {
            window.location.href = "/blood-request.html";
            return;
        }

              if (path.startsWith("/hospital/") && data.role !== "HOSPITAL") {
            window.location.href = "/blood-request.html";
            return;
        }

        if (path.startsWith("/admin/") && data.role !== "ADMIN") {
            window.location.href = "/blood-request.html";
            return;
        }

        


        // ✅ All checks passed — show the page
        document.body.style.visibility = "visible";

    } catch (error) {
        const path = window.location.pathname;
        const isPublicPage = path === "/blood-request.html" || path === "/";
        if (!isPublicPage) {
            window.location.href = "/blood-request.html";
        } else {
            document.body.style.visibility = "visible";
        }
    }
})();