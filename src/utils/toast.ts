import React from 'react';
import { dynaura } from 'dynaura';

/**
 * Global Toast Safety Formatter:
 * Converts any object/array/Pydantic error passed into toast into a clean string,
 * preventing React child rendering crashes.
 */
export const formatToastMessage = (message: any): any => {
  if (message == null) return '';
  if (typeof message === 'string') return message;
  if (typeof message === 'number' || typeof message === 'boolean') {
    return String(message);
  }
  if (React.isValidElement(message) || typeof message === 'function') {
    return message;
  }
  if (Array.isArray(message)) {
    return (
      message
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const field = Array.isArray(item.loc) && item.loc.length > 0 ? item.loc[item.loc.length - 1] : '';
            const msg = item.msg || item.message || JSON.stringify(item);
            if (field && typeof field === 'string' && field !== 'body') {
              return `${field}: ${msg}`;
            }
            return msg;
          }
          return String(item ?? '');
        })
        .filter(Boolean)
        .join(', ') || 'Validation error'
    );
  }
  if (typeof message === 'object') {
    return message.msg || message.message || message.detail || JSON.stringify(message);
  }
  return String(message);
};

export const toDynauraOptions = (message: any, opts?: any): any => {
  const formatted = formatToastMessage(message);
  const options = opts && typeof opts === 'object' ? { ...opts } : {};
  const duration = options.duration != null ? options.duration : 4000;
  const id = options.id;

  if (React.isValidElement(formatted) || typeof formatted === 'function') {
    return {
      title: '',
      custom: formatted,
      id,
      duration,
      ...options,
    };
  }

  return {
    title: String(formatted ?? ''),
    id,
    duration,
    ...options,
  };
};

export const toast = Object.assign(
  (message: any, opts?: any) => dynaura.info(toDynauraOptions(message, opts)),
  {
    success: (message: any, opts?: any) => dynaura.success(toDynauraOptions(message, opts)),
    error: (message: any, opts?: any) => dynaura.error(toDynauraOptions(message, opts)),
    warning: (message: any, opts?: any) => dynaura.warning(toDynauraOptions(message, opts)),
    info: (message: any, opts?: any) => dynaura.info(toDynauraOptions(message, opts)),
    loading: (message: any, opts?: any) => dynaura.loading({ ...toDynauraOptions(message, opts), duration: null }),
    dismiss: (id?: string) => {
      if (id) {
        dynaura.dismiss(id);
      } else {
        dynaura.clear();
      }
    },
    promise: <T>(
      promise: Promise<T>,
      msgs: {
        loading: any;
        success: any;
        error: any;
      },
      opts?: any
    ) => {
      return dynaura.promise(promise, {
        loading: toDynauraOptions(msgs.loading, opts),
        success: (data: T) => {
          const msg = typeof msgs.success === 'function' ? msgs.success(data) : msgs.success;
          return toDynauraOptions(msg, opts);
        },
        error: (err: any) => {
          const msg = typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
          return toDynauraOptions(msg, opts);
        },
      });
    },
    custom: (jsxOrFn: any, opts?: any) => dynaura.custom(jsxOrFn, opts),
    clear: () => dynaura.clear(),
  }
);

export { dynaura };
export default toast;
