// The welcome page is shown once, the first time someone signs in on this browser. After that, sign-in goes to Chat.
const KEY = 'vp-welcomed';

export const hasSeenWelcome = (): boolean => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export const markWelcomed = () => {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* private browsing: the welcome may show again next time */
  }
};

export const afterSignInPath = (): string => (hasSeenWelcome() ? '/dashboard' : '/welcome');
