// Référentiel : catégories, types, couleurs, coupes.

export const CATEGORIES = {
  haut: {
    key: 'haut', title: 'Hauts', one: 'un haut', empty: 'Aucun haut ne correspond',
    types: ['T-shirt', 'Pull', 'Sweat', 'Veste', 'Chemise'],
    plural: { 'T-shirt': 'T-shirts', Pull: 'Pulls', Sweat: 'Sweats', Veste: 'Vestes', Chemise: 'Chemises' },
    fits: ['Ajusté', 'Regular', 'Ample'], fitWord: 'Coupe'
  },
  bas: {
    key: 'bas', title: 'Bas', one: 'un bas', empty: 'Aucun bas ne correspond',
    types: ['Jean', 'Pantalon', 'Chino', 'Jogging', 'Cargo'],
    plural: { Jean: 'Jeans', Pantalon: 'Pantalons', Chino: 'Chinos', Jogging: 'Joggings', Cargo: 'Cargos' },
    fits: ['Ajusté', 'Regular', 'Ample'], fitWord: 'Coupe'
  },
  chaussures: {
    key: 'chaussures', title: 'Chaussures', one: 'des chaussures', empty: 'Aucune paire ne correspond',
    types: ['Baskets', 'Running', 'Ville', 'Bottines'],
    plural: { Baskets: 'Baskets', Running: 'Running', Ville: 'Ville', Bottines: 'Bottines' },
    fits: ['Basses', 'Montantes'], fitWord: 'Tige'
  },
  accessoire: {
    key: 'accessoire', title: 'Accessoires', one: 'un accessoire', empty: 'Aucun accessoire ne correspond',
    types: ['Montre', 'Bague', 'Chaîne', 'Bracelet'],
    plural: { Montre: 'Montres', Bague: 'Bagues', 'Chaîne': 'Chaînes', Bracelet: 'Bracelets' },
    fits: [], fitWord: ''
  }
};
export const CAT_ORDER = ['haut', 'bas', 'chaussures', 'accessoire'];

export const PALETTE = [
  { label: 'Blanc', hex: '#F4F2EE', neutral: true },
  { label: 'Noir', hex: '#1E1E1E', neutral: true },
  { label: 'Gris', hex: '#8C8C8C', neutral: true },
  { label: 'Marine', hex: '#27324F', neutral: true },
  { label: 'Bleu', hex: '#3D63A8', neutral: false },
  { label: 'Beige', hex: '#CDB892', neutral: true },
  { label: 'Marron', hex: '#6B4A32', neutral: true },
  { label: 'Vert', hex: '#5F7A57', neutral: false },
  { label: 'Kaki', hex: '#6B6A4A', neutral: true },
  { label: 'Bordeaux', hex: '#7A2531', neutral: false },
  { label: 'Rouge', hex: '#B8322E', neutral: false },
  { label: 'Jaune', hex: '#D9B23A', neutral: false },
  { label: 'Or', hex: '#D4AF5A', neutral: true },
  { label: 'Argent', hex: '#C9CCD1', neutral: true }
];
export const isNeutral = (hex) => {
  const p = PALETTE.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase());
  return p ? p.neutral : true;
};
export const isDark = (hex) => {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 110;
};

// Avatar
export const AV = {
  skin: [
    { label: 'Très claire', hex: '#F1D9C5', dark: '#DDBFA8', lip: '#C98A7E' },
    { label: 'Claire', hex: '#E2BE9F', dark: '#CBA383', lip: '#B9786A' },
    { label: 'Mate', hex: '#C99B76', dark: '#B0825F', lip: '#9A6052' },
    { label: 'Hâlée', hex: '#A87652', dark: '#8F6040', lip: '#7D4A3C' },
    { label: 'Foncée', hex: '#7E5236', dark: '#673F28', lip: '#5A3326' },
    { label: 'Très foncée', hex: '#573826', dark: '#432A1C', lip: '#3E2419' }
  ],
  hair: [
    { label: 'Noir', hex: '#1D1A18' }, { label: 'Brun', hex: '#4A3022' }, { label: 'Châtain', hex: '#7A5333' },
    { label: 'Blond', hex: '#C9A162' }, { label: 'Roux', hex: '#A4532B' }, { label: 'Gris', hex: '#9C9893' }
  ],
  eye: [
    { label: 'Marron', hex: '#5A3A22' }, { label: 'Noisette', hex: '#8A6A3A' }, { label: 'Bleu', hex: '#4F7DB0' },
    { label: 'Vert', hex: '#5E8456' }, { label: 'Gris', hex: '#7D8A93' }
  ],
  hairStyle: ['Court', 'Dégradé', 'Mi-long', 'Bouclé', 'Rasé'],
  eyeShape: ['Amande', 'Ronds', 'Étroits'],
  eyeSize: ['Petits', 'Moyens', 'Grands'],
  beard: ['Aucune', 'Courte', 'Pleine'],
  build: ['Mince', 'Normale', 'Athlétique']
};
export const DEFAULT_AVATAR = { skin: 2, hair: 0, eye: 0, hairStyle: 'Court', eyeShape: 'Amande', eyeSize: 'Moyens', beard: 'Aucune', build: 'Normale' };

// Pièces d'exemple pour le mode démo
export const DEMO_ITEMS = [
  { category: 'haut', type: 'T-shirt', name: 'T-shirt blanc', color_name: 'Blanc', color_hex: '#F4F2EE', fit: 'Ajusté' },
  { category: 'haut', type: 'Pull', name: 'Pull col rond marine', color_name: 'Marine', color_hex: '#27324F', fit: 'Regular' },
  { category: 'haut', type: 'Sweat', name: 'Sweat oversize gris', color_name: 'Gris', color_hex: '#8C8C8C', fit: 'Ample' },
  { category: 'haut', type: 'Veste', name: 'Veste bordeaux', color_name: 'Bordeaux', color_hex: '#7A2531', fit: 'Regular' },
  { category: 'bas', type: 'Jean', name: 'Jean brut', color_name: 'Marine', color_hex: '#27324F', fit: 'Ajusté' },
  { category: 'bas', type: 'Pantalon', name: 'Pantalon de costume noir', color_name: 'Noir', color_hex: '#1E1E1E', fit: 'Regular' },
  { category: 'bas', type: 'Jogging', name: 'Jogging gris', color_name: 'Gris', color_hex: '#8C8C8C', fit: 'Ample' },
  { category: 'bas', type: 'Chino', name: 'Chino beige', color_name: 'Beige', color_hex: '#CDB892', fit: 'Regular' },
  { category: 'chaussures', type: 'Baskets', name: 'Baskets blanches', color_name: 'Blanc', color_hex: '#F4F2EE', fit: 'Basses' },
  { category: 'chaussures', type: 'Ville', name: 'Derbies noires', color_name: 'Noir', color_hex: '#1E1E1E', fit: 'Basses' },
  { category: 'chaussures', type: 'Bottines', name: 'Bottines marron', color_name: 'Marron', color_hex: '#6B4A32', fit: 'Montantes' },
  { category: 'accessoire', type: 'Montre', name: 'Montre acier', color_name: 'Argent', color_hex: '#C9CCD1', fit: '' }
];
