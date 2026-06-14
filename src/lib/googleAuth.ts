import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App for Google Auth & Workspace Integration
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const provider = new GoogleAuthProvider();
// Required Google Drive scope
provider.addScope("https://www.googleapis.com/auth/drive");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initGoogleAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Initiate Google Sign-In with popup
export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Impossible d'obtenir le jeton d'accès Google Drive à partir de Firebase Auth.");
    }

    cachedAccessToken = credential.accessToken;
    // Set token in localStorage to keep auth persistent across reloads if possible,
    // but the instruction says: "You MUST implement in-memory caching for the access token. Do NOT store the access token in localStorage or sessionStorage. Use onAuthStateChanged to clear the cached token when the user signs out."
    // So we persist ONLY in memory.
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Erreur de connexion Google Drive:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
