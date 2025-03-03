'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('@capacitor/core');

const Http = core.registerPlugin('Http', {
  web: () =>
    Promise.resolve()
      .then(function () {
        return web;
      })
      .then(m => new m.HttpWeb()),
  electron: () =>
    Promise.resolve()
      .then(function () {
        return web;
      })
      .then(m => new m.HttpWeb()),
});

/**
 * Read in a Blob value and return it as a base64 string
 * @param blob The blob value to convert to a base64 string
 */
const readBlobAsBase64 = async blob =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result;
      const base64StringWithoutTags = base64String.substr(
        base64String.indexOf(',') + 1,
      ); // remove prefix "data:application/pdf;base64,"
      resolve(base64StringWithoutTags);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(blob);
  });
/**
 * Safely web encode a string value (inspired by js-cookie)
 * @param str The string value to encode
 */
const encode = str =>
  encodeURIComponent(str)
    .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
    .replace(/[()]/g, escape);
/**
 * Safely web decode a string value (inspired by js-cookie)
 * @param str The string value to decode
 */
const decode = str => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);

/**
 * Set a cookie
 * @param key The key to set
 * @param value The value to set
 * @param options Optional additional parameters
 */
const setCookie = (key, value, options = {}) => {
  // Safely Encoded Key/Value
  const encodedKey = encode(key);
  const encodedValue = encode(value);
  // Clean & sanitize options
  const expires = `; expires=${(options.expires || '').replace(
    'expires=',
    '',
  )}`; // Default is "; expires="
  const path = (options.path || '/').replace('path=', ''); // Default is "path=/"
  document.cookie = `${encodedKey}=${
    encodedValue || ''
  }${expires}; path=${path}`;
};
/**
 * Gets all HttpCookies
 */
const getCookies = () => {
  const output = [];
  const map = {};
  if (!document.cookie) {
    return output;
  }
  const cookies = document.cookie.split(';') || [];
  for (const cookie of cookies) {
    // Replace first "=" with CAP_COOKIE to prevent splitting on additional "="
    let [k, v] = cookie.replace(/=/, 'CAP_COOKIE').split('CAP_COOKIE');
    k = decode(k).trim();
    v = decode(v).trim();
    map[k] = v;
  }
  const entries = Object.entries(map);
  for (const [key, value] of entries) {
    output.push({
      key,
      value,
    });
  }
  return output;
};
/**
 * Gets a single HttpCookie given a key
 */
const getCookie = key => {
  const cookies = getCookies();
  for (const cookie of cookies) {
    if (cookie.key === key) {
      return cookie;
    }
  }
  return {
    key,
    value: '',
  };
};
/**
 * Deletes a cookie given a key
 * @param key The key of the cookie to delete
 */
const deleteCookie = key => {
  document.cookie = `${key}=; Max-Age=0`;
};
/**
 * Clears out cookies by setting them to expire immediately
 */
const clearCookies = () => {
  const cookies = document.cookie.split(';') || [];
  for (const cookie of cookies) {
    document.cookie = cookie
      .replace(/^ +/, '')
      .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
  }
};

/**
 * Normalize an HttpHeaders map by lowercasing all of the values
 * @param headers The HttpHeaders object to normalize
 */
const normalizeHttpHeaders = (headers = {}) => {
  const originalKeys = Object.keys(headers);
  const loweredKeys = Object.keys(headers).map(k => k.toLocaleLowerCase());
  const normalized = loweredKeys.reduce((acc, key, index) => {
    acc[key] = headers[originalKeys[index]];
    return acc;
  }, {});
  return normalized;
};
/**
 * Builds a string of url parameters that
 * @param params A map of url parameters
 * @param shouldEncode true if you should encodeURIComponent() the values (true by default)
 */
const buildUrlParams = (params, shouldEncode = true) => {
  if (!params) return null;
  const output = Object.entries(params).reduce((accumulator, entry) => {
    const [key, value] = entry;
    let encodedValue;
    let item;
    if (Array.isArray(value)) {
      item = '';
      value.forEach(str => {
        encodedValue = shouldEncode ? encodeURIComponent(str) : str;
        item += `${key}=${encodedValue}&`;
      });
      // last character will always be "&" so slice it off
      item.slice(0, -1);
    } else {
      encodedValue = shouldEncode ? encodeURIComponent(value) : value;
      item = `${key}=${encodedValue}`;
    }
    return `${accumulator}&${item}`;
  }, '');
  // Remove initial "&" from the reduce
  return output.substr(1);
};
/**
 * Build the RequestInit object based on the options passed into the initial request
 * @param options The Http plugin options
 * @param extra Any extra RequestInit values
 */
const buildRequestInit = (options, extra = {}) => {
  const output = Object.assign(
    { method: options.method || 'GET', headers: options.headers },
    extra,
  );
  // Get the content-type
  const headers = normalizeHttpHeaders(options.headers);
  const type = headers['content-type'] || '';
  // If body is already a string, then pass it through as-is.
  if (typeof options.data === 'string') {
    output.body = options.data;
  }
  // Build request initializers based off of content-type
  else if (type.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.data || {})) {
      params.set(key, value);
    }
    output.body = params.toString();
  } else if (type.includes('multipart/form-data')) {
    const form = new FormData();
    if (options.data instanceof FormData) {
      options.data.forEach((value, key) => {
        form.append(key, value);
      });
    } else {
      for (let key of Object.keys(options.data)) {
        form.append(key, options.data[key]);
      }
    }
    output.body = form;
    const headers = new Headers(output.headers);
    headers.delete('content-type'); // content-type will be set by `window.fetch` to includy boundary
    output.headers = headers;
  } else if (
    type.includes('application/json') ||
    typeof options.data === 'object'
  ) {
    output.body = JSON.stringify(options.data);
  }
  return output;
};
/**
 * Perform an Http request given a set of options
 * @param options Options to build the HTTP request
 */
const request = async options => {
  const requestInit = buildRequestInit(options, options.webFetchExtra);
  const urlParams = buildUrlParams(
    options.params,
    options.shouldEncodeUrlParams,
  );
  const url = urlParams ? `${options.url}?${urlParams}` : options.url;
  const response = await fetch(url, requestInit);
  const contentType = response.headers.get('content-type') || '';
  // Default to 'text' responseType so no parsing happens
  let { responseType = 'text' } = response.ok ? options : {};
  // If the response content-type is json, force the response to be json
  if (contentType.includes('application/json')) {
    responseType = 'json';
  }
  let data;
  switch (responseType) {
    case 'arraybuffer':
    case 'blob':
      const blob = await response.blob();
      data = await readBlobAsBase64(blob);
      break;
    case 'json':
      data = await response.json();
      break;
    case 'document':
    case 'text':
    default:
      data = await response.text();
  }
  // Convert fetch headers to Capacitor HttpHeaders
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return {
    data,
    headers,
    status: response.status,
    url: response.url,
  };
};
/**
 * Perform an Http GET request given a set of options
 * @param options Options to build the HTTP request
 */
const get = async options =>
  request(Object.assign(Object.assign({}, options), { method: 'GET' }));
/**
 * Perform an Http POST request given a set of options
 * @param options Options to build the HTTP request
 */
const post = async options =>
  request(Object.assign(Object.assign({}, options), { method: 'POST' }));
/**
 * Perform an Http PUT request given a set of options
 * @param options Options to build the HTTP request
 */
const put = async options =>
  request(Object.assign(Object.assign({}, options), { method: 'PUT' }));
/**
 * Perform an Http PATCH request given a set of options
 * @param options Options to build the HTTP request
 */
const patch = async options =>
  request(Object.assign(Object.assign({}, options), { method: 'PATCH' }));
/**
 * Perform an Http DELETE request given a set of options
 * @param options Options to build the HTTP request
 */
const del = async options =>
  request(Object.assign(Object.assign({}, options), { method: 'DELETE' }));

class HttpWeb extends core.WebPlugin {
  constructor() {
    super();
    /**
     * Perform an Http request given a set of options
     * @param options Options to build the HTTP request
     */
    this.request = async options => request(options);
    /**
     * Perform an Http GET request given a set of options
     * @param options Options to build the HTTP request
     */
    this.get = async options => get(options);
    /**
     * Perform an Http POST request given a set of options
     * @param options Options to build the HTTP request
     */
    this.post = async options => post(options);
    /**
     * Perform an Http PUT request given a set of options
     * @param options Options to build the HTTP request
     */
    this.put = async options => put(options);
    /**
     * Perform an Http PATCH request given a set of options
     * @param options Options to build the HTTP request
     */
    this.patch = async options => patch(options);
    /**
     * Perform an Http DELETE request given a set of options
     * @param options Options to build the HTTP request
     */
    this.del = async options => del(options);
    /**
     * Gets all HttpCookies as a Map
     */
    this.getCookiesMap = async (
      // @ts-ignore
      options,
    ) => {
      const cookies = getCookies();
      const output = {};
      for (const cookie of cookies) {
        output[cookie.key] = cookie.value;
      }
      return output;
    };
    /**
     * Get all HttpCookies as an object with the values as an HttpCookie[]
     */
    this.getCookies = async options => {
      const cookies = getCookies();
      return { cookies };
    };
    /**
     * Set a cookie
     * @param key The key to set
     * @param value The value to set
     * @param options Optional additional parameters
     */
    this.setCookie = async options => {
      const { key, value, expires = '', path = '' } = options;
      setCookie(key, value, { expires, path });
    };
    /**
     * Gets all cookie values unless a key is specified, then return only that value
     * @param key The key of the cookie value to get
     */
    this.getCookie = async options => getCookie(options.key);
    /**
     * Deletes a cookie given a key
     * @param key The key of the cookie to delete
     */
    this.deleteCookie = async options => deleteCookie(options.key);
    /**
     * Clears out cookies by setting them to expire immediately
     */
    this.clearCookies = async (
      // @ts-ignore
      options,
    ) => clearCookies();
    /**
     * Clears out cookies by setting them to expire immediately
     */
    this.clearAllCookies = async () => clearCookies();
    /**
     * Uploads a file through a POST request
     * @param options TODO
     */
    this.uploadFile = async options => {
      const formData = new FormData();
      formData.append(options.name, options.blob || 'undefined');
      const fetchOptions = Object.assign(Object.assign({}, options), {
        body: formData,
        method: 'POST',
      });
      return this.post(fetchOptions);
    };
    /**
     * Downloads a file
     * @param options TODO
     */
    this.downloadFile = async options => {
      const requestInit = buildRequestInit(options, options.webFetchExtra);
      const response = await fetch(options.url, requestInit);
      let blob;
      if (!(options === null || options === void 0 ? void 0 : options.progress))
        blob = await response.blob();
      else if (
        !(response === null || response === void 0 ? void 0 : response.body)
      )
        blob = new Blob();
      else {
        const reader = response.body.getReader();
        let bytes = 0;
        let chunks = [];
        const contentType = response.headers.get('content-type');
        const contentLength = parseInt(
          response.headers.get('content-length') || '0',
          10,
        );
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          bytes +=
            (value === null || value === void 0 ? void 0 : value.length) || 0;
          const status = {
            type: 'DOWNLOAD',
            url: options.url,
            bytes,
            contentLength,
          };
          this.notifyListeners('progress', status);
        }
        let allChunks = new Uint8Array(bytes);
        let position = 0;
        for (const chunk of chunks) {
          if (typeof chunk === 'undefined') continue;
          allChunks.set(chunk, position);
          position += chunk.length;
        }
        blob = new Blob([allChunks.buffer], { type: contentType || undefined });
      }
      return {
        blob,
      };
    };
  }
}

var web = /*#__PURE__*/ Object.freeze({
  __proto__: null,
  HttpWeb: HttpWeb,
});

exports.Http = Http;
//# sourceMappingURL=plugin.cjs.js.map
