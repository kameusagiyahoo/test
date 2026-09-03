export function createRequiredPicker(scope){
  if(typeof scope!=='string'||!scope.trim()){
    throw new TypeError('context scope is required');
  }
  const prefix=scope.trim();

  return function pickRequired(source,keys,label,{functions=false}={}){
    const result={};
    for(const key of keys){
      const value=source?.[key];
      if(value==null)throw new Error(`missing ${prefix} ${label}: ${key}`);
      if(functions&&typeof value!=='function'){
        throw new TypeError(`${prefix} ${label} must be a function: ${key}`);
      }
      result[key]=value;
    }
    return Object.freeze(result);
  };
}
