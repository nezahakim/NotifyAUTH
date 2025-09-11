import { writable } from 'svelte/store';


interface RegType {
    isEmailVerified: boolean;
    isRegistered: boolean;
    email: string | null;
};

interface PasType {
    isEmailVerified: boolean;
    isPasswordReset: boolean;
    email: string | null;
}

function createRegisterStore() {
    const { subscribe, set, update } = writable<RegType>({
        isEmailVerified: false,
        isRegistered: false,
        email: null,
    });

    return {
        subscribe,
        
        setEmailVerified({status, email}: {status: boolean, email: string}) {
            update(state => ({
                ...state,
                isEmailVerified: status,
                email: email,
            }));
        },
        
        setRegistered({status, email}: {status: boolean, email: string}) {
            update(state => ({
                ...state,
                isRegistered: status,
                email: email,
            }));
        },

        setEmail(email: string) {
            update(state => ({
                ...state,
                email: email,
            }));
        },

        reset() {
            set({
                isEmailVerified: false,
                isRegistered: false,
                email: null,
            });
        }
    };
}
export const registerStore = createRegisterStore();


function createPasswordVerifyStore() {
    const { subscribe, set, update } = writable<PasType>({
        isEmailVerified: false,
        isPasswordReset: false,
        email: null,
    });

    return {
        subscribe,
        
        setEmailVerified({status, email}: {status: boolean, email: string}) {
            update(state => ({
                ...state,
                isEmailVerified: status,
                email: email,
            }));
        },
        
        setPassword({status, email}: {status: boolean, email: string}) {
            update(state => ({
                ...state,
                isPasswordReset: status,
                email: email,
            }));
        },

        reset() {
            set({
                isEmailVerified: false,
                isPasswordReset: false,
                email: null,
            });
        }
    };
}
export const passwordStore = createPasswordVerifyStore();