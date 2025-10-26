import { runtimeConfig } from './runtime-config';

const SUPABASE_FUNCTIONS_PATH = runtimeConfig.supabaseFunctionsPath;

const trimTrailingSlash = (value: string) => value.trim().replace(/\/+$/, '');
const trimLeadingSlash = (value: string) => value.replace(/^\/+/, '');

const resolveSupabaseBase = () =>
  trimTrailingSlash(runtimeConfig.supabaseUrl ?? runtimeConfig.supabaseDemoUrl);

export const getSupabaseFunctionBaseUrl = (functionName: string) => {
  const functionSegment = trimLeadingSlash(functionName);
  return `${resolveSupabaseBase()}/${SUPABASE_FUNCTIONS_PATH}/${functionSegment}`;
};

export const resolveSupabaseFunctionRoute = (functionName: string, path: string) => {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${getSupabaseFunctionBaseUrl(functionName)}${suffix}`;
};
