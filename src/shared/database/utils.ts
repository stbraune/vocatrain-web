export function any(...actions: {
  if: () => boolean,
  then: () => void
}[]) {
  return actions.reduce((result, action) => {
    if (action.if()) {
      action.then();
      return true;
    }
    return result;
  }, false);
}

// removes properties with undefined value from value and those with the given keys.
export function sanitize<TVal, TKey extends keyof TVal>(value: TVal, ...keys: TKey[]): Partial<TVal> {
  if (!value) {
    return value;
  }

  return <Partial<TVal>>pick(value, ...(<TKey[]>Object.keys(value))
    .filter((key) => value[key] !== undefined && (!keys || keys.indexOf(key) === -1)));
}

// picks some properties from value.
export function pick<TVal, TKey extends keyof TVal>(value: TVal, ...keys: TKey[]): Pick<TVal, TKey> {
  return keys.map((key) => ({ [key]: value[key] })).reduce((prev, cur) => Object.assign(prev, cur), <Pick<TVal, TKey>>{});
}
