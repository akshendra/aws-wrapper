
function getValue(object, key) {
  if (key === '.') {
    return object;
  }
  const splits = key.split('.');
  return splits.reduce((acc, k) => {
    return object[k];
  }, object);
}

function map(schema, data, parent) {
  const mapped = Object.entries(schema).reduce((start, [toKey, key]) => {
    if (typeof key === 'string') {
      start[toKey] = getValue(data, key);
    } else if (Array.isArray(key)) {
      const arrayKeyInObject = key[0];
      const arraySchema = key[1];
      if (!arraySchema) {
        start[toKey] = getValue(data, arrayKeyInObject);
      } else if (typeof arraySchema === 'function') {
        start[toKey] = arraySchema(getValue(data, arrayKeyInObject));
      } else {
        start[toKey] = getValue(data, arrayKeyInObject).map(valInArray => map(arraySchema, valInArray));
      }
    } else if (typeof key === 'object') {
      const objectKeyInObject = key.key;
      const objectSchema = key.schema;
      const applyFx = key.apply;
      if (objectKeyInObject && objectSchema) {
        start[toKey] = map(objectSchema, getValue(data, objectKeyInObject));
      } else if (applyFx && objectKeyInObject) {
        start[toKey] = applyFx(getValue(data, objectKeyInObject));
      } else {
        start[toKey] = map(key, data);
      }
    } else {
      throw new Error(`Unknown type key ${key} for ${toKey}`);
    }
    return start;
  }, {});
  if (parent === true) {
    return Object.assign(mapped, {
      _org: data,
    });
  }
  return mapped;
}


exports.bindSchema = function bindSchema(schema, parent = true) {
  return (data) => map(schema, data, parent);
};

exports.extractTag = function extractTag(tags) {
  return tags.reduce((start, { Key, Value }) => {
    if (Value.indexOf('+') >= 0) {
      start[Key] = Value.split('+');
    } else {
      start[Key] = Value;
    }
    return start;
  }, {});
};
