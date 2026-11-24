/* The theme the world on screen wears (commission 9), for the view's modules to read without importing the theme
   layer: TH.id is null, or a theme's id ('feline'). view/theme.js keeps it up to date; models put it in their keys. */
const TH = { id: null };
const feline = () => TH.id === 'feline';
export { TH, feline };
