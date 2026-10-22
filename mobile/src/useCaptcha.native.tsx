/** Native authentication does not embed CAPTCHA; the web flow still requires it. */
export function useCaptcha(){return {verify:async(_action:'login'|'register')=>undefined as string|undefined,captchaView:null};}
