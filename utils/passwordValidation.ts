
export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
}

export const validatePassword = (password: string): PasswordValidationResult => {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push("Mínimo de 8 caracteres");
    }
    if (!/[A-Z]/.test(password)) {
        errors.push("Pelo menos uma letra maiúscula");
    }
    if (!/[0-9]/.test(password)) {
        errors.push("Pelo menos um número");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push("Pelo menos um símbolo especial (!@#$...)");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

export interface PasswordRuleStatus {
    id: 'length' | 'uppercase' | 'number' | 'symbol';
    label: string;
    ok: boolean;
}

/** Mesmas regras de `validatePassword`, item a item, para checklist ao vivo. */
export const getPasswordRules = (password: string): PasswordRuleStatus[] => [
    { id: 'length', label: '8 ou mais caracteres', ok: password.length >= 8 },
    { id: 'uppercase', label: 'Uma letra maiúscula', ok: /[A-Z]/.test(password) },
    { id: 'number', label: 'Um número', ok: /[0-9]/.test(password) },
    { id: 'symbol', label: 'Um símbolo (!@#$…)', ok: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
];
