import { useEffect } from "react";

export default function AuthCallback() {
  useEffect(() => {
    // 1. Get the tokens from the URL (Supabase puts them in the #fragment)
    const hash = window.location.hash;
    if (hash) {
      // 2. Redirect to your custom protocol
      // This changes mshb.vercel.app/#access_token=... to mshb://auth#access_token=...
      const desktopUrl = hash.replace("#", "mshb://auth#");
      window.location.assign(desktopUrl);

      // 3. (Optional) Provide a manual button in case the browser blocks the auto-redirect
      setTimeout(() => {
        const fallback = document.getElementById("manual-link");
        if (fallback) fallback.style.display = "block";
      }, 2000);
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h1>Verifying your email...</h1>
      <p>We are opening the MSHB Desktop app to log you in.</p>
      <a id="manual-link" href={window.location.hash.replace("#", "mshb://auth#")} 
         style={{ display: 'none', color: '#0070f3', textDecoration: 'underline' }}>
        Click here if the app doesn't open automatically
      </a>
    </div>
  );
}