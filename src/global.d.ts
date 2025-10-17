// src/global.d.ts

export {}; // This makes it a module and avoids TS errors


declare global {
  interface JwtPayload {
    name?: string;
    email?: string;
    [key: string]: any;  // fallback for other dynamic fields
  }
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: any) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement | null,
            options: {
              theme: string;
              size: string;
              shape: string;
              logo_alignment: string;
            }
          ) => void;
        };
      };
    };
  }
}
