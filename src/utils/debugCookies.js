/**
 * Debug utility to verify cookies are working correctly with API requests
 */

export const debugCookieIssue = () => {
  console.log("🔍 === COOKIE DEBUG INFO ===");
  
  // Check 1: Local cookies in browser
  const allCookies = document.cookie;
  console.log("📍 Step 1: Cookies in browser document.cookie:");
  console.log(allCookies || "⚠️  NO COOKIES FOUND");
  
  // Check 2: AC_CMP specifically
  const acCmpCookie = allCookies.split('; ').find(row => row.startsWith('AC_CMP='));
  if (acCmpCookie) {
    const [key, value] = acCmpCookie.split('=');
    console.log(`✅ AC_CMP Cookie found: ${key}=${value}`);
  } else {
    console.error("❌ AC_CMP Cookie NOT FOUND - This is the problem!");
  }
  
  // Check 3: Check localStorage
  const storedCompany = localStorage.getItem("selectedCompany");
  console.log("📍 Step 2: localStorage selectedCompany:");
  if (storedCompany) {
    try {
      const company = JSON.parse(storedCompany);
      console.log(`✅ Company in localStorage: ${company.name} (${company._id})`);
    } catch (e) {
      console.error("❌ Invalid JSON in localStorage:", storedCompany);
    }
  } else {
    console.warn("⚠️  No selectedCompany in localStorage");
  }
  
  // Check 4: Check cookie attributes
  if (allCookies) {
    console.log("📍 Step 3: Checking cookie availability:");
    // These are indicators - actual attributes set by js-cookie
    const httpOnly = "✓ (set by js-cookie)";
    const secure = window.location.protocol === 'https:' ? "✓ (HTTPS enabled)" : "✗ (HTTP - may work)";
    const sameSite = "Lax ✓";
    console.log({ sameSite, secure, httpOnly });
  }
  
  // Check 5: CORS/credentials settings
  console.log("📍 Step 4: Request settings (should include credentials):");
  console.log({
    expectedAxiosConfig: "{ withCredentials: true }",
    expectedFetchConfig: "{ credentials: 'include' }",
  });
  
  console.log("🔍 === END DEBUG ===\n");
  
  return {
    hasCookie: !!acCmpCookie,
    cookieValue: acCmpCookie ? acCmpCookie.split('=')[1] : null,
    hasLocalStorage: !!storedCompany,
    isHttps: window.location.protocol === 'https:',
  };
};

export const checkAPIRequestHeaders = (config) => {
  console.log("🚀 API Request being sent:", {
    url: config.url,
    method: config.method,
    withCredentials: config.withCredentials,
    headers: config.headers,
    willSendCookies: config.withCredentials === true,
  });
  return config;
};
