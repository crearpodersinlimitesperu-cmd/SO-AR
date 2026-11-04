export function isAssetLoadError(error) {
  return /failed to fetch dynamically imported module|importing a module script failed|loading chunk .+ failed|unable to preload css/i.test(String(error));
}
