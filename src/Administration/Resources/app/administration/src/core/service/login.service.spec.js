/**
 * @package admin
 */

import LoginService from 'src/core/service/login.service';
import createHTTPClient from 'src/core/factory/http.factory';
// eslint-disable-next-line import/no-extraneous-dependencies
import MockAdapter from 'axios-mock-adapter';
import { CookieStorage } from 'cookie-storage';

const getClientMock = () => {
    const client = createHTTPClient();
    const clientMock = new MockAdapter(client);

    return { client, clientMock };
};

const loginServiceFactory = () => {
    const { client, clientMock } = getClientMock();
    const contextMock = {};

    return {
        loginService: new LoginService(client, contextMock),
        contextMock: contextMock,
        clientMock: clientMock,
    };
};

let cookieStorageMock = '';
let lastUserActivity = null;

describe('core/service/login.service.js', () => {
    beforeAll(async () => {
        Object.defineProperty(document, 'cookie', {
            // eslint-disable-next-line func-names
            set: function (value) {
                cookieStorageMock = `${cookieStorageMock}${value};`;
            },
            // eslint-disable-next-line func-names
            get: function () {
                return cookieStorageMock;
            },
        });

        const mockDate = new Date(1577881800000);
        Date.now = jest.fn(() => +mockDate);

        Shopware.Service().register('userActivityService', () => {
            return {
                getLastUserActivity: () => {
                    return lastUserActivity ?? new Date();
                },
                updateLastUserActivity: () => {
                    lastUserActivity = new Date();
                },
            };
        });
    });

    beforeEach(() => {
        cookieStorageMock = '';
        lastUserActivity = null;
        Shopware.Application.view.router = undefined;
    });

    afterEach(() => {
        localStorage.removeItem('rememberMe');
        sessionStorage.removeItem('redirectFromLogin');
    });

    it('should contain all public functions', async () => {
        const { loginService } = loginServiceFactory();

        expect(loginService).toHaveProperty('loginByUsername');
        expect(loginService).toHaveProperty('refreshToken');
        expect(loginService).toHaveProperty('getToken');
        expect(loginService).toHaveProperty('getBearerAuthentication');
        expect(loginService).toHaveProperty('setBearerAuthentication');
        expect(loginService).toHaveProperty('restartAutoTokenRefresh');
        expect(loginService).toHaveProperty('logout');
        expect(loginService).toHaveProperty('isLoggedIn');
        expect(loginService).toHaveProperty('addOnTokenChangedListener');
        expect(loginService).toHaveProperty('addOnLogoutListener');
        expect(loginService).toHaveProperty('addOnLoginListener');
        expect(loginService).toHaveProperty('notifyOnLoginListener');
    });

    it('should set the bearer authentication with the right expiry', async () => {
        const { loginService } = loginServiceFactory();

        const auth = loginService.setBearerAuthentication({
            expiry: 300,
            access: 'aCcEsS_tOkEn',
            refresh: 'rEfReSh_ToKeN',
        });

        expect(auth).toEqual({
            expiry: Date.now() + 300 * 1000,
            access: 'aCcEsS_tOkEn',
            refresh: 'rEfReSh_ToKeN',
        });
    });

    it('should set the bearer authentication with the right cookie expiry', async () => {
        const { loginService } = loginServiceFactory();

        loginService.setBearerAuthentication({
            expiry: 300,
            access: 'aCcEsS_tOkEn',
            refresh: 'rEfReSh_ToKeN',
        });

        const expiresPart = cookieStorageMock.match(/expires=([^;]+)/);
        expect(expiresPart).not.toBeNull();
        expect(expiresPart).toHaveLength(2);
        const date = new Date(expiresPart[1]);
        expect(date.getTime()).toBe(Date.now() + 300 * 1000);
    });

    it('should set the bearer authentication with the right cookie expiry (remember me - default value)', async () => {
        const { loginService } = loginServiceFactory();

        loginService.setRememberMe(true);

        loginService.setBearerAuthentication({
            expiry: 300,
            access: 'aCcEsS_tOkEn',
            refresh: 'rEfReSh_ToKeN',
        });

        expect(localStorage.getItem('rememberMe')).toBe('true');

        const expiresPart = cookieStorageMock.match(/expires=([^;]+)/);
        expect(expiresPart).not.toBeNull();
        expect(expiresPart).toHaveLength(2);
        const date = new Date(expiresPart[1]);
        expect(date.getTime()).toBe(Date.now() + 7 * 86400 * 1000);
    });

    it('should set the bearer authentication with the right cookie expiry (remember me - refreshTokenTtl)', async () => {
        const { loginService, contextMock } = loginServiceFactory();

        loginService.setRememberMe(true);

        const refreshTokenTtl = 14 * 86400 * 1000;
        contextMock.refreshTokenTtl = refreshTokenTtl;

        loginService.setBearerAuthentication({
            expiry: 300,
            access: 'aCcEsS_tOkEn',
            refresh: 'rEfReSh_ToKeN',
        });

        expect(localStorage.getItem('rememberMe')).toBe('true');

        const expiresPart = cookieStorageMock.match(/expires=([^;]+)/);
        expect(expiresPart).not.toBeNull();
        expect(expiresPart).toHaveLength(2);
        const date = new Date(expiresPart[1]);
        expect(date.getTime()).toBe(Date.now() + refreshTokenTtl);
    });

    it('should set the remember me value', async () => {
        const { loginService } = loginServiceFactory();

        loginService.setRememberMe(true);
        expect(localStorage.getItem('rememberMe')).toBe('true');

        loginService.setRememberMe(false);
        expect(localStorage.getItem('rememberMe')).toBeNull();
    });

    it('should login and return the bearer token', async () => {
        const { loginService, clientMock } = loginServiceFactory();

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 600,
            access_token: 'aCcEsS_tOkEn',
            refresh_token: 'rEfReSh_ToKeN',
        });

        const auth = await loginService.loginByUsername('admin', 'shopware');

        expect(auth).toEqual({
            expiry: Date.now() + 600 * 1000,
            access: 'aCcEsS_tOkEn',
            refresh: 'rEfReSh_ToKeN',
        });
    });

    it('should clear the cookie successfully after each test', async () => {
        const { loginService } = loginServiceFactory();

        const auth = loginService.getBearerAuthentication();

        expect(auth).toBeFalsy();
    });

    it('should get a new token', async () => {
        const { loginService, clientMock } = loginServiceFactory();

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 600,
            access_token: 'aCcEsS_tOkEn',
            refresh_token: 'rEfReSh_ToKeN',
        });

        await loginService.loginByUsername('admin', 'shopware');

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 600,
            access_token: 'aCcEsS_tOkEn_TwO',
            refresh_token: 'rEfReSh_ToKeN_tWo',
        });

        const refreshToken = await loginService.refreshToken();
        expect(refreshToken).toBe('aCcEsS_tOkEn_TwO');
    });

    it('should refresh the actual bearer auth', async () => {
        const { loginService, clientMock } = loginServiceFactory();

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 600,
            access_token: 'aCcEsS_tOkEn',
            refresh_token: 'rEfReSh_ToKeN',
        });

        await loginService.loginByUsername('admin', 'shopware');

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 400,
            access_token: 'aCcEsS_tOkEn_TwO',
            refresh_token: 'rEfReSh_ToKeN_tWo',
        });

        await loginService.refreshToken();

        const bearerAuthentication = loginService.getBearerAuthentication();
        expect(bearerAuthentication).toEqual({
            access: 'aCcEsS_tOkEn_TwO',
            expiry: Date.now() + 400 * 1000,
            refresh: 'rEfReSh_ToKeN_tWo',
        });
    });

    it('should login and logout successfully', async () => {
        const { loginService, clientMock } = loginServiceFactory();

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 600,
            access_token: 'aCcEsS_tOkEn',
            refresh_token: 'rEfReSh_ToKeN',
        });

        await loginService.loginByUsername('admin', 'shopware');

        const authLoggedIn = loginService.getBearerAuthentication();
        expect(authLoggedIn).toEqual({
            expiry: Date.now() + 600 * 1000,
            access: 'aCcEsS_tOkEn',
            refresh: 'rEfReSh_ToKeN',
        });

        loginService.logout();

        const newAuth = loginService.getBearerAuthentication();
        expect(newAuth).toBeFalsy();
    });

    it('should return the storage key', async () => {
        const { loginService } = loginServiceFactory();

        expect(loginService.getStorageKey()).toBe('bearerAuth');
    });

    it('should check if user is logged in', async () => {
        const { loginService, clientMock } = loginServiceFactory();

        expect(loginService.isLoggedIn()).toBeFalsy();

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 600,
            access_token: 'aCcEsS_tOkEn',
            refresh_token: 'rEfReSh_ToKeN',
        });

        await loginService.loginByUsername('admin', 'shopware');

        expect(loginService.isLoggedIn()).toBeTruthy();
    });

    it('should return only the token', async () => {
        const { loginService, clientMock } = loginServiceFactory();

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 600,
            access_token: 'aCcEsS_tOkEn',
            refresh_token: 'rEfReSh_ToKeN',
        });

        await loginService.loginByUsername('admin', 'shopware');

        expect(loginService.getToken()).toBe('aCcEsS_tOkEn');
    });

    it('should return false when token is unparsable', async () => {
        const { loginService } = loginServiceFactory();

        document.cookie = 'bearerAuth=%7B%22acce{{"ss%%3A1577882400%7D';

        expect(loginService.getBearerAuthentication()).toBeFalsy();
    });

    it('should call the listener', async () => {
        const { loginService, clientMock } = loginServiceFactory();

        const logoutListener = jest.fn();
        const tokenChangedListener = jest.fn();

        loginService.addOnLogoutListener(logoutListener);
        loginService.addOnTokenChangedListener(tokenChangedListener);

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 600,
            access_token: 'aCcEsS_tOkEn',
            refresh_token: 'rEfReSh_ToKeN',
        });

        expect(tokenChangedListener).not.toHaveBeenCalled();

        await loginService.loginByUsername('admin', 'shopware');

        expect(tokenChangedListener).toHaveBeenCalled();

        expect(logoutListener).not.toHaveBeenCalled();
        loginService.logout();
        expect(logoutListener).toHaveBeenCalled();
    });

    it('should not call the login listener when you not redirecting from the login', async () => {
        const { loginService } = loginServiceFactory();

        const loginListener = jest.fn();

        loginService.addOnLoginListener(loginListener);
        expect(loginListener).not.toHaveBeenCalled();

        loginService.notifyOnLoginListener();
        expect(loginListener).not.toHaveBeenCalled();
    });

    it('should call the login listener when redirect from the login', async () => {
        const { loginService } = loginServiceFactory();
        sessionStorage.setItem('redirectFromLogin', true);

        const loginListener = jest.fn();

        loginService.addOnLoginListener(loginListener);
        expect(loginListener).not.toHaveBeenCalled();

        loginService.notifyOnLoginListener();
        expect(loginListener).toHaveBeenCalled();
    });

    it('should reject when no refresh token was found', async () => {
        const { loginService } = loginServiceFactory();

        await expect(loginService.refreshToken()).rejects.toThrow();
    });

    it('should be logged in when token exists and there is a valid last activity', async () => {
        // eslint-disable-next-line max-len
        document.cookie =
            'bearerAuth=%7B%22access%22%3A%22eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImU5Njk3NjdmMWQ0M2FhMzBiOGRjNDU3NDU0YWNjZWU4YjM3MzRjYTMyZDVlZDcwYTU4Yjg3ZWZjMWRkYzI5MjFhYTE1NzBjOWI4Zjk0NjZkIn0.eyJhdWQiOiJhZG1pbmlzdHJhdGlvbiIsImp0aSI6ImU5Njk3NjdmMWQ0M2FhMzBiOGRjNDU3NDU0YWNjZWU4YjM3MzRjYTMyZDVlZDcwYTU4Yjg3ZWZjMWRkYzI5MjFhYTE1NzBjOWI4Zjk0NjZkIiwiaWF0IjoxNjA2Mjk0MTM2LCJuYmYiOjE2MDYyOTQxMzYsImV4cCI6MTYwNjI5NDczNiwic3ViIjoiZTAzOWY0YzMyZjllNGMxZjgyMDNlMzVmZjdmZDQ1NzUiLCJzY29wZXMiOlsid3JpdGUiLCJhZG1pbiJdfQ.KNMWZqRJXM-lamNSuNvCsyZkR0zYkvS72DxjbJDAKqQex-PNUsDBDll9E4B7W5dLmIurTbxbzB4c8ztfPVkdXcZg5EORIIU8JRTjpbtwKhnXohEODsNqFPYGjFfhJnwcpt8tXvJ1BFXQdGR0UcHqPe-qLqWP9U1CZRht3A-9EvQFfzyqV9RJTs83tZ5MQI1LowjKIx1C6yxQ4CaQ-d-YUkerDguCukCg_z_Qkf2ME5tfdiiVp_uKCqknXNrNzs5y6LX0xnrLXBOGrcC3ZNF7RxmWxM-MzLaDa6kcYxc-k-QP3I89qDitZVU7LYTvK4WW_eH4qfOyVEzqSJuwtsoShA%22%2C%22refresh%22%3A%22def502006b139951ad0e625d58b94953b05b68ab5cd05abbc68b375ba21abf3e155a162020fd3175f2b057dc095c7ee53ac6686df506baba3053521be09354faa0142aee26a1548edf3f11fb724b1f0c60d044bc66c1c1304f59501a2f1b60378a5200e9254fcbde8c25fc9f745f31aacdaebbc77b3611226d22ee68128f28182a419ab2b04bfba9f240c4d743263dd8e798afccc7c0c2d2cc1c2df6ac6c097d17d9f991a408b5b6534a4a71fad3f7348139fa5b95b483fd2d3e206047fda7c60e099723dab5ff5197113faccd23a3aba8d8c948fd7e4d8da59dc74f9c160fd1de812900f51b5d06bd61dae754b87dc18efec9acdc82447042189871e69db6cbaaed1d82aef3cc8958c553cd5c75c98f0d174887c6a71a3f60aae584e2711198d3af88177f43bb630c6ee4e2453b11a6783953e1e6ef84ba2085f1414a4bf0638e65a047f1fb1b0b0dd59f4df68ef245d465c38dae2a7c887db636832b060c78e40b11667641653e5e4ec7a0eaacb1fdb1eef80e699d695183be585f4f3db16022e33f36ad300282487fcc17eee807085d079cdd2f129b30c5d5aea861d0%22%2C%22expiry%22%3A1606294737%7D';
        const { loginService } = loginServiceFactory();

        loginService.getStorage().setItem('lastActivity', `${Math.round(Date.now() / 1000)}`);

        await expect(loginService.isLoggedIn()).toBe(true);
    });

    it('should be logged out when token exists, but the last activity is too old', async () => {
        // eslint-disable-next-line max-len
        document.cookie =
            'bearerAuth=%7B%22access%22%3A%22eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImU5Njk3NjdmMWQ0M2FhMzBiOGRjNDU3NDU0YWNjZWU4YjM3MzRjYTMyZDVlZDcwYTU4Yjg3ZWZjMWRkYzI5MjFhYTE1NzBjOWI4Zjk0NjZkIn0.eyJhdWQiOiJhZG1pbmlzdHJhdGlvbiIsImp0aSI6ImU5Njk3NjdmMWQ0M2FhMzBiOGRjNDU3NDU0YWNjZWU4YjM3MzRjYTMyZDVlZDcwYTU4Yjg3ZWZjMWRkYzI5MjFhYTE1NzBjOWI4Zjk0NjZkIiwiaWF0IjoxNjA2Mjk0MTM2LCJuYmYiOjE2MDYyOTQxMzYsImV4cCI6MTYwNjI5NDczNiwic3ViIjoiZTAzOWY0YzMyZjllNGMxZjgyMDNlMzVmZjdmZDQ1NzUiLCJzY29wZXMiOlsid3JpdGUiLCJhZG1pbiJdfQ.KNMWZqRJXM-lamNSuNvCsyZkR0zYkvS72DxjbJDAKqQex-PNUsDBDll9E4B7W5dLmIurTbxbzB4c8ztfPVkdXcZg5EORIIU8JRTjpbtwKhnXohEODsNqFPYGjFfhJnwcpt8tXvJ1BFXQdGR0UcHqPe-qLqWP9U1CZRht3A-9EvQFfzyqV9RJTs83tZ5MQI1LowjKIx1C6yxQ4CaQ-d-YUkerDguCukCg_z_Qkf2ME5tfdiiVp_uKCqknXNrNzs5y6LX0xnrLXBOGrcC3ZNF7RxmWxM-MzLaDa6kcYxc-k-QP3I89qDitZVU7LYTvK4WW_eH4qfOyVEzqSJuwtsoShA%22%2C%22refresh%22%3A%22def502006b139951ad0e625d58b94953b05b68ab5cd05abbc68b375ba21abf3e155a162020fd3175f2b057dc095c7ee53ac6686df506baba3053521be09354faa0142aee26a1548edf3f11fb724b1f0c60d044bc66c1c1304f59501a2f1b60378a5200e9254fcbde8c25fc9f745f31aacdaebbc77b3611226d22ee68128f28182a419ab2b04bfba9f240c4d743263dd8e798afccc7c0c2d2cc1c2df6ac6c097d17d9f991a408b5b6534a4a71fad3f7348139fa5b95b483fd2d3e206047fda7c60e099723dab5ff5197113faccd23a3aba8d8c948fd7e4d8da59dc74f9c160fd1de812900f51b5d06bd61dae754b87dc18efec9acdc82447042189871e69db6cbaaed1d82aef3cc8958c553cd5c75c98f0d174887c6a71a3f60aae584e2711198d3af88177f43bb630c6ee4e2453b11a6783953e1e6ef84ba2085f1414a4bf0638e65a047f1fb1b0b0dd59f4df68ef245d465c38dae2a7c887db636832b060c78e40b11667641653e5e4ec7a0eaacb1fdb1eef80e699d695183be585f4f3db16022e33f36ad300282487fcc17eee807085d079cdd2f129b30c5d5aea861d0%22%2C%22expiry%22%3A1606294737%7D';
        const { loginService } = loginServiceFactory();

        // 01.07.1982
        lastUserActivity = new Date(394356370);

        await expect(loginService.isLoggedIn()).toBe(false);
    });

    it('should not be logged in when token does not exists', async () => {
        document.cookie = '';
        const { loginService } = loginServiceFactory();

        await expect(loginService.isLoggedIn()).toBe(false);
    });

    it('should start auto refresh the token after login', async () => {
        jest.useFakeTimers();

        const { loginService, clientMock } = loginServiceFactory();

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 600,
            access_token: 'aCcEsS_tOkEn_first',
            refresh_token: 'rEfReSh_ToKeN_first',
        });

        await loginService.loginByUsername('admin', 'shopware');

        expect(clientMock.history.post[0]).toBeDefined();
        expect(clientMock.history.post[1]).toBeUndefined();
        expect(JSON.parse(clientMock.history.post[0].data).grant_type).toBe('password');

        await jest.runAllTimers();

        expect(clientMock.history.post[1]).toBeDefined();
        expect(JSON.parse(clientMock.history.post[1].data).grant_type).toBe('refresh_token');
    });

    it('should start auto refresh the token after token refresh', async () => {
        const { loginService, clientMock } = loginServiceFactory();

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 600,
            access_token: 'aCcEsS_tOkEn',
            refresh_token: 'rEfReSh_ToKeN',
        });

        await loginService.loginByUsername('admin', 'shopware');

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 400,
            access_token: 'aCcEsS_tOkEn_TwO',
            refresh_token: 'rEfReSh_ToKeN_tWo',
        });

        await loginService.refreshToken();

        expect(clientMock.history.post[1]).toBeDefined();
        expect(JSON.parse(clientMock.history.post[1].data).grant_type).toBe('refresh_token');
    });

    it('should return CookieStorage', async () => {
        const { loginService } = loginServiceFactory();

        expect(typeof loginService.getStorage).toBe('function');

        const storage = loginService.getStorage();
        expect(storage instanceof CookieStorage).toBe(true);
    });

    it('should logout inactive user', async () => {
        // Current time in Seconds - 1501 to be one 1-second over the threshold
        cookieStorageMock = Math.round(+new Date() / 1000) - 1501;

        const { loginService, clientMock } = loginServiceFactory();
        const logoutListener = jest.fn();
        loginService.addOnLogoutListener(logoutListener);

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 600,
            access_token: 'aCcEsS_tOkEn_first',
            refresh_token: 'rEfReSh_ToKeN_first',
        });

        await loginService.loginByUsername('admin', 'shopware');

        expect(clientMock.history.post[0]).toBeDefined();
        expect(clientMock.history.post[1]).toBeUndefined();
        expect(JSON.parse(clientMock.history.post[0].data).grant_type).toBe('password');

        expect(clientMock.history.post[1]).toBeUndefined();
    });

    it('should set logout refresh storage key correctly', async () => {
        // Mock Router
        Shopware.Application.view.router = {
            currentRoute: {
                value: {
                    fullPath: '/sw/dashboard/index',
                },
            },
            push: jest.fn(),
        };
        const { loginService } = loginServiceFactory();

        // Check if refresh-after-logout storage key is not set before logout
        expect(sessionStorage.getItem('refresh-after-logout')).toBeNull();

        loginService.logout();

        // Check if refresh-after-logout storage key is set after logout
        expect(sessionStorage.getItem('refresh-after-logout')).toBe('true');

        sessionStorage.removeItem('refresh-after-logout');
    });

    it('should logout inactive user when user activity is over the threshold', async () => {
        const { loginService, clientMock } = loginServiceFactory();

        clientMock.onPost('/oauth/token').reply(200, {
            token_type: 'Bearer',
            expires_in: 600,
            access_token: 'aCcEsS_tOkEn',
            refresh_token: 'rEfReSh_ToKeN',
        });

        await loginService.loginByUsername('admin', 'shopware');

        lastUserActivity = new Date(Date.now() - 30 * 60 * 1000 - 1);

        const logoutListener = jest.fn();
        loginService.addOnLogoutListener(logoutListener);

        loginService.isLoggedIn();

        expect(logoutListener).toHaveBeenCalled();
    });
});
