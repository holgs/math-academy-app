const EVENT_HANDLER_ATTR = /\son[a-z]+\s*=\s*(['"]).*?\1/gi;
const SCRIPT_TAG = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const JS_URL = /(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi;
const STYLE_TAG = /<style[\s\S]*?>[\s\S]*?<\/style>/gi;
const IFRAME_TAG = /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi;

export function sanitizeHtml(input: string): string {
  if (!input) {
    return '';
  }

  return input
    .replace(SCRIPT_TAG, '')
    .replace(STYLE_TAG, '')
    .replace(IFRAME_TAG, '')
    .replace(EVENT_HANDLER_ATTR, '')
    .replace(JS_URL, '$1="#"');
}
