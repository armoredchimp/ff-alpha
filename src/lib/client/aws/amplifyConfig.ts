interface AmplifyConfig {
    Auth: {
        Cognito: {
            userPoolId: string;
            userPoolClientId: string;
            passwordFormat: {
                minLength: number;
                requireLowercase: boolean;
                requireUppercase: boolean;
                requireNumbers: boolean;
                requireSpecialCharacters: boolean;
            };
        };
    };
}

const userPoolId = import.meta.env.VITE_USER_POOL_ID as string;
const userPoolClientId = import.meta.env.VITE_USER_POOL_CLIENT_ID as string;

export const amplifyConfig: AmplifyConfig = {
    Auth: {
        Cognito: {
            userPoolId: userPoolId,
            userPoolClientId: userPoolClientId,
            passwordFormat: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireNumbers: true,
                requireSpecialCharacters: true
            }
        }
    }
};

export default amplifyConfig;