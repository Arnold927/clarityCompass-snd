// export async function getValidAccessToken() {
//     const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
//     let access = localStorage.getItem("access");
//     const refresh = localStorage.getItem("refresh");

//     if (!access || !refresh) {
//         console.warn(" No tokens found in localStorage.");
//         return null;
//     }

//     try {
//         // Try decoding token to check expiration
//         let isExpired = false;
//         try {
//             const [, payloadBase64] = access.split(".");
//             const payload = JSON.parse(atob(payloadBase64));
//             isExpired = Date.now() >= payload.exp * 1000;
//         } catch (err) {
//             console.warn("Invalid access token structure, forcing refresh.");
//             isExpired = true;
//         }

//         if (!isExpired) return access;

//         console.log("Access token expired, attempting refresh...");
//         const response = await fetch(`${API_BASE}/api/token/refresh/`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ refresh }),
//         });

//         if (!response.ok) {
//             console.error("Token refresh failed — logging out.");
//             localStorage.removeItem("access");
//             localStorage.removeItem("refresh");
//             window.location.href = "/login";
//             return null;
//         }

//         const data = await response.json();
//         localStorage.setItem("access", data.access);
//         console.log(" Token refreshed successfully");
//         return data.access;
//     } catch (err) {
//         console.error("Error validating/refreshing token:", err);
//         localStorage.removeItem("access");
//         localStorage.removeItem("refresh");
//         window.location.href = "/login";
//         return null;
//     }
// }

