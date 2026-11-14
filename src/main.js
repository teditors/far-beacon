/* Entry point for the browser build. */
import { Rules } from './rules/index.js';
import './view/ui.js';

globalThis.Rules = Rules; // handy from the browser console, and used by the browser tests
